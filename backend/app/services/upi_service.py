import urllib.parse
import io
import base64
import random
import datetime
import qrcode
from app.config import settings

class UPIService:
    @staticmethod
    def generate_upi_uri(
        vpa: str,
        payee_name: str,
        amount: float,
        transaction_note: str,
        transaction_ref: str
    ) -> str:
        """
        Generate standard NPCI UPI payment deep link URL.
        Format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...&tr=...
        """
        clean_vpa = vpa.strip() if vpa else settings.DEFAULT_UPI_ID
        clean_name = payee_name.strip() if payee_name else settings.DEFAULT_UPI_NAME
        clean_amount = f"{amount:.2f}"
        
        params = {
            "pa": clean_vpa,
            "pn": clean_name,
            "am": clean_amount,
            "cu": "INR",
            "tn": transaction_note[:40],
            "tr": transaction_ref
        }
        query_string = urllib.parse.urlencode(params)
        return f"upi://pay?{query_string}"

    @staticmethod
    def generate_qr_code_base64(upi_uri: str) -> str:
        """
        Generate a QR code image as a base64-encoded PNG data URL.
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=3,
        )
        qr.add_data(upi_uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_str}"

    @staticmethod
    def generate_upi_txn_ref() -> str:
        """
        Generate realistic Indian UPI 12-digit Bank RRN (Retrieval Reference Number).
        e.g., UPI/427618920194
        """
        rrn = "".join([str(random.randint(0, 9)) for _ in range(12)])
        return f"UPI/{rrn}"

    @staticmethod
    def generate_payment_reference(sub_id: int, obligation_id: int) -> str:
        now = datetime.datetime.utcnow().strftime("%Y%m")
        rand = random.randint(1000, 9999)
        return f"SUB-{now}-{sub_id:03d}-{obligation_id:04d}-{rand}"
