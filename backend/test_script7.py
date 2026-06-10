import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient("mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0")
db = client["hrms_db"]

async def test():
    import sys
    sys.path.append('d:/hrms-1/backend')
    import crud
    print("Running payroll processing for June 2026")
    res = await crud.run_payroll_processing(db, "June", 2026)
    for p in res:
        if p.get('employeeName') == 'Abc   xyz' or p.get('employeeName') == 'Abc xyz':
            print(f"Name: {p.get('employeeName')}, Gross: {p.get('grossSalary')}, Deduction: {p.get('lopAmount')}, Incentive: {p.get('incentiveAmount')}")

asyncio.run(test())
