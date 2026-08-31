import asyncio
from eom_service import get_eom_work_completion_stats
from database import db

async def main():
    res = await get_eom_work_completion_stats('2026-08', 15.0)
    statsMap = res.get('employeeStats', {})
    
    emps = await db.employees.find({}).to_list(1000)
    emp_list = []
    for e in emps:
        eId = str(e['_id'])
        eName = f"{e.get('firstName', '')} {e.get('lastName', '')}".strip()
        obj = statsMap.get(eId) or statsMap.get(eName.lower()) or {}
        days = obj.get('daysVerified', 0)
        avg_r = obj.get('avgRating', 0.0)
        factor = obj.get('factor', 0.0)
        if factor > 0:
            emp_list.append({'name': eName, 'days': days, 'avg': avg_r, 'factor': factor})
            
    emp_list.sort(key=lambda x: x['factor'], reverse=True)
    
    N = len(emp_list)
    max_score = 15.0
    interval = max_score / (N - 1) if N > 1 else 0
    
    print(f"=== WORK COMPLETION EVALUATION BREAKDOWN (Max {max_score} pts) ===")
    print(f"Total Participating Employees: {N}")
    print(f"Equal Interval Step: {interval:.4f} pts per rank\n")
    
    for idx, item in enumerate(emp_list):
        rank = idx + 1
        for j in range(idx):
            if emp_list[j]['factor'] == item['factor']:
                rank = j + 1
                break
        score = max_score - ((rank - 1) * interval)
        score = round(max(0, min(max_score, score)), 2)
        formula = f"{item['days']} Days × {item['avg']} Avg Rating = {item['factor']} Factor -> Rank #{rank} -> {max_score} - (Rank {rank-1} × {interval:.2f}) = {score} pts"
        print(f"| #{rank:<2} | {item['name']:<28} | {item['days']:<2} Days | {item['avg']:<4} | {item['factor']:<5} | #{rank:<2} | {score:<5} pts | {formula} |")

if __name__ == "__main__":
    asyncio.run(main())
