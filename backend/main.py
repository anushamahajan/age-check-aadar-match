import os
import shutil
import json
from typing import List, Dict, Any, Union

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv # To load environment variables from a .env file

# Import the DocumentProcessorService from the separate file
from services.document_processor_service import DocumentProcessorService

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
# Directory to temporarily store uploaded files before processing
UPLOADS_DIR = "./uploaded_files"
# Directory for DocumentProcessorService to store intermediate/extracted files
TEMP_PROCESSING_DIR = "./backend_temp_data"

# Ensure upload directory exists
os.makedirs(UPLOADS_DIR, exist_ok=True)
# The DocumentProcessorService will create TEMP_PROCESSING_DIR

# Get Llama Cloud API key from environment variable
LLAMA_CLOUD_API_KEY = os.getenv("LLAMA_CLOUD_API_KEY")

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Document Processing API with LlamaParse",
    description="API to convert images to PDF and extract text/images from documents using LlamaParse.",
    version="1.0.0"
)

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
# This function initializes the service and can be reused across endpoints.
# It ensures the API key is present before starting the service.
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

# --- API Endpoints ---

@app.get("/health", summary="Health Check", response_model=Dict[str, str])
async def health_check():
    """
    Returns a simple status message to indicate the API is running.
    """
    return {"status": "ok", "message": "Document Processing API is healthy."}

@app.post("/process_document", summary="Upload and Process Document", response_model=Dict[str, Any])
async def process_document_endpoint(
    file: UploadFile = File(...),
    processor_service: DocumentProcessorService = Depends(get_processor_service)
):
    """
    Uploads a document (PDF, PNG, JPEG), converts images to PDF if necessary,
    and then processes the document using LlamaParse to extract text and image data.

    Returns the raw LlamaParse JSON, extracted text nodes, and extracted image paths.
    """
    # 1. Save the uploaded file to a temporary location
    file_extension = os.path.splitext(file.filename)[1].lower()
    original_upload_path = os.path.join(UPLOADS_DIR, file.filename)
    
    # Generate a unique filename for the uploaded file to prevent conflicts
    unique_upload_filename = processor_service._generate_unique_filepath(file.filename, prefix="uploaded_")
    original_upload_path = unique_upload_filename

    try:
        with open(original_upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"Uploaded file saved to: {original_upload_path}")

        converted_pdf_path: Union[str, None] = None
        final_pdf_to_process: str = original_upload_path

        # 2. Determine if the file is an image and needs conversion
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

        # 3. Process the document (original PDF or converted image-PDF) with LlamaParse
        print(f"Initiating LlamaParse processing for: {final_pdf_to_process}")
        processing_result = processor_service.process_pdf_for_extraction(final_pdf_to_process)

        # Handle errors from the processing service
        if processing_result["error"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Document processing failed: {processing_result['error']}"
            )

        # 4. Prepare data for the frontend
        # Convert LlamaIndex TextNode and ImageDocument objects to JSON-serializable dictionaries
        response_text_nodes = [
            {"text": node.text, "metadata": node.metadata}
            for node in processing_result["text_nodes"]
        ]
        response_image_documents = [
            {"image_path": doc.image_path, "metadata": doc.metadata}
            for doc in processing_result["image_documents"]
        ]

        # 5. Return the structured JSON response
        return JSONResponse(content={
            "message": "Document processed successfully.",
            "original_filename": file.filename,
            "processed_file_path": final_pdf_to_process, # Path to the PDF that was processed
            "raw_llamaparse_json": processing_result["raw_llamaparse_json"],
            "extracted_text_nodes": response_text_nodes,
            "extracted_image_documents": response_image_documents,
            # Note: For security and performance, extracted_image_documents['image_path']
            # refers to a path on the backend server. You would need another endpoint
            # to serve these images if your frontend needs to display them directly.
        })

    except HTTPException as http_exc:
        raise http_exc

    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected server error occurred: {str(e)}"
        )
    finally:
        # 6. Clean up temporary files regardless of success or failure
        cleanup_paths = [original_upload_path]
        if converted_pdf_path:
            cleanup_paths.append(converted_pdf_path)

        processor_service.cleanup_temp_files(cleanup_paths)
