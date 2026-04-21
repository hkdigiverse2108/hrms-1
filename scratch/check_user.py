from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        print("MONGO_URL not found")
        return
    client = AsyncIOMotorClient(mongo_url)
    db = client.hrms_db
    employee = await db.employees.find_one()
    if employee:
        print(f"Test Email: {employee.get('email')}")
        print(f"Test Password: {employee.get('password')}")
    else:
        print("No employees found in database")

if __name__ == "__main__":
    asyncio.run(main())
