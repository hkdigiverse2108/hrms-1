from pymongo import MongoClient
import os

MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0")

def seed():
    client = MongoClient(MONGO_URL)
    db = client.hrms_db
    
    # Clear existing data
    db.employees.delete_many({})
    db.attendance.delete_many({})
    db.leave_requests.delete_many({})
    db.announcements.delete_many({})
    db.dashboard_stats.delete_many({})
    db.payroll.delete_many({})
    print("Old data cleared.")

    # Mock Data
    employees = [
        {"employeeId": "EMP001", "name": "John Smith", "email": "john.smith@company.com", "password": "password123", "phone": "+1 234 567 8901", "department": "Engineering", "designation": "Senior Developer", "joinDate": "2022-03-15", "status": "active", "salary": 85000.0},
        {"employeeId": "EMP002", "name": "Sarah Johnson", "email": "sarah.johnson@company.com", "password": "password123", "phone": "+1 234 567 8902", "department": "Marketing", "designation": "Marketing Manager", "joinDate": "2021-07-20", "status": "active", "salary": 75000.0},
        {"employeeId": "EMP003", "name": "Michael Brown", "email": "michael.brown@company.com", "password": "password123", "phone": "+1 234 567 8903", "department": "HR", "designation": "HR Specialist", "joinDate": "2023-01-10", "status": "probation", "salary": 55000.0},
        {"employeeId": "EMP004", "name": "Emily Davis", "email": "emily.davis@company.com", "password": "password123", "phone": "+1 234 567 8904", "department": "Finance", "designation": "Financial Analyst", "joinDate": "2022-09-05", "status": "active", "salary": 70000.0},
        {"employeeId": "EMP005", "name": "David Wilson", "email": "david.wilson@company.com", "password": "password123", "phone": "+1 234 567 8905", "department": "Engineering", "designation": "Junior Developer", "joinDate": "2023-06-01", "status": "active", "salary": 55000.0},
        {"employeeId": "EMP006", "name": "Jennifer Taylor", "email": "jennifer.taylor@company.com", "password": "password123", "phone": "+1 234 567 8906", "department": "Sales", "designation": "Sales Executive", "joinDate": "2022-11-15", "status": "active", "salary": 60000.0},
        {"employeeId": "EMP007", "name": "Robert Martinez", "email": "robert.martinez@company.com", "password": "password123", "phone": "+1 234 567 8907", "department": "Operations", "designation": "Operations Manager", "joinDate": "2020-05-20", "status": "active", "salary": 80000.0},
        {"employeeId": "EMP008", "name": "Lisa Anderson", "email": "lisa.anderson@company.com", "password": "password123", "phone": "+1 234 567 8908", "department": "Engineering", "designation": "Tech Lead", "joinDate": "2021-02-10", "status": "active", "salary": 95000.0},
    ]

    attendance = [
        {"employeeId": "EMP001", "employeeName": "John Smith", "date": "2024-01-15", "checkIn": "09:00", "checkOut": "18:00", "status": "present", "workHours": "9h"},
        {"employeeId": "EMP002", "employeeName": "Sarah Johnson", "date": "2024-01-15", "checkIn": "09:15", "checkOut": "18:30", "status": "late", "workHours": "9h 15m"},
        {"employeeId": "EMP003", "employeeName": "Michael Brown", "date": "2024-01-15", "checkIn": "08:45", "checkOut": "17:45", "status": "present", "workHours": "9h"},
        {"employeeId": "EMP004", "employeeName": "Emily Davis", "date": "2024-01-15", "checkIn": "-", "checkOut": "-", "status": "absent", "workHours": "-"},
    ]

    leaves = [
        {"employeeId": "EMP001", "employeeName": "John Smith", "leaveType": "annual", "startDate": "2024-02-01", "endDate": "2024-02-05", "days": 5, "reason": "Family vacation", "status": "approved", "appliedOn": "2024-01-15"},
        {"employeeId": "EMP002", "employeeName": "Sarah Johnson", "leaveType": "sick", "startDate": "2024-01-20", "endDate": "2024-01-21", "days": 2, "reason": "Medical appointment", "status": "pending", "appliedOn": "2024-01-18"},
    ]

    announcements = [
        {"title": "Annual Company Meeting", "content": "Join us for the annual company meeting on February 15th at 10 AM in the main conference hall.", "author": "HR Department", "date": "2024-01-15", "priority": "high"},
        {"title": "New Health Insurance Policy", "content": "We are pleased to announce updates to our health insurance policy effective March 1st.", "author": "HR Department", "date": "2024-01-12", "priority": "medium"},
    ]

    stats = {
        "totalEmployees": 88,
        "presentToday": 75,
        "onLeave": 8,
        "newJoinees": 5,
        "pendingLeaves": 12,
        "openPositions": 8,
        "upcomingBirthdays": 3,
        "upcomingAnniversaries": 2
    }

    payroll = [
        {"employeeId": "EMP001", "employeeName": "John Smith", "month": "January 2024", "basicSalary": 7083, "allowances": 1500, "deductions": 850, "netSalary": 7733, "status": "paid"},
        {"employeeId": "EMP002", "employeeName": "Sarah Johnson", "month": "January 2024", "basicSalary": 6250, "allowances": 1200, "deductions": 720, "netSalary": 6730, "status": "paid"},
    ]

    db.employees.insert_many(employees)
    db.attendance.insert_many(attendance)
    db.leave_requests.insert_many(leaves)
    db.announcements.insert_many(announcements)
    db.dashboard_stats.insert_one(stats)
    db.payroll.insert_many(payroll)
    
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed()
