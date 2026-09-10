"""
AI Native Trust Infrastructure
Cryptographic Engine

Chức năng:
- Tạo khóa RSA
- Lưu khóa
- Tải khóa
- Tạo SHA-256 hash
- Ký dữ liệu bằng RSA-PSS
- Xác minh chữ ký RSA-PSS
"""

import hashlib
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.exceptions import InvalidSignature


class CryptoEngine:

    @staticmethod
    def generate_key_pair():
        """
        Tạo cặp khóa RSA 3072-bit.
        """

        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=3072
        )

        public_key = private_key.public_key()

        return private_key, public_key


    @staticmethod
    def save_private_key(private_key, filename):
        """
        Lưu private key dưới định dạng PEM.
        """

        pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )

        with open(filename, "wb") as f:
            f.write(pem)


    @staticmethod
    def save_public_key(public_key, filename):
        """
        Lưu public key dưới định dạng PEM.
        """

        pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

        with open(filename, "wb") as f:
            f.write(pem)


    @staticmethod
    def load_private_key(filename):
        """
        Đọc private key từ file PEM.
        """

        with open(filename, "rb") as f:
            private_key = serialization.load_pem_private_key(
                f.read(),
                password=None
            )

        return private_key


    @staticmethod
    def load_public_key(filename):
        """
        Đọc public key từ file PEM.
        """

        with open(filename, "rb") as f:
            public_key = serialization.load_pem_public_key(
                f.read()
            )

        return public_key


    @staticmethod
    def hash_data(data: str):
        """
        Tạo SHA-256 hash.
        """

        return hashlib.sha256(
            data.encode("utf-8")
        ).hexdigest()


    @staticmethod
    def sign_data(private_key, data: str):
        """
        Ký dữ liệu bằng RSA-PSS + SHA-256.
        """

        signature = private_key.sign(
            data.encode("utf-8"),
            padding.PSS(
                mgf=padding.MGF1(
                    hashes.SHA256()
                ),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )

        return signature


    @staticmethod
    def verify_signature(public_key, data: str, signature: bytes):
        """
        Xác minh chữ ký số.

        Trả về:
        True  -> chữ ký hợp lệ
        False -> chữ ký không hợp lệ
        """

        try:

            public_key.verify(
                signature,
                data.encode("utf-8"),
                padding.PSS(
                    mgf=padding.MGF1(
                        hashes.SHA256()
                    ),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )

            return True

        except InvalidSignature:

            return False
