import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_users():
    client = AsyncIOMotorClient("mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0", tls=True, tlsAllowInvalidCertificates=True)
    db = client.hrms_db
    user = await db.employees.find_one({}, {"email": 1, "password": 1})
    print(f"User: {user}")

asyncio.run(check_users())
