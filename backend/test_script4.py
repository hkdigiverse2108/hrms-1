import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient("mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0")
db = client["hrms_db"]

async def test():
    emp = await db.employees.find_one({"name": {"$regex": "Abc", "$options": "i"}})
    print(f"Emp ID: {emp['_id']}")
    
    slabs = await db.incentive_slabs.find({}).to_list(100)
    print("\nSLABS:")
    for s in slabs:
        print(s)
        
    targets = await db.sales_targets.find({"employeeId": str(emp["_id"])}).to_list(100)
    print("\nTARGETS:")
    for t in targets:
        print(t)

asyncio.run(test())
