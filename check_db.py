from pymongo import MongoClient
import os

url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(url)

for db_name in ["hrms_db", "hrms_live_db"]:
    db = client[db_name]
    admin = db.employees.find_one({"email": "admin@gmail.com"})
    print(f"{db_name}: admin found? {admin is not None}")
