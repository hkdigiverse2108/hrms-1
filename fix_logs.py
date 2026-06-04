from pymongo import MongoClient
import re

client = MongoClient("mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0")
db = client.get_database()

# Find logs where userName is a 24 char hex string (ObjectId)
count = 0
for log in db.task_logs.find():
    user_name = log.get("userName", "")
    performed_by = log.get("performedBy", "")
    
    if re.fullmatch(r"[0-9a-fA-F]{24}", str(user_name)):
        # They are swapped
        db.task_logs.update_one(
            {"_id": log["_id"]},
            {"$set": {"userName": performed_by, "performedBy": user_name}}
        )
        count += 1

print(f"Fixed {count} log entries!")
