import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import calendar
from datetime import datetime

async def check():
    url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(url)
    db = client.hrms_db
    
    # Manually simulate the function for May
    month = "May"
    year = 2026
    emp = await db.employees.find_one({"name": "Janvii Vasani"})
    emp_id = str(emp["_id"])
    
    salary = await db.salary_structures.find_one({"employeeId": emp_id})
    num_days = 31
    month_num = 5
    
    # Attendance count
    attendance_count = await db.attendance.count_documents({
        "employeeId": emp_id,
        "date": {"$regex": "^2026-05"}
    })
    
    # Sundays
    sundays = 0
    for d in range(1, num_days + 1):
        if calendar.weekday(year, month_num, d) == 6: sundays += 1
        
    total_working_days = num_days - sundays # 31 - 5 = 26
    lop_days = max(0, total_working_days - attendance_count)
    per_day_gross = salary["monthlyGross"] / total_working_days
    lop_amount = lop_days * per_day_gross
    
    # Remarks check
    remark_query = {
        "employeeId": emp_id,
        "date": {"$regex": f"May.* {year}"}
    }
    remarks = await db.remarks.find(remark_query).to_list(100)
    
    late_penalty = 0
    for r in remarks:
        if r["type"] == "Late Punch-in":
            late_penalty += per_day_gross

    print(f"Janvii May Stats:")
    print(f"Attendance={attendance_count}")
    print(f"TotalWorkingDays={total_working_days}")
    print(f"LOP_Days={lop_days}")
    print(f"LOP_Amount={lop_amount}")
    print(f"Late_Penalty={late_penalty}")
    print(f"Total_Deduction={lop_amount + late_penalty}")

if __name__ == "__main__":
    asyncio.run(check())
