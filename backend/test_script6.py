import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient("mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0")
db = client["hrms_db"]

async def test():
    targets = await db.sales_targets.find({}).to_list(100)
    for t in targets:
        print(f"Target ID: {t['_id']}, empID type: {type(t.get('employeeId'))}, empID: {t.get('employeeId')}")

asyncio.run(test())
