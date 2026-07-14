import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_otp_email(to_email: str, otp: str):
    """
    Sends a 6-digit OTP to the user's email address.
    Reads SMTP settings from environment variables.
    If SMTP settings are missing, logs the OTP for debugging.
    """
    smtp_server = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")

    if not smtp_user or not smtp_pass:
        print(f"\n[WARNING] SMTP credentials not configured.")
        print(f"--- MOCK EMAIL ---")
        print(f"To: {to_email}")
        print(f"OTP: {otp}")
        print(f"------------------\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = f"HK DigiVerse <{smtp_user}>"
        msg['To'] = to_email
        msg['Subject'] = "Your Login OTP - HK DigiVerse"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #0d9488; text-align: center;">HK DigiVerse Login</h2>
                <p>Hello,</p>
                <p>Your One-Time Password (OTP) for login is:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; background: #f8fafc; padding: 15px 30px; border-radius: 8px; border: 1px dashed #cbd5e1;">
                        {otp}
                    </span>
                </div>
                <p>This OTP is valid for 5 minutes. Please do not share it with anyone.</p>
                <p>If you did not request this, please ignore this email.</p>
                <br/>
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                    &copy; HK DigiVerse. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Error sending OTP email: {e}")
        # Even if email fails, we don't want to completely crash if it's a dev environment.
        # But we should log it.
        return False
