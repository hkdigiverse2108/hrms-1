import motor.motor_asyncio
import asyncio
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
MONGO_URL = os.getenv("MONGO_URL")

async def seed():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL, tls=True, tlsAllowInvalidCertificates=True)
    db = client.hrms_db
    
    payroll_data = {
        "employeeId": "69eeffae3733750b1fd1fec5",
        "employeeName": "Janvii Vasani",
        "month": "April",
        "year": 2026,
        "totalWorkingDays": 30,
        "workedDays": 30,
        "leaveDays": 0,
        "lopDays": 0,
        "basicSalary": 25000,
        "allowances": 2000,
        "bonus": 1000,
        "deductions": 500,
        "penalty": 0,
        "netSalary": 27500,
        "status": "processed",
        "deductionRemarks": "April Monthly Salary"
    }
    
    await db.payroll.update_one(
        {"employeeId": "69eeffae3733750b1fd1fec5", "month": "April", "year": 2026},
        {"$set": payroll_data},
        upsert=True
    )
    print("April payslip for Janvii Vasani seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed())
