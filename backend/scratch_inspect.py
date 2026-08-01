import asyncio
import database

async def run():
    emps = await database.db.employees.find({}).to_list(100)
    print(f"TOTAL EMPLOYEES: {len(emps)}\n")
    for e in emps:
        name = e.get('name') or f"{e.get('firstName', '')} {e.get('lastName', '')}".strip()
        desig = e.get('designation') or ''
        dept = e.get('department') or ''
        role = e.get('role') or ''
        print(f"NAME: {name:<30} | DESIG: {desig:<25} | DEPT: {dept:<20} | ROLE: {role}")

if __name__ == "__main__":
    asyncio.run(run())
