import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0")
    db = client.hrms_db
    
    # 1. Strip required docs from Admins
    admins = await db.employees.find({"role": {"$regex": "^admin$", "$options": "i"}}).to_list(100)
    for admin in admins:
        print(f"Fixing admin: {admin.get('name')}")
        await db.employees.update_one(
            {"_id": admin["_id"]},
            {"$set": {"requiredDocuments": []}}
        )
        # Delete any dummy salary structure
        await db.salary_structures.delete_many({"employeeId": str(admin["_id"])})
        # Delete any dummy payroll records
        await db.payroll.delete_many({"employeeId": str(admin["_id"])})

    print("Done clearing out Admin records!")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
