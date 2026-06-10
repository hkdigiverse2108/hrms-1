import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient("mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0")
db = client["hrms_db"]

async def test():
    employees = await db.employees.find({}).to_list(10)
    for emp in employees:
        print(emp.get('name') or emp.get('firstName'))
        
    leads = await db.leads.find({"status": "Client Won"}).to_list(10)
    for l in leads:
        print(f"Lead: {l.get('company')}, Assigned: {l.get('assignedTo')}")

asyncio.run(test())
