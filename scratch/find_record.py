from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from dotenv import load_dotenv

load_dotenv('.env')

async def test():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'), tls=True, tlsAllowInvalidCertificates=True)
    db = client.hrms_db
    
    attn = await db.attendance.find_one({'checkIn': '16:09:05', 'checkOut': '16:34:46'})
    print(f"Attendance: {attn}")
    
    if attn:
        recovery = await db.time_recovery.find_one({'employee_id': attn.get('employeeId'), 'date': attn['date']})
        print(f"Recovery: {recovery}")

if __name__ == "__main__":
    asyncio.run(test())
