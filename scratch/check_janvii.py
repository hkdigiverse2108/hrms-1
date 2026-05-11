
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    mongo_url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(mongo_url)
    db = client.hrms_db
    
    # Find Janvii
    janvii = await db.employees.find_one({"name": "Janvii Vasani"})
    if not janvii:
        print("Janvii not found")
        return
    
    jid = str(janvii['_id'])
    print(f"Janvii Name: {janvii['name']}")
    print(f"Janvii ID: {jid}")
    print(f"Janvii Role: {janvii.get('role', 'N/A')}")
    
    # Find her permissions
    perms = await db.user_permissions.find_one({"employeeId": jid})
    if perms:
        print("Permissions found in user_permissions collection:")
        for p in perms.get('permissions', []):
            if p.get('canView'):
                print(f" - {p['moduleName']}: View=True")
            else:
                print(f" - {p['moduleName']}: View=False")
    else:
        print("No permissions record found in user_permissions collection for Janvii")

if __name__ == "__main__":
    asyncio.run(check())
