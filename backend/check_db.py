import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"

async def run():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["hrms_db"]

    # Show all assets
    total = await db.assets.count_documents({})
    print(f"Total assets: {total}")
    assets = await db.assets.find({}).to_list(length=200)
    for a in assets:
        print(f"  assetId={a.get('assetId','N/A')} | category={a.get('category','N/A')} | type={a.get('type','N/A')}")

    # Show all categories
    cats = await db.asset_categories.find({}).to_list(length=100)
    print(f"\nCategories ({len(cats)}):")
    for c in cats:
        print(f"  {c.get('name','N/A')}")

    client.close()

asyncio.run(run())
