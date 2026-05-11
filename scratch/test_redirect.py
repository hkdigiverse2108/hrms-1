import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["hrms"]
    
    # Get a staff employee
    employee = await db.employees.find_one({"role": "Staff"})
    if not employee:
        print("No staff employee found")
        return
    
    emp_id = str(employee["_id"])
    emp_name = employee["name"]
    
    # Create a leave request
    leave_request = {
        "employee_id": emp_id,
        "employee_name": emp_name,
        "type": "Sick Leave",
        "duration": "1 Day",
        "start_date": "12-05-2026",
        "end_date": "12-05-2026",
        "reason": "Testing notification redirect",
        "status": "Pending",
        "requested_on": datetime.now().strftime("%d-%m-%Y %H:%M")
    }
    
    res = await db.leave_requests.insert_one(leave_request)
    leave_id = str(res.inserted_id)
    
    # Create notifications for Admin and HR
    admin_hr_users = await db.employees.find({"role": {"$in": ["Admin", "HR"]}}).to_list(100)
    
    for user in admin_hr_users:
        notification = {
            "employee_id": str(user["_id"]),
            "title": "New Leave Request (Test)",
            "message": f"{emp_name} requested sick leave.",
            "type": "leave",
            "reference_id": leave_id,
            "is_read": False,
            "created_at": datetime.now().strftime("%d-%m-%Y %H:%M")
        }
        await db.notifications.insert_one(notification)
    
    print(f"Created leave request {leave_id} and notifications for {len(admin_hr_users)} users.")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
