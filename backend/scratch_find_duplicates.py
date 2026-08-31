import asyncio
from database import db
from datetime import datetime, date

async def check_all_duplicates():
    reports1 = await db.employee_daily_reports.find({}).to_list(30000)
    reports2 = await db.daily_reports.find({}).to_list(30000)
    
    # Map employees
    emps = await db.employees.find({}).to_list(1000)
    emp_map = {str(e['_id']): f"{e.get('firstName', '')} {e.get('lastName', '')}".strip() for e in emps}
    
    emp_date_docs = {}
    
    for r in reports1 + reports2:
        e_id = str(r.get('employeeId') or r.get('employee_id') or '').strip()
        if not e_id:
            continue
            
        raw_d = r.get('date')
        if isinstance(raw_d, (datetime, date)):
            d_str = raw_d.strftime('%Y-%m-%d')
        else:
            d_str = str(raw_d).split('T')[0].split(' ')[0].strip()
            
        if '2026-08' in d_str:
            key = (e_id, d_str)
            if key not in emp_date_docs:
                emp_date_docs[key] = []
            emp_date_docs[key].append(r)
            
    print("=== AUGUST 2026 DUPLICATE DAILY REPORTS SCAN ===")
    duplicate_count = 0
    
    for (e_id, d_str), docs in sorted(emp_date_docs.items()):
        if len(docs) > 1:
            duplicate_count += 1
            emp_name = emp_map.get(e_id, e_id)
            doc_ids = [str(x['_id']) for x in docs]
            ratings = [x.get('rating') for x in docs]
            statuses = [x.get('status') for x in docs]
            print(f"- Employee: {emp_name:<28} | Date: {d_str} | Count: {len(docs)} | Ratings: {ratings} | Statuses: {statuses} | IDs: {doc_ids}")
            
    if duplicate_count == 0:
        print("No duplicate daily report entries found in August 2026!")
    else:
        print(f"\nTotal Duplicate Cases Found in August 2026: {duplicate_count}")

if __name__ == "__main__":
    asyncio.run(check_all_duplicates())
