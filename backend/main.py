import os
import shutil
import json
import uuid
from datetime import datetime # Import for age calculation
from typing import List, Dict, Any, Union

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.responses import JSONResponse, FileResponse # FileResponse is needed for /get_extracted_image
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv # To load environment variables from a .env file

# Import the DocumentProcessorService from the separate file
from backend.services.document_processor_service import DocumentProcessorService

# Load environment variables from .env file
load_dotenv('.env')

# --- Configuration ---
# Directory to temporarily store uploaded files before processing
UPLOADS_DIR = "./uploaded_files"
# Directory for DocumentProcessorService to store intermediate/extracted files
TEMP_PROCESSING_DIR = "./backend_temp_data"

# Ensure upload directory exists
os.makedirs(UPLOADS_DIR, exist_ok=True)
# The DocumentProcessorService will create TEMP_PROCESSING_DIR itself

# Get API keys from environment variables
LLAMA_CLOUD_API_KEY = os.getenv("LLAMA_CLOUD_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") # Get Gemini API Key

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
        # Initialize Gemini model. Using gemini-1.5-flash-latest for speed and cost-effectiveness for extraction.
        gemini_model = genai.GenerativeModel('gemini-1.5-flash-latest')
        print("Gemini 1.5 Flash model initialized.")
    except Exception as e:
        print(f"ERROR: Failed to configure Gemini API or initialize model: {e}")
        gemini_model = None
else:
    print("WARNING: GOOGLE_API_KEY environment variable not found. Gemini extraction will be disabled.")


# --- CORS Middleware ---
# Configure CORS to allow requests from your React frontend.
# Adjust `allow_origins` to your frontend's URL in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], # Allow your React dev server
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, etc.)
    allow_headers=["*"], # Allow all headers
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

# --- Helper Function for Gemini Extraction (now in main.py) ---
async def extract_id_info_with_gemini(document_text: str) -> Dict[str, Any]:
    """
    Uses Gemini 1.5 Flash to extract Name, Date of Birth (DOB) or Year of Birth (YOB),
    and calculate Age from the given document text.
    """
    if not gemini_model:
        return {"name": None, "dob": None, "age": None, "llm_extraction_error": "Gemini API not configured."}

    # Prompt for extracting Name and DOB/YOB. Explicitly requesting JSON format.
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
        # Send the prompt to Gemini for content generation
        response = await gemini_model.generate_content_async(prompt)
        response_text = response.text.strip()
        
        # --- FIX: Strip Markdown code block fences if present ---
        if response_text.startswith("```json") and response_text.endswith("```"):
            response_text = response_text[len("```json"): -len("```")].strip()
        # --- END FIX ---

        # Parse the JSON response from Gemini. This is where Gemini's string output
        # is converted into a Python dictionary.
        extracted_data = json.loads(response_text)
        
        dob_str = extracted_data.get("dob")
        age = None
        if dob_str:
            try:
                # Logic to calculate age based on DOB string
                if len(dob_str) == 4 and dob_str.isdigit(): # YYYY format
                    birth_year = int(dob_str)
                    current_year = datetime.now().year
                    age = current_year - birth_year
                elif len(dob_str) == 10 and dob_str[4] == '-' and dob_str[7] == '-': # YYYY-MM-DD format
                    dob_obj = datetime.strptime(dob_str, "%Y-%m-%d")
                    today = datetime.now()
                    # Calculate age considering month and day for accuracy
                    age = today.year - dob_obj.year - ((today.month, today.day) < (dob_obj.month, dob_obj.day))
                else:
                    print(f"Warning: DOB format not recognized for age calculation: {dob_str}")
            except ValueError as ve:
                print(f"Error parsing DOB for age calculation ({dob_str}): {ve}")
            except Exception as e:
                print(f"Unexpected error calculating age for DOB '{dob_str}': {e}")
            
            # Sanity check for calculated age to avoid unreasonable values (e.g., negative age)
            if age is not None and (age < 0 or age > 120):
                age = None

        # Add the calculated age to the dictionary received from Gemini.
        # This ensures 'age' is always part of the 'extracted_id_info' structure.
        extracted_data["age"] = age 
        return extracted_data

    except json.JSONDecodeError as e:
        # Handle cases where Gemini's response is not valid JSON
        print(f"Gemini response was not valid JSON: '{response_text}'. Error: {e}")
        return {"name": None, "dob": None, "age": None, "llm_extraction_error": f"Invalid JSON response from LLM or parsing error: {e}. Raw response (first 200 chars): {response_text[:200]}"}
    except Exception as e:
        # Catch any other exceptions during the Gemini API call
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
    
    # Generate a unique filename for the uploaded file to prevent conflicts
    unique_upload_filename = processor_service._generate_unique_filepath(file.filename, prefix="uploaded_")
    original_upload_path = unique_upload_filename

    try:
        with open(original_upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"Uploaded file saved to: {original_upload_path}")

        converted_pdf_path: Union[str, None] = None
        final_pdf_to_process: str = original_upload_path

        # Determine if the file is an image and needs conversion
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
        # Initialize variables for extracted info. These will be 'null' in the final JSON if no data is found.
        extracted_name = None
        extracted_dob = None
        predicted_age = None
        llm_extraction_error = None

        if processing_result["text_nodes"]:
            # Combine all text nodes from LlamaParse into a single string to send to Gemini
            # LlamaParse returns TextNode objects, so we access their 'text' attribute.
            full_document_text = "\n".join([node.text for node in processing_result["text_nodes"]])
            
            if full_document_text.strip(): # Ensure there's actual text content before sending to Gemini
                # Call the Gemini extraction helper function to get structured data
                llm_extraction_result = await extract_id_info_with_gemini(full_document_text)
                
                # Populate the response variables with data obtained from Gemini's output
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

        # Prepare LlamaParse results for frontend response.
        # These lines explicitly convert LlamaIndex TextNode and ImageDocument objects
        # into standard Python dictionaries that FastAPI can easily serialize into JSON.
        response_text_nodes = [
            {"text": node.text, "metadata": node.metadata}
            for node in processing_result["text_nodes"]
        ]
        
        response_image_documents = [
            # For ImageDocument, 'image_path' is the local file path on the backend server.
            # The frontend will need to call /get_extracted_image to retrieve the actual image content.
            {"image_path": doc.image_path, "metadata": doc.metadata}
            for doc in processing_result["image_documents"]
        ]

        # Construct the final JSON response sent to the frontend
        return JSONResponse(content={
            "message": "Document processed successfully and information extracted with Gemini.",
            "original_filename": file.filename,
            "processed_file_path": final_pdf_to_process, # Path to the PDF that was processed (on backend)
            "raw_llamaparse_json": processing_result["raw_llamaparse_json"],
            "extracted_text_nodes": response_text_nodes,
            "extracted_image_documents": response_image_documents,
            "extracted_id_info": { # This object will contain Name, DOB, Age extracted by Gemini
                "name": extracted_name,
                "dob": extracted_dob,
                "age": predicted_age,
                "llm_error": llm_extraction_error # Provides any error/warning from the LLM extraction step
            }
        })

    except HTTPException as http_exc:
        # Re-raise FastAPI HTTP exceptions directly
        raise http_exc

    except Exception as e:
        # Catch any unexpected server errors during the entire document processing flow
        print(f"An unexpected error occurred during document processing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected server error occurred during document processing: {str(e)}"
        )
    finally:
        # Clean up temporary files regardless of success or failure
        cleanup_paths = [original_upload_path]
        if converted_pdf_path:
            cleanup_paths.append(converted_pdf_path)
        processor_service.cleanup_temp_files(cleanup_paths)