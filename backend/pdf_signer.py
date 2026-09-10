"""
AI Native Trust Infrastructure
PDF Signature Engine

Chức năng:
- Tạo chứng thư số tự ký (self-signed certificate)
- Sử dụng RSA Private Key
- Ký PDF bằng chữ ký số thực
- Tạo visible digital signature
- Nhúng chữ ký vào PDF
- Xuất Signed PDF
"""

import os
import datetime
from pathlib import Path

from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization

from pyhanko.sign import signers
from pyhanko.sign import fields
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter


class PDFSigner:
    """
    PDF Digital Signature Engine.

    Kiến trúc:

        RSA Private Key
                │
                ▼
        X.509 Certificate
                │
                ▼
          pyHanko Signer
                │
                ▼
        PDF Digital Signature
                │
                ▼
        Visible Signature Field
                │
                ▼
          Signed PDF
    """

    # ========================================================
    # CREATE SELF-SIGNED CERTIFICATE
    # ========================================================

    @staticmethod
    def ensure_certificate(
        private_key_path: str,
        certificate_path: str,
        common_name: str,
        email: str = None,
        organization: str = "AI Native Trust Infrastructure"
    ):
        """
        Tạo Self-Signed X.509 Certificate nếu chưa tồn tại.
        """

        certificate_file = Path(
            certificate_path
        )

        # ----------------------------------------------------
        # Certificate đã tồn tại
        # ----------------------------------------------------

        if certificate_file.exists():

            return certificate_path

        # ----------------------------------------------------
        # Load private key
        # ----------------------------------------------------

        with open(
            private_key_path,
            "rb"
        ) as f:

            private_key = (
                serialization.load_pem_private_key(
                    f.read(),
                    password=None
                )
            )

        # ----------------------------------------------------
        # Certificate subject
        # ----------------------------------------------------

        name_attributes = [

            x509.NameAttribute(
                NameOID.COUNTRY_NAME,
                "VN"
            ),

            x509.NameAttribute(
                NameOID.ORGANIZATION_NAME,
                organization
            ),

            x509.NameAttribute(
                NameOID.COMMON_NAME,
                common_name
            )
        ]

        if email:

            name_attributes.append(
                x509.NameAttribute(
                    NameOID.EMAIL_ADDRESS,
                    email
                )
            )

        subject = issuer = x509.Name(
            name_attributes
        )

        # ----------------------------------------------------
        # Validity period
        # ----------------------------------------------------

        now = datetime.datetime.now(
            datetime.timezone.utc
        )

        certificate = (

            x509.CertificateBuilder()

            .subject_name(
                subject
            )

            .issuer_name(
                issuer
            )

            .public_key(
                private_key.public_key()
            )

            .serial_number(
                x509.random_serial_number()
            )

            .not_valid_before(
                now
            )

            .not_valid_after(
                now + datetime.timedelta(
                    days=3650
                )
            )

            .add_extension(
                x509.BasicConstraints(
                    ca=False,
                    path_length=None
                ),
                critical=True
            )

            .sign(
                private_key,
                hashes.SHA256()
            )
        )

        # ----------------------------------------------------
        # Create directory
        # ----------------------------------------------------

        certificate_file.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        # ----------------------------------------------------
        # Save certificate
        # ----------------------------------------------------

        with open(
            certificate_path,
            "wb"
        ) as f:

            f.write(
                certificate.public_bytes(
                    serialization.Encoding.PEM
                )
            )

        return certificate_path


    # ========================================================
    # SIGN PDF
    # ========================================================

    @staticmethod
    def sign_pdf(
        input_pdf_path: str,
        output_pdf_path: str,
        private_key_path: str,
        certificate_path: str,
        signer_name: str = "AI Native Trust Identity",
        reason: str = (
            "AI Native Trust Infrastructure "
            "Digital Signature"
        ),
        location: str = "Vietnam"
    ):
        """
        Ký PDF bằng RSA + SHA-256.

        Đồng thời tạo visible signature field
        trên trang đầu tiên của PDF.
        """

        # ----------------------------------------------------
        # CHECK INPUT PDF
        # ----------------------------------------------------

        if not os.path.exists(
            input_pdf_path
        ):

            raise FileNotFoundError(
                f"Input PDF not found: "
                f"{input_pdf_path}"
            )

        # ----------------------------------------------------
        # CHECK PRIVATE KEY
        # ----------------------------------------------------

        if not os.path.exists(
            private_key_path
        ):

            raise FileNotFoundError(
                f"Private key not found: "
                f"{private_key_path}"
            )

        # ----------------------------------------------------
        # CHECK CERTIFICATE
        # ----------------------------------------------------

        if not os.path.exists(
            certificate_path
        ):

            raise FileNotFoundError(
                f"Certificate not found: "
                f"{certificate_path}"
            )

        # ----------------------------------------------------
        # CREATE OUTPUT DIRECTORY
        # ----------------------------------------------------

        output_directory = (
            os.path.dirname(
                output_pdf_path
            )
        )

        if output_directory:

            os.makedirs(
                output_directory,
                exist_ok=True
            )

        # ====================================================
        # LOAD RSA SIGNER
        # ====================================================

        signer = signers.SimpleSigner.load(
            key_file=private_key_path,
            cert_file=certificate_path
        )

        if signer is None:

            raise RuntimeError(
                "Unable to load PDF signer."
            )

        # ====================================================
        # SIGNATURE METADATA
        # ====================================================

        signature_metadata = (
            signers.PdfSignatureMetadata(

                field_name=(
                    "AI_NATIVE_TRUST_SIGNATURE"
                ),

                reason=reason,

                location=location,

                name=signer_name
            )
        )

        # ====================================================
        # OPEN ORIGINAL PDF
        # ====================================================

        with open(
            input_pdf_path,
            "rb"
        ) as input_file:

            writer = IncrementalPdfFileWriter(
                input_file
            )

            # =================================================
            # VISIBLE SIGNATURE FIELD
            # =================================================
            #
            # Coordinates:
            #
            # x1 = 360
            # y1 = 40
            # x2 = 560
            # y2 = 120
            #
            # Đây là vùng ở góc dưới bên phải
            # của trang đầu tiên.
            #
            # =================================================

            new_field_spec = fields.SigFieldSpec(

                sig_field_name=(
                    "AI_NATIVE_TRUST_SIGNATURE"
                ),

                on_page=0,

                box=(
                    360,
                    40,
                    560,
                    120
                )
            )

            # =================================================
            # CREATE PDF SIGNER
            # =================================================

            pdf_signer = signers.PdfSigner(

                signature_meta=(
                    signature_metadata
                ),

                signer=signer,

                new_field_spec=(
                    new_field_spec
                )
            )

            # =================================================
            # SIGN PDF
            # =================================================

            with open(
                output_pdf_path,
                "wb"
            ) as output_file:

                pdf_signer.sign_pdf(
                    writer,
                    output=output_file
                )

        # ====================================================
        # VERIFY OUTPUT
        # ====================================================

        if not os.path.exists(
            output_pdf_path
        ):

            raise RuntimeError(
                "Signed PDF was not created."
            )

        output_size = os.path.getsize(
            output_pdf_path
        )

        if output_size == 0:

            raise RuntimeError(
                "Signed PDF is empty."
            )

        # ====================================================
        # RETURN RESULT
        # ====================================================

        return {

            "success": True,

            "message": (
                "PDF digitally signed successfully"
            ),

            "input_file": (
                input_pdf_path
            ),

            "output_file": (
                output_pdf_path
            ),

            "algorithm": (
                "RSA-PSS + SHA-256"
            ),

            "visible_signature": True,

            "signature_field": (
                "AI_NATIVE_TRUST_SIGNATURE"
            )
        }


    # ========================================================
    # CREATE CERTIFICATE FOR DIGITAL IDENTITY
    # ========================================================

    @staticmethod
    def create_certificate_for_identity(
        private_key_path: str,
        certificate_path: str,
        identity_name: str,
        identity_email: str,
        organization: str
    ):
        """
        Tạo certificate cho Digital Identity.
        """

        return PDFSigner.ensure_certificate(

            private_key_path=(
                private_key_path
            ),

            certificate_path=(
                certificate_path
            ),

            common_name=(
                identity_name
            ),

            email=(
                identity_email
            ),

            organization=(
                organization
            )
        )