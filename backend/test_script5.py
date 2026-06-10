import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient("mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0")
db = client["hrms_db"]

async def test():
    targets = await db.sales_targets.find({}).to_list(100)
    print("\nTARGETS:")
    for t in targets:
        print(t)
        
    leads = await db.leads.find({"status": "Client Won"}).to_list(100)
    print("\nLEADS:")
    for l in leads:
        print(f"{l.get('company')}, {l.get('assignedTo')}, Income: {l.get('expectedIncome')}, Date: {l.get('closedDate')}")

asyncio.run(test())
