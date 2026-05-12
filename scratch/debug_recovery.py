from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from dotenv import load_dotenv

load_dotenv('.env')

async def test():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'), tls=True, tlsAllowInvalidCertificates=True)
    db = client.hrms_db
    
    # Check Janvii's attendance
    # The screenshot shows ID 69eeffae3733750b1fd1fec5
    attn = await db.attendance.find_one({'employeeId': '69eeffae3733750b1fd1fec5', 'date': '2026-05-12'})
    print(f"Attendance: {attn}")
    
    # Check recovery request
    recovery = await db.time_recovery.find_one({'employee_id': '69eeffae3733750b1fd1fec5', 'date': '2026-05-12'})
    print(f"Recovery: {recovery}")

if __name__ == "__main__":
    asyncio.run(test())
