from pymongo import MongoClient

url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(url)
db = client["hrms_live_db"]
users = db.employees.find().limit(5)
for user in users:
    print({k: v for k, v in user.items() if k in ['_id', 'role', 'designation', 'name']})
