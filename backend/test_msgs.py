import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient('mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0')
    db = client.hrms_db
    msgs = await db.messages.find().sort('timestamp', -1).limit(5).to_list(10)
    for m in msgs:
        print(f"senderId: {type(m.get('senderId'))} | receiverId: {type(m.get('receiverId'))}")
    client.close()

if __name__ == '__main__':
    asyncio.run(run())
