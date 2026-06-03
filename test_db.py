import asyncio
import motor.motor_asyncio
from bson import ObjectId

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0')
    db = client.hrms_live_db
    try:
        emp = await db.employees.find_one({'_id': ObjectId('6a20233e5b0cc7714259f9af')})
        print("Employee 6a20233e5b0cc7714259f9af:", emp is not None)
    except Exception as e:
        print("Invalid ObjectId:", e)

    count = await db.employees.count_documents({})
    print("Total employees:", count)

asyncio.run(main())
