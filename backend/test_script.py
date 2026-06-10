import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient("mongodb+srv://HK_Digiverse:HK%40Digiverse%40123@cluster0.lcbyqbq.mongodb.net/hrms_db?retryWrites=true&w=majority&appName=Cluster0")
db = client["hrms_db"]

async def test():
    # Find Abc xyz
    emp = await db.employees.find_one({"name": {"$regex": "Abc xyz", "$options": "i"}})
    if not emp:
        print("Employee not found")
        return
    print(f"Employee found: {emp['name']}, ID: {emp['_id']}")
    
    # Check leads
    emp_name_norm = " ".join(emp['name'].split()).lower()
    leads = await db.leads.find({"status": "Client Won"}).to_list(100)
    print(f"Total won leads: {len(leads)}")
    matched_leads = []
    for lead in leads:
        assigned = lead.get("assignedTo", [])
        if not isinstance(assigned, list):
            assigned = [assigned]
        matched = False
        for name in assigned:
            if name and " ".join(str(name).split()).lower() == emp_name_norm:
                matched = True
                break
        if matched:
            matched_leads.append(lead)
            print(f"Matched Lead: {lead.get('company')}, Date: {lead.get('closedDate') or lead.get('date')}, Income: {lead.get('expectedIncome')}")

    # Check targets
    targets = await db.sales_targets.find({"employeeId": str(emp["_id"])}).to_list(100)
    print(f"Targets found: {len(targets)}")
    for t in targets:
        print(f"Target: {t.get('month')} {t.get('year')}, TargetAmount: {t.get('targetAmount')}, Achieved: {t.get('currentAchievement')}, Incentive: {t.get('incentiveAmount')}")

asyncio.run(test())
