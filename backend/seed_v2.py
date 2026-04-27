from pymongo import MongoClient
import os

MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0")

def seed():
    client = MongoClient(MONGO_URL)
    db = client.hrms_db
    
    # helper to seed collection if empty
    def seed_collection(name, data):
        if db[name].count_documents({}) == 0:
            db[name].insert_many(data)
            print(f"{name.capitalize()} seeded.")
        else:
            print(f"{name.capitalize()} collection not empty, skipping.")

    # Master Data
    seed_collection("companies", [
        {"name": "HK Digiverse & IT Consultancy"},
        {"name": "Software Solutions"},
        {"name": "Marketing Pros"},
    ])

    seed_collection("roles", [
        {"name": "Admin"},
        {"name": "HR"},
        {"name": "Employee"},
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
    ])

    # Recruitment
    seed_collection("job_openings", [
        {"title": "Senior React Developer", "department": "Engineering", "location": "New York", "type": "full-time", "applications": 45, "status": "open", "postedDate": "2024-01-05"},
        {"title": "Marketing Specialist", "department": "Marketing", "location": "Remote", "type": "full-time", "applications": 32, "status": "open", "postedDate": "2024-01-10"},
        {"title": "HR Coordinator", "department": "HR", "location": "Chicago", "type": "full-time", "applications": 28, "status": "on-hold", "postedDate": "2024-01-02"},
    ])

    seed_collection("applications", [
        {"candidateName": "Alex Turner", "email": "alex.turner@email.com", "phone": "+1 555 123 4567", "position": "Senior React Developer", "status": "interview", "appliedDate": "2024-01-10"},
        {"candidateName": "Maria Garcia", "email": "maria.garcia@email.com", "phone": "+1 555 234 5678", "position": "Marketing Specialist", "status": "screening", "appliedDate": "2024-01-12"},
    ])

    # Internships
    seed_collection("interns", [
        {"name": "Chris Martin", "email": "chris.martin@email.com", "department": "Finance", "mentor": "Emily Davis", "startDate": "2024-02-01", "endDate": "2024-07-31", "status": "active"},
        {"name": "Sophie Clark", "email": "sophie.clark@email.com", "department": "Engineering", "mentor": "John Smith", "startDate": "2024-01-15", "endDate": "2024-06-15", "status": "active"},
    ])

    # Assets & Expenses
    seed_collection("assets", [
        {"name": "MacBook Pro 16\"", "type": "Laptop", "serialNumber": "MBP-2024-001", "assignedTo": "John Smith", "status": "assigned", "purchaseDate": "2024-01-01", "value": 2499},
        {"name": "Dell Monitor 27\"", "type": "Monitor", "serialNumber": "DM-2024-001", "assignedTo": "Sarah Johnson", "status": "assigned", "purchaseDate": "2024-01-05", "value": 450},
    ])

    seed_collection("expense_claims", [
        {"employeeId": "EMP001", "employeeName": "John Smith", "category": "Travel", "amount": 450, "description": "Client meeting travel expenses", "status": "approved", "submittedDate": "2024-01-10"},
        {"employeeId": "EMP002", "employeeName": "Sarah Johnson", "category": "Software", "amount": 99, "description": "Design software subscription", "status": "pending", "submittedDate": "2024-01-12"},
    ])

    # Performance & Planning
    seed_collection("holidays", [
        {"name": "New Year", "date": "2024-01-01", "type": "public"},
        {"name": "Republic Day", "date": "2024-01-26", "type": "public"},
    ])

    # Employees
    seed_collection("employees", [
        {
            "employeeId": "EMP001",
            "firstName": "John",
            "middleName": "Robert",
            "lastName": "Doe",
            "email": "john.doe@hkdigiverse.com",
            "phone": "+91 9876543210",
            "password": "hashed_password_123",
            "dob": "1990-05-15",
            "joinDate": "2024-01-01",
            "salary": 75000.0,
            "role": "HR",
            "status": "active",
            "department": "HR",
            "designation": "HR Manager",
            "position": "Senior HR",
            "upiId": "john.doe@okaxis",
            "accountNumber": "123456789012",
            "ifscCode": "UTIB0000123",
            "bankName": "Axis Bank",
            "accountHolderName": "John Robert Doe",
            "parentName": "Richard Doe",
            "parentNumber": "+91 9988776655",
            "relation": "Father",
            "aadharCard": "1234 5678 9012",
            "panCard": "ABCDE1234F",
            "startTime": "09:00",
            "endTime": "18:00",
            "profilePhoto": "https://api.dicebear.com/7.x/avataaars/svg?seed=John"
        }
    ])

    print("Seeding complete!")

if __name__ == "__main__":
    seed()
