"""
AI Native Trust Infrastructure
Trust Validator

Chức năng:
- Tạo SHA-256 hash cho tài liệu
- Xác minh tính toàn vẹn của tài liệu
- Xác minh chữ ký RSA-PSS
- Kiểm tra Digital Identity
- Trả về Trust Status chuẩn hóa
"""

import hashlib
import base64
from datetime import datetime, timezone
from pathlib import Path

from cryptography.exceptions import InvalidSignature

from backend.crypto_engine import CryptoEngine


class TrustValidator:
    """
    AI Native Trust Validator.

    Lớp này chịu trách nhiệm xác minh:

    1. Document Integrity
    2. Document Hash
    3. Digital Signature
    4. Digital Identity
    5. Overall Trust Status
    """

    # ============================================================
    # SHA-256 DOCUMENT HASH
    # ============================================================

    @staticmethod
    def calculate_document_hash(document_bytes: bytes) -> str:
        """
        Tạo SHA-256 hash từ dữ liệu binary.

        Parameters
        ----------
        document_bytes : bytes
            Nội dung file hoặc tài liệu.

        Returns
        -------
        str
            SHA-256 hexadecimal hash.
        """

        return hashlib.sha256(
            document_bytes
        ).hexdigest()


    # ============================================================
    # VERIFY DOCUMENT INTEGRITY
    # ============================================================

    @staticmethod
    def verify_document_hash(
        document_bytes: bytes,
        expected_hash: str
    ) -> bool:
        """
        Kiểm tra tính toàn vẹn của tài liệu.

        So sánh SHA-256 hiện tại của tài liệu
        với hash được lưu khi ký.

        Returns
        -------
        bool

        True:
            Tài liệu không bị thay đổi.

        False:
            Tài liệu đã bị thay đổi hoặc hash không khớp.
        """

        actual_hash = (
            TrustValidator.calculate_document_hash(
                document_bytes
            )
        )

        return actual_hash == expected_hash


    # ============================================================
    # VERIFY RSA SIGNATURE
    # ============================================================

    @staticmethod
    def verify_rsa_signature(
        public_key,
        data: str,
        signature_base64: str
    ) -> bool:
        """
        Xác minh chữ ký RSA-PSS-SHA256.

        Parameters
        ----------
        public_key :
            RSA public key.

        data : str
            Dữ liệu gốc đã được ký.

        signature_base64 : str
            Chữ ký dưới dạng Base64.

        Returns
        -------
        bool
            True nếu chữ ký hợp lệ.
            False nếu chữ ký không hợp lệ.
        """

        try:

            signature_bytes = (
                base64.b64decode(
                    signature_base64
                )
            )

            return (
                CryptoEngine.verify_signature(
                    public_key,
                    data,
                    signature_bytes
                )
            )

        except Exception:

            return False


    # ============================================================
    # LOAD PUBLIC KEY
    # ============================================================

    @staticmethod
    def load_identity_public_key(
        identity_id: str,
        keys_directory: Path
    ):
        """
        Tải Public Key của Digital Identity.

        Cấu trúc:

        data/
        └── keys/
            └── <identity_id>/
                └── public_key.pem
        """

        public_key_file = (
            Path(keys_directory)
            / identity_id
            / "public_key.pem"
        )

        if not public_key_file.exists():

            return None

        try:

            public_key = (
                CryptoEngine.load_public_key(
                    public_key_file
                )
            )

            return public_key

        except Exception:

            return None


    # ============================================================
    # VERIFY DIGITAL SIGNATURE
    # ============================================================

    @staticmethod
    def verify_signature(
        identity_id: str,
        document_hash: str,
        signature_base64: str,
        keys_directory: Path
    ) -> dict:
        """
        Xác minh Digital Signature.

        Quy trình:

        Identity ID
            ↓
        Load Public Key
            ↓
        Decode Base64 Signature
            ↓
        RSA-PSS Verification
            ↓
        VALID / INVALID
        """

        public_key = (
            TrustValidator.load_identity_public_key(
                identity_id,
                keys_directory
            )
        )

        if public_key is None:

            return {
                "valid": False,
                "status": "PUBLIC_KEY_NOT_FOUND",
                "message": (
                    "Public key for this identity "
                    "was not found."
                )
            }

        is_valid = (
            TrustValidator.verify_rsa_signature(
                public_key,
                document_hash,
                signature_base64
            )
        )

        if is_valid:

            return {
                "valid": True,
                "status": "SIGNATURE_VALID",
                "message": (
                    "Digital signature is cryptographically valid."
                )
            }

        return {
            "valid": False,
            "status": "SIGNATURE_INVALID",
            "message": (
                "Digital signature verification failed."
            )
        }


    # ============================================================
    # FULL TRUST VALIDATION
    # ============================================================

    @staticmethod
    def validate_document(
        document_bytes: bytes,
        identity_id: str,
        expected_hash: str,
        signature_base64: str,
        keys_directory: Path
    ) -> dict:
        """
        Xác minh toàn bộ AI-Native Trust Record.

        Kiểm tra:

        1. Document Integrity
        2. SHA-256 Hash
        3. Public Key
        4. RSA Digital Signature
        5. Overall Trust Status
        """

        validation_time = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )

        # --------------------------------------------------------
        # STEP 1
        # CALCULATE CURRENT DOCUMENT HASH
        # --------------------------------------------------------

        actual_hash = (
            TrustValidator.calculate_document_hash(
                document_bytes
            )
        )

        # --------------------------------------------------------
        # STEP 2
        # VERIFY DOCUMENT INTEGRITY
        # --------------------------------------------------------

        hash_valid = (
            actual_hash == expected_hash
        )

        # --------------------------------------------------------
        # STEP 3
        # VERIFY DIGITAL SIGNATURE
        # --------------------------------------------------------

        signature_result = (
            TrustValidator.verify_signature(
                identity_id=identity_id,
                document_hash=expected_hash,
                signature_base64=signature_base64,
                keys_directory=keys_directory
            )
        )

        signature_valid = (
            signature_result["valid"]
        )

        # --------------------------------------------------------
        # STEP 4
        # DETERMINE TRUST STATUS
        # --------------------------------------------------------

        if hash_valid and signature_valid:

            trust_status = "TRUSTED"

            trust_level = "VERIFIED"

            message = (
                "Document integrity and digital signature "
                "have been successfully verified."
            )

        elif not hash_valid:

            trust_status = "UNTRUSTED"

            trust_level = "DOCUMENT_MODIFIED"

            message = (
                "Document hash does not match the original "
                "signed document. The document may have been modified."
            )

        elif not signature_valid:

            trust_status = "UNTRUSTED"

            trust_level = "SIGNATURE_INVALID"

            message = (
                "Document signature could not be verified."
            )

        else:

            trust_status = "UNKNOWN"

            trust_level = "UNKNOWN"

            message = (
                "Unable to determine document trust status."
            )

        # --------------------------------------------------------
        # RETURN TRUST REPORT
        # --------------------------------------------------------

        return {

            "status": trust_status,

            "trust_level": trust_level,

            "message": message,

            "identity_id": identity_id,

            "document": {

                "expected_hash": expected_hash,

                "actual_hash": actual_hash,

                "hash_valid": hash_valid
            },

            "signature": {

                "valid": signature_valid,

                "verification_status":
                    signature_result["status"],

                "message":
                    signature_result["message"],

                "algorithm":
                    "RSA-PSS-SHA256"
            },

            "validated_at": validation_time
        }


    # ============================================================
    # SIMPLE TRUST STATUS
    # ============================================================

    @staticmethod
    def get_trust_status(
        hash_valid: bool,
        signature_valid: bool
    ) -> str:
        """
        Trả về Trust Status đơn giản.

        TRUSTED
            Hash đúng + Signature đúng.

        COMPROMISED
            Hash sai.

        INVALID_SIGNATURE
            Signature sai.

        UNKNOWN
            Không xác định.
        """

        if hash_valid and signature_valid:

            return "TRUSTED"

        if not hash_valid:

            return "COMPROMISED"

        if not signature_valid:

            return "INVALID_SIGNATURE"

        return "UNKNOWN"