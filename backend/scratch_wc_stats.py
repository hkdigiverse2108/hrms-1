import asyncio
from eom_service import get_eom_work_completion_stats, calculate_eom_leaderboard
from database import db

async def main():
    wc_stats = await get_eom_work_completion_stats('2026-08', 10.0)
    lb = await calculate_eom_leaderboard('2026-08')
    
    emp_map = {}
    emps = await db.employees.find({}).to_list(1000)
    for e in emps:
        emp_map[str(e['_id'])] = f"{e.get('firstName', '')} {e.get('lastName', '')}".strip()
        
    print("=== WORK COMPLETION STATS BREAKDOWN (2026-08) ===")
    print("Formula:", wc_stats.get("formula"))
    print("\nPer-Employee Work Completion Data:")
    stats_dict = wc_stats.get("employeeStats", {})
    
    # Leaderboard Work completion points map
    lb_points = {}
    for entry in lb.get("leaderboard", []):
        lb_points[entry["employeeId"]] = entry.get("scores", {}).get("Work Completion", 0)
        
    for emp_id, name in emp_map.items():
        if emp_id in stats_dict:
            item = stats_dict[emp_id]
            pts = lb_points.get(emp_id, 0)
            print(f"- {name}: Days Verified = {item['daysVerified']}, Avg Rating = {item['avgRating']}/10, Factor (Verified Days x Avg Rating) = {item['factor']} => Final Work Completion Score = {pts} / 10 pts")
        else:
            pts = lb_points.get(emp_id, 0)
            print(f"- {name}: 0 Days Verified => Factor = 0.0 => Final Work Completion Score = {pts} / 10 pts")

if __name__ == "__main__":
    asyncio.run(main())
