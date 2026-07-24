import asyncio
from database import db

async def check():
    companies = await db.companies.find({}).to_list(100)
    employees_count = await db.employees.count_documents({})
    activity_count = await db.activity_logs.count_documents({})
    purchases = await db.tenant_purchases.find({}).to_list(100)
    print(f"COMPANIES ({len(companies)}):", companies)
    print("EMPLOYEE COUNT:", employees_count)
    print("ACTIVITY LOGS COUNT:", activity_count)
    print(f"PURCHASES ({len(purchases)}):", purchases)

if __name__ == "__main__":
    asyncio.run(check())
