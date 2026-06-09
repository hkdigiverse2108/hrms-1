import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client["hrms"]

async def test():
    slabs = await db.incentive_slabs.find({}).to_list(100)
    print("SLABS:")
    for s in slabs:
        print(s)

asyncio.run(test())
