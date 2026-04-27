import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta

async def main():
    MONGO_URL = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.hrms_db
    
    # Clean existing leaves to start fresh as requested
    await db.leave_requests.delete_many({})
    
    leaves = [
        {
            "employee_id": "69eeffae3733750b1fd1fec5",
            "employee_name": "Janvi Vasani",
            "type": "Annual Leave",
            "start_date": "20-12-2026",
            "end_date": "25-12-2026",
            "duration": "5 Days",
            "reason": "Family vacation and end of year holidays.",
            "status": "Pending",
            "requested_on": datetime.now().strftime("%d-%m-%Y"),
            "half_day": False
        },
        {
            "employee_id": "69eeffae3733750b1fd1fec5",
            "employee_name": "Janvi Vasani",
            "type": "Sick Leave",
            "start_date": "15-11-2026",
            "end_date": "16-11-2026",
            "duration": "2 Days",
            "reason": "Feeling unwell, need some rest.",
            "status": "Approved",
            "requested_on": (datetime.now() - timedelta(days=5)).strftime("%d-%m-%Y"),
            "half_day": False
        },
        {
            "employee_id": "69eeffae3733750b1fd1fec5",
            "employee_name": "Janvi Vasani",
            "type": "Personal",
            "start_date": "05-11-2026",
            "end_date": "05-11-2026",
            "duration": "1 Day",
            "reason": "Urgent personal work at home.",
            "status": "Rejected",
            "requested_on": (datetime.now() - timedelta(days=10)).strftime("%d-%m-%Y"),
            "half_day": False
        }
    ]
    
    await db.leave_requests.insert_many(leaves)
    print(f"Successfully seeded {len(leaves)} leave requests for Janvi Vasani.")

if __name__ == "__main__":
    asyncio.run(main())
