import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    MONGO_URL = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.hrms_db
    employees = await db.employees.find().to_list(length=10)
    for emp in employees:
        print(f"ID: {emp['_id']}, Name: {emp.get('firstName')} {emp.get('lastName')}, Role: {emp.get('role')}")

if __name__ == "__main__":
    asyncio.run(main())
