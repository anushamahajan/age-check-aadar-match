import os
import shutil
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Union

import nest_asyncio
nest_asyncio.apply()

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import the DocumentProcessorService from the separate file
from backend.services.document_processor_service import DocumentProcessorService

# Load environment variables from .env file
load_dotenv('.env')

# --- Configuration ---
UPLOADS_DIR = "./uploaded_files"
TEMP_PROCESSING_DIR = "./backend_temp_data"

os.makedirs(UPLOADS_DIR, exist_ok=True)
# TEMP_PROCESSING_DIR will be created by DocumentProcessorService

LLAMA_CLOUD_API_KEY = os.getenv("LLAMA_CLOUD_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# --- Google Gemini related imports ---
import google.generativeai as genai

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Document Processing API with LlamaParse & Gemini 1.5",
    description="API to convert images to PDF, extract text/images from documents using LlamaParse, and then extract structured info (Name, DOB, Age) using Gemini 1.5.",
    version="1.0.0"
)

# --- Configure Gemini API ---
gemini_model = None
if GOOGLE_API_KEY:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-1.5-flash-latest')
        print("Gemini 1.5 Flash model initialized.")
    except Exception as e:
        print(f"ERROR: Failed to configure Gemini API or initialize model: {e}")
        gemini_model = None
else:
    print("WARNING: GOOGLE_API_KEY environment variable not found. Gemini extraction will be disabled.")


# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependency Injection for DocumentProcessorService ---
def get_processor_service() -> DocumentProcessorService:
    if not LLAMA_CLOUD_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Llama Cloud API Key is not configured on the backend."
        )
    return DocumentProcessorService(
        llama_cloud_api_key=LLAMA_CLOUD_API_KEY,
        temp_storage_dir=TEMP_PROCESSING_DIR
    )

# --- Helper Function for Gemini Extraction ---
async def extract_id_info_with_gemini(document_text: str) -> Dict[str, Any]:
    """
    Uses Gemini 1.5 Flash to extract Name, Date of Birth (DOB) or Year of Birth (YOB),
    and calculate Age from the given document text.
    """
    if not gemini_model:
        return {"name": None, "dob": None, "age": None, "llm_extraction_error": "Gemini API not configured."}

    prompt = f"""
    You are an expert at extracting personal information from identity documents.
    From the provided text, extract the following information for the primary document holder:
    1.  **Full Name**: The complete name of the individual.
    2.  **Date of Birth (DOB)**: The full date of birth in 'YYYY-MM-DD' format. If only the year is explicitly found (e.g., "Year of Birth: 1990"), return just the year in 'YYYY' format. If no date information is found, return `null`.

    If a piece of information is not found, return `null` for that field.

    Here is the document text:
    \"\"\"
    {document_text}
    \"\"\"

    Provide the extracted information in JSON format.
    Example 1 (Full DOB):
    {{
      "name": "John Doe",
      "dob": "1990-05-15"
    }}
    Example 2 (Only Year):
    {{
      "name": "Jane Smith",
      "dob": "1985"
    }}
    Example 3 (Nothing Found):
    {{
      "name": null,
      "dob": null
    }}
    """
    
    try:
        response = await gemini_model.generate_content_async(prompt)
        response_text = response.text.strip()
        
        # Strip Markdown code block fences if present
        if response_text.startswith("```json") and response_text.endswith("```"):
            response_text = response_text[len("```json"): -len("```")].strip()

        extracted_data = json.loads(response_text)
        
        dob_str = extracted_data.get("dob")
        age = None
        if dob_str:
            try:
                if len(dob_str) == 4 and dob_str.isdigit():
                    birth_year = int(dob_str)
                    current_year = datetime.now().year
                    age = current_year - birth_year
                elif len(dob_str) == 10 and dob_str[4] == '-' and dob_str[7] == '-':
                    dob_obj = datetime.strptime(dob_str, "%Y-%m-%d")
                    today = datetime.now()
                    age = today.year - dob_obj.year - ((today.month, today.day) < (dob_obj.month, dob_obj.day))
                else:
                    print(f"Warning: DOB format not recognized for age calculation: {dob_str}")
            except ValueError as ve:
                print(f"Error parsing DOB for age calculation ({dob_str}): {ve}")
            except Exception as e:
                print(f"Unexpected error calculating age for DOB '{dob_str}': {e}")
            
            if age is not None and (age < 0 or age > 120):
                age = None

        extracted_data["age"] = age 
        return extracted_data

    except json.JSONDecodeError as e:
        print(f"Gemini response was not valid JSON: '{response_text}'. Error: {e}")
        return {"name": None, "dob": None, "age": None, "llm_extraction_error": f"Invalid JSON response from LLM or parsing error: {e}. Raw response (first 200 chars): {response_text[:200]}"}
    except Exception as e:
        print(f"Error during Gemini extraction API call: {e}")
        return {"name": None, "dob": None, "age": None, "llm_extraction_error": str(e)}

# --- API Endpoints ---

@app.get("/health", summary="Health Check", response_model=Dict[str, str])
async def health_check():
    """
    Returns a simple status message to indicate the API is running.
    """
    return {"status": "ok", "message": "Document Processing API is healthy."}

@app.post("/process_document", summary="Upload and Process Document with LlamaParse & Gemini", response_model=Dict[str, Any])
async def process_document_endpoint(
    file: UploadFile = File(...),
    processor_service: DocumentProcessorService = Depends(get_processor_service)
):
    """
    Uploads a document (PDF, PNG, JPEG), converts images to PDF if necessary,
    processes it with LlamaParse, and then extracts Name, DOB, and Age using Gemini 1.5.

    Returns the raw LlamaParse JSON, extracted text/images, and structured ID info from Gemini.
    """
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    unique_upload_filename = processor_service._generate_unique_filepath(file.filename, prefix="uploaded_")
    original_upload_path = unique_upload_filename

    try:
        with open(original_upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"Uploaded file saved to: {original_upload_path}")

        converted_pdf_path: Union[str, None] = None
        final_pdf_to_process: str = original_upload_path

        if file_extension in [".png", ".jpg", ".jpeg", ".gif", ".bmp"]:
            print(f"Detected image file: {file.filename}. Converting to PDF...")
            converted_pdf_path = processor_service.convert_image_to_pdf(original_upload_path)
            if not converted_pdf_path:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to convert image to PDF."
                )
            final_pdf_to_process = converted_pdf_path
        elif file_extension != ".pdf":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {file_extension}. Only PDF and common image formats are supported."
            )

        print(f"Initiating LlamaParse processing for: {final_pdf_to_process}")
        processing_result = processor_service.process_pdf_for_extraction(final_pdf_to_process)

        if processing_result["error"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Document processing failed: {processing_result['error']}"
            )

        # --- LLM-based Information Extraction using Gemini ---
        extracted_name = None
        extracted_dob = None
        predicted_age = None
        llm_extraction_error = None

        if processing_result["text_nodes"]:
            full_document_text = "\n".join([node.text for node in processing_result["text_nodes"]])
            
            if full_document_text.strip():
                llm_extraction_result = await extract_id_info_with_gemini(full_document_text)
                
                if llm_extraction_result.get("llm_extraction_error"):
                    llm_extraction_error = llm_extraction_result["llm_extraction_error"]
                else:
                    extracted_name = llm_extraction_result.get("name")
                    extracted_dob = llm_extraction_result.get("dob")
                    predicted_age = llm_extraction_result.get("age")
            else:
                llm_extraction_error = "LlamaParse extracted text, but it was empty after stripping whitespace. Cannot perform Gemini extraction."
        else:
            llm_extraction_error = "No text nodes found by LlamaParse for Gemini extraction. Please check the document image clarity."
        # --- END LLM Extraction ---

        response_text_nodes = [
            {"text": node.text, "metadata": node.metadata}
            for node in processing_result["text_nodes"]
        ]
        
        response_image_documents = [
            {"image_path": doc.image_path, "metadata": doc.metadata}
            for doc in processing_result["image_documents"]
        ]

        return JSONResponse(content={
            "message": "Document processed successfully and information extracted with Gemini.",
            "original_filename": file.filename,
            "processed_file_path": final_pdf_to_process,
            "raw_llamaparse_json": processing_result["raw_llamaparse_json"],
            "extracted_text_nodes": response_text_nodes,
            "extracted_image_documents": response_image_documents,
            "extracted_id_info": {
                "name": extracted_name,
                "dob": extracted_dob,
                "age": predicted_age,
                "llm_error": llm_extraction_error
            }
        })

    except HTTPException as http_exc:
        raise http_exc

    except Exception as e:
        print(f"An unexpected error occurred during document processing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected server error occurred during document processing: {str(e)}"
        )
    finally:
        cleanup_paths = [original_upload_path]
        if converted_pdf_path:
            cleanup_paths.append(converted_pdf_path)
        processor_service.cleanup_temp_files(cleanup_paths)