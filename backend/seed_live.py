from pymongo import MongoClient
import os
from auth import get_password_hash

MONGO_URL = os.getenv("MONGO_URL")
if not MONGO_URL:
    raise ValueError("MONGO_URL environment variable is not set.")

MONGO_DB = os.getenv("MONGO_DB", "hrms_db")

def seed():
    client = MongoClient(MONGO_URL)
    db = client[MONGO_DB]
    
    # helper to seed collection if empty
    def seed_collection(name, data):
        if db[name].count_documents({}) == 0:
            db[name].insert_many(data)
            print(f"{name.capitalize()} seeded.")
        else:
            print(f"{name.capitalize()} collection not empty, skipping.")

    print("Starting Live Database Seeding...")

    # 1. Master Data
    seed_collection("companies", [
        {"name": "HK Digiverse & IT Consultancy"}
    ])

    seed_collection("departments", [
        {"name": "Development", "head": "TBD", "employeeCount": 0},
        {"name": "Sales", "head": "TBD", "employeeCount": 0},
        {"name": "Graphics", "head": "TBD", "employeeCount": 0},
        {"name": "HR", "head": "TBD", "employeeCount": 0},
        {"name": "Marketing", "head": "TBD", "employeeCount": 0},
    ])

    seed_collection("roles", [
        {"name": "Admin"},
        {"name": "HR"},
        {"name": "Employee"},
        {"name": "Team Leader"},
    ])

    seed_collection("relations", [
        {"name": "Father"},
        {"name": "Mother"},
        {"name": "Spouse"},
        {"name": "Guardian"},
    ])

    seed_collection("positions", [
        {"name": "Fullstack Developer"},
        {"name": "Frontend Developer"},
        {"name": "Backend Developer"},
        {"name": "UI/UX Designer"},
        {"name": "Project Manager"},
        {"name": "HR Manager"},
    ])

    # 2. Super Admin Employee
    # Hash the password properly using your auth.py logic so login works!
    admin_password = get_password_hash("Admin@123")
    
    seed_collection("employees", [
        {
            "employeeId": "ADMIN001",
            "firstName": "Super",
            "lastName": "Admin",
            "email": "admin@hkdigiverse.com",
            "phone": "+91 0000000000",
            "password": admin_password,
            "role": "Admin",
            "status": "active",
            "department": "HR",
            "designation": "System Administrator",
            "position": "HR Manager",
            "joinDate": "2024-01-01"
        }
    ])

    print("Live Server Seeding complete!")
    print("--------------------------------------------------")
    print("Login Details:")
    print("Email: admin@hkdigiverse.com")
    print("Password: Admin@123")
    print("--------------------------------------------------")

if __name__ == "__main__":
    seed()
