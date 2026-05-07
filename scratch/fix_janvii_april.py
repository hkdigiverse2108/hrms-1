import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def fix():
    url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(url)
    db = client.hrms_db
    
    janvii = await db.employees.find_one({"name": "Janvii Vasani"})
    if not janvii:
        print("Janvii not found")
        return
        
    emp_id = str(janvii["_id"])
    
    # 1. Delete attendance for April 2 and 3
    res1 = await db.attendance.delete_many({"employeeId": emp_id, "date": {"$in": ["2026-04-02", "2026-04-03"]}})
    print(f"Deleted {res1.deleted_count} attendance records for April 2 & 3")
    
    # 2. Add Late Punch-in remarks for April 13 and 25
    late_remarks = [
        {
            "employeeId": emp_id,
            "employeeName": janvii["name"],
            "role": janvii.get("designation", "Staff"),
            "avatar": janvii.get("profilePhoto", ""),
            "type": "Late Punch-in",
            "details": "Manual adjustment: Late arrival detected.",
            "addedBy": "Admin",
            "date": "Apr 13, 2026"
        },
        {
            "employeeId": emp_id,
            "employeeName": janvii["name"],
            "role": janvii.get("designation", "Staff"),
            "avatar": janvii.get("profilePhoto", ""),
            "type": "Late Punch-in",
            "details": "Manual adjustment: Late arrival detected.",
            "addedBy": "Admin",
            "date": "Apr 25, 2026"
        }
    ]
    
    # Check if they already exist to avoid duplicates
    for remark in late_remarks:
        exists = await db.remarks.find_one({"employeeId": emp_id, "date": remark["date"], "type": "Late Punch-in"})
        if not exists:
            await db.remarks.insert_one(remark)
            print(f"Added Late remark for {remark['date']}")
        else:
            print(f"Late remark already exists for {remark['date']}")

if __name__ == "__main__":
    asyncio.run(fix())
