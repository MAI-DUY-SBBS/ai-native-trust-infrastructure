"""
AI Native Trust Infrastructure
Backend API

Chức năng:
- Digital Identity Management
- RSA Key Management
- Text Digital Signature
- PDF Digital Signature
- X.509 Certificate Generation
- Cryptographic Verification Foundation
"""

import asyncio
import base64
import hashlib
import json
import uuid
import tempfile

from pathlib import Path
from datetime import datetime, timezone

from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    File
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from backend.crypto_engine import CryptoEngine
from backend.pdf_signer import PDFSigner


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="AI Native Trust Infrastructure API",
    version="0.2.0",
    description=(
        "Backend API for AI Native Trust Infrastructure "
        "with Digital Identity, RSA Cryptography and PDF Signing"
    )
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-AI-Native-Identity",
        "X-AI-Native-Document-Hash",
        "X-AI-Native-Algorithm",
        "X-AI-Native-Signed-At"
    ]
)


# ============================================================
# DATA DIRECTORIES
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"

IDENTITIES_DIR = DATA_DIR / "identities"

KEYS_DIR = DATA_DIR / "keys"

CERTIFICATES_DIR = DATA_DIR / "certificates"

SIGNED_DOCUMENTS_DIR = DATA_DIR / "signed_documents"

TRUST_REGISTRY_DIR = DATA_DIR / "trust_registry"


IDENTITIES_DIR.mkdir(
    parents=True,
    exist_ok=True
)

KEYS_DIR.mkdir(
    parents=True,
    exist_ok=True
)

CERTIFICATES_DIR.mkdir(
    parents=True,
    exist_ok=True
)

SIGNED_DOCUMENTS_DIR.mkdir(
    parents=True,
    exist_ok=True
)

TRUST_REGISTRY_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return FileResponse(BASE_DIR / "main.html")


@app.get("/main.js")
def main_js():
    return FileResponse(
        BASE_DIR / "main.js",
        media_type="application/javascript"
    )


@app.get("/styles.css")
def styles_css():
    return FileResponse(
        BASE_DIR / "styles.css",
        media_type="text/css"
    )


# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health_check():

    return {
        "status": "healthy",
        "system": "AI Native Trust Infrastructure",
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat()
    }


# ============================================================
# CREATE IDENTITY
# ============================================================

@app.post("/api/identities")
def create_identity(
    name: str,
    email: str,
    organization: str
):

    identity_id = str(
        uuid.uuid4()
    )

    identity = {
        "id": identity_id,
        "name": name,
        "email": email,
        "organization": organization,
        "created_at": datetime.now(
            timezone.utc
        ).isoformat()
    }

    identity_file = (
        IDENTITIES_DIR
        / f"{identity_id}.json"
    )

    with open(
        identity_file,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            identity,
            f,
            ensure_ascii=False,
            indent=4
        )

    return {
        "status": "success",
        "message": (
            "Identity created successfully"
        ),
        "identity": identity
    }


# ============================================================
# LIST IDENTITIES
# ============================================================

@app.get("/api/identities")
def list_identities():

    identities = []

    for file in IDENTITIES_DIR.glob("*.json"):

        try:

            with open(
                file,
                "r",
                encoding="utf-8"
            ) as f:

                identities.append(
                    json.load(f)
                )

        except Exception:

            continue

    return identities


# ============================================================
# GET IDENTITY
# ============================================================

@app.get("/api/identities/{identity_id}")
def get_identity(identity_id: str):

    identity_file = (
        IDENTITIES_DIR
        / f"{identity_id}.json"
    )

    if not identity_file.exists():

        raise HTTPException(
            status_code=404,
            detail="Identity not found"
        )

    with open(
        identity_file,
        "r",
        encoding="utf-8"
    ) as f:

        identity = json.load(f)

    return identity


# ============================================================
# DELETE IDENTITY
# ============================================================

@app.delete("/api/identities/{identity_id}")
def delete_identity(identity_id: str):

    identity_file = (
        IDENTITIES_DIR
        / f"{identity_id}.json"
    )

    if not identity_file.exists():

        raise HTTPException(
            status_code=404,
            detail="Identity not found"
        )

    identity_file.unlink()

    return {
        "status": "success",
        "message": (
            "Identity deleted successfully"
        ),
        "identity_id": identity_id
    }


# ============================================================
# GENERATE RSA KEY PAIR
# ============================================================

@app.post("/api/identities/{identity_id}/keys")
def generate_key_pair(identity_id: str):

    identity_file = (
        IDENTITIES_DIR
        / f"{identity_id}.json"
    )

    if not identity_file.exists():

        raise HTTPException(
            status_code=404,
            detail="Identity not found"
        )

    private_key_file = (
        KEYS_DIR
        / identity_id
        / "private_key.pem"
    )

    public_key_file = (
        KEYS_DIR
        / identity_id
        / "public_key.pem"
    )

    # Nếu key đã tồn tại thì không tạo lại

    if (
        private_key_file.exists()
        and public_key_file.exists()
    ):

        return {
            "status": "success",
            "message": (
                "RSA key pair already exists"
            ),
            "key": {
                "identity_id": identity_id,
                "algorithm": "RSA",
                "key_size": 3072
            }
        }

    # Generate RSA key pair

    private_key, public_key = (
        CryptoEngine.generate_key_pair()
    )

    identity_keys_dir = (
        KEYS_DIR
        / identity_id
    )

    identity_keys_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    CryptoEngine.save_private_key(
        private_key,
        private_key_file
    )

    CryptoEngine.save_public_key(
        public_key,
        public_key_file
    )

    return {
        "status": "success",
        "message": (
            "RSA key pair generated successfully"
        ),
        "key": {
            "identity_id": identity_id,
            "algorithm": "RSA",
            "key_size": 3072
        }
    }


# ============================================================
# SIGN TEXT DATA
# ============================================================

@app.post("/api/identities/{identity_id}/sign")
def sign_data(
    identity_id: str,
    message: str
):

    identity_file = (
        IDENTITIES_DIR
        / f"{identity_id}.json"
    )

    if not identity_file.exists():

        raise HTTPException(
            status_code=404,
            detail="Identity not found"
        )

    private_key_file = (
        KEYS_DIR
        / identity_id
        / "private_key.pem"
    )

    if not private_key_file.exists():

        raise HTTPException(
            status_code=404,
            detail="Private key not found"
        )

    private_key = (
        CryptoEngine.load_private_key(
            private_key_file
        )
    )

    signature = (
        CryptoEngine.sign_data(
            private_key,
            message
        )
    )

    signature_base64 = (
        base64.b64encode(
            signature
        ).decode("utf-8")
    )

    message_hash = (
        CryptoEngine.hash_data(
            message
        )
    )

    return {
        "status": "success",
        "message": (
            "Data signed successfully"
        ),
        "identity_id": identity_id,
        "original_message": message,
        "message_hash": message_hash,
        "signature": signature_base64,
        "algorithm": "RSA-PSS-SHA256",
        "signed_at": datetime.now(
            timezone.utc
        ).isoformat()
    }


# ============================================================
# VERIFY TEXT DIGITAL SIGNATURE
# ============================================================

@app.post("/api/identities/{identity_id}/verify")
def verify_signature(
    identity_id: str,
    message: str,
    signature: str
):

    identity_file = (
        IDENTITIES_DIR
        / f"{identity_id}.json"
    )

    if not identity_file.exists():

        raise HTTPException(
            status_code=404,
            detail="Identity not found"
        )

    public_key_file = (
        KEYS_DIR
        / identity_id
        / "public_key.pem"
    )

    if not public_key_file.exists():

        raise HTTPException(
            status_code=404,
            detail="Public key not found"
        )

    try:

        signature_bytes = (
            base64.b64decode(
                signature
            )
        )

    except Exception:

        raise HTTPException(
            status_code=400,
            detail="Invalid Base64 signature"
        )

    public_key = (
        CryptoEngine.load_public_key(
            public_key_file
        )
    )

    is_valid = (
        CryptoEngine.verify_signature(
            public_key,
            message,
            signature_bytes
        )
    )

    return {
        "status": (
            "valid"
            if is_valid
            else "invalid"
        ),
        "identity_id": identity_id,
        "message": message,
        "signature_valid": is_valid,
        "algorithm": "RSA-PSS-SHA256",
        "verified_at": datetime.now(
            timezone.utc
        ).isoformat()
    }


# ============================================================
# PDF DIGITAL SIGNATURE
# ============================================================

@app.post(
    "/api/identities/{identity_id}/sign-pdf"
)
async def sign_pdf_document(
    identity_id: str,
    file: UploadFile = File(...)
):

    # --------------------------------------------------------
    # VALIDATE IDENTITY
    # --------------------------------------------------------

    identity_file = (
        IDENTITIES_DIR
        / f"{identity_id}.json"
    )

    if not identity_file.exists():

        raise HTTPException(
            status_code=404,
            detail="Identity not found"
        )

    with open(
        identity_file,
        "r",
        encoding="utf-8"
    ) as f:

        identity = json.load(f)


    # --------------------------------------------------------
    # VALIDATE PDF
    # --------------------------------------------------------

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file uploaded"
        )

    if not file.filename.lower().endswith(
        ".pdf"
    ):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )


    # --------------------------------------------------------
    # CHECK RSA PRIVATE KEY
    # --------------------------------------------------------

    private_key_file = (
        KEYS_DIR
        / identity_id
        / "private_key.pem"
    )

    public_key_file = (
        KEYS_DIR
        / identity_id
        / "public_key.pem"
    )

    if not private_key_file.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "Private key not found. "
                "Generate RSA keys first."
            )
        )


    # --------------------------------------------------------
    # CREATE CERTIFICATE IF NECESSARY
    # --------------------------------------------------------

    certificate_dir = (
        CERTIFICATES_DIR
        / identity_id
    )

    certificate_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    certificate_file = (
        certificate_dir
        / "certificate.pem"
    )

    try:

        PDFSigner.create_certificate_for_identity(

            private_key_path=str(
                private_key_file
            ),

            certificate_path=str(
                certificate_file
            ),

            identity_name=identity.get(
                "name",
                "AI Native Trust Identity"
            ),

            identity_email=identity.get(
                "email",
                ""
            ),

            organization=identity.get(
                "organization",
                "AI Native Trust Infrastructure"
            )
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Certificate creation failed: "
                f"{str(error)}"
            )
        )


    # --------------------------------------------------------
    # READ ORIGINAL PDF
    # --------------------------------------------------------

    try:

        pdf_bytes = await file.read()

    except Exception:

        raise HTTPException(
            status_code=400,
            detail="Unable to read uploaded file"
        )


    if len(pdf_bytes) == 0:

        raise HTTPException(
            status_code=400,
            detail="Uploaded PDF is empty"
        )


    # --------------------------------------------------------
    # ORIGINAL DOCUMENT HASH
    # --------------------------------------------------------

    document_hash = hashlib.sha256(
        pdf_bytes
    ).hexdigest()


    # --------------------------------------------------------
    # CREATE TEMPORARY FILES
    # --------------------------------------------------------

    temp_dir = Path(
        tempfile.mkdtemp(
            prefix="ai_native_trust_"
        )
    )

    input_pdf_path = (
        temp_dir
        / "input.pdf"
    )

    output_pdf_path = (
        temp_dir
        / "signed_output.pdf"
    )


    try:

        # ----------------------------------------------------
        # SAVE UPLOADED PDF TEMPORARILY
        # ----------------------------------------------------

        with open(
            input_pdf_path,
            "wb"
        ) as f:

            f.write(pdf_bytes)


        # ----------------------------------------------------
        # SIGN PDF CRYPTOGRAPHICALLY
        #
        # IMPORTANT:
        # PDFSigner / pyHanko may internally use asyncio.run().
        #
        # FastAPI is already running an asyncio event loop.
        #
        # Therefore we MUST execute PDFSigner.sign_pdf()
        # inside a separate worker thread.
        # ----------------------------------------------------

        signing_result = await asyncio.to_thread(

            PDFSigner.sign_pdf,

            input_pdf_path=str(
                input_pdf_path
            ),

            output_pdf_path=str(
                output_pdf_path
            ),

            private_key_path=str(
                private_key_file
            ),

            certificate_path=str(
                certificate_file
            ),

            signer_name=identity.get(
                "name",
                "AI Native Trust Identity"
            ),

            reason=(
                "AI Native Trust Infrastructure "
                "Digital Signature"
            ),

            location="Vietnam"
        )


    except Exception as error:

        # Xóa file tạm nếu có lỗi

        import shutil

        shutil.rmtree(
            temp_dir,
            ignore_errors=True
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "PDF signing failed: "
                f"{str(error)}"
            )
        )


    # --------------------------------------------------------
    # VERIFY OUTPUT FILE EXISTS
    # --------------------------------------------------------

    if not output_pdf_path.exists():

        import shutil

        shutil.rmtree(
            temp_dir,
            ignore_errors=True
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "PDF signing failed: "
                "Signed PDF output was not created."
            )
        )


    # --------------------------------------------------------
    # CREATE TRUST RECORD
    # --------------------------------------------------------

    signed_at = datetime.now(
        timezone.utc
    ).isoformat()

    trust_record = {

        "trust_id": str(
            uuid.uuid4()
        ),

        "identity_id": identity_id,

        "signer_name": identity.get(
            "name"
        ),

        "document_name": file.filename,

        "original_document_hash": document_hash,

        "algorithm": "RSA-SHA256",

        "certificate": str(
            certificate_file
        ),

        "signed_at": signed_at,

        "status": "SIGNED"
    }


    trust_record_file = (
        TRUST_REGISTRY_DIR
        / f"{document_hash}.json"
    )


    try:

        with open(
            trust_record_file,
            "w",
            encoding="utf-8"
        ) as f:

            json.dump(
                trust_record,
                f,
                ensure_ascii=False,
                indent=4
            )

    except Exception:

        pass


    # --------------------------------------------------------
    # RESPONSE HEADERS
    # --------------------------------------------------------

    response_headers = {

        "X-AI-Native-Identity":
            identity_id,

        "X-AI-Native-Document-Hash":
            document_hash,

        "X-AI-Native-Algorithm":
            "RSA-SHA256",

        "X-AI-Native-Signed-At":
            signed_at
    }


    # --------------------------------------------------------
    # CLEANUP TEMP DIRECTORY AFTER DOWNLOAD
    # --------------------------------------------------------

    def cleanup_temp_files():

        import shutil

        shutil.rmtree(
            temp_dir,
            ignore_errors=True
        )


    # --------------------------------------------------------
    # RETURN SIGNED PDF
    # --------------------------------------------------------

    output_filename = (
        f"signed_{file.filename}"
    )


    return FileResponse(

        path=output_pdf_path,

        media_type="application/pdf",

        filename=output_filename,

        headers=response_headers,

        background=BackgroundTask(
            cleanup_temp_files
        )
    )