import motor.motor_asyncio
import asyncio
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
MONGO_URL = os.getenv("MONGO_URL")

async def check():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL, tls=True, tlsAllowInvalidCertificates=True)
    db = client.hrms_db
    cursor = db.payroll.find({'employeeName': {'$regex': 'Janvii', '$options': 'i'}})
    async for doc in cursor:
        print(f"Month: {doc.get('month')}, Year: {doc.get('year')}, Name: {doc.get('employeeName')}")

if __name__ == "__main__":
    asyncio.run(check())
