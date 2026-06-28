import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    db = AsyncIOMotorClient('mongodb://localhost:27017/').hrms
    async for doc in db.marketing_daily_reports.find().sort('date', -1).limit(20):
        print(doc.get('date'), doc.get('campaignName'), doc.get('isDeleted'))

asyncio.run(run())
