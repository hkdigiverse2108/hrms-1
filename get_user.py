from pymongo import MongoClient

url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(url)
db = client["hrms_db"]
admin = db.employees.find_one({"email": "admin@gmail.com"})
print(admin)
