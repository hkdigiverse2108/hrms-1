import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

client = AsyncIOMotorClient("mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0")
db = client["hrms_db"]

async def test():
    payroll = await db.payroll.find({"month": "June", "year": 2026}).to_list(100)
    for p in payroll:
        if "Abc" in p.get("employeeName", ""):
            print(f"Name: '{p.get('employeeName')}', Incentive: {p.get('incentiveAmount')}")

asyncio.run(test())
