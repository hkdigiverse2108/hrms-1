import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def main():
    mongo_url = "mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(mongo_url)
    db = client.hrms_db
    
    # Update Roles
    print("Updating Roles...")
    roles_to_add = ["Admin", "HR", "Employee", "Team Leader"]
    for role in roles_to_add:
        await db.roles.update_one({"name": role}, {"$set": {"name": role}}, upsert=True)
    print("Roles updated.")
    
    # Update Departments
    print("Updating Departments...")
    # Clear existing departments if we want them to be strictly "static" as requested
    # await db.departments.delete_many({}) # User might not want to lose existing links? 
    # Actually, I'll just upsert the requested ones and maybe keep others, 
    # but the user said "give static departments...", so I'll clear others to match the request.
    
    # Let's find existing departments to see if we should delete them
    requested_depts = ["Development", "Sales", "Graphics", "Marketing"]
    
    # Delete departments NOT in the requested list to ensure they are the ONLY ones
    await db.departments.delete_many({"name": {"$nin": requested_depts}})
    
    for dept in requested_depts:
        await db.departments.update_one(
            {"name": dept}, 
            {"$set": {"name": dept, "head": "TBD", "employeeCount": 0}}, 
            upsert=True
        )
    print("Departments updated.")

if __name__ == "__main__":
    asyncio.run(main())
