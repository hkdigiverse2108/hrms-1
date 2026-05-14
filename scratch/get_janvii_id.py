import motor.motor_asyncio
import asyncio
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
MONGO_URL = os.getenv("MONGO_URL")

async def get_id():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL, tls=True, tlsAllowInvalidCertificates=True)
    db = client.hrms_db
    emp = await db.employees.find_one({'name': 'Janvii Vasani'})
    if emp:
        print(emp.get('_id') if '_id' in emp else emp.get('id'))
    else:
        print("Employee not found")

if __name__ == "__main__":
    asyncio.run(get_id())
