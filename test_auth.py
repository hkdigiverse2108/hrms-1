from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
try:
    print(pwd_context.verify('Admin@123', 'Admin@123'))
except Exception as e:
    print("Error:", e)
