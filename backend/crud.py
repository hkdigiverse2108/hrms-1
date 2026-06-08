from bson import ObjectId
from datetime import datetime, timedelta, timezone, date
from typing import List, Optional, Dict
import schemas
import auth
import calendar
import pytz
from websocket import manager as ws_manager

import time
import urllib.request
import threading

IST = pytz.timezone('Asia/Kolkata')
_real_time_anchor = None
_mono_anchor = None
_sync_lock = threading.Lock()
_sync_thread_started = False

def _sync_time_from_network():
    """Fetch real time from Google in a background thread (non-blocking)."""
    global _real_time_anchor, _mono_anchor
    try:
        req = urllib.request.Request('http://www.google.com', method='HEAD')
        with urllib.request.urlopen(req, timeout=3) as response:
            date_str = response.headers.get('Date')
            dt = datetime.strptime(date_str, '%a, %d %b %Y %H:%M:%S %Z')
            with _sync_lock:
                _real_time_anchor = dt.replace(tzinfo=timezone.utc).astimezone(IST)
                _mono_anchor = time.monotonic()
    except Exception:
        # Silently fall back to system time if network unavailable
        pass

def _start_sync_thread():
    """Start a daemon thread that syncs time every 30 minutes."""
    global _sync_thread_started
    if _sync_thread_started:
        return
    _sync_thread_started = True
    
    def _loop():
        while True:
            _sync_time_from_network()
            time.sleep(1800)  # Re-sync every 30 minutes
    
    t = threading.Thread(target=_loop, daemon=True)
    t.start()

def get_now():
    global _real_time_anchor, _mono_anchor
    
    # Start the background sync thread on first call
    if not _sync_thread_started:
        _start_sync_thread()
        # Give the first sync a moment to complete
        time.sleep(0.1)
    
    with _sync_lock:
        if _real_time_anchor is None:
            # Sync hasn't completed yet — use system time
            return datetime.now(IST)
        elapsed = time.monotonic() - _mono_anchor
        return _real_time_anchor + timedelta(seconds=elapsed)

def parse_datetime(date_val, time_str):
    if not time_str:
        return get_now()
    if isinstance(date_val, (date, datetime)):
        date_str = date_val.strftime("%Y-%m-%d")
    else:
        # Extract only the date part in case date_val is an ISO timestamp string or full datetime string
        date_str = str(date_val).split('T')[0].split(' ')[0]
    try:
        # Standard format
        dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
    except ValueError:
        # Fallback for formats without seconds
        dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    return IST.localize(dt)

def fix_id(doc):
    from datetime import datetime, date
    if doc is None:
        return None
    if isinstance(doc, list):
        return [fix_id(x) for x in doc]
    if isinstance(doc, dict):
        new_doc = {}
        for k, v in doc.items():
            if k == "_id":
                new_doc["id"] = str(v)
            elif isinstance(v, ObjectId):
                new_doc[k] = str(v)
            elif isinstance(v, (datetime, date)):
                if hasattr(v, "hour") and (v.hour != 0 or v.minute != 0 or v.second != 0):
                    new_doc[k] = v.isoformat()
                else:
                    new_doc[k] = v.strftime("%Y-%m-%d")
            elif isinstance(v, (dict, list)):
                new_doc[k] = fix_id(v)
            else:
                new_doc[k] = v
        return new_doc
    return doc

async def archive_and_delete_many(db, collection_name: str, query: dict):
    docs = await db[collection_name].find(query).to_list(length=None)
    if docs:
        now = get_now()
        for doc in docs:
            doc["archived_at"] = now
        archive_collection = f"archive_{collection_name}"
        await db[archive_collection].insert_many(docs)
    await db[collection_name].delete_many(query)

async def archive_and_delete_one(db, collection_name: str, query: dict):
    doc = await db[collection_name].find_one(query)
    if doc:
        doc["archived_at"] = get_now()
        archive_collection = f"archive_{collection_name}"
        await db[archive_collection].insert_one(doc)
    await db[collection_name].delete_one(query)

async def delete_employee(db, employee_id: str):
    existing = await db.employees.find_one({"_id": ObjectId(employee_id)})
    if existing:
        old_photo = existing.get("profilePhoto")
        if old_photo and not old_photo.startswith("http"):
            import os
            filename = old_photo.split('/')[-1]
            old_photo_path = os.path.join("uploads", filename)
            if os.path.exists(old_photo_path) and os.path.isfile(old_photo_path):
                try:
                    os.remove(old_photo_path)
                except Exception as e:
                    print(f"Error removing deleted employee's photo: {e}")
    # Cascade deletes for employee
    await archive_and_delete_many(db, "attendance", {"employeeId": employee_id})
    await archive_and_delete_many(db, "leave_requests", {"employee_id": employee_id})
    await archive_and_delete_many(db, "payroll", {"employeeId": employee_id})
    await archive_and_delete_many(db, "salary_structures", {"employeeId": employee_id})
    await archive_and_delete_many(db, "employee_daily_reports", {"employeeId": employee_id})
    try:
        emp_obj_id = ObjectId(employee_id)
        await archive_and_delete_many(db, "notifications", {"$or": [{"employee_id": employee_id}, {"employee_id": emp_obj_id}, {"employeeId": employee_id}]})
    except Exception:
        await archive_and_delete_many(db, "notifications", {"$or": [{"employee_id": employee_id}, {"employeeId": employee_id}]})
    await archive_and_delete_many(db, "remarks", {"employeeId": employee_id})
    await archive_and_delete_many(db, "bonus_deductions", {"employeeId": employee_id})
    await archive_and_delete_many(db, "sales_targets", {"employeeId": employee_id})
    
    # Unassign tasks
    await db.wm_tasks.update_many(
        {"assignedToId": employee_id},
        {"$set": {"assignedToId": None, "assignedToName": "Unassigned"}}
    )

    await archive_and_delete_one(db, "employees", {"_id": ObjectId(employee_id)})
    
    try:
        await ws_manager.broadcast_all("data_refresh", {"entity": "employees"})
    except Exception:
        pass
        
    return True

async def get_employee(db, employee_id: str):
    try:
        doc = await db.employees.find_one({"_id": ObjectId(employee_id)})
        return fix_id(doc)
    except Exception:
        return None

async def sync_employee_salary_to_structure(db, employee_id: str, salary_amount: float):
    if salary_amount is None:
        return
    try:
        existing = await db.salary_structures.find_one({"employeeId": employee_id})
        if existing:
            if existing.get("monthlyGross") != salary_amount or existing.get("basic") != salary_amount:
                await db.salary_structures.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"monthlyGross": salary_amount, "basic": salary_amount}}
                )
        else:
            new_structure = {
                "employeeId": employee_id,
                "basic": salary_amount,
                "hra": 0.0,
                "conveyance": 0.0,
                "medical": 0.0,
                "specialAllowance": 0.0,
                "pf": 0.0,
                "esi": 0.0,
                "professionalTax": 0.0,
                "tds": 0.0,
                "monthlyGross": salary_amount
            }
            await db.salary_structures.insert_one(new_structure)
    except Exception as e:
        print(f"Error syncing salary to structure: {e}")


async def update_employee(db, employee_id: str, employee_update: schemas.EmployeeUpdate):
    # Fetch existing employee first to handle name recalculation
    existing = await db.employees.find_one({"_id": ObjectId(employee_id)})
    if not existing:
        return None
    
    update_data = employee_update.dict(exclude_unset=True)
    
    # If a new profile photo is uploaded/edited, delete the old one from the uploads folder
    if "profilePhoto" in update_data and update_data["profilePhoto"] != existing.get("profilePhoto"):
        import os
        old_photo = existing.get("profilePhoto")
        if old_photo and not old_photo.startswith("http"):
            filename = old_photo.split('/')[-1]
            old_photo_path = os.path.join("uploads", filename)
            if os.path.exists(old_photo_path) and os.path.isfile(old_photo_path):
                try:
                    os.remove(old_photo_path)
                except Exception as e:
                    print(f"Error removing old photo: {e}")
    
    # Recalculate name if name components are updated
    if any(field in update_data for field in ["firstName", "middleName", "lastName"]):
        first = update_data.get("firstName", existing.get("firstName", ""))
        middle = update_data.get("middleName", existing.get("middleName", ""))
        last = update_data.get("lastName", existing.get("lastName", ""))
        
        name = f"{first} {last}"
        if middle:
            name = f"{first} {middle} {last}"
        update_data["name"] = name

    await db.employees.update_one(
        {"_id": ObjectId(employee_id)},
        {"$set": update_data}
    )
    
    if "salary" in update_data and update_data["salary"] is not None:
        await sync_employee_salary_to_structure(db, employee_id, update_data["salary"])
    
    try:
        await ws_manager.broadcast_all("data_refresh", {"entity": "employees"})
    except Exception:
        pass
        
    updated_doc = await db.employees.find_one({"_id": ObjectId(employee_id)})
    return fix_id(updated_doc)

async def get_employees(db, skip: int = 0, limit: int = 100):
    cursor = db.employees.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def get_attendance(db, skip: int = 0, limit: int = 100):
    cursor = db.attendance.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def get_leave_requests(db, skip: int = 0, limit: int = 100):
    cursor = db.leave_requests.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def get_announcements(db, skip: int = 0, limit: int = 100):
    cursor = db.announcements.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def get_dashboard_stats(db):
    doc = await db.dashboard_stats.find_one()
    if not doc:
        doc = {
            "id": "default",
            "totalEmployees": 0,
            "presentToday": 0,
            "onLeave": 0,
            "newJoinees": 0,
            "pendingLeaves": 0,
            "upcomingBirthdays": 0,
            "upcomingAnniversaries": 0,
            "lateToday": 0
        }
        
    total_employees = await db.employees.count_documents({"status": "active"})
    
    today = get_now()
    today_str = today.strftime("%Y-%m-%d")
    today_dt_naive = datetime.strptime(today_str, "%Y-%m-%d")
    today_dt_aware = today_dt_naive.replace(tzinfo=IST)
    
    present_today = await db.attendance.count_documents({
        "date": {"$in": [today_dt_naive, today_dt_aware]},
        "status": {"$in": ["Logged", "Active", "On Break"]}
    })
    
    on_leave = await db.attendance.count_documents({
        "date": {"$in": [today_dt_naive, today_dt_aware]},
        "status": "Leave"
    })
    
    pending_leaves = await db.leave_requests.count_documents({
        "status": {"$in": ["Pending", "pending", "Awaiting Approval"]}
    })
    
    late_today = await db.remarks.count_documents({
        "date": {"$in": [today_dt_naive, today_dt_aware]},
        "type": "Late Punch-in",
        "isDeleted": {"$nin": [True, "true", "True"]}
    })
    
    doc["totalEmployees"] = total_employees
    doc["presentToday"] = present_today
    doc["onLeave"] = on_leave
    doc["pendingLeaves"] = pending_leaves
    doc["lateToday"] = late_today
    doc["newJoinees"] = doc.get("newJoinees", 0)
    doc["upcomingBirthdays"] = doc.get("upcomingBirthdays", 0)
    doc["upcomingAnniversaries"] = doc.get("upcomingAnniversaries", 0)
    
    return fix_id(doc)

async def get_analytics_overview(db, months: int = 6):
    today = get_now()
    
    # Department Distribution
    dept_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$department", "employees": {"$sum": 1}}}
    ]
    dept_data = await db.employees.aggregate(dept_pipeline).to_list(length=100)
    department_distribution = [{"name": d["_id"] or "Unknown", "employees": d["employees"]} for d in dept_data if d["_id"]]

    # Leave Distribution
    leave_pipeline = [
        {"$group": {"_id": "$type", "value": {"$sum": 1}}}
    ]
    leave_data = await db.leave_requests.aggregate(leave_pipeline).to_list(length=100)
    leave_distribution = [{"name": l["_id"] or "Other", "value": l["value"]} for l in leave_data]
    
    # Add colors to leave distribution for charts
    colors = ['#3b82f6', '#ef4444', '#f59e0b', '#6b7280', '#10b981', '#8b5cf6']
    for i, l in enumerate(leave_distribution):
        l["color"] = colors[i % len(colors)]

    # Performance Distribution
    perf_pipeline = [
        {"$group": {"_id": "$rating", "count": {"$sum": 1}}}
    ]
    perf_data = await db.kpi_records.aggregate(perf_pipeline).to_list(length=100)
    # Map back to capitalize
    perf_map = {p["_id"].capitalize() if p["_id"] else "Unknown": p["count"] for p in perf_data}
    performance_distribution = [
        {"rating": r, "count": perf_map.get(r, 0)} 
        for r in ["Excellent", "Good", "Average", "Poor"]
    ]

    # Time-based trends (Attendance & Hiring)
    attendance_trend = []
    hiring_trend = []
    
    for i in range(months - 1, -1, -1):
        target_date = today - timedelta(days=30*i)
        month_name = target_date.strftime("%b")
        year = target_date.year
        month_num = target_date.month
        
        # Start and end of that month
        start_dt = datetime(year, month_num, 1)
        if month_num == 12:
            end_dt = datetime(year + 1, 1, 1)
        else:
            end_dt = datetime(year, month_num + 1, 1)
            
        # Make them timezone aware based on IST like the rest of the app
        start_dt = IST.localize(start_dt)
        end_dt = IST.localize(end_dt)
            
        # Attendance Trend
        present = await db.attendance.count_documents({
            "date": {"$gte": start_dt, "$lt": end_dt},
            "status": {"$in": ["Logged", "Active", "On Break", "Present"]}
        })
        absent = await db.attendance.count_documents({
            "date": {"$gte": start_dt, "$lt": end_dt},
            "status": "Absent"
        })
        late = await db.attendance.count_documents({
            "date": {"$gte": start_dt, "$lt": end_dt},
            "isLate": True
        })
        attendance_trend.append({
            "month": month_name,
            "present": present,
            "absent": absent,
            "late": late
        })
        
        # Hiring Trend
        hires = await db.employees.count_documents({
            "joinDate": {"$gte": start_dt, "$lt": end_dt}
        })
        # Simplified exits (employees who are inactive and updated in that month)
        exits = await db.employees.count_documents({
            "status": "inactive",
            "updated_at": {"$gte": start_dt, "$lt": end_dt}
        })
        hiring_trend.append({
            "month": month_name,
            "hires": hires,
            "exits": exits
        })

    # Summary Stats
    total_employees = await db.employees.count_documents({"status": "active"})
    total_attendance = sum([t["present"] + t["absent"] for t in attendance_trend])
    avg_attendance = (sum([t["present"] for t in attendance_trend]) / total_attendance * 100) if total_attendance > 0 else 0
    
    total_perf_scores = await db.kpi_records.aggregate([{"$group": {"_id": None, "avg": {"$avg": "$score"}}}]).to_list(length=1)
    avg_perf = total_perf_scores[0]["avg"] if total_perf_scores else 0
    # Normalize score from 0-100 to 0-5
    avg_perf_5 = round(avg_perf / 20, 1) if avg_perf else 0.0

    total_exits = sum([t["exits"] for t in hiring_trend])
    attrition = round((total_exits / total_employees * 100), 1) if total_employees > 0 else 0

    return {
        "departmentDistribution": department_distribution,
        "attendanceTrend": attendance_trend,
        "leaveDistribution": leave_distribution,
        "hiringTrend": hiring_trend,
        "performanceDistribution": performance_distribution,
        "summaryStats": {
            "totalEmployees": total_employees,
            "avgAttendanceRate": round(avg_attendance),
            "avgPerformanceScore": avg_perf_5,
            "attritionRate": attrition
        }
    }

async def get_payroll(db, skip: int = 0, limit: int = 100):
    cursor = db.payroll.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def get_salary_structures(db, skip: int = 0, limit: int = 100):
    cursor = db.salary_structures.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def get_salary_structure_by_employee(db, employee_id: str):
    # Try finding directly by the ID provided (could be custom ID or MongoDB ID)
    doc = await db.salary_structures.find_one({"employeeId": employee_id})
    if doc:
        return fix_id(doc)
    
    # If not found, check if employee_id is a MongoDB ID and look up the custom ID
    try:
        emp = await db.employees.find_one({"_id": ObjectId(employee_id)})
        if emp:
            doc = await db.salary_structures.find_one({"employeeId": emp.get("employeeId")})
            if doc:
                return fix_id(doc)
    except Exception:
        pass
    return None

async def create_or_update_salary_structure(db, salary: schemas.SalaryStructureCreate):
    salary_dict = salary.dict()
    await db.salary_structures.update_one(
        {"employeeId": salary.employeeId},
        {"$set": salary_dict},
        upsert=True
    )
    
    # Sync monthlyGross back to the employee's salary field
    try:
        emp_filter = {}
        if len(salary.employeeId) == 24:
            from bson import ObjectId
            try:
                emp_filter = {"_id": ObjectId(salary.employeeId)}
            except Exception:
                emp_filter = {"employeeId": salary.employeeId}
        else:
            emp_filter = {"employeeId": salary.employeeId}
            
        await db.employees.update_one(
            emp_filter,
            {"$set": {"salary": salary.monthlyGross}}
        )
    except Exception as e:
        print(f"Error syncing structure monthlyGross back to employee: {e}")

    doc = await db.salary_structures.find_one({"employeeId": salary.employeeId})
    return fix_id(doc)

async def get_bonus_deductions(db, month: str = None, year: int = None):
    query = {}
    if month: query["month"] = month
    if year: query["year"] = year
    cursor = db.bonus_deductions.find(query)
    rows = await cursor.to_list(length=1000)
    return [fix_id(row) for row in rows]

async def get_bonus_deductions_with_remarks(db, month: str = None, year: int = None):
    # 1. Get manual adjustments
    adjustments = await get_bonus_deductions(db, month, year)
    
    # 2. Get penalty types for lookup
    penalty_types = await get_penalty_types(db)
    penalty_names = [p["name"] for p in penalty_types]
    
    # 3. Get remarks
    remark_query = {"isDeleted": {"$nin": [True, "true", "True"]}}
    if month and year:
        try:
            month_num = list(calendar.month_name).index(month)
        except ValueError:
            month_map = {m: i for i, m in enumerate(calendar.month_name)}
            month_num = month_map.get(month.capitalize(), 1)
        
        _, num_days = calendar.monthrange(year, month_num)
        start_dt_naive = datetime(year, month_num, 1)
        end_dt_naive = datetime(year, month_num, num_days, 23, 59, 59)
        start_dt_aware = start_dt_naive.replace(tzinfo=IST)
        end_dt_aware = end_dt_naive.replace(tzinfo=IST)
        remark_query["$or"] = [
            {"date": {"$gte": start_dt_naive, "$lte": end_dt_naive}},
            {"date": {"$gte": start_dt_aware, "$lte": end_dt_aware}}
        ]
    
    cursor = db.remarks.find(remark_query)
    remarks = await cursor.to_list(length=1000)
    
    # 4. Merge remarks that are deductions
    for r in remarks:
        is_penalty = r["type"] in penalty_names or r["type"] == "Late Punch-in"
        if not is_penalty:
            continue
            
        # Avoid duplication if already in bonus_deductions (e.g. Work Rejected)
        # Check by reason/details matching
        if any(a["reason"] in r["details"] or r["details"] in a["reason"] for a in adjustments if a["employeeId"] == r["employeeId"]):
            continue

        r_date = r.get("date")
        r_month = month or "Unknown"
        r_year = year or 2026

        if isinstance(r_date, datetime):
            r_month = r_date.strftime("%B")
            r_year = r_date.year
        elif isinstance(r_date, str):
            try:
                if "T" in r_date or "-" in r_date:
                    parts = r_date.split("T")[0].split("-")
                    if len(parts[0]) == 4:
                        r_year = int(parts[0])
                        month_num = int(parts[1])
                    else:
                        r_year = int(parts[2])
                        month_num = int(parts[1])
                    r_month = calendar.month_name[month_num]
                else:
                    date_parts = r_date.split(" ")
                    r_month = date_parts[0].replace(",", "")
                    r_year = int(date_parts[-1])
            except Exception:
                pass

        # Always calculate one-day salary dynamically for Late Punch-in
        if r["type"] == "Late Punch-in":
            salary_struct = await get_salary_structure_by_employee(db, r["employeeId"])
            if salary_struct:
                try:
                    if isinstance(r_date, datetime):
                        month_num = r_date.month
                        curr_year = r_date.year
                    else:
                        if "T" in r_date or "-" in r_date:
                            parts = r_date.split("T")[0].split("-")
                            if len(parts[0]) == 4:
                                curr_year = int(parts[0])
                                month_num = int(parts[1])
                            else:
                                curr_year = int(parts[2])
                                month_num = int(parts[1])
                        else:
                            date_parts = r_date.split(" ")
                            r_month_name = date_parts[0].replace(",", "")
                            curr_year = int(date_parts[-1])
                            try:
                                month_num = list(calendar.month_abbr).index(r_month_name)
                            except ValueError:
                                month_num = list(calendar.month_name).index(r_month_name)
                        
                    _, num_days = calendar.monthrange(curr_year, month_num)
                    
                    sundays = sum(1 for d in range(1, num_days + 1) if calendar.weekday(curr_year, month_num, d) == 6)
                    
                    # Count Holidays for the company
                    try:
                        from bson import ObjectId
                        emp = await db.employees.find_one({"_id": ObjectId(r["employeeId"])} if len(r["employeeId"]) == 24 else {"employeeId": r["employeeId"]})
                    except Exception:
                        emp = await db.employees.find_one({"employeeId": r["employeeId"]})
                    emp_company = emp.get("company") if emp else None
                    start_dt_naive = datetime(curr_year, month_num, 1)
                    end_dt_naive = datetime(curr_year, month_num, num_days, 23, 59, 59)
                    start_dt_aware = start_dt_naive.replace(tzinfo=IST)
                    end_dt_aware = end_dt_naive.replace(tzinfo=IST)
                    holiday_query = {
                        "$or": [
                            {"date": {"$gte": start_dt_naive, "$lte": end_dt_naive}},
                            {"date": {"$gte": start_dt_aware, "$lte": end_dt_aware}}
                        ]
                    }
                    if emp_company:
                        holiday_query["$or"] = [
                            {"$and": [{"company": emp_company}, {"$or": [{"date": {"$gte": start_dt_naive, "$lte": end_dt_naive}}, {"date": {"$gte": start_dt_aware, "$lte": end_dt_aware}}]}]},
                            {"$and": [{"company": {"$in": [None, "", "null"]}}, {"$or": [{"date": {"$gte": start_dt_naive, "$lte": end_dt_naive}}, {"date": {"$gte": start_dt_aware, "$lte": end_dt_aware}}]}]}
                        ]
                    month_holidays = await db.holidays.find(holiday_query).to_list(length=31)
                    
                    unique_holidays = 0
                    for h in month_holidays:
                        h_date = h.get("date")
                        h_date_str = h_date.strftime("%Y-%m-%d") if isinstance(h_date, (date, datetime)) else str(h_date)
                        if h_date_str not in [f"{curr_year}-{str(month_num).zfill(2)}-{str(d).zfill(2)}" for d in range(1, num_days + 1) if calendar.weekday(curr_year, month_num, d) == 6]:
                            unique_holidays += 1
                            
                    total_working_days = max(1, num_days - sundays - unique_holidays)
                    p_amount = round(salary_struct["monthlyGross"] / total_working_days, 2)
                except Exception as e:
                    print(f"Error calculating p_amount in merged list: {e}")
                    p_amount = round(salary_struct["monthlyGross"] / 30, 2)
        else:
            p_amount = next((p["amount"] for p in penalty_types if p["name"] == r["type"]), 0)

        r_date_str = None
        if isinstance(r_date, datetime):
            r_date_str = r_date.strftime("%Y-%m-%d")
        elif isinstance(r_date, str):
            if "T" in r_date:
                r_date_str = r_date.split("T")[0]
            elif "-" in r_date:
                r_date_str = r_date
            else:
                try:
                    dt = datetime.strptime(r_date, "%b %d, %Y")
                    r_date_str = dt.strftime("%Y-%m-%d")
                except Exception:
                    try:
                        dt = datetime.strptime(r_date, "%B %d, %Y")
                        r_date_str = dt.strftime("%Y-%m-%d")
                    except Exception:
                        r_date_str = r_date

        adjustments.append({
            "id": f"remark_{str(r['_id'])}",
            "employeeId": r["employeeId"],
            "month": r_month,
            "year": r_year,
            "type": "deduction",
            "amount": p_amount, # Note: Late punch will show 0 here as it's calculated at payroll
            "reason": f"[Remark] {r['type']}: {r['details']}",
            "status": "active",
            "date": r_date_str
        })
        
    return adjustments

async def create_bonus_deduction(db, item: schemas.BonusDeductionCreate):
    item_dict = item.dict()
    result = await db.bonus_deductions.insert_one(item_dict)
    doc = await db.bonus_deductions.find_one({"_id": result.inserted_id})
    return fix_id(doc)

async def run_payroll_processing(db, month: str, year: int):
    # 1. Get all employees
    employees = await get_employees(db, limit=1000)
    
    # 2. Get days in month
    try:
        month_num = list(calendar.month_name).index(month)
    except ValueError:
        # Fallback if month is abbreviated or case-different
        month_map = {m: i for i, m in enumerate(calendar.month_name)}
        month_num = month_map.get(month.capitalize(), 1)
        
    _, num_days = calendar.monthrange(year, month_num)
    
    penalty_types = await get_penalty_types(db)
    system_settings = await get_system_settings(db)
    late_punch_deduction_enabled = system_settings.get("latePunchDeductionEnabled", True)
    payroll_results = []
    
    for emp in employees:
        emp_id = emp["id"]
        # Skip inactive and admin employees to avoid generating unnecessary payroll records
        if emp.get("status", "").lower() == "inactive" or emp.get("role", "").lower() == "admin":
            await db.payroll.delete_many({"employeeId": emp_id, "month": month, "year": year})
            continue
        # Get salary structure
        salary = await get_salary_structure_by_employee(db, emp_id)
        if not salary:
            continue 
            
        # Start/End date strings
        start_date_str = f"{year}-{str(month_num).zfill(2)}-01"
        end_date_str = f"{year}-{str(month_num).zfill(2)}-{num_days}"
        
        # Count Weekends (Sundays only)
        sundays = 0
        sunday_dates = []
        for d in range(1, num_days + 1):
            if calendar.weekday(year, month_num, d) == 6: # Sunday
                sundays += 1
                sunday_dates.append(f"{year}-{str(month_num).zfill(2)}-{str(d).zfill(2)}")
        
        # Count Holidays for this employee's company
        emp_company = emp.get("company")
        holiday_start_dt = datetime(year, month_num, 1, tzinfo=IST)
        holiday_end_dt = datetime(year, month_num, num_days, 23, 59, 59, tzinfo=IST)
        holiday_query = {
            "date": {"$gte": holiday_start_dt, "$lte": holiday_end_dt}
        }
        if emp_company:
            # Match specific company holidays OR global holidays (where company is null/empty)
            holiday_query["$or"] = [
                {"company": emp_company},
                {"company": None},
                {"company": ""}
            ]
        
        holidays_cursor = db.holidays.find(holiday_query)
        month_holidays = await holidays_cursor.to_list(length=31)
        
        unique_holidays = 0
        for h in month_holidays:
            # Only count holiday if it doesn't fall on a Sunday
            h_date_str = h["date"].strftime("%Y-%m-%d") if isinstance(h["date"], (date, datetime)) else h["date"]
            if h_date_str not in sunday_dates:
                unique_holidays += 1

        # 1. Map out approved leaves for this month with deduction factors
        # Robust query checking both camelCase and snake_case for employee ID, and case-insensitive status
        leave_cursor = db.leave_requests.find({
            "$or": [
                {"employee_id": emp_id},
                {"employeeId": emp_id}
            ],
            "status": {"$in": ["Approved", "approved"]}
        })
        all_emp_leaves = await leave_cursor.to_list(length=100)
        
        leave_map = {} # date -> {"factor": factor, "type": leave_type}
        for l in all_emp_leaves:
            try:
                # Robust day type & half day detection (handles strings, booleans, case differences)
                day_type_str = str(l.get("day_type") or l.get("dayType") or "").strip().lower()
                is_half = (
                    l.get("half_day") == True or 
                    l.get("halfDay") == True or 
                    l.get("half_day") in [True, "true", "True"] or
                    l.get("halfDay") in [True, "true", "True"] or
                    day_type_str in ["half day", "first half", "second half", "half-day"]
                )
                factor = 0.5 if is_half else 1.0
                l_type = str(l.get("type") or l.get("leaveType") or "annual").strip().lower()
                
                # Check both snake_case and camelCase for dates
                raw_start = l.get("start_date") or l.get("startDate")
                raw_end = l.get("end_date") or l.get("endDate")
                
                if not raw_start or not raw_end:
                    continue

                # Try to parse different date formats robustly (handles datetime, date, str)
                def parse_date(val):
                    if not val:
                        return None
                    if isinstance(val, datetime):
                        return val
                    if isinstance(val, date):
                        return datetime.combine(val, datetime.min.time())
                    if not isinstance(val, str):
                        return None
                    val_str = val.strip()
                    if "T" in val_str:
                        val_str = val_str.split("T")[0]
                    elif " " in val_str:
                        val_str = val_str.split(" ")[0]
                    for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
                        try:
                            return datetime.strptime(val_str.strip(), fmt)
                        except ValueError:
                            continue
                    return None

                s = parse_date(raw_start)
                e = parse_date(raw_end)
                
                if not s or not e:
                    continue

                # Clean tzinfo to avoid comparison crashes
                if s.tzinfo is not None:
                    s = s.replace(tzinfo=None)
                if e.tzinfo is not None:
                    e = e.replace(tzinfo=None)

                curr = s
                while curr <= e:
                    # Only map if it falls within the requested month
                    if curr.month == month_num and curr.year == year:
                        d_str = curr.strftime("%Y-%m-%d")
                        if d_str in leave_map:
                            if factor > leave_map[d_str]["factor"]:
                                leave_map[d_str] = {"factor": factor, "type": l_type}
                        else:
                            leave_map[d_str] = {"factor": factor, "type": l_type}
                    curr += timedelta(days=1)
                    # Safety break to prevent infinite loops
                    if (curr - s).days > 365:
                        break
            except Exception as ex:
                print(f"Robust leave parse error: {ex}")
                pass

        # 2. Map out actual presence
        att_start_dt_naive = datetime.strptime(start_date_str, "%Y-%m-%d")
        att_end_dt_naive = datetime.strptime(end_date_str, "%Y-%m-%d") + timedelta(days=1)
        att_start_dt_aware = att_start_dt_naive.replace(tzinfo=IST)
        att_end_dt_aware = (att_end_dt_naive - timedelta(seconds=1)).replace(tzinfo=IST)
        
        attendance_cursor = db.attendance.find({
            "employeeId": emp_id,
            "$or": [
                {"date": {"$gte": att_start_dt_naive, "$lt": att_end_dt_naive}},
                {"date": {"$gte": att_start_dt_aware, "$lte": att_end_dt_aware}}
            ]
        })
        attendance_records = await attendance_cursor.to_list(length=100)
        attendance_dates = {
            att["date"].strftime("%Y-%m-%d") if isinstance(att["date"], (date, datetime)) else att["date"]
            for att in attendance_records
        }
        
        # 3. Calculate worked/absent based on priority: Leave > Attendance
        sunday_dates_set = set(sunday_dates)
        holiday_dates_set = {
            h["date"].strftime("%Y-%m-%d") if isinstance(h["date"], (date, datetime)) else h["date"]
            for h in month_holidays if "date" in h
        }
        
        actual_worked_days = 0.0
        half_day_leave_days = 0.0
        full_day_leave_days = 0.0
        monthly_leave_days = 0.0  # Only "annual" type leaves
        paid_monthly_leave_days = 0.0
        unapproved_absent_days = 0.0
        attendance_present_days = 0.0
 
        for d in range(1, num_days + 1):
            date_str = f"{year}-{str(month_num).zfill(2)}-{str(d).zfill(2)}"
            
            # We only care about scheduled working days
            if date_str not in sunday_dates_set and date_str not in holiday_dates_set:
                if date_str in leave_map:
                    leave_info = leave_map[date_str]
                    factor = leave_info["factor"]
                    l_type = leave_info["type"]
                    
                    if factor == 0.5:
                        half_day_leave_days += 0.5
                        attendance_present_days += 0.5 # Worked the other half of the day
                        if l_type in ["annual", "monthly leave", "monthly_leave"]:
                            monthly_leave_days += 0.5
                        if l_type in ["monthly leave", "monthly_leave"]:
                            paid_monthly_leave_days += 0.5
                    else:
                        full_day_leave_days += 1.0
                        if l_type in ["annual", "monthly leave", "monthly_leave"]:
                            monthly_leave_days += 1.0
                        if l_type in ["monthly leave", "monthly_leave"]:
                            paid_monthly_leave_days += 1.0
                elif date_str in attendance_dates:
                    attendance_present_days += 1.0
                else:
                    unapproved_absent_days += 1.0
        
        allowed_leaves = 0.0
        total_leaves_taken = full_day_leave_days + half_day_leave_days
        
        # Calculate Loss of Pay (LOP) days (excluding paid monthly leaves)
        lop_days = max(0.0, total_leaves_taken - paid_monthly_leave_days) + unapproved_absent_days
        actual_worked_days = attendance_present_days
        deducted_leaves = 0.0
        
        total_working_days = num_days - sundays - unique_holidays
        per_day_gross = salary["monthlyGross"] / total_working_days
        lop_amount = lop_days * per_day_gross
        
        deduction_details = []
        if deducted_leaves > 0:
            deduction_details.append(f"Paid Leave Allowance - {round(deducted_leaves, 1)} day(s) applied")
            
        if lop_days > unapproved_absent_days:
            unpaid_leaves = lop_days - unapproved_absent_days
            deduction_details.append(f"Unpaid Leave - {round(unpaid_leaves, 1)} day(s): ₹{round(unpaid_leaves * per_day_gross, 2)}")
            
        if unapproved_absent_days > 0:
            deduction_details.append(f"Unpaid Absence - {round(unapproved_absent_days, 1)} day(s): ₹{round(unapproved_absent_days * per_day_gross, 2)}")

        # Ad-hoc Bonus/Deductions
        adjustments = await get_bonus_deductions(db, month, year)
        emp_adjustments = [a for a in adjustments if a["employeeId"] == emp_id and a["status"] == "active"]
        
        # Recalculate Sales Targets to ensure fresh data for payroll
        targets_cursor = db.sales_targets.find({
            "employeeId": emp_id,
            "month": month,
            "year": year
        })
        targets = await targets_cursor.to_list(length=10)
        for t in targets:
            await recalculate_sales_target(db, emp_id, month, year, t.get("type", "Monthly"), t.get("week"))

        # Fetch Sales Incentive
        sales_target = await db.sales_targets.find_one({
            "employeeId": emp_id,
            "month": month,
            "year": year,
            "type": "Monthly" # Usually payroll uses monthly incentive
        })
        incentive_amount = sales_target.get("incentiveAmount", 0) if sales_target else 0

        total_bonus = 0
        total_adhoc_deduction = 0
        penalty_total = 0
        for a in emp_adjustments:
            if a["type"] == "bonus":
                total_bonus += a["amount"]
            elif a["type"] == "deduction":
                if "rejected by Team Leader" in a["reason"] or "Work rejected by TL" in a["reason"]:
                    penalty_total += per_day_gross
                    deduction_details.append(f"{a['reason']}: ₹{round(per_day_gross, 2)}")
                else:
                    total_adhoc_deduction += a["amount"]
                    deduction_details.append(f"{a['reason']}: ₹{a.get('amount', 0)}")
        
        # Add sales incentive to allowances (previously bonus)
        # We will track it in deduction_details but it will be added to allowances field
        if incentive_amount > 0:
            deduction_details.append(f"Sales Incentive: ₹{incentive_amount}")
        
        # Fetch Penalties from Remarks
        try:
            rem_month_num = list(calendar.month_name).index(month)
        except ValueError:
            rem_month_map = {m: i for i, m in enumerate(calendar.month_name)}
            rem_month_num = rem_month_map.get(month.capitalize(), 1)
        
        _, rem_num_days = calendar.monthrange(year, rem_month_num)
        rem_start_dt_naive = datetime(year, rem_month_num, 1)
        rem_end_dt_naive = datetime(year, rem_month_num, rem_num_days, 23, 59, 59)
        rem_start_dt_aware = rem_start_dt_naive.replace(tzinfo=IST)
        rem_end_dt_aware = rem_end_dt_naive.replace(tzinfo=IST)
        
        remark_query = {
            "employeeId": emp_id,
            "isDeleted": {"$nin": [True, "true", "True"]},
            "$or": [
                {"date": {"$gte": rem_start_dt_naive, "$lte": rem_end_dt_naive}},
                {"date": {"$gte": rem_start_dt_aware, "$lte": rem_end_dt_aware}}
            ]
        }
        remarks_cursor = db.remarks.find(remark_query)
        emp_remarks = await remarks_cursor.to_list(length=100)
            
        for r in emp_remarks:
            remark_type = r.get("type")
            r_date_val = r.get("date")
            r_date_str = r_date_val.strftime("%d-%m-%Y") if isinstance(r_date_val, (date, datetime)) else str(r_date_val)
            
            if remark_type == "Late Punch-in":
                if late_punch_deduction_enabled:
                    penalty_total += per_day_gross
                    deduction_details.append(f"Late Punch-in ({r_date_str}): ₹{round(per_day_gross, 2)}")
                continue

            p_amount = next((p["amount"] for p in penalty_types if p["name"] == remark_type), 0)
            if p_amount > 0:
                penalty_total += p_amount
                deduction_details.append(f"{r['type']} ({r_date_str}): ₹{p_amount}")
        
        # Fetch existing payroll to preserve custom security deposit and return amounts
        existing_payroll = await db.payroll.find_one({"employeeId": emp_id, "month": month, "year": year})
        deposit_deduction = existing_payroll.get("securityDeposit", 0.0) if existing_payroll else 0.0
        returned_deposit = existing_payroll.get("returnedDeposit", 0.0) if existing_payroll else 0.0
        
        if deposit_deduction > 0:
            deduction_details.append(f"Security Deposit: ₹{deposit_deduction}")

        net_salary = (salary["monthlyGross"] - lop_amount + total_bonus + incentive_amount + returned_deposit - total_adhoc_deduction - penalty_total) - (salary["pf"] + salary["esi"] + salary["professionalTax"] + salary["tds"] + deposit_deduction)
        
        payroll_record = {
            "employeeId": emp_id,
            "employeeName": emp["name"],
            "month": month,
            "year": year,
            "totalWorkingDays": int(total_working_days),
            "workedDays": round(actual_worked_days, 1),
            "leaveDays": round(half_day_leave_days + full_day_leave_days - monthly_leave_days, 1),
            "monthlyLeaveDays": round(monthly_leave_days, 1),
            "lopDays": round(lop_days, 1),
            "basicSalary": salary["basic"],
            "allowances": salary["hra"] + salary["conveyance"] + salary["medical"] + salary["specialAllowance"] + incentive_amount,
            "bonus": total_bonus,
            "deductions": salary["pf"] + salary["esi"] + salary["professionalTax"] + salary["tds"] + lop_amount + total_adhoc_deduction + penalty_total + deposit_deduction,
            "penalty": penalty_total,
            "securityDeposit": deposit_deduction,
            "returnedDeposit": returned_deposit,
            "netSalary": round(net_salary, 2),
            "status": existing_payroll.get("status", "processed") if existing_payroll else "processed",
            "deductionRemarks": "; ".join(deduction_details)
        }
        
        await db.payroll.update_one(
            {"employeeId": emp_id, "month": month, "year": year},
            {"$set": payroll_record},
            upsert=True
        )
        
        doc = await db.payroll.find_one({"employeeId": emp_id, "month": month, "year": year})
        payroll_results.append(fix_id(doc))
        
    return payroll_results

async def create_employee(db, employee: schemas.EmployeeCreate):
    is_admin = employee.role and employee.role.lower() == "admin"
    
    if not is_admin:
        # Atomic counter to prevent duplicate IDs under concurrent requests
        counter = await db.counters.find_one_and_update(
            {"_id": "employee_id"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True
        )
        next_id = f"EMP{str(counter['seq']).zfill(3)}"
    else:
        next_id = employee.employeeId
    
    # Calculate full name
    name = f"{employee.firstName} {employee.lastName}"
    if employee.middleName:
        name = f"{employee.firstName} {employee.middleName} {employee.lastName}"
    
    employee_dict = employee.dict()
    employee_dict["name"] = name
    
    if next_id:
        employee_dict["employeeId"] = next_id # Override frontend generation unless it's admin with no ID provided
    else:
        # If admin and no ID provided, just don't set or keep whatever is in employee.employeeId
        pass

    
    result = await db.employees.insert_one(employee_dict)
    employee_dict["id"] = str(result.inserted_id)
    if "_id" in employee_dict:
        employee_dict.pop("_id")
    
    if employee.salary is not None and employee.salary > 0:
        await sync_employee_salary_to_structure(db, employee_dict["id"], employee.salary)
        
    try:
        await ws_manager.broadcast_all("data_refresh", {"entity": "employees"})
    except Exception:
        pass
        
    return employee_dict

# Department CRUD
async def get_departments(db, skip: int = 0, limit: int = 100):
    cursor = db.departments.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    results = []
    for row in rows:
        row = fix_id(row)
        # Automatic employee count based on department name
        row["employeeCount"] = await db.employees.count_documents({"department": row["name"]})
        results.append(row)
    return results

async def create_department(db, department: schemas.DepartmentCreate):
    department_dict = department.dict()
    result = await db.departments.insert_one(department_dict)
    department_dict["id"] = str(result.inserted_id)
    if "_id" in department_dict:
        department_dict.pop("_id")
    return department_dict

async def update_department(db, department_id: str, department_update: schemas.DepartmentUpdate):
    update_data = department_update.dict(exclude_unset=True)
    await db.departments.update_one(
        {"_id": ObjectId(department_id)},
        {"$set": update_data}
    )
    updated_doc = await db.departments.find_one({"_id": ObjectId(department_id)})
    return fix_id(updated_doc)

async def delete_department(db, department_id: str):
    await db.departments.delete_one({"_id": ObjectId(department_id)})
    return True

# Designation CRUD
async def get_designations(db, skip: int = 0, limit: int = 100):
    cursor = db.designations.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def create_designation(db, designation: schemas.DesignationCreate):
    designation_dict = designation.dict()
    result = await db.designations.insert_one(designation_dict)
    designation_dict["id"] = str(result.inserted_id)
    if "_id" in designation_dict:
        designation_dict.pop("_id")
    return designation_dict

async def update_designation(db, designation_id: str, designation_update: schemas.DesignationUpdate):
    update_data = designation_update.dict(exclude_unset=True)
    await db.designations.update_one(
        {"_id": ObjectId(designation_id)},
        {"$set": update_data}
    )
    updated_doc = await db.designations.find_one({"_id": ObjectId(designation_id)})
    return fix_id(updated_doc)

async def delete_designation(db, designation_id: str):
    await db.designations.delete_one({"_id": ObjectId(designation_id)})
    return True

# Generic CRUD Helpers
async def get_items(db, collection_name: str, skip: int = 0, limit: int = 100):
    cursor = db[collection_name].find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def create_item(db, collection_name: str, item_data: dict):
    result = await db[collection_name].insert_one(item_data)
    item_data["id"] = str(result.inserted_id)
    if "_id" in item_data:
        item_data.pop("_id")
    return item_data

async def update_item(db, collection_name: str, item_id: str, update_data: dict):
    await db[collection_name].update_one(
        {"_id": ObjectId(item_id)},
        {"$set": update_data}
    )
    updated_doc = await db[collection_name].find_one({"_id": ObjectId(item_id)})
    return fix_id(updated_doc)

async def delete_item(db, collection_name: str, item_id: str):
    await db[collection_name].delete_one({"_id": ObjectId(item_id)})
    return True

# Specific Collection Implementations
async def get_companies(db, skip: int = 0, limit: int = 100): return await get_items(db, "companies", skip, limit)
async def create_company(db, company: schemas.CompanyCreate): return await create_item(db, "companies", company.dict())
async def update_company(db, company_id: str, update: schemas.CompanyUpdate): return await update_item(db, "companies", company_id, update.dict(exclude_unset=True))
async def delete_company(db, company_id: str): return await delete_item(db, "companies", company_id)

async def get_roles(db, skip: int = 0, limit: int = 100): return await get_items(db, "roles", skip, limit)
async def create_role(db, role: schemas.RoleCreate): return await create_item(db, "roles", role.dict())
async def update_role(db, role_id: str, update: schemas.RoleUpdate): return await update_item(db, "roles", role_id, update.dict(exclude_unset=True))
async def delete_role(db, role_id: str): return await delete_item(db, "roles", role_id)

async def get_relations(db, skip: int = 0, limit: int = 100): return await get_items(db, "relations", skip, limit)
async def create_relation(db, relation: schemas.RelationCreate): return await create_item(db, "relations", relation.dict())
async def update_relation(db, relation_id: str, update: schemas.RelationUpdate): return await update_item(db, "relations", relation_id, update.dict(exclude_unset=True))
async def delete_relation(db, relation_id: str): return await delete_item(db, "relations", relation_id)


async def get_job_openings(db, skip: int = 0, limit: int = 100): return await get_items(db, "job_openings", skip, limit)
async def create_job_opening(db, job: schemas.JobOpeningCreate): return await create_item(db, "job_openings", job.dict())
async def update_job_opening(db, job_id: str, update: schemas.JobOpeningUpdate): return await update_item(db, "job_openings", job_id, update.dict(exclude_unset=True))
async def delete_job_opening(db, job_id: str): return await delete_item(db, "job_openings", job_id)

async def get_applications(db, skip: int = 0, limit: int = 100): return await get_items(db, "applications", skip, limit)
async def create_application(db, app: schemas.ApplicationCreate): 
    app_dict = app.dict()
    performedBy = app_dict.pop("performedBy", "Unknown")
    userName = app_dict.pop("userName", "Unknown User")
    
    result = await create_item(db, "applications", app_dict)
    
    # Increment the application count for the job opening
    job_title = app_dict.get("jobTitle")
    if job_title:
        await db.job_openings.update_one(
            {"title": job_title},
            {"$inc": {"applications": 1}}
        )
    
    await log_activity(db, "Created", performedBy, userName, f"Candidate '{app_dict.get('candidateName')}' was added to the system.", applicationId=result["id"])
    
    return result

async def update_application(db, app_id: str, update: schemas.ApplicationUpdate):
    # Fetch existing to check for status change and job title change
    existing = await db.applications.find_one({"_id": ObjectId(app_id)})
    update_dict = update.dict(exclude_unset=True)
    
    performedBy = update_dict.pop("performedBy", "Unknown")
    userName = update_dict.pop("userName", "Unknown User")
    
    await db.applications.update_one(
        {"_id": ObjectId(app_id)},
        {"$set": update_dict}
    )
    
    if existing:
        details = []
        if "status" in update_dict and existing.get("status") != update_dict["status"]:
            details.append(f"Status changed from '{existing.get('status')}' to '{update_dict['status']}'")
            
            # Map hiring board stage back to referral status
            STAGE_TO_REFERRAL_STATUS = {
                "new": "Contacted",
                "tl_approved": "TL Approved",
                "interview": "Scheduled Interview",
                "selected": "Selected",
                "rejected": "Rejected"
            }
            ref_status = STAGE_TO_REFERRAL_STATUS.get(update_dict["status"])
            if ref_status:
                await db.referrals.update_many(
                    {
                        "candidateName": existing.get("candidateName"),
                        "phone": existing.get("phone")
                    },
                    {"$set": {"status": ref_status}}
                )

            # Auto close Job Opening when candidate is selected
            if update_dict["status"] == "selected":
                job_title = update_dict.get("jobTitle") or existing.get("jobTitle")
                if job_title:
                    await db.job_openings.update_one(
                        {"title": job_title},
                        {"$set": {"status": "closed"}}
                    )
            # Auto reopen Job Opening when candidate is moved from Selected to Rejected (or other stages)
            elif existing.get("status") == "selected" and update_dict["status"] != "selected":
                job_title = update_dict.get("jobTitle") or existing.get("jobTitle")
                if job_title:
                    await db.job_openings.update_one(
                        {"title": job_title},
                        {"$set": {"status": "open"}}
                    )

        # Handle job title changes and update counts
        if "jobTitle" in update_dict and existing.get("jobTitle") != update_dict["jobTitle"]:
            old_job = existing.get("jobTitle")
            new_job = update_dict["jobTitle"]
            if old_job:
                await db.job_openings.update_one({"title": old_job}, {"$inc": {"applications": -1}})
            if new_job:
                await db.job_openings.update_one({"title": new_job}, {"$inc": {"applications": 1}})

        if "interviewerId" in update_dict and existing.get("interviewerId") != update_dict["interviewerId"]:
            details.append(f"Interviewer assigned: {update_dict.get('interviewerName')}")
        if "interviewDate" in update_dict and existing.get("interviewDate") != update_dict["interviewDate"]:
            details.append(f"Interview scheduled for {update_dict['interviewDate']} at {update_dict.get('interviewTime')}")
            
        if details:
            log_details = f"Candidate '{existing.get('candidateName')}': " + ", ".join(details)
            await log_activity(db, "Updated", performedBy, userName, log_details, applicationId=app_id)
    
    # If moved to interview and has an interviewer, notify them
    if existing and update_dict.get("status") == "interview" and existing.get("status") != "interview":
        interviewer_id = update_dict.get("interviewerId") or existing.get("interviewerId")
        if interviewer_id:
            await create_notification(db, schemas.NotificationCreate(
                employee_id=interviewer_id,
                title="New Interview Assigned",
                message=f"You have been assigned an interview for {update_dict.get('candidateName') or existing.get('candidateName')} on {update_dict.get('interviewDate') or existing.get('interviewDate')} at {update_dict.get('interviewTime') or existing.get('interviewTime')}.",
                type="recruitment",
                created_at=get_now().strftime("%d-%m-%Y %H:%M")
            ))
            
    updated_doc = await db.applications.find_one({"_id": ObjectId(app_id)})
    return fix_id(updated_doc)
async def delete_application(db, app_id: str):
    existing = await db.applications.find_one({"_id": ObjectId(app_id)})
    if existing:
        job_title = existing.get("jobTitle")
        if job_title:
            await db.job_openings.update_one(
                {"title": job_title},
                {"$inc": {"applications": -1}}
            )
    return await delete_item(db, "applications", app_id)

async def get_interns(db, skip: int = 0, limit: int = 100): return await get_items(db, "interns", skip, limit)
async def create_intern(db, intern: schemas.InternCreate): return await create_item(db, "interns", intern.dict())
async def update_intern(db, intern_id: str, update: schemas.InternUpdate): return await update_item(db, "interns", intern_id, update.dict(exclude_unset=True))
async def delete_intern(db, intern_id: str): return await delete_item(db, "interns", intern_id)

async def get_assets(db, skip: int = 0, limit: int = 100):
    cursor = db.assets.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    results = []
    for row in rows:
        row = fix_id(row)
        # Compatibility mapping
        if "type" in row and "category" not in row:
            row["category"] = row.pop("type")
        if "assetId" not in row:
            row["assetId"] = f"ASSET-{row['id'][-4:].upper()}"
        results.append(row)
    return results
async def create_asset(db, asset: schemas.AssetCreate):
    asset_dict = asset.dict()
    performedBy = asset_dict.pop("performedBy", "System")
    userName = asset_dict.pop("userName", "System User")
    
    result = await create_item(db, "assets", asset_dict)
    await log_activity(db, "Created", performedBy, userName, f"Asset '{asset_dict['name']}' ({asset_dict.get('assetId', 'N/A')}) was created and added to inventory.", assetId=result["id"])
    return result

async def update_asset(db, asset_id: str, update: schemas.AssetUpdate):
    existing = await db.assets.find_one({"_id": ObjectId(asset_id)})
    update_dict = update.dict(exclude_unset=True)
    performedBy = update_dict.pop("performedBy", "System")
    userName = update_dict.pop("userName", "System User")
    
    await db.assets.update_one(
        {"_id": ObjectId(asset_id)},
        {"$set": update_dict}
    )
    
    if existing:
        changes = []
        if "status" in update_dict and existing.get("status") != update_dict["status"]:
            changes.append(f"Status changed from '{existing.get('status')}' to '{update_dict['status']}'")
        if "assignedTo" in update_dict and existing.get("assignedTo") != update_dict["assignedTo"]:
            old_assign = existing.get("assignedTo") or "Unassigned"
            new_assign = update_dict["assignedTo"] or "Unassigned"
            changes.append(f"Assignment changed from '{old_assign}' to '{new_assign}'")
        if "condition" in update_dict and existing.get("condition") != update_dict["condition"]:
            changes.append(f"Condition updated from '{existing.get('condition')}' to '{update_dict['condition']}'")
        if "location" in update_dict and existing.get("location") != update_dict["location"]:
            changes.append(f"Location changed from '{existing.get('location')}' to '{update_dict['location']}'")
            
        if not changes:
            changes.append("General asset details updated")
            
        log_details = f"Asset '{existing.get('name')}' ({existing.get('assetId', 'N/A')}): " + ", ".join(changes)
        await log_activity(db, "Updated", performedBy, userName, log_details, assetId=asset_id)
        
    updated_doc = await db.assets.find_one({"_id": ObjectId(asset_id)})
    return fix_id(updated_doc)

async def delete_asset(db, asset_id: str, performedBy: str = None, userName: str = None):
    existing = await db.assets.find_one({"_id": ObjectId(asset_id)})
    asset_name = existing.get("name", "Unknown Asset") if existing else "Unknown Asset"
    asset_code = existing.get("assetId", "N/A") if existing else "N/A"
    
    result = await delete_item(db, "assets", asset_id)
    if result:
        await log_activity(db, "Deleted", performedBy or "System", userName or "System User", f"Asset '{asset_name}' ({asset_code}) was deleted from inventory.", assetId=asset_id)
        if existing and existing.get("category"):
            await db.asset_categories.update_one(
                {"name": existing.get("category")},
                {"$inc": {"totalItems": -1}}
            )
    return result

async def get_expense_claims(db, skip: int = 0, limit: int = 100): return await get_items(db, "expense_claims", skip, limit)
async def create_expense_claim(db, claim: schemas.ExpenseClaimCreate): return await create_item(db, "expense_claims", claim.dict())
async def update_expense_claim(db, claim_id: str, update: schemas.ExpenseClaimUpdate): return await update_item(db, "expense_claims", claim_id, update.dict(exclude_unset=True))
async def delete_expense_claim(db, claim_id: str): return await delete_item(db, "expense_claims", claim_id)

async def get_holidays(db, skip: int = 0, limit: int = 100): return await get_items(db, "holidays", skip, limit)
async def create_holiday(db, holiday: schemas.HolidayCreate): return await create_item(db, "holidays", holiday.dict())
async def create_holidays_bulk(db, payload: schemas.HolidayBulkCreate):
    holidays_data = [h.dict() for h in payload.holidays]
    if not holidays_data:
        return {"inserted": 0}
        
    # Find the years of the holidays being inserted
    years = set()
    for h_data in holidays_data:
        date_val = h_data.get("date")
        if isinstance(date_val, datetime):
            years.add(date_val.year)
        elif isinstance(date_val, date):
            years.add(date_val.year)
        elif isinstance(date_val, str):
            try:
                # Basic parsing assuming it starts with year like YYYY-MM-DD
                years.add(int(date_val[:4]))
            except ValueError:
                pass
                
    # Delete existing National public holidays for these years to prevent duplicates
    for year in years:
        year_str = str(year)
        
        # 1. Delete if date is stored as datetime
        await db.holidays.delete_many({
            "type": "National",
            "$or": [
                {"company": ""},
                {"company": None},
                {"company": {"$exists": False}}
            ],
            "date": {"$gte": datetime(year, 1, 1), "$lte": datetime(year, 12, 31, 23, 59, 59)}
        })
        
        # 2. Delete if date is stored as string
        await db.holidays.delete_many({
            "type": "National",
            "$or": [
                {"company": ""},
                {"company": None},
                {"company": {"$exists": False}}
            ],
            "date": {"$type": "string", "$regex": f"^{year_str}"}
        })
        
    # using insert_many directly from Motor on our timestamped db
    result = await db.holidays.insert_many(holidays_data)
    return {"inserted": len(result.inserted_ids)}
async def update_holiday(db, holiday_id: str, update: schemas.HolidayUpdate): return await update_item(db, "holidays", holiday_id, update.dict(exclude_unset=True))
async def delete_holiday(db, holiday_id: str): return await delete_item(db, "holidays", holiday_id)
async def delete_all_holidays(db): return await db.holidays.delete_many({})

async def get_kpi_records(db, skip: int = 0, limit: int = 100): return await get_items(db, "kpi_records", skip, limit)
async def create_kpi_record(db, kpi: schemas.KPICreate): return await create_item(db, "kpi_records", kpi.dict())
async def update_kpi_record(db, kpi_id: str, update: schemas.KPIUpdate): return await update_item(db, "kpi_records", kpi_id, update.dict(exclude_unset=True))
async def delete_kpi_record(db, kpi_id: str): return await delete_item(db, "kpi_records", kpi_id)

async def get_reviews(db, employee_id: str = None, skip: int = 0, limit: int = 100):
    query = {}
    if employee_id:
        query["employeeId"] = employee_id
    cursor = db.reviews.find(query).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]
async def create_review(db, review: schemas.ReviewCreate): 
    review_dict = review.dict()
    if not review_dict.get("date"):
        review_dict["date"] = get_now().strftime("%Y-%m-%d")
    return await create_item(db, "reviews", review_dict)
async def update_review(db, review_id: str, update: schemas.ReviewUpdate): return await update_item(db, "reviews", review_id, update.dict(exclude_unset=True))
async def delete_review(db, review_id: str): return await delete_item(db, "reviews", review_id)

async def get_remarks(db, skip: int = 0, limit: int = 100):
    items = await get_items(db, "remarks", skip, limit)
    # Enrich with penalty amount
    penalty_types = await get_penalty_types(db)
    
    # Cache salary structures to avoid repeated DB calls
    salary_cache = {}
    
    for item in items:
        p_amount = next((p["amount"] for p in penalty_types if p["name"] == item.get("type")), 0)
        
        # Calculate one-day salary for Late Punch-in if amount is 0
        if item.get("type") == "Late Punch-in" and p_amount == 0:
            emp_id = item.get("employeeId")
            if emp_id not in salary_cache:
                salary_cache[emp_id] = await get_salary_structure_by_employee(db, emp_id)
            
            salary_struct = salary_cache[emp_id]
            if salary_struct:
                try:
                    itm_date = item.get("date")
                    if isinstance(itm_date, datetime):
                        month_num = itm_date.month
                        r_year = itm_date.year
                    elif isinstance(itm_date, str):
                        if "T" in itm_date or "-" in itm_date:
                            try:
                                parts = itm_date.split("T")[0].split("-")
                                if len(parts[0]) == 4:
                                    r_year = int(parts[0])
                                    month_num = int(parts[1])
                                else:
                                    r_year = int(parts[2])
                                    month_num = int(parts[1])
                            except Exception:
                                from dateutil.parser import parse
                                parsed_dt = parse(itm_date)
                                month_num = parsed_dt.month
                                r_year = parsed_dt.year
                        else:
                            date_parts = itm_date.split(" ")
                            r_month_name = date_parts[0].replace(",", "")
                            r_year = int(date_parts[-1])
                            try:
                                month_num = list(calendar.month_abbr).index(r_month_name)
                            except ValueError:
                                month_num = list(calendar.month_name).index(r_month_name)
                    else:
                        raise ValueError("Unknown date type")

                    _, num_days = calendar.monthrange(r_year, month_num)
                    
                    sundays = sum(1 for d in range(1, num_days + 1) if calendar.weekday(r_year, month_num, d) == 6)
                    total_working_days = max(1, num_days - sundays)
                    p_amount = round(salary_struct["monthlyGross"] / total_working_days, 2)
                except Exception as e:
                    print(f"Error calculating p_amount in remarks list: {e}")
                    p_amount = round(salary_struct["monthlyGross"] / 30, 2)
        
        item["amount"] = p_amount
        
    return items
async def create_remark(db, remark: schemas.RemarkCreate): 
    remark_dict = remark.dict()
    if not remark_dict.get("date"):
        remark_dict["date"] = get_now().strftime("%d-%m-%Y")
    return await create_item(db, "remarks", remark_dict)
async def update_remark(db, remark_id: str, update: schemas.RemarkUpdate): return await update_item(db, "remarks", remark_id, update.dict(exclude_unset=True))
async def delete_remark(db, remark_id: str):
    await db.remarks.update_one({"_id": ObjectId(remark_id)}, {"$set": {"isDeleted": True}})
    return True

async def restore_remark(db, remark_id: str):
    await db.remarks.update_one({"_id": ObjectId(remark_id)}, {"$set": {"isDeleted": False}})
    return True

async def permanently_delete_remark(db, remark_id: str):
    return await delete_item(db, "remarks", remark_id)

async def get_events(db, skip: int = 0, limit: int = 100): return await get_items(db, "events", skip, limit)
async def create_event(db, event: schemas.EventCreate): return await create_item(db, "events", event.dict())
async def update_event(db, event_id: str, update: schemas.EventUpdate): return await update_item(db, "events", event_id, update.dict(exclude_unset=True))
async def delete_event(db, event_id: str): return await delete_item(db, "events", event_id)

async def authenticate_user(db, login_data: schemas.LoginRequest):
    user = await db.employees.find_one({"email": login_data.email})
    if not user:
        return None
        
    stored_password = user.get("password", "")
    password_match = (stored_password == login_data.password)
            
    if password_match:
        user_id = str(user["_id"])
        
        user_fixed = fix_id(user)
        
        # Fetch permissions
        permissions_doc = await db.user_permissions.find_one({"employeeId": user_id})
        if permissions_doc:
            user_fixed["permissions"] = fix_id(permissions_doc).get("permissions", [])
        else:
            user_fixed["permissions"] = []
            
        # Generate JWT token
        token = auth.create_access_token(data={"sub": user_id})
        
        # The frontend expects {user: ...} right now, we'll wrap it in main.py
        # Actually main.py returns {"message": "...", "user": user}
        # Let's add token to the returned object
        user_fixed["token"] = token
            
        return user_fixed
    return None


async def get_attendance_status(db, employee_id: str):
    # Find most recent active punch (checkOut missing)
    cursor = db.attendance.find({
        "employeeId": employee_id,
        "checkOut": None
    }).sort("date", -1).limit(1)
    records = await cursor.to_list(length=1)
    record = records[0] if records else None
    return fix_id(record)

async def punch_in(db, employee_id: str):
    employee = await get_employee(db, employee_id)
    if not employee:
        return None
    
    today = get_now()
    today_str = today.strftime("%Y-%m-%d")
    today_dt_naive = datetime.strptime(today_str, "%Y-%m-%d")
    today_dt_aware = today_dt_naive.replace(tzinfo=IST)
    now_time_str = today.strftime("%H:%M:%S")

    # Check if there is an approved half-day leave for today
    half_day_type = None
    try:
        leave_cursor = db.leave_requests.find({
            "$or": [
                {"employeeId": employee_id},
                {"employee_id": employee_id}
            ],
            "status": {"$in": ["Approved", "approved"]}
        })
        all_emp_leaves = await leave_cursor.to_list(length=100)
        for l in all_emp_leaves:
            raw_s = l.get("startDate") or l.get("start_date")
            raw_e = l.get("endDate") or l.get("end_date")
            if not raw_s or not raw_e:
                continue
            
            def robust_parse(val):
                if not val:
                    return None
                if isinstance(val, datetime):
                    return val
                if isinstance(val, date):
                    return datetime.combine(val, datetime.min.time()).replace(tzinfo=IST)
                if not isinstance(val, str):
                    return None
                val_str = val.strip()
                if "T" in val_str:
                    val_str = val_str.split("T")[0]
                elif " " in val_str:
                    val_str = val_str.split(" ")[0]
                for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y"):
                    try:
                        return datetime.strptime(val_str, fmt).replace(tzinfo=IST)
                    except ValueError:
                        continue
                return None
            
            s = robust_parse(raw_s)
            e = robust_parse(raw_e)
            if not s or not e:
                continue
            
            s_date = s.date()
            e_date = e.date()
            today_date = today.date()
            
            if s_date <= today_date <= e_date:
                day_type_str = str(l.get("day_type") or l.get("dayType") or "").strip().lower()
                is_half = (
                    l.get("half_day") == True or 
                    l.get("halfDay") == True or 
                    l.get("half_day") in [True, "true", "True"] or
                    l.get("halfDay") in [True, "true", "True"] or
                    day_type_str in ["half day", "first half", "second half", "half-day"]
                )
                if is_half:
                    display_day_type = "Half Day"
                    if day_type_str in ["first half", "second half"]:
                        display_day_type = day_type_str.title()
                    elif day_type_str:
                        display_day_type = day_type_str.title()
                    half_day_type = display_day_type
                    break
    except Exception as e_leave:
        print(f"Error checking leave for punch-in: {e_leave}")

    # Check for existing record for today to consolidate - supports naive and aware dates
    existing_record = await db.attendance.find_one({
        "employeeId": employee_id,
        "date": {"$in": [today_dt_naive, today_dt_aware]}
    })

    # Pre-calculate late punch status for the first actual punch of the day
    is_late_punch = False
    late_remark_data = None
    try:
        sys_settings = await get_system_settings(db)
        start_time_str = employee.get("startTime") or sys_settings.get("officeStartTime", "09:30")
        buffer_mins = sys_settings.get("lateBufferMins", 10)
        
        # Robust time parsing supporting both 24-hour ("09:30") and 12-hour AM/PM ("09:30 AM") formats
        try:
            start_time_obj = datetime.strptime(start_time_str.strip(), "%H:%M")
        except ValueError:
            try:
                start_time_obj = datetime.strptime(start_time_str.strip(), "%I:%M %p")
            except ValueError:
                # Fallback if both formats fail
                office_start = sys_settings.get("officeStartTime", "09:30")
                try:
                    start_time_obj = datetime.strptime(office_start.strip(), "%H:%M")
                except ValueError:
                    start_time_obj = datetime.strptime(office_start.strip(), "%I:%M %p")
                    
        limit_time_obj = start_time_obj + timedelta(minutes=buffer_mins)
        current_time_str = today.strftime("%H:%M")
        current_time_obj = datetime.strptime(current_time_str, "%H:%M")
        
        if current_time_obj > limit_time_obj:
            is_late_punch = True
            late_remark_data = {
                "employeeId": employee_id,
                "employeeName": employee["name"],
                "role": employee.get("designation", "Staff"),
                "avatar": employee.get("profilePhoto", ""),
                "type": "Late Punch-in",
                "details": f"Late Punch-in detected at {current_time_str}. Shift starts at {start_time_str} with a {buffer_mins}-minute buffer (Limit: {limit_time_obj.strftime('%H:%M')}).",
                "addedBy": "System",
                "date": today_dt_naive
            }
    except Exception as e:
        print(f"Error computing late punch-in status: {e}")

    if existing_record:
        # If already active or on break, just return the record
        if existing_record.get("status") in ["Active", "On Break"] and existing_record.get("checkOut") is None:
            return fix_id(existing_record)
        
        # If logged out, resume this record instead of creating a new one
        new_punch = {"punchIn": now_time_str, "punchOut": None}
        set_values = {
            "status": "Active",
            "checkOut": None,
            "lastPunchIn": now_time_str
        }
        # If the existing checkIn is a placeholder or empty, set it to the actual first punch-in time!
        if existing_record.get("checkIn") in [None, "--", "--:--", "", "-"]:
            set_values["checkIn"] = now_time_str
            set_values["isLate"] = is_late_punch
            if is_late_punch and late_remark_data:
                try:
                    await db.remarks.insert_one(late_remark_data)
                except Exception as e_rem:
                    print(f"Error inserting late remark for existing record: {e_rem}")
            
        if half_day_type:
            remark_str = f"On Leave: {half_day_type}"
            existing_remarks = existing_record.get("remarks") or ""
            if not existing_remarks or existing_remarks == "-":
                set_values["remarks"] = remark_str
            elif remark_str not in existing_remarks:
                set_values["remarks"] = f"{existing_remarks}; {remark_str}"

        await db.attendance.update_one(
            {"_id": existing_record["_id"]},
            {
                "$set": set_values,
                "$push": {"punches": new_punch}
            }
        )
        updated_doc = await db.attendance.find_one({"_id": existing_record["_id"]})
        return fix_id(updated_doc)
    
    # First punch of the day: create new record (use naive date so MongoDB stores it as exactly today's midnight UTC date)
    attendance_data = {
        "employeeId": employee_id,
        "employeeName": employee["name"],
        "date": today_dt_naive,
        "checkIn": now_time_str,
        "lastPunchIn": now_time_str,
        "checkOut": None,
        "status": "Active",
        "workHours": None,
        "accumulatedWorkSeconds": 0,
        "punches": [{"punchIn": now_time_str, "punchOut": None}],
        "remarks": f"On Leave: {half_day_type}" if half_day_type else "-",
        "isLate": is_late_punch
    }
    
    # If late, insert the remark
    if is_late_punch and late_remark_data:
        try:
            await db.remarks.insert_one(late_remark_data)
        except Exception as e:
            print(f"Error processing late remark: {e}")
    
    result = await db.attendance.insert_one(attendance_data)
    attendance_data["id"] = str(result.inserted_id)
    if "_id" in attendance_data:
        attendance_data.pop("_id")
    return attendance_data

async def punch_out(db, employee_id: str):
    status = await get_attendance_status(db, employee_id)
    if not status:
        return None
    
    now = get_now()
    # Use lastPunchIn if available to calculate session duration, otherwise fallback to checkIn
    start_time_str = status.get("lastPunchIn") or status["checkIn"]
    check_in_time = parse_datetime(status['date'], start_time_str)
    
    # Calculate break seconds that occurred during this session (since check_in_time)
    breaks = status.get("breaks", [])
    total_break_seconds = 0
    updated_breaks = []
    
    for b in breaks:
        b_copy = dict(b)
        b_start_str = b_copy.get("startTime")
        if b_start_str:
            b_start = parse_datetime(status['date'], b_start_str)
            if b_start >= check_in_time:
                b_end_str = b_copy.get("endTime")
                if b_end_str:
                    b_end = parse_datetime(status['date'], b_end_str)
                    if b_end < b_start:
                        b_end += timedelta(days=1)
                    break_dur = (b_end - b_start).total_seconds()
                else:
                    # User punched out while on active break: close the break at now
                    b_end = now
                    break_dur = (b_end - b_start).total_seconds()
                    b_copy["endTime"] = now.strftime("%H:%M:%S")
                    b_copy["duration"] = f"{int(break_dur // 60)}m"
                total_break_seconds += break_dur
        updated_breaks.append(b_copy)
        
    raw_session_seconds = (now - check_in_time).total_seconds()
    session_work_seconds = max(0.0, raw_session_seconds - total_break_seconds)
    
    accumulated_seconds = status.get("accumulatedWorkSeconds") or 0
    total_seconds = accumulated_seconds + session_work_seconds
    
    hours, remainder = divmod(int(total_seconds), 3600)
    minutes, _ = divmod(remainder, 60)
    work_hours = f"{hours}h {minutes}m"
    
    # Update the last punch log entry
    punches = status.get("punches", [])
    now_time_str = now.strftime("%H:%M:%S")
    
    update_data = {
        "checkOut": now_time_str,
        "workHours": work_hours,
        "status": "Logged",
        "accumulatedWorkSeconds": total_seconds,
        "breaks": updated_breaks
    }

    if punches:
        punches_copy = [dict(p) for p in punches]
        punches_copy[-1]["punchOut"] = now_time_str
        update_data["punches"] = punches_copy
    else:
        update_data["punches"] = [{"punchIn": start_time_str, "punchOut": now_time_str}]
    
    await db.attendance.update_one(
        {"_id": ObjectId(status["id"])},
        {"$set": update_data}
    )
    
    updated_doc = await db.attendance.find_one({"_id": ObjectId(status["id"])})
    return fix_id(updated_doc)

async def create_manual_attendance(db, attendance: schemas.AttendanceCreate):
    attendance_dict = attendance.dict()
    
    # Ensure workHours and accumulatedWorkSeconds are calculated if times are provided
    if attendance_dict.get("checkIn") and attendance_dict.get("checkOut"):
        try:
            date_val = attendance_dict.get("date")
            if isinstance(date_val, (datetime, date)):
                date_str = date_val.strftime("%Y-%m-%d")
            else:
                date_str = str(date_val).split('T')[0].split(' ')[0]
                
            ci = attendance_dict['checkIn']
            co = attendance_dict['checkOut']
            
            # Pad seconds if not present
            if len(ci.split(':')) == 2: ci = f"{ci}:00"
            if len(co.split(':')) == 2: co = f"{co}:00"
            
            start = datetime.strptime(f"{date_str} {ci}", "%Y-%m-%d %H:%M:%S")
            end = datetime.strptime(f"{date_str} {co}", "%Y-%m-%d %H:%M:%S")
            if end < start:
                end += timedelta(days=1)
            duration = end - start
            total_seconds = max(0.0, duration.total_seconds())
            
            hours, remainder = divmod(int(total_seconds), 3600)
            minutes, _ = divmod(remainder, 60)
            
            attendance_dict["workHours"] = f"{hours}h {minutes}m"
            attendance_dict["accumulatedWorkSeconds"] = total_seconds
            attendance_dict["lastPunchIn"] = attendance_dict["checkIn"]
            attendance_dict["punches"] = [{"punchIn": attendance_dict["checkIn"], "punchOut": attendance_dict["checkOut"]}]
        except Exception as e:
            print(f"Error creating manual attendance calculation: {e}")

    result = await db.attendance.insert_one(attendance_dict)
    attendance_dict["id"] = str(result.inserted_id)
    if "_id" in attendance_dict:
        attendance_dict.pop("_id")
    return attendance_dict

async def update_attendance(db, attendance_id: str, attendance_update: schemas.AttendanceUpdate):
    update_data = attendance_update.dict(exclude_unset=True)
    
    # Recalculate workHours if checkIn or checkOut are updated
    if "checkIn" in update_data or "checkOut" in update_data or "date" in update_data:
        existing = await db.attendance.find_one({"_id": ObjectId(attendance_id)})
        if existing:
            date_val = update_data.get("date") or existing.get("date")
            ci_val = update_data.get("checkIn") or existing.get("checkIn")
            co_val = update_data.get("checkOut") or existing.get("checkOut")
            
            if ci_val and co_val:
                try:
                    if isinstance(date_val, (datetime, date)):
                        date_str = date_val.strftime("%Y-%m-%d")
                    else:
                        date_str = str(date_val).split('T')[0].split(' ')[0]
                    
                    # Pad seconds if not present
                    if len(ci_val.split(':')) == 2: ci_val = f"{ci_val}:00"
                    if len(co_val.split(':')) == 2: co_val = f"{co_val}:00"
                    
                    start = datetime.strptime(f"{date_str} {ci_val}", "%Y-%m-%d %H:%M:%S")
                    end = datetime.strptime(f"{date_str} {co_val}", "%Y-%m-%d %H:%M:%S")
                    if end < start:
                        end += timedelta(days=1)
                    duration = end - start
                    total_seconds = max(0.0, duration.total_seconds())
                    
                    hours, remainder = divmod(int(total_seconds), 3600)
                    minutes, _ = divmod(remainder, 60)
                    
                    update_data["workHours"] = f"{hours}h {minutes}m"
                    update_data["accumulatedWorkSeconds"] = total_seconds
                    update_data["punches"] = [{"punchIn": ci_val, "punchOut": co_val}]
                except Exception as e:
                    print(f"Error updating work hours calculation: {e}")

    await db.attendance.update_one(
        {"_id": ObjectId(attendance_id)},
        {"$set": update_data}
    )
    updated = await db.attendance.find_one({"_id": ObjectId(attendance_id)})
    return fix_id(updated)

async def delete_attendance(db, attendance_id: str):
    await db.attendance.delete_one({"_id": ObjectId(attendance_id)})
    return True

async def delete_multiple_attendance(db, attendance_ids: List[str]):
    await db.attendance.delete_many({
        "_id": {"$in": [ObjectId(aid) for aid in attendance_ids]}
    })
    return True



async def break_in(db, employee_id: str):
    status = await get_attendance_status(db, employee_id)
    if not status or status.get("status") == "On Break":
        return None
    
    new_break = {
        "startTime": get_now().strftime("%H:%M:%S"),
        "endTime": None,
        "duration": None
    }
    
    await db.attendance.update_one(
        {"_id": ObjectId(status["id"])},
        {
            "$push": {"breaks": new_break},
            "$set": {"status": "On Break"}
        }
    )
    result = await db.attendance.find_one({"_id": ObjectId(status["id"])})
    return fix_id(result)

async def break_out(db, employee_id: str):
    # Find record where status is 'On Break'
    # Find most recent record where status is 'On Break'
    cursor = db.attendance.find({
        "employeeId": employee_id,
        "status": "On Break",
        "checkOut": None
    }).sort("date", -1).limit(1)
    records = await cursor.to_list(length=1)
    record = records[0] if records else None
    
    if not record or not record.get("breaks"):
        return None
    
    # Get the last break which should have no endTime
    last_break_idx = len(record["breaks"]) - 1
    last_break = record["breaks"][last_break_idx]
    
    now = get_now()
    start_time = parse_datetime(record['date'], last_break['startTime'])
    
    if last_break.get("endTime") is not None:
        return None
        
    duration_delta = now - start_time
    minutes = int(duration_delta.total_seconds()) // 60
    duration_str = f"{minutes}m"
    
    await db.attendance.update_one(
        {"_id": ObjectId(record["_id"])},
        {
            "$set": {
                f"breaks.{last_break_idx}.endTime": now.strftime("%H:%M:%S"),
                f"breaks.{last_break_idx}.duration": duration_str,
                "status": "Active"
            }
        }
    )
    result = await db.attendance.find_one({"_id": ObjectId(record["_id"])})
    return fix_id(result)

# Leave Request CRUD
async def create_leave_request(db, leave: schemas.LeaveRequestCreate):
    leave_dict = leave.dict()
    leave_dict["status"] = "Pending"
    leave_dict["requested_on"] = get_now().strftime("%d-%m-%Y %H:%M")
    result = await db.leave_requests.insert_one(leave_dict)
    leave_dict["id"] = str(result.inserted_id)
    if "_id" in leave_dict:
        leave_dict.pop("_id")

    # Notify HR and Admin
    try:
        # Find all HR and Admin users
        admins_and_hr = await db.employees.find({
            "role": {"$regex": "^(Admin|HR)$", "$options": "i"}
        }).to_list(length=100)

        for staff in admins_and_hr:
            staff_id = str(staff["_id"])
            # Don't notify the person who requested the leave if they are an admin/hr
            if staff_id == leave_dict["employee_id"]:
                continue
                
            notification = {
                "employee_id": staff_id,
                "title": "New Leave Request",
                "message": f"{leave_dict['employee_name']} has requested {leave_dict['type']} leave for {leave_dict['duration']}. Reason: {leave_dict['reason']}",
                "type": "leave",
                "reference_id": leave_dict["id"],
                "is_read": False,
                "created_at": get_now().strftime("%d-%m-%Y %H:%M")
            }
            await db.notifications.insert_one(notification)
    except Exception as e:
        print(f"Error creating notifications for leave request: {e}")

    return leave_dict

async def get_all_leave_requests(db, skip: int = 0, limit: int = 100):
    cursor = db.leave_requests.find().sort("requested_on", -1).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    leaves = [fix_id(row) for row in rows]
    for leave in leaves:
        approved_by_id = leave.get("approved_by_id")
        if approved_by_id:
            try:
                employee = await db.employees.find_one({"_id": ObjectId(approved_by_id)})
                if employee:
                    leave["approved_by_photo"] = employee.get("profilePhoto") or None
            except Exception:
                pass
    return leaves

async def get_user_leave_requests(db, employee_id: str, skip: int = 0, limit: int = 100):
    cursor = db.leave_requests.find({"employee_id": employee_id}).sort("requested_on", -1).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    leaves = [fix_id(row) for row in rows]
    for leave in leaves:
        approved_by_id = leave.get("approved_by_id")
        if approved_by_id:
            try:
                employee = await db.employees.find_one({"_id": ObjectId(approved_by_id)})
                if employee:
                    leave["approved_by_photo"] = employee.get("profilePhoto") or None
            except Exception:
                pass
    return leaves

async def auto_create_leave_attendance(db, employee_id: str, start_date, end_date, leave_type: str = "leave", is_half: bool = False, day_type: str = "Half Day"):
    def robust_parse(val):
        if not val:
            return None
        if isinstance(val, datetime):
            return val
        if isinstance(val, date):
            return datetime.combine(val, datetime.min.time()).replace(tzinfo=IST)
        # Parse string
        for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
            try:
                return datetime.strptime(val, fmt).replace(tzinfo=IST)
            except ValueError:
                continue
        return None

    s = robust_parse(start_date)
    e = robust_parse(end_date)
    if not s or not e:
        return

    employee = await get_employee(db, employee_id)
    if not employee:
        return

    curr = s
    if is_half:
        remark_str = f"On Leave: {day_type}"
    else:
        remark_str = f"Auto-marked leave - {leave_type.lower()} approved"

    while curr <= e:
        date_naive = curr.replace(tzinfo=None)
        date_aware = curr.replace(tzinfo=IST)
        
        existing = await db.attendance.find_one({
            "employeeId": employee_id,
            "date": {"$in": [date_naive, date_aware]}
        })

        if existing:
            if is_half:
                # For half-day leaves, do NOT overwrite check-in/out times, punches, status etc.
                # Just append remark and ensure status isn't "Leave"
                new_status = existing.get("status")
                if new_status == "Leave":
                    new_status = "--"
                
                existing_remarks = existing.get("remarks") or ""
                if remark_str not in existing_remarks:
                    new_remarks = f"{existing_remarks}; {remark_str}" if existing_remarks else remark_str
                else:
                    new_remarks = existing_remarks

                await db.attendance.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {
                        "status": new_status,
                        "remarks": new_remarks
                    }}
                )
            else:
                await db.attendance.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {
                        "status": "Leave",
                        "checkIn": "--",
                        "lastPunchIn": "--",
                        "checkOut": "--",
                        "workHours": "--",
                        "accumulatedWorkSeconds": 0,
                        "breaks": [],
                        "punches": [],
                        "remarks": remark_str
                    }}
                )
        else:
            if not is_half:
                record = {
                    "employeeId": employee_id,
                    "employeeName": employee["name"],
                    "date": date_naive,
                    "checkIn": "--",
                    "lastPunchIn": "--",
                    "checkOut": "--",
                    "status": "Leave",
                    "workHours": "--",
                    "accumulatedWorkSeconds": 0,
                    "breaks": [],
                    "punches": [],
                    "remarks": remark_str
                }
                await db.attendance.insert_one(record)

        curr += timedelta(days=1)
        if (curr - s).days > 365:
            break

async def update_leave_request(db, leave_id: str, update_data: dict):
    # Fetch current leave request
    leave = await db.leave_requests.find_one({"_id": ObjectId(leave_id)})
    if not leave:
        return None
    
    await db.leave_requests.update_one(
        {"_id": ObjectId(leave_id)},
        {"$set": update_data}
    )

    # Check if the status has become Approved
    if "status" in update_data and update_data["status"] == "Approved":
        emp_id = leave.get("employee_id") or leave.get("employeeId")
        raw_start = leave.get("start_date") or leave.get("startDate")
        raw_end = leave.get("end_date") or leave.get("endDate")
        leave_type = leave.get("leaveType") or leave.get("type") or "leave"
        if emp_id and raw_start and raw_end:
            try:
                # Detect half day and day type
                day_type_str = str(leave.get("day_type") or leave.get("dayType") or "").strip().lower()
                is_half = (
                    leave.get("half_day") == True or 
                    leave.get("halfDay") == True or 
                    leave.get("half_day") in [True, "true", "True"] or
                    leave.get("halfDay") in [True, "true", "True"] or
                    day_type_str in ["half day", "first half", "second half", "half-day"]
                )
                
                display_day_type = "Half Day"
                if day_type_str in ["first half", "second half"]:
                    display_day_type = day_type_str.title()
                elif day_type_str:
                    display_day_type = day_type_str.title()
                    
                await auto_create_leave_attendance(db, emp_id, raw_start, raw_end, leave_type, is_half=is_half, day_type=display_day_type)
            except Exception as e:
                print(f"Error auto creating leave attendance: {e}")
    
    # Create notification if status changed
    if "status" in update_data and update_data["status"] in ["Approved", "Rejected", "Cancelled"]:
        msg = f"Your {leave['type']} request from {leave['start_date']} to {leave['end_date']} has been {update_data['status'].lower()}."
        if update_data["status"] == "Rejected" and update_data.get("reject_reason"):
            msg += f" Reason: {update_data['reject_reason']}"
        elif update_data["status"] == "Approved" and update_data.get("approve_reason"):
            msg += f" Message: {update_data['approve_reason']}"
        
        await create_notification(db, schemas.NotificationCreate(
            employee_id=leave["employee_id"],
            title=f"Leave Request {update_data['status']}",
            message=msg,
            type="leave",
            created_at=get_now().strftime("%d-%m-%Y %H:%M")
        ))
        
    result = await db.leave_requests.find_one({"_id": ObjectId(leave_id)})
    return fix_id(result)

async def update_leave_request_status(db, leave_id: str, status: str, approved_by: str = None, approved_by_role: str = None, approved_by_id: str = None, approved_by_photo: str = None, reject_reason: str = None, approve_reason: str = None):
    update_data = {"status": status}
    if approved_by:
        update_data["approved_by"] = approved_by
    if approved_by_role:
        update_data["approved_by_role"] = approved_by_role
    if approved_by_id:
        update_data["approved_by_id"] = approved_by_id
    if approved_by_photo:
        update_data["approved_by_photo"] = approved_by_photo
    if reject_reason:
        update_data["reject_reason"] = reject_reason
    if approve_reason:
        update_data["approve_reason"] = approve_reason
    return await update_leave_request(db, leave_id, update_data)


# Notification CRUD
async def create_notification(db, notification: schemas.NotificationCreate):
    notification_dict = notification.dict()
    if not notification_dict.get("created_at"):
        notification_dict["created_at"] = get_now().strftime("%d-%m-%Y %H:%M")
    result = await db.notifications.insert_one(notification_dict)
    notification_dict["id"] = str(result.inserted_id)
    if "_id" in notification_dict:
        notification_dict.pop("_id")
        
    try:
        await ws_manager.send_personal_message(notification_dict["employee_id"], "new_notification", notification_dict)
    except Exception as e:
        print(f"Error broadcasting new notification: {e}")
        
    return notification_dict

async def get_notifications_by_user(db, employee_id: str, skip: int = 0, limit: int = 50):
    try:
        emp_obj_id = ObjectId(employee_id)
        query = {"$or": [{"employee_id": employee_id}, {"employee_id": emp_obj_id}]}
    except Exception:
        query = {"employee_id": employee_id}
        
    cursor = db.notifications.find(query).sort("_id", -1).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def mark_notification_as_read(db, notification_id: str):
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": True}}
    )
    result = await db.notifications.find_one({"_id": ObjectId(notification_id)})
    return fix_id(result)

async def mark_all_notifications_as_read(db, employee_id: str):
    try:
        emp_obj_id = ObjectId(employee_id)
        query = {"$or": [{"employee_id": employee_id}, {"employee_id": emp_obj_id}], "is_read": False}
    except Exception:
        query = {"employee_id": employee_id, "is_read": False}

    await db.notifications.update_many(
        query,
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

async def delete_leave_request(db, leave_id: str):
    result = await db.leave_requests.delete_one({"_id": ObjectId(leave_id)})
    return result.deleted_count > 0

# Client CRUD
async def get_clients(db, skip: int = 0, limit: int = 100):
    cursor = db.clients.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def create_client(db, client: schemas.ClientCreate):
    client_dict = client.dict()
    performedBy = client_dict.pop("performedBy", "Unknown")
    userName = client_dict.pop("userName", "Unknown User")
    
    if not client_dict.get("createdDate"):
        client_dict["createdDate"] = get_now().strftime("%Y-%m-%d")
    result = await db.clients.insert_one(client_dict)
    clientId = str(result.inserted_id)
    
    await log_activity(db, "Created", performedBy, userName, f"Client '{client_dict['companyName']}' was created.", clientId=clientId)
    
    try:
        await ws_manager.broadcast_all("data_refresh", {"entity": "clients"})
    except Exception:
        pass
        
    doc = await db.clients.find_one({"_id": result.inserted_id})
    return fix_id(doc)

async def update_client(db, client_id: str, client_update: schemas.ClientUpdate):
    update_data = client_update.dict(exclude_unset=True)
    performedBy = update_data.pop("performedBy", "Unknown")
    userName = update_data.pop("userName", "Unknown User")
    
    if update_data:
        old_client = await db.clients.find_one({"_id": ObjectId(client_id)})
        await db.clients.update_one({"_id": ObjectId(client_id)}, {"$set": update_data})
        
        details = []
        for key, value in update_data.items():
            old_val = old_client.get(key, "N/A")
            if old_val != value:
                # Format key for readability (e.g. companyName -> Company Name)
                formatted_key = ''.join([' ' + c if c.isupper() else c for c in key]).capitalize().strip()
                details.append(f"{formatted_key} changed from '{old_val}' to '{value}'")
        
        log_details = f"Client '{old_client.get('companyName')}': " + (", ".join(details) if details else "Details updated")
        await log_activity(db, "Updated", performedBy, userName, log_details, clientId=client_id)
        
        try:
            await ws_manager.broadcast_all("data_refresh", {"entity": "clients"})
        except Exception:
            pass
            
    doc = await db.clients.find_one({"_id": ObjectId(client_id)})
    return fix_id(doc)

async def delete_client(db, client_id: str):
    client = await db.clients.find_one({"_id": ObjectId(client_id)})
    
    if client:
        # Cascade deletes
        projects = await db.projects.find({"clientId": client_id}).to_list(length=1000)
        for p in projects:
            project_id = str(p["_id"])
            await archive_and_delete_many(db, "wm_tasks", {"projectId": project_id})
            await archive_and_delete_many(db, "task_logs", {"projectId": project_id})
            
        await archive_and_delete_many(db, "projects", {"clientId": client_id})
        await archive_and_delete_many(db, "marketing_daily_reports", {"clientId": client_id})
        await archive_and_delete_many(db, "marketing_monthly_reports", {"clientId": client_id})
        await archive_and_delete_many(db, "task_logs", {"clientId": client_id})
        
        company_name = client.get("companyName", "")
        if company_name:
            await db.leads.update_many(
                {"company": company_name},
                {"$set": {"company": f"[Deleted] {company_name}"}}
            )

    await archive_and_delete_one(db, "clients", {"_id": ObjectId(client_id)})
    if client:
        await log_activity(db, "Deleted", "Admin", "N/A", f"Client '{client.get('companyName')}' was deleted.", clientId=client_id)
    return True

# Project CRUD
async def get_projects(db, userId: str = None, role: str = None, skip: int = 0, limit: int = 100):
    query = {}
    if role and role.lower() not in ["admin", "hr"] and userId:
        # Fetch user to get department
        user = await get_employee(db, userId)
        if user:
            dept = user.get("department")
            
            if role.lower() == "team leader":
                # TL sees projects where they are TL OR projects in their department
                query["$or"] = [
                    {"teamLeaderId": userId},
                    {"department": dept}
                ]
            else:
                # Employee sees projects where they have tasks
                task_cursor = db.wm_tasks.find({"assignedToId": userId})
                task_list = await task_cursor.to_list(length=1000)
                project_ids = list(set([t.get("projectId") for t in task_list if t.get("projectId")]))
                
                or_conditions = [{"teamLeaderId": userId}]
                if project_ids:
                    project_ids_as_obj = []
                    for pid in project_ids:
                        try:
                            project_ids_as_obj.append(ObjectId(pid))
                        except Exception:
                            pass
                    
                    if project_ids_as_obj:
                        or_conditions.append({"_id": {"$in": project_ids_as_obj}})
                    or_conditions.append({"id": {"$in": project_ids}}) # fallback for string IDs
                
                query["$or"] = or_conditions

    cursor = db.projects.find(query).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def create_project(db, project: schemas.ProjectCreate):
    project_dict = project.dict()
    performedBy = project_dict.pop("performedBy", "Unknown")
    userName = project_dict.pop("userName", "Unknown User")
    
    if not project_dict.get("clientName") and project_dict.get("clientId"):
        client = await db.clients.find_one({"_id": ObjectId(project_dict["clientId"])})
        if client:
            project_dict["clientName"] = client.get("companyName")
    
    if not project_dict.get("teamLeaderName") and project_dict.get("teamLeaderId"):
        employee = await db.employees.find_one({"_id": ObjectId(project_dict["teamLeaderId"])})
        if employee:
            project_dict["teamLeaderName"] = f"{employee.get('firstName')} {employee.get('lastName')}"
            
    result = await db.projects.insert_one(project_dict)
    projectId = str(result.inserted_id)
    
    await log_activity(db, "Created", performedBy, userName, f"Project '{project_dict['title']}' was created.", projectId=projectId)
    
    try:
        await ws_manager.broadcast_all("data_refresh", {"entity": "projects"})
    except Exception:
        pass
        
    doc = await db.projects.find_one({"_id": result.inserted_id})
    return fix_id(doc)

async def update_project(db, project_id: str, project_update: schemas.ProjectUpdate):
    update_data = project_update.dict(exclude_unset=True)
    performedBy = update_data.pop("performedBy", "Unknown")
    userName = update_data.pop("userName", "Unknown User")
    
    if update_data:
        old_project = await db.projects.find_one({"_id": ObjectId(project_id)})
        
        if update_data.get("clientId") and not update_data.get("clientName"):
            client = await db.clients.find_one({"_id": ObjectId(update_data["clientId"])})
            if client:
                update_data["clientName"] = client.get("companyName")
        
        if update_data.get("teamLeaderId") and not update_data.get("teamLeaderName"):
            employee = await db.employees.find_one({"_id": ObjectId(update_data["teamLeaderId"])})
            if employee:
                update_data["teamLeaderName"] = f"{employee.get('firstName')} {employee.get('lastName')}"
                
        await db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": update_data})
        
        details = []
        if "status" in update_data and old_project.get("status") != update_data["status"]:
            details.append(f"Status changed to {update_data['status']}")
        if "teamLeaderName" in update_data and old_project.get("teamLeaderName") != update_data["teamLeaderName"]:
            details.append(f"Team Leader changed to {update_data['teamLeaderName']}")
        
        log_details = f"Project '{old_project.get('title')}': " + (", ".join(details) if details else "Details updated")
        await log_activity(db, "Updated", performedBy, userName, log_details, projectId=project_id)
        
        try:
            await ws_manager.broadcast_all("data_refresh", {"entity": "projects"})
        except Exception:
            pass
            
    doc = await db.projects.find_one({"_id": ObjectId(project_id)})
    return fix_id(doc)

async def delete_project(db, project_id: str):
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    
    if project:
        # Cascade deletes
        await archive_and_delete_many(db, "wm_tasks", {"projectId": project_id})
        await archive_and_delete_many(db, "task_logs", {"projectId": project_id})
        
    await archive_and_delete_one(db, "projects", {"_id": ObjectId(project_id)})
    if project:
        await log_activity(db, "Deleted", "Admin", "N/A", f"Project '{project.get('title')}' was deleted.", projectId=project_id)
    return True

# General Task CRUD
async def get_tasks(db, userId: str = None, role: str = None, skip: int = 0, limit: int = 100):
    query = {}
    if role and role.lower() not in ["admin", "hr"] and userId:
        # User sees tasks assigned to them, or tasks they assigned
        query["$or"] = [
            {"assignedToId": userId},
            {"assignedToIds": userId},
            {"assignedById": userId}
        ]
                
    cursor = db.tasks.find(query).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def create_task(db, task: schemas.TaskCreate):
    task_dict = task.dict()
    performedBy = task_dict.pop("performedBy", "Unknown")
    userName = task_dict.pop("userName", "Unknown User")
    
    # Auto-assign assignedById and Name to the creator if not explicitly passed
    if not task_dict.get("assignedById"):
        task_dict["assignedById"] = performedBy
    if not task_dict.get("assignedByName"):
        task_dict["assignedByName"] = userName
    
    if task_dict.get("assignedToIds") and len(task_dict.get("assignedToIds")) > 0:
        names = []
        for emp_id in task_dict["assignedToIds"]:
            try:
                employee = await db.employees.find_one({"_id": ObjectId(emp_id)})
                if employee:
                    names.append(f"{employee.get('firstName')} {employee.get('lastName')}")
            except Exception:
                pass
        task_dict["assignedToNames"] = names
        
        # for backwards compatibility if only 1 user assigned
        if len(task_dict["assignedToIds"]) == 1:
            task_dict["assignedToId"] = task_dict["assignedToIds"][0]
            task_dict["assignedToName"] = task_dict["assignedToNames"][0] if names else None

    elif task_dict.get("assignedToId"):
        try:
            employee = await db.employees.find_one({"_id": ObjectId(task_dict["assignedToId"])})
            if employee:
                if not task_dict.get("assignedToName"):
                    task_dict["assignedToName"] = f"{employee.get('firstName')} {employee.get('lastName')}"
                if not task_dict.get("assignedToIds"):
                    task_dict["assignedToIds"] = [task_dict["assignedToId"]]
                    task_dict["assignedToNames"] = [task_dict["assignedToName"]]
        except Exception:
            pass

    if not task_dict.get("createdDate"):
        task_dict["createdDate"] = get_now().strftime("%Y-%m-%d")
        
    result = await db.tasks.insert_one(task_dict)
    taskId = str(result.inserted_id)
    
    task_dict["_id"] = result.inserted_id
    await log_activity(db, "Created", performedBy, userName, f"Created a new task '{task_dict.get('title')}'", taskId=taskId)
    return fix_id(task_dict)

async def update_task(db, task_id: str, task: schemas.TaskUpdate):
    update_data = task.dict(exclude_unset=True)
    performedBy = update_data.pop("performedBy", "Unknown")
    userName = update_data.pop("userName", "Unknown User")
    
    if update_data.get("assignedToIds") is not None:
        names = []
        for emp_id in update_data["assignedToIds"]:
            try:
                employee = await db.employees.find_one({"_id": ObjectId(emp_id)})
                if employee:
                    names.append(f"{employee.get('firstName')} {employee.get('lastName')}")
            except Exception:
                pass
        update_data["assignedToNames"] = names
        if len(update_data["assignedToIds"]) == 1:
            update_data["assignedToId"] = update_data["assignedToIds"][0]
            update_data["assignedToName"] = update_data["assignedToNames"][0] if names else None
        else:
            update_data["assignedToId"] = None
            update_data["assignedToName"] = None

    elif update_data.get("assignedToId"):
        try:
            employee = await db.employees.find_one({"_id": ObjectId(update_data["assignedToId"])})
            if employee and not update_data.get("assignedToName"):
                update_data["assignedToName"] = f"{employee.get('firstName')} {employee.get('lastName')}"
        except Exception:
            pass

    if update_data:
        await db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update_data})
        
        changes = []
        for k, v in update_data.items():
            if k == "title": changes.append(f"title to '{v}'")
            elif k == "description": changes.append(f"description")
            elif k == "dueDate": changes.append(f"due date to {v}")
            elif k == "status": changes.append(f"status to '{str(v).capitalize()}'")
            elif k == "priority": changes.append(f"priority to '{str(v).capitalize()}'")
            elif k == "assignedToId": changes.append(f"assignee to {update_data.get('assignedToName', 'another employee')}")
            
        detail_msg = f"Updated {', '.join(changes)}" if changes else "Updated task details"
        await log_activity(db, "Updated", performedBy, userName, detail_msg, taskId=task_id)
        
    updated = await db.tasks.find_one({"_id": ObjectId(task_id)})
    return fix_id(updated) if updated else None

async def delete_task(db, task_id: str):
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        return False
        
    await archive_and_delete_one(db, "tasks", {"_id": ObjectId(task_id)})
    await log_activity(db, "Deleted", "Admin", "N/A", f"Task '{task.get('title')}' was deleted.", taskId=task_id)
    return True

# Work Management Task CRUD
    query = {}
    if role and role.lower() not in ["admin", "hr"] and userId:
        user = await get_employee(db, userId)
        if user:
            dept = user.get("department")
            
            if role.lower() == "team leader":
                # TL sees tasks assigned to them OR tasks assigned to employees in their dept
                dept_employees = await db.employees.find({"department": dept}).to_list(length=1000)
                dept_emp_ids = [str(e["_id"]) for e in dept_employees]
                
                query["assignedToId"] = {"$in": dept_emp_ids}
            else:
                # Employee sees only their own tasks
                query["assignedToId"] = userId
                
    cursor = db.wm_tasks.find(query).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def create_wm_task(db, task: schemas.WMTaskCreate):
    task_dict = task.dict()
    performedBy = task_dict.pop("performedBy", "Unknown")
    userName = task_dict.pop("userName", "Unknown User")
    
    if not task_dict.get("projectName") and task_dict.get("projectId"):
        project = await db.projects.find_one({"_id": ObjectId(task_dict["projectId"])})
        if project:
            task_dict["projectName"] = project.get("title")
    
    if task_dict.get("assignedToId"):
        employee = await db.employees.find_one({"_id": ObjectId(task_dict["assignedToId"])})
        if employee:
            if not task_dict.get("assignedToName"):
                task_dict["assignedToName"] = f"{employee.get('firstName')} {employee.get('lastName')}"
            if not task_dict.get("department"):
                task_dict["department"] = employee.get("department")

    if not task_dict.get("createdDate"):
        task_dict["createdDate"] = get_now().strftime("%Y-%m-%d")
        
    result = await db.wm_tasks.insert_one(task_dict)
    taskId = str(result.inserted_id)
    
    # Log the creation
    await log_task_activity(db, taskId, "Created", performedBy, userName, f"Task '{task_dict['title']}' was created.")
    
    try:
        await ws_manager.broadcast_all("task_update", {"taskId": taskId})
    except Exception:
        pass
        
    doc = await db.wm_tasks.find_one({"_id": result.inserted_id})
    return fix_id(doc)

async def update_wm_task(db, task_id: str, task_update: schemas.WMTaskUpdate):
    update_data = task_update.dict(exclude_unset=True)
    performedBy = update_data.pop("performedBy", "Unknown")
    userName = update_data.pop("userName", "Unknown User")
    
    if update_data:
        # Get old task state for logging
        old_task = await db.wm_tasks.find_one({"_id": ObjectId(task_id)})
        
        if update_data.get("projectId") and not update_data.get("projectName"):
            project = await db.projects.find_one({"_id": ObjectId(update_data["projectId"])})
            if project:
                update_data["projectName"] = project.get("title")
        
        if update_data.get("assignedToId"):
            employee = await db.employees.find_one({"_id": ObjectId(update_data["assignedToId"])})
            if employee:
                if not update_data.get("assignedToName"):
                    update_data["assignedToName"] = f"{employee.get('firstName')} {employee.get('lastName')}"
                if not update_data.get("department"):
                    update_data["department"] = employee.get("department")
                
        await db.wm_tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update_data})
        
        # Log the update
        details = []
        if "status" in update_data and old_task.get("status") != update_data["status"]:
            details.append(f"Stage changed from '{old_task.get('status')}' to '{update_data['status']}'")
        
        if "title" in update_data and old_task.get("title") != update_data["title"]:
            details.append(f"Title changed from '{old_task.get('title')}' to '{update_data['title']}'")
            
        if "assignedToName" in update_data and old_task.get("assignedToName") != update_data["assignedToName"]:
            details.append(f"Assignee changed to '{update_data['assignedToName']}'")
        elif "assignedToId" in update_data and old_task.get("assignedToId") != update_data["assignedToId"]:
            details.append(f"Assignee ID updated")

        if "projectName" in update_data and old_task.get("projectName") != update_data["projectName"]:
            details.append(f"Project changed to '{update_data['projectName']}'")
            
        if "priority" in update_data and old_task.get("priority") != update_data["priority"]:
            details.append(f"Priority changed from '{old_task.get('priority')}' to '{update_data['priority']}'")
            
        if "dueDate" in update_data and old_task.get("dueDate") != update_data["dueDate"]:
            details.append(f"Due date changed from '{old_task.get('dueDate')}' to '{update_data['dueDate']}'")
            
        log_details = f"Task '{old_task.get('title')}': " + (", ".join(details) if details else "No visible changes")
        await log_task_activity(db, task_id, "Updated", performedBy, userName, log_details)
    
    doc = await db.wm_tasks.find_one({"_id": ObjectId(task_id)})
    return fix_id(doc)

async def delete_wm_task(db, task_id: str):
    # Get task info before deletion for logging
    task = await db.wm_tasks.find_one({"_id": ObjectId(task_id)})
    result = await db.wm_tasks.delete_one({"_id": ObjectId(task_id)})
    
    if result.deleted_count > 0 and task:
        await log_task_activity(db, task_id, "Deleted", "Admin/User", "N/A", f"Task '{task.get('title')}' was deleted.")
        
    return result.deleted_count > 0

# Activity Log CRUD
async def log_activity(db, action: str, performedBy: str, userName: str, details: str, taskId: str = None, projectId: str = None, clientId: str = None, leadId: str = None, dailyReportId: str = None, monthlyReportId: str = None, applicationId: str = None, assetId: str = None, categoryId: str = None):
    log_entry = {
        "action": action,
        "performedBy": performedBy,
        "userName": userName,
        "details": details,
        "timestamp": get_now().strftime("%Y-%m-%d %H:%M:%S")
    }
    if taskId: log_entry["taskId"] = taskId
    if projectId: log_entry["projectId"] = projectId
    if clientId: log_entry["clientId"] = clientId
    if leadId: log_entry["leadId"] = leadId
    if dailyReportId: log_entry["dailyReportId"] = dailyReportId
    if monthlyReportId: log_entry["monthlyReportId"] = monthlyReportId
    if applicationId: log_entry["applicationId"] = applicationId
    if assetId: log_entry["assetId"] = assetId
    if categoryId: log_entry["categoryId"] = categoryId
    
    await db.task_logs.insert_one(log_entry)

async def get_category_logs(db, category_id: str = None):
    query = {"categoryId": category_id} if category_id else {"categoryId": {"$exists": True}}
    cursor = db.task_logs.find(query).sort("timestamp", -1)
    logs = []
    async for doc in cursor:
        logs.append(fix_id(doc))
    return logs

async def get_task_activities(db, task_id: str):
    cursor = db.task_logs.find({"taskId": task_id}).sort("timestamp", -1)
    logs = await cursor.to_list(length=100)
    return [fix_id(log) for log in logs]

async def get_application_logs(db, application_id: str):
    cursor = db.task_logs.find({"applicationId": application_id}).sort("timestamp", -1)
    logs = []
    async for doc in cursor:
        logs.append(fix_id(doc))
    return logs

async def get_lead_logs(db, lead_id: str):
    cursor = db.task_logs.find({"leadId": lead_id}).sort("timestamp", -1)
    logs = []
    async for doc in cursor:
        logs.append(fix_id(doc))
    return logs

async def get_asset_logs(db, asset_id: str = None):
    query = {"assetId": asset_id} if asset_id else {"assetId": {"$exists": True}}
    cursor = db.task_logs.find(query).sort("timestamp", -1)
    logs = []
    async for doc in cursor:
        logs.append(fix_id(doc))
    return logs

async def get_task_logs(db, taskId: str = None, projectId: str = None, clientId: str = None, dailyReportId: str = None, monthlyReportId: str = None):
    query = {}
    if taskId: query["taskId"] = taskId
    if projectId: query["projectId"] = projectId
    if clientId: query["clientId"] = clientId
    if dailyReportId: query["dailyReportId"] = dailyReportId
    if monthlyReportId: query["monthlyReportId"] = monthlyReportId
    
    cursor = db.task_logs.find(query).sort("timestamp", -1)
    rows = await cursor.to_list(length=100)
    return [fix_id(row) for row in rows]

# Update existing log_task_activity calls to use the new log_activity
async def log_task_activity(db, taskId: str, action: str, performedBy: str, userName: str, details: str):
    await log_activity(db, action, performedBy, userName, details, taskId=taskId)


# Sales Lead CRUD
async def get_leads(db, skip: int = 0, limit: int = 100):
    cursor = db.leads.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def create_lead(db, lead: schemas.LeadCreate):
    lead_dict = lead.dict()
    performedBy = lead_dict.pop("performedBy", "Unknown")
    userName = lead_dict.pop("userName", "Unknown User")
    
    if not lead_dict.get("date"):
        lead_dict["date"] = get_now().strftime("%Y-%m-%d")
        
    result = await db.leads.insert_one(lead_dict)
    lead_id = str(result.inserted_id)
    
    # Log the creation
    await log_activity(db, "Lead Created", performedBy, userName, f"Lead for '{lead_dict['company']}' was created.", leadId=lead_id)
    
    doc = await db.leads.find_one({"_id": result.inserted_id})
    return fix_id(doc)

async def update_lead(db, lead_id: str, lead_update: schemas.LeadUpdate):
    try:
        oid = ObjectId(lead_id)
    except Exception:
        return None
        
    update_data = lead_update.dict(exclude_unset=True)
    performedBy = update_data.pop("performedBy", "Unknown")
    userName = update_data.pop("userName", "Unknown User")
    
    if update_data:
        # If status changed to 'Client Won', set closedDate if not provided
        old_lead = await db.leads.find_one({"_id": oid})
        if not old_lead:
            return None
            
        if update_data.get("status") == "Client Won" and not update_data.get("closedDate"):
            update_data["closedDate"] = get_now().strftime("%Y-%m-%d")
            
        await db.leads.update_one({"_id": oid}, {"$set": update_data})
        
        # Log the update with detailed changes
        changes = []
        ALLOWED_LOG_FIELDS = ["company", "contact", "email", "phone", "expectedIncome", "status", "priority", "source", "date", "remarks", "assignedTo"]
        for key, new_val in update_data.items():
            if key not in ALLOWED_LOG_FIELDS:
                continue
            old_val = old_lead.get(key)
            if old_val != new_val:
                display_key = key.replace("_", " ").title()
                if key == "expectedIncome":
                    changes.append(f"{display_key} changed from ₹{old_val or 0} to ₹{new_val}")
                else:
                    changes.append(f"{display_key} changed from '{old_val or 'None'}' to '{new_val}'")
                    
        if changes:
            details = "; ".join(changes)
            await log_activity(db, "Lead Updated", performedBy, userName, details, leadId=lead_id)
        
        # Trigger recalculation if status is Client Won or assignedTo changed
        if update_data.get("status") == "Client Won" or "assignedTo" in update_data:
            updated_lead = await db.leads.find_one({"_id": oid})
            emp_name = updated_lead.get("assignedTo")
            if emp_name:
                emp = await db.employees.find_one({"name": emp_name})
                if emp:
                    ld_str = updated_lead.get("closedDate") or updated_lead.get("date")
                    try:

                        ld = None
                        for fmt in ("%b %d, %Y", "%Y-%m-%d", "%d/%m/%Y"):
                            try: 
                                if isinstance(ld_str, datetime):
                                    ld = ld_str
                                else:
                                    ld = datetime.strptime(str(ld_str), fmt)
                                break
                            except Exception: continue
                        
                        if ld:
                            month_name = ld.strftime("%B")
                            week_num = (ld.day - 1) // 7 + 1
                            # Recalculate Monthly
                            await recalculate_sales_target(db, str(emp["_id"]), month_name, ld.year, "Monthly")
                            # Recalculate Weekly
                            await recalculate_sales_target(db, str(emp["_id"]), month_name, ld.year, "Weekly", week_num)
                    except Exception: pass
        
    doc = await db.leads.find_one({"_id": ObjectId(lead_id)})
    return fix_id(doc)

async def delete_lead(db, lead_id: str):
    try:
        result = await db.leads.delete_one({"_id": ObjectId(lead_id)})
        return result.deleted_count > 0
    except Exception:
        return False

async def add_lead_follow_up(db, lead_id: str, follow_up: schemas.FollowUp, performedBy: str = "Unknown", userName: str = "Unknown User"):
    follow_up_dict = follow_up.dict()
    if not follow_up_dict.get("date"):
        follow_up_dict["date"] = get_now().strftime("%Y-%m-%d %H:%M")
        
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$push": {"followUps": follow_up_dict}}
    )
    
    # Log activity
    await log_activity(db, "Follow-up Added", performedBy, userName, f"Added follow-up: {follow_up_dict.get('note', 'No notes provided')}", leadId=lead_id)
    
    doc = await db.leads.find_one({"_id": ObjectId(lead_id)})
    return fix_id(doc)

async def update_lead_follow_up(db, lead_id: str, follow_up_idx: int, follow_up: schemas.FollowUp, performedBy: str = "Unknown", userName: str = "Unknown User"):
    follow_up_dict = follow_up.dict()
    
    # Update specific element in the array using positional operator
    # followUps.0, followUps.1, etc.
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {f"followUps.{follow_up_idx}": follow_up_dict}}
    )
    
    # Log activity
    await log_activity(db, "Follow-up Updated", performedBy, userName, f"Updated follow-up at index {follow_up_idx}: {follow_up_dict.get('note', 'No notes provided')}", leadId=lead_id)
    
    doc = await db.leads.find_one({"_id": ObjectId(lead_id)})
    return fix_id(doc)

# System Settings CRUD
async def get_system_settings(db):
    settings = await db.system_settings.find_one({})
    if not settings:
        # Create default settings if none exist
        default_settings = {
            "clientVisibilityAdminOnly": True,
            "latePunchDeductionEnabled": True,
            "officeStartTime": "09:30",
            "officeEndTime": "18:30",
            "lateBufferMins": 10,
            "allowedMonthlyPaidLeaves": 1,
            "companyGstin": "24AAXFN3372M1ZK",
            "companyAddress": "FLAT-204, 2nd FLOOR, RS NO-67/1, WING-A, HARIKRUSHANA COMPLEX, OPP. BHAGAT NAGAR, VED, GURUKULROAD, KATARGAM, SURAT- 395004, GUJARAT, INDIA.",
            "companyPhone": "+91 87805 64463",
            "companyEmail": "billing@hkdigiverse.com",
            "companyPan": "AAXFN3372M",
            "companyLlpin": "ACK-1143",
            "companyState": "24",
            "bankName": "Axis Bank",
            "bankAccountNumber": "924020057377415",
            "bankIfscCode": "UTIB0002891",
            "taxInvoicePrefix": "INV",
            "proformaInvoicePrefix": "PINV",
            "invoiceColor1": "#08304b",
            "invoiceColor2": "#08304b",
            "defaultSac": ""
        }
        result = await db.system_settings.insert_one(default_settings)
        settings = await db.system_settings.find_one({"_id": result.inserted_id})
    return fix_id(settings)

async def update_system_settings(db, settings_update: schemas.SystemSettingsUpdate):
    update_data = settings_update.dict(exclude_unset=True)
    if update_data:
        await db.system_settings.update_one({}, {"$set": update_data}, upsert=True)
    return await get_system_settings(db)
# Marketing Reports CRUD
async def create_marketing_daily_report(db, report: schemas.MarketingDailyReportCreate):
    report_dict = report.dict()
    result = await db.marketing_daily_reports.insert_one(report_dict)
    report_dict["id"] = str(result.inserted_id)
    return report_dict

async def get_marketing_daily_reports(db, client_id: str = None, date: str = None):
    query = {}
    if client_id:
        query["clientId"] = client_id
    if date:
        try:
            parsed_date = datetime.strptime(date, "%Y-%m-%d")
            dt_val = datetime(parsed_date.year, parsed_date.month, parsed_date.day)
            query["date"] = {"$in": [date, parsed_date, dt_val]}
        except Exception:
            query["date"] = date
    cursor = db.marketing_daily_reports.find(query).sort("date", -1)
    reports = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        reports.append(doc)
    return reports

async def update_marketing_daily_report(db, report_id: str, report: schemas.MarketingDailyReportUpdate):
    update_data = report.dict(exclude_unset=True)
    performedBy = update_data.pop("performedBy", "Unknown")
    userName = update_data.pop("userName", "Unknown User")
    
    if not update_data:
        return None
        
    old_report = await db.marketing_daily_reports.find_one({"_id": ObjectId(report_id)})
    await db.marketing_daily_reports.update_one({"_id": ObjectId(report_id)}, {"$set": update_data})
    
    # Log details
    changes = []
    for field, val in update_data.items():
        if old_report and old_report.get(field) != val:
            changes.append(f"{field} changed to {val}")
    
    if changes:
        log_details = f"Daily Report updated: " + ", ".join(changes)
        await log_activity(db, "Updated", performedBy, userName, log_details, dailyReportId=report_id)
        
    doc = await db.marketing_daily_reports.find_one({"_id": ObjectId(report_id)})
    if doc:
        doc["id"] = str(doc["_id"])
        return doc
    return None

async def delete_marketing_daily_report(db, report_id: str):
    result = await db.marketing_daily_reports.delete_one({"_id": ObjectId(report_id)})
    return result.deleted_count > 0

async def create_marketing_monthly_report(db, report: schemas.MarketingMonthlyReportCreate):
    report_dict = report.dict()
    result = await db.marketing_monthly_reports.insert_one(report_dict)
    report_dict["id"] = str(result.inserted_id)
    return report_dict

async def get_marketing_monthly_reports(db, client_id: str = None, month: str = None):
    query = {}
    if client_id:
        query["clientId"] = client_id
    if month:
        query["month"] = month
        
    cursor = db.marketing_monthly_reports.find(query)
    reports = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        reports.append(doc)
    return reports

async def update_marketing_monthly_report(db, report_id: str, report: schemas.MarketingMonthlyReportUpdate):
    update_data = report.dict(exclude_unset=True)
    performedBy = update_data.pop("performedBy", "Unknown")
    userName = update_data.pop("userName", "Unknown User")
    
    if not update_data:
        return None
        
    old_report = await db.marketing_monthly_reports.find_one({"_id": ObjectId(report_id)})
    await db.marketing_monthly_reports.update_one({"_id": ObjectId(report_id)}, {"$set": update_data})
    
    # Log details
    changes = []
    for field, val in update_data.items():
        if old_report and old_report.get(field) != val:
            changes.append(f"{field} changed to {val}")
            
    if changes:
        log_details = f"Monthly Report updated: " + ", ".join(changes)
        await log_activity(db, "Updated", performedBy, userName, log_details, monthlyReportId=report_id)
        
    doc = await db.marketing_monthly_reports.find_one({"_id": ObjectId(report_id)})
    if doc:
        doc["id"] = str(doc["_id"])
        return doc
    return None

async def delete_marketing_monthly_report(db, report_id: str):
    result = await db.marketing_monthly_reports.delete_one({"_id": ObjectId(report_id)})
    return result.deleted_count > 0

# Penalty Type CRUD
async def get_penalty_types(db, skip: int = 0, limit: int = 100):
    cursor = db.penalty_types.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def create_penalty_type(db, penalty_type: schemas.PenaltyTypeCreate):
    penalty_dict = penalty_type.dict()
    result = await db.penalty_types.insert_one(penalty_dict)
    penalty_dict["id"] = str(result.inserted_id)
    return penalty_dict

async def update_penalty_type(db, penalty_id: str, penalty_update: schemas.PenaltyTypeUpdate):
    update_data = penalty_update.dict(exclude_unset=True)
    await db.penalty_types.update_one({"_id": ObjectId(penalty_id)}, {"$set": update_data})
    updated_doc = await db.penalty_types.find_one({"_id": ObjectId(penalty_id)})
    return fix_id(updated_doc)

async def delete_penalty_type(db, penalty_id: str):
    await db.penalty_types.delete_one({"_id": ObjectId(penalty_id)})
    return True
# Chat CRUD
async def create_message(db, message: schemas.ChatMessageCreate):
    message_dict = message.dict()
    message_dict["timestamp"] = get_now().isoformat()
    result = await db.messages.insert_one(message_dict)
    message_dict["id"] = str(result.inserted_id)
    if "_id" in message_dict:
        message_dict.pop("_id")
    if "senderId" in message_dict:
        try:
            emp = await db.employees.find_one({"_id": ObjectId(message_dict["senderId"])})
            if emp:
                message_dict["sender"] = emp.get("name", "Colleague")
        except Exception:
            pass
    return message_dict

async def create_chat_group(db, group: schemas.ChatGroupCreate):
    group_dict = group.dict()
    group_dict["timestamp"] = get_now().isoformat()
    result = await db.chat_groups.insert_one(group_dict)
    group_dict["id"] = str(result.inserted_id)
    return group_dict

async def update_chat_group(db, group_id: str, group_update: schemas.ChatGroupUpdate):
    update_data = group_update.dict(exclude_unset=True)
    await db.chat_groups.update_one({"_id": ObjectId(group_id)}, {"$set": update_data})
    updated_doc = await db.chat_groups.find_one({"_id": ObjectId(group_id)})
    return fix_id(updated_doc)

async def delete_chat_group(db, group_id: str):
    await db.chat_groups.delete_one({"_id": ObjectId(group_id)})
    # Also delete messages in this group
    await db.messages.delete_many({"groupId": group_id})
    return True

async def get_chat_groups(db, user_id: str):
    # Get groups where user is a member
    cursor = db.chat_groups.find({"members": user_id}).sort("timestamp", -1)
    rows = await cursor.to_list(length=100)
    
    fixed_rows = []
    for row in rows:
        fixed = fix_id(row)
        last_msg = await db.messages.find_one({"groupId": fixed["id"]}, sort=[("timestamp", -1)])
        if last_msg:
            fixed["lastMessage"] = last_msg.get("text", "")
            try:
                from datetime import datetime
                t_str = last_msg["timestamp"].replace("Z", "+00:00")
                dt = datetime.fromisoformat(t_str)
                fixed["lastMessageTime"] = dt.strftime("%I:%M %p").lstrip("0")
            except Exception:
                fixed["lastMessageTime"] = last_msg.get("timestamp", "")
        else:
            fixed["lastMessage"] = ""
            fixed["lastMessageTime"] = ""
        fixed_rows.append(fixed)
    return fixed_rows

async def get_messages(db, sender_id: str = None, receiver_id: str = None, group_id: str = None):
    if group_id:
        query = {"groupId": group_id}
    else:
        query = {
            "$or": [
                {"senderId": sender_id, "receiverId": receiver_id},
                {"senderId": receiver_id, "receiverId": sender_id}
            ]
        }
    cursor = db.messages.find(query).sort("timestamp", 1)
    rows = await cursor.to_list(length=1000)
    
    # Pre-fetch all active employees to avoid N+1 database queries
    try:
        employees_cursor = db.employees.find()
        employees_list = await employees_cursor.to_list(length=1000)
        employee_cache = {str(emp["_id"]): emp.get("name", "Colleague") for emp in employees_list}
    except Exception:
        employee_cache = {}

    fixed_rows = []
    for row in rows:
        fixed = fix_id(row)
        if "senderId" in fixed:
            sender_id_str = fixed["senderId"]
            fixed["sender"] = employee_cache.get(sender_id_str, "Colleague")
        fixed_rows.append(fixed)
    return fixed_rows

async def update_message(db, message_id: str, text: str):
    await db.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"text": text, "isEdited": True}}
    )
    doc = await db.messages.find_one({"_id": ObjectId(message_id)})
    return fix_id(doc)

async def delete_message(db, message_id: str):
    await db.messages.delete_one({"_id": ObjectId(message_id)})
    return True

async def mark_messages_as_seen(db, other_id: str, user_id: str):
    is_group = await db.chat_groups.find_one({"_id": ObjectId(other_id)}) if len(other_id) == 24 else None
    is_channel = await db.chat_channels.find_one({"_id": ObjectId(other_id)}) if len(other_id) == 24 else None
    
    other_id_obj = ObjectId(other_id) if len(other_id) == 24 else None
    user_id_obj = ObjectId(user_id) if len(user_id) == 24 else None
    
    user_ids = [user_id]
    if user_id_obj:
        user_ids.append(user_id_obj)
        
    other_ids = [other_id]
    if other_id_obj:
        other_ids.append(other_id_obj)
        
    if is_group or is_channel or other_id.startswith("gen-"):
        # Group or General channel
        await db.messages.update_many(
            {"groupId": {"$in": other_ids}, "seenBy": {"$nin": user_ids}},
            {"$push": {"seenBy": user_id}}
        )
    else:
        # Personal chat
        await db.messages.update_many(
            {"senderId": {"$in": other_ids}, "receiverId": {"$in": user_ids}, "seenBy": {"$nin": user_ids}},
            {"$set": {"isSeen": True}, "$push": {"seenBy": user_id}}
        )
    return True

async def get_chat_summaries(db, user_id: str):
    pipeline = [
        {"$match": {"$or": [{"senderId": user_id}, {"receiverId": user_id}]}},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": {
                "$cond": [
                    {"$eq": ["$senderId", user_id]},
                    "$receiverId",
                    "$senderId"
                ]
            },
            "lastMessage": {"$first": "$text"},
            "timestamp": {"$first": "$timestamp"},
            "isSeen": {"$first": "$isSeen"},
            "senderId": {"$first": "$senderId"}
        }}
    ]
    cursor = db.messages.aggregate(pipeline)
    results = await cursor.to_list(length=1000)
    return {r["_id"]: r for r in results}

async def toggle_save_message(db, message_id: str, user_id: str):
    msg = await db.messages.find_one({"_id": ObjectId(message_id)})
    if msg:
        saved_by = msg.get("savedBy", [])
        if user_id in saved_by:
            await db.messages.update_one({"_id": ObjectId(message_id)}, {"$pull": {"savedBy": user_id}})
            return False
        else:
            await db.messages.update_one({"_id": ObjectId(message_id)}, {"$push": {"savedBy": user_id}})
            return True
    return False

async def toggle_pin_message(db, message_id: str):
    msg = await db.messages.find_one({"_id": ObjectId(message_id)})
    if msg:
        new_status = not msg.get("isPinned", False)
        await db.messages.update_one({"_id": ObjectId(message_id)}, {"$set": {"isPinned": new_status}})
        return new_status
    return False

# Chat Channels CRUD
async def get_chat_channels(db):
    cursor = db.chat_channels.find()
    rows = await cursor.to_list(length=100)
    if not rows:
        # Seed default channels
        defaults = [
            {"name": "Announcements", "description": "Company-wide official news"},
            {"name": "General", "description": "General watercooler talk"},
            {"name": "Tech Support", "description": "IT and technical help"},
            {"name": "HR Queries", "description": "Ask HR about policies"}
        ]
        for d in defaults:
            await db.chat_channels.insert_one(d)
        cursor = db.chat_channels.find()
        rows = await cursor.to_list(length=100)
        
    fixed_rows = []
    for row in rows:
        fixed = fix_id(row)
        last_msg = await db.messages.find_one({"groupId": fixed["id"]}, sort=[("timestamp", -1)])
        if last_msg:
            fixed["lastMessage"] = last_msg.get("text", "")
            try:
                from datetime import datetime
                t_str = last_msg["timestamp"].replace("Z", "+00:00")
                dt = datetime.fromisoformat(t_str)
                fixed["lastMessageTime"] = dt.strftime("%I:%M %p").lstrip("0")
            except Exception:
                fixed["lastMessageTime"] = last_msg.get("timestamp", "")
        else:
            fixed["lastMessage"] = fixed.get("description", "")
            fixed["lastMessageTime"] = ""
        fixed_rows.append(fixed)
    return fixed_rows

async def create_chat_channel(db, channel: schemas.ChatChannelCreate):
    channel_dict = channel.dict()
    result = await db.chat_channels.insert_one(channel_dict)
    channel_dict["id"] = str(result.inserted_id)
    if "_id" in channel_dict:
        channel_dict.pop("_id")
    return channel_dict

async def update_chat_channel(db, channel_id: str, channel_update: schemas.ChatChannelUpdate):
    update_data = channel_update.dict(exclude_unset=True)
    await db.chat_channels.update_one({"_id": ObjectId(channel_id)}, {"$set": update_data})
    doc = await db.chat_channels.find_one({"_id": ObjectId(channel_id)})
    return fix_id(doc)

async def delete_chat_channel(db, channel_id: str):
    await db.chat_channels.delete_one({"_id": ObjectId(channel_id)})
    # Note: messages might use channel id as groupId
    await db.messages.delete_many({"groupId": channel_id})
    return True

async def get_saved_messages(db, user_id: str):
    cursor = db.messages.find({"savedBy": user_id})
    rows = await cursor.to_list(length=1000)
    return [fix_id(row) for row in rows]

async def get_chat_files(db, user_id: str, other_id: str, is_group: bool = False):
    if is_group:
        query = {"groupId": other_id, "attachmentUrl": {"$ne": None}}
    else:
        query = {
            "$or": [
                {"senderId": user_id, "receiverId": other_id},
                {"senderId": other_id, "receiverId": user_id}
            ],
            "attachmentUrl": {"$ne": None}
        }
    cursor = db.messages.find(query).sort("timestamp", -1)
    rows = await cursor.to_list(length=500)
    return [fix_id(row) for row in rows]

async def toggle_archive_message(db, message_id: str, user_id: str):
    msg = await db.messages.find_one({"_id": ObjectId(message_id)})
    if msg:
        archived_by = msg.get("archivedBy", [])
        if user_id in archived_by:
            await db.messages.update_one({"_id": ObjectId(message_id)}, {"$pull": {"archivedBy": user_id}})
            return False
        else:
            await db.messages.update_one({"_id": ObjectId(message_id)}, {"$push": {"archivedBy": user_id}})
            return True
    return False

async def toggle_complete_message(db, message_id: str, user_id: str):
    msg = await db.messages.find_one({"_id": ObjectId(message_id)})
    if msg:
        completed_by = msg.get("completedBy", [])
        if user_id in completed_by:
            await db.messages.update_one({"_id": ObjectId(message_id)}, {"$pull": {"completedBy": user_id}})
            return False
        else:
            await db.messages.update_one({"_id": ObjectId(message_id)}, {"$push": {"completedBy": user_id}})
            return True
    return False

async def toggle_reaction(db, message_id: str, user_id: str, emoji: str):
    msg = await db.messages.find_one({"_id": ObjectId(message_id)})
    if not msg:
        return None
    
    reactions = msg.get("reactions", {})
    if not isinstance(reactions, dict):
        reactions = {}
        
    user_list = reactions.get(emoji, [])
    if user_id in user_list:
        user_list.remove(user_id)
        if not user_list:
            del reactions[emoji]
        else:
            reactions[emoji] = user_list
    else:
        # Check if user already reacted with this emoji, or if we want to allow multiple different reactions per user
        # Standard behavior: allow multiple different emojis, but only one of each
        if emoji not in reactions:
            reactions[emoji] = []
        reactions[emoji].append(user_id)
        
    await db.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"reactions": reactions}}
    )
    return reactions

async def update_employee_status(db, employee_id: str, status: str, emoji: str):
    await db.employees.update_one(
        {"_id": ObjectId(employee_id)},
        {"$set": {"customStatus": status, "statusEmoji": emoji}}
    )
    doc = await db.employees.find_one({"_id": ObjectId(employee_id)})
    return fix_id(doc)

async def vote_poll(db, message_id: str, user_id: str, option_id: str):
    msg = await db.messages.find_one({"_id": ObjectId(message_id)})
    if not msg or "poll" not in msg:
        return None
    
    poll = msg["poll"]
    is_multiple = poll.get("isMultiple", False)
    
    updated_options = []
    for opt in poll["options"]:
        if opt["id"] == option_id:
            if user_id in opt["votes"]:
                opt["votes"].remove(user_id)
            else:
                opt["votes"].append(user_id)
        elif not is_multiple:
            # If not multiple choice, remove user from other options
            if user_id in opt["votes"]:
                opt["votes"].remove(user_id)
        updated_options.append(opt)
    
    await db.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"poll.options": updated_options}}
    )
    return updated_options

async def set_typing_status(db, chat_id: str, user_id: str, is_typing: bool):
    if is_typing:
        await db.typing.update_one(
            {"chatId": chat_id, "userId": user_id},
            {"$set": {"timestamp": get_now()}},
            upsert=True
        )
    else:
        await db.typing.delete_one({"chatId": chat_id, "userId": user_id})
    return True

async def get_typing_users(db, chat_id: str, current_user_id: str):
    # Get users typing in this chat in the last 10 seconds
    threshold = get_now() - timedelta(seconds=10)
    
    # Check if it's a group chat or personal chat
    is_group = False
    if chat_id.startswith("gen-"):
        is_group = True
    elif len(chat_id) == 24:
        try:
            group = await db.chat_groups.find_one({"_id": ObjectId(chat_id)})
            if group:
                is_group = True
        except Exception:
            pass
            
    if is_group:
        query = {
            "chatId": chat_id, 
            "userId": {"$ne": current_user_id},
            "timestamp": {"$gt": threshold}
        }
    else:
        # Personal chat: check if the other user (chat_id) is typing to the current user (current_user_id)
        query = {
            "chatId": current_user_id,
            "userId": chat_id,
            "timestamp": {"$gt": threshold}
        }
        
    cursor = db.typing.find(query)
    typing_entries = await cursor.to_list(length=100)
    
    user_ids = [entry["userId"] for entry in typing_entries]
    if not user_ids:
        return []
    
    # Get user names
    users = await db.employees.find({"_id": {"$in": [ObjectId(uid) for uid in user_ids]}}).to_list(length=100)
    return [user["name"] for user in users]

# Employee Document CRUD
async def create_employee_document(db, document: schemas.EmployeeDocumentCreate):
    doc_dict = document.dict()
    result = await db.employee_documents.insert_one(doc_dict)
    doc_dict["id"] = str(result.inserted_id)
    # Log activity
    await log_task_activity(db, None, "Document Uploaded", doc_dict["employeeId"], doc_dict["employeeName"], f"Uploaded document: {doc_dict['documentName']}")
    return doc_dict

async def get_employee_documents(db, employee_id: str = None):
    query = {}
    if employee_id:
        query["employeeId"] = employee_id
    cursor = db.employee_documents.find(query).sort("uploadDate", -1)
    docs = []
    async for doc in cursor:
        docs.append(fix_id(doc))
    return docs

async def update_employee_document(db, doc_id: str, doc_update: schemas.EmployeeDocumentUpdate):
    update_data = doc_update.dict(exclude_unset=True)
    if not update_data:
        doc = await db.employee_documents.find_one({"_id": ObjectId(doc_id)})
        return fix_id(doc)
    
    # Extract actor info if provided
    performed_by = update_data.pop("performedBy", None)
    user_name = update_data.pop("userName", None)
    
    existing_doc = await db.employee_documents.find_one({"_id": ObjectId(doc_id)})
    
    # Check for status change
    log_entry = None
    if "status" in update_data and existing_doc:
        old_status = existing_doc.get("status")
        new_status = update_data["status"]
        if old_status != new_status:
            log_entry = {
                "oldStatus": old_status,
                "newStatus": new_status,
                "changedBy": user_name or performed_by or "System",
                "timestamp": get_now().isoformat()
            }
            
    await db.employee_documents.update_one({"_id": ObjectId(doc_id)}, {"$set": update_data})
    
    if log_entry:
        await db.employee_documents.update_one({"_id": ObjectId(doc_id)}, {"$push": {"logs": log_entry}})
        
    doc = await db.employee_documents.find_one({"_id": ObjectId(doc_id)})
    return fix_id(doc)

async def delete_employee_document(db, doc_id: str):
    result = await db.employee_documents.delete_one({"_id": ObjectId(doc_id)})
    return result.deleted_count > 0

# Document Type CRUD
async def create_document_type(db, doc_type: schemas.DocumentTypeCreate):
    dt_dict = doc_type.dict()
    result = await db.document_types.insert_one(dt_dict)
    dt_dict["id"] = str(result.inserted_id)
    if "_id" in dt_dict:
        dt_dict.pop("_id")
    return dt_dict

async def get_document_types(db):
    cursor = db.document_types.find({})
    types = []
    async for dt in cursor:
        types.append(fix_id(dt))
    return types

async def update_document_type(db, type_id: str, type_update: schemas.DocumentTypeUpdate):
    update_data = type_update.dict(exclude_unset=True)
    if not update_data:
        dt = await db.document_types.find_one({"_id": ObjectId(type_id)})
        return fix_id(dt)
    
    await db.document_types.update_one({"_id": ObjectId(type_id)}, {"$set": update_data})
    dt = await db.document_types.find_one({"_id": ObjectId(type_id)})
    return fix_id(dt)

async def delete_document_type(db, type_id: str):
    result = await db.document_types.delete_one({"_id": ObjectId(type_id)})
    return result.deleted_count > 0


# Document Request CRUD
async def create_document_request(db, request: schemas.DocumentRequestCreate):
    req_dict = request.dict()
    result = await db.document_requests.insert_one(req_dict)
    req_dict["id"] = str(result.inserted_id)
    if "_id" in req_dict:
        req_dict.pop("_id")
    # Log activity
    await log_task_activity(db, None, "Document Requested", req_dict["employeeId"], req_dict["employeeName"], f"Requested letter: {req_dict['documentType']}")
    
    # Notify all Admins and HR
    try:
        admins_and_hr = await db.employees.find({
            "role": {"$regex": "^(Admin|HR)$", "$options": "i"}
        }).to_list(length=100)
        for staff in admins_and_hr:
            staff_id = str(staff["_id"])
            if staff_id == req_dict["employeeId"]:
                continue
            await db.notifications.insert_one({
                "employee_id": staff_id,
                "title": "New Document Request",
                "message": f"{req_dict['employeeName']} has requested a {req_dict['documentType']}. Reason: {req_dict.get('reason', 'Not specified')}",
                "type": "document",
                "reference_id": req_dict["id"],
                "is_read": False,
                "created_at": get_now().strftime("%d-%m-%Y %H:%M")
            })
    except Exception as e:
        print(f"Error creating notifications for document request: {e}")
    
    return req_dict

async def get_document_requests(db, employee_id: str = None):
    query = {}
    if employee_id:
        query["employeeId"] = employee_id
    cursor = db.document_requests.find(query).sort("requestDate", -1)
    reqs = []
    async for req in cursor:
        reqs.append(fix_id(req))
    return reqs

async def update_document_request(db, req_id: str, req_update: schemas.DocumentRequestUpdate):
    update_data = req_update.dict(exclude_unset=True)
    
    # Fetch the existing request before updating
    existing_req = await db.document_requests.find_one({"_id": ObjectId(req_id)})
    
    if not update_data:
        return fix_id(existing_req) if existing_req else None
    
    await db.document_requests.update_one({"_id": ObjectId(req_id)}, {"$set": update_data})
    req = await db.document_requests.find_one({"_id": ObjectId(req_id)})
    
    # Notify the employee when their document has been sent
    if update_data.get("status") == "Sent" and existing_req:
        try:
            employee_id = existing_req.get("employeeId", "")
            doc_type = existing_req.get("documentType", "document")
            if employee_id:
                await db.notifications.insert_one({
                    "employee_id": employee_id,
                    "title": "Your Document is Ready",
                    "message": f"Your requested {doc_type} has been generated and sent to you. You can download it from the Official Letters section.",
                    "type": "document",
                    "reference_id": req_id,
                    "is_read": False,
                    "created_at": get_now().strftime("%d-%m-%Y %H:%M")
                })
        except Exception as e:
            print(f"Error creating notification for document sent: {e}")
    
    return fix_id(req)

async def delete_document_request(db, req_id: str):
    result = await db.document_requests.delete_one({"_id": ObjectId(req_id)})
    return result.deleted_count > 0

# Employee Daily Report CRUD
async def apply_work_rejection_penalty(db, employee_id: str, report_date: str):
    employee = await get_employee(db, employee_id)
    if not employee:
        return
    
    salary_struct = await get_salary_structure_by_employee(db, employee_id)
    if not salary_struct:
        return
    
    try:
        dt = datetime.strptime(report_date, "%Y-%m-%d")
        month_name = calendar.month_name[dt.month]
        month_num = dt.month
        year = dt.year
        _, num_days = calendar.monthrange(year, month_num)
        
        # Calculate working days in month (excluding Sundays and Holidays)
        sunday_dates = []
        for d in range(1, num_days + 1):
            if calendar.weekday(year, month_num, d) == 6: # Sunday
                sunday_dates.append(f"{year}-{str(month_num).zfill(2)}-{str(d).zfill(2)}")
        
        start_dt_naive = datetime(year, month_num, 1)
        end_dt_naive = datetime(year, month_num, num_days, 23, 59, 59)
        start_dt_aware = start_dt_naive.replace(tzinfo=IST)
        end_dt_aware = end_dt_naive.replace(tzinfo=IST)

        # Count Holidays for this employee's company
        emp_company = employee.get("company")
        holiday_query = {
            "$or": [
                {"date": {"$gte": start_dt_naive, "$lte": end_dt_naive}},
                {"date": {"$gte": start_dt_aware, "$lte": end_dt_aware}}
            ]
        }
        if emp_company:
            holiday_query["$or"] = [
                {"$and": [{"company": emp_company}, {"$or": [{"date": {"$gte": start_dt_naive, "$lte": end_dt_naive}}, {"date": {"$gte": start_dt_aware, "$lte": end_dt_aware}}]}]},
                {"$and": [{"company": {"$in": [None, "", "null"]}}, {"$or": [{"date": {"$gte": start_dt_naive, "$lte": end_dt_naive}}, {"date": {"$gte": start_dt_aware, "$lte": end_dt_aware}}]}]}
            ]
        
        holidays_cursor = db.holidays.find(holiday_query)
        month_holidays = await holidays_cursor.to_list(length=31)
        
        unique_holidays = 0
        for h in month_holidays:
            h_date = h.get("date")
            h_date_str = h_date.strftime("%Y-%m-%d") if isinstance(h_date, (date, datetime)) else str(h_date)
            if h_date_str not in sunday_dates:
                unique_holidays += 1
                
        total_working_days = max(1, num_days - len(sunday_dates) - unique_holidays)
        per_day_salary = salary_struct["monthlyGross"] / total_working_days
        reason = f"Daily work report for {report_date} was rejected by Team Leader. Automatic full-day salary deduction applied."
        
        # Check if already deducted for this specific date
        existing = await db.bonus_deductions.find_one({
            "employeeId": employee_id,
            "type": "deduction",
            "reason": reason
        })
        
        if not existing:
            deduction = schemas.BonusDeductionCreate(
                employeeId=employee_id,
                month=month_name,
                year=year,
                type="deduction",
                amount=round(per_day_salary, 2),
                reason=reason,
                status="active",
                date=report_date
            )
            await create_bonus_deduction(db, deduction)
            
            # Add Remark for visibility
            remark_data = {
                "employeeId": employee_id,
                "employeeName": employee["name"],
                "role": employee.get("designation", "Staff"),
                "avatar": employee.get("profilePhoto", ""),
                "type": "Performance",
                "details": f"Daily work report for {report_date} was rejected by Team Leader. Automatic full-day salary deduction applied.",
                "addedBy": "System",
                "date": datetime.combine(dt.date(), datetime.min.time()).replace(tzinfo=IST)
            }
            await db.remarks.insert_one(remark_data)
            
    except Exception as e:
        print(f"Error applying work rejection penalty: {e}")

async def create_employee_daily_report(db, report: schemas.EmployeeDailyReportCreate):
    report_dict = report.dict()
    performedBy = report_dict.pop("performedBy", None)
    userName = report_dict.pop("userName", None)
    
    result = await db.employee_daily_reports.insert_one(report_dict)
    report_dict["id"] = str(result.inserted_id)
    
    # Log activity
    status = report_dict.get("status", "Submitted")
    report_date = str(report_dict['date']).split(" ")[0]
    if status in ["Approved", "Rejected"] and performedBy and userName:
        # Created directly as Approved or Rejected by TL/Admin
        action = f"Daily Report {status}"
        details = f"{status} daily report for {report_dict['employeeName']} on {report_date}"
        await log_activity(db, action, performedBy, userName, details, dailyReportId=report_dict["id"])
    else:
        # Submitted by the employee themselves
        actor_id = performedBy or report_dict["employeeId"]
        actor_name = userName or report_dict["employeeName"]
        await log_activity(db, "Daily Report Submitted", actor_id, actor_name, f"Submitted daily report for {report_date}", dailyReportId=report_dict["id"])
        
    if report_dict.get("status") == "Rejected":
        await apply_work_rejection_penalty(db, report_dict["employeeId"], report_dict["date"])
        
    return report_dict

async def get_employee_daily_reports(db, employee_id: str = None, department: str = None, date: str = None):
    query = {}
    if employee_id:
        query["employeeId"] = employee_id
    if department:
        query["department"] = department
    if date:
        try:
            parsed_date = datetime.strptime(date, "%Y-%m-%d")
            dt_val = datetime(parsed_date.year, parsed_date.month, parsed_date.day)
            query["date"] = {"$in": [date, parsed_date, dt_val]}
        except Exception:
            query["date"] = date
    
    cursor = db.employee_daily_reports.find(query).sort("date", -1)
    reports = []
    async for doc in cursor:
        reports.append(fix_id(doc))
    return reports

# Sales Target CRUD
async def get_sales_targets(db, month: Optional[str] = None, year: Optional[int] = None, type: Optional[str] = None):
    query = {}
    if month: query["month"] = month
    if year: query["year"] = year
    if type: query["type"] = type
    cursor = db.sales_targets.find(query)
    rows = await cursor.to_list(length=1000)
    return [fix_id(row) for row in rows]

async def create_or_update_sales_target(db, target: schemas.SalesTargetCreate):
    target_dict = target.dict()
    # Unique identifier: employeeId + month + year + type + (week if weekly)
    query = {
        "employeeId": target_dict["employeeId"],
        "month": target_dict["month"],
        "year": target_dict["year"],
        "type": target_dict.get("type", "Monthly")
    }
    if target_dict.get("type") == "Weekly":
        query["week"] = target_dict.get("week")
        
    await db.sales_targets.update_one(
        query,
        {"$set": target_dict},
        upsert=True
    )
    
    # Trigger recalculation immediately
    await recalculate_sales_target(
        db, 
        target_dict["employeeId"], 
        target_dict["month"], 
        target_dict["year"], 
        target_dict.get("type", "Monthly"), 
        target_dict.get("week")
    )
    
    doc = await db.sales_targets.find_one(query)
    return fix_id(doc)

async def update_sales_target(db, target_id: str, target_update: schemas.SalesTargetUpdate):
    update_data = target_update.dict(exclude_unset=True)
    result = await db.sales_targets.find_one_and_update(
        {"_id": ObjectId(target_id)},
        {"$set": update_data},
        return_document=True
    )
    return fix_id(result)

async def delete_sales_target(db, target_id: str):
    await db.sales_targets.delete_one({"_id": ObjectId(target_id)})
    return True

# Incentive Slab CRUD
async def get_incentive_slabs(db):
    cursor = db.incentive_slabs.find().sort("minAmount", 1)
    rows = await cursor.to_list(length=100)
    return [fix_id(row) for row in rows]

async def create_incentive_slab(db, slab: schemas.IncentiveSlabCreate):
    slab_dict = slab.dict()
    result = await db.incentive_slabs.insert_one(slab_dict)
    doc = await db.incentive_slabs.find_one({"_id": result.inserted_id})
    return fix_id(doc)

async def update_incentive_slab(db, slab_id: str, slab_update: schemas.IncentiveSlabUpdate):
    update_data = slab_update.dict(exclude_unset=True)
    result = await db.incentive_slabs.find_one_and_update(
        {"_id": ObjectId(slab_id)},
        {"$set": update_data},
        return_document=True
    )
    return fix_id(result)

async def calculate_sales_incentive(db, revenue: float):
    # Fetch slabs sorted by minAmount
    cursor = db.incentive_slabs.find().sort("minAmount", 1)
    slabs = await cursor.to_list(length=100)
    
    # Find the applicable slab (highest percentage where revenue hits the bracket)
    # Most business logic uses "flat" rate for the bracket reached
    applicable_slab = None
    for slab in slabs:
        if revenue >= slab["minAmount"] and revenue <= slab["maxAmount"]:
            applicable_slab = slab
            break
            
    if applicable_slab:
        return round((revenue * applicable_slab["percentage"]) / 100, 2)
    return 0.0

async def recalculate_sales_target(db, employee_id: str, month: str, year: int, target_type: str = "Monthly", week: Optional[int] = None):
    try:
        # 1. Calculate Achievement from Leads
        query = {
            "assignedTo": None, # Will be filled below
            "status": "Client Won"
        }
        
        # Get employee name for query
        emp = await get_employee(db, employee_id)
        if not emp: return
        emp_name = emp["name"]
        query["assignedTo"] = emp_name

        cursor = db.leads.find(query)
        all_won_leads = await cursor.to_list(length=1000)
        
        total_achievement = 0.0
        for lead in all_won_leads:
            try:
                # Parse date and check if it matches period
                lead_date_str = lead.get("closedDate") or lead.get("date")
                if not lead_date_str: continue

                # Expected format: "May 08, 2026" or "2026-05-08"
                ld = None
                if isinstance(lead_date_str, datetime):
                    ld = lead_date_str
                else:
                    for fmt in ("%b %d, %Y", "%Y-%m-%d", "%d/%m/%Y"):
                        try:
                            ld = datetime.strptime(str(lead_date_str), fmt)
                            break
                        except Exception: continue
                
                if not ld: continue
                
                # Check month/year
                month_name = ld.strftime("%B")
                if month_name != month or ld.year != year:
                    continue
                
                # Weekly check
                if target_type == "Weekly" and week:
                    lead_week = (ld.day - 1) // 7 + 1
                    if lead_week != week:
                        continue
                
                # Extract income amount
                income_str = str(lead.get("expectedIncome", "0")).replace("₹", "").replace(",", "").strip()
                if not income_str: income_str = "0"
                total_achievement += float(income_str)
            except Exception as e:
                print(f"Error processing lead in recalculate_sales_target: {e}")
                continue
                
        # 2. Calculate Incentive
        incentive = await calculate_sales_incentive(db, total_achievement)
        
        # 3. Update Target record
        target_query = {
            "employeeId": employee_id,
            "month": month,
            "year": year,
            "type": target_type
        }
        if target_type == "Weekly":
            target_query["week"] = week
            
        await db.sales_targets.update_one(
            target_query,
            {"$set": {
                "currentAchievement": total_achievement,
                "incentiveAmount": incentive
            }, "$setOnInsert": {
                "employeeName": emp.get("name", "Unknown") if emp else "Unknown",
                "targetAmount": 0
            }},
            upsert=True
        )
    except Exception as e:
        print(f"Global error in recalculate_sales_target: {e}")

async def update_employee_daily_report(db, report_id: str, report_update: schemas.EmployeeDailyReportUpdate):
    update_data = report_update.dict(exclude_unset=True)
    performedBy = update_data.pop("performedBy", "Unknown")
    userName = update_data.pop("userName", "Unknown User")
    
    if not update_data:
        return fix_id(await db.employee_daily_reports.find_one({"_id": ObjectId(report_id)}))
    
    # Fetch existing to check status change
    existing = await db.employee_daily_reports.find_one({"_id": ObjectId(report_id)})
    
    await db.employee_daily_reports.update_one({"_id": ObjectId(report_id)}, {"$set": update_data})
    
    # Apply penalty if status changed to Rejected
    if update_data.get("status") == "Rejected" and existing and existing.get("status") != "Rejected":
        await apply_work_rejection_penalty(db, existing["employeeId"], existing["date"])
        
    # Log activity
    if existing:
        report_date = str(existing.get('date')).split(" ")[0]
        if "status" in update_data and existing.get("status") != update_data["status"]:
            status = update_data["status"]
            await log_activity(
                db,
                f"Daily Report {status}",
                performedBy,
                userName,
                f"{status} daily report for {existing.get('employeeName')} on {report_date}",
                dailyReportId=report_id
            )
        if "note" in update_data and existing.get("note") != update_data["note"]:
            await log_activity(
                db,
                "Verification Note Added",
                performedBy,
                userName,
                f"Verification note for {existing.get('employeeName')} on {report_date} updated to: \"{update_data['note']}\"",
                dailyReportId=report_id
            )
        
    doc = await db.employee_daily_reports.find_one({"_id": ObjectId(report_id)})
    return fix_id(doc)

# Permission CRUD
async def get_user_permissions(db, employee_id: str):
    doc = await db.user_permissions.find_one({"employeeId": employee_id})
    if not doc:
        return None
    return fix_id(doc)

async def save_user_permissions(db, employee_id: str, permissions_data: schemas.UserPermissionUpdate):
    # Upsert pattern
    await db.user_permissions.update_one(
        {"employeeId": employee_id},
        {"$set": {
            "permissions": [p.dict() for p in permissions_data.permissions],
            "presetId": permissions_data.presetId
        }},
        upsert=True
    )
    doc = await db.user_permissions.find_one({"employeeId": employee_id})
    return fix_id(doc)

# Permission Presets CRUD
async def get_permission_presets(db, skip: int = 0, limit: int = 100):
    cursor = db.permission_presets.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def get_permission_preset(db, preset_id: str):
    doc = await db.permission_presets.find_one({"_id": ObjectId(preset_id)})
    if doc:
        return fix_id(doc)
    return None

async def create_permission_preset(db, preset: schemas.PermissionPresetCreate):
    doc = preset.dict()
    result = await db.permission_presets.insert_one(doc)
    doc["_id"] = result.inserted_id
    return fix_id(doc)

async def update_permission_preset(db, preset_id: str, preset_update: schemas.PermissionPresetUpdate):
    update_data = preset_update.dict(exclude_unset=True)
    if update_data:
        await db.permission_presets.update_one({"_id": ObjectId(preset_id)}, {"$set": update_data})
    
    # Propagate permissions to linked employees if permissions were updated
    if "permissions" in update_data and update_data["permissions"] is not None:
        permissions_list = [p.dict() for p in preset_update.permissions]
        await db.user_permissions.update_many(
            {"presetId": preset_id},
            {"$set": {"permissions": permissions_list}}
        )
        
    doc = await db.permission_presets.find_one({"_id": ObjectId(preset_id)})
    return fix_id(doc)

async def delete_permission_preset(db, preset_id: str):
    result = await db.permission_presets.delete_one({"_id": ObjectId(preset_id)})
    return result.deleted_count > 0

async def create_time_recovery(db, recovery: schemas.TimeRecoveryCreate):
    doc = recovery.dict()
    doc['created_at'] = get_now().isoformat()
    result = await db.time_recovery.insert_one(doc)
    doc['_id'] = result.inserted_id
    return fix_id(doc)

async def get_time_recoveries(db, skip: int = 0, limit: int = 100):
    cursor = db.time_recovery.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def get_employee_time_recoveries(db, employee_id: str):
    cursor = db.time_recovery.find({'employee_id': employee_id})
    rows = await cursor.to_list(length=1000)
    return [fix_id(row) for row in rows]

async def update_time_recovery_status(db, recovery_id: str, status: str):
    await db.time_recovery.update_one(
        {'_id': ObjectId(recovery_id)},
        {'$set': {'status': status}}
    )
    doc = await db.time_recovery.find_one({'_id': ObjectId(recovery_id)})

    if status == 'approved' and doc:
        try:
            import re
            from datetime import datetime
            reason = doc.get('reason', '')
            
            # Fuzzy search for attendance (find all records for the day)
            search_query = {
                '$or': [
                    {'employeeId': {'$regex': f'^{re.escape(str(doc["employee_id"]))}$', '$options': 'i'}},
                    {'employee_id': {'$regex': f'^{re.escape(str(doc["employee_id"]))}$', '$options': 'i'}},
                    {'employeeName': {'$regex': f'^{re.escape(str(doc.get("employee_name", "")))}', '$options': 'i'}},
                    {'employee_name': {'$regex': f'^{re.escape(str(doc.get("employee_name", "")))}', '$options': 'i'}}
                ],
                'date': doc['date']
            }
            print(f"DEBUG: Searching all attendance records for date: {doc['date']}")
            cursor = db.attendance.find(search_query)
            attn_list = await cursor.to_list(length=100)
            
            if not attn_list:
                print(f"ERROR: No attendance found for query.")
                return fix_id(doc)

            # Helper to recalculate and save
            async def apply_updates(attn_record, updated_breaks):
                if attn_record.get('checkIn') and attn_record.get('checkOut'):
                    try:
                        ci = datetime.strptime(attn_record['checkIn'], "%H:%M:%S" if ":" in attn_record['checkIn'] else "%H:%M")
                        co = datetime.strptime(attn_record['checkOut'], "%H:%M:%S" if ":" in attn_record['checkOut'] else "%H:%M")
                        diff = co - ci
                        h, r = divmod(diff.total_seconds(), 3600)
                        m, _ = divmod(r, 60)
                        attn_record['workHours'] = f"{int(h)}h {int(m)}m"
                    except Exception: pass
                
                await db.attendance.update_one(
                    {'_id': attn_record['_id']},
                    {'$set': {
                        'breaks': updated_breaks,
                        'checkIn': attn_record.get('checkIn'),
                        'workHours': attn_record.get('workHours'),
                        'status': 'Logged'
                    }}
                )

            # Case 1: Break Timing Correction
            break_match = re.search(r'Break-In:\s*(\d{1,2}:\d{2}(?::\d{2})?),?\s*Actual Break-Out:\s*(\d{1,2}:\d{2}(?::\d{2})?)', reason)
            if break_match:
                break_in, break_out = break_match.group(1), break_match.group(2)
                # Ensure 2-digit hour for consistency
                if len(break_in.split(':')[0]) == 1: break_in = '0' + break_in
                if len(break_out.split(':')[0]) == 1: break_out = '0' + break_out

                print(f"DEBUG: Processing break correction: {break_in} to {break_out}")

                for attn in attn_list:
                    updated = False
                    breaks = attn.get('breaks', [])
                    
                    # Find the BEST matching break (closest startTime)
                    best_break = None
                    min_diff = 16 # Must be within 15 mins
                    
                    for b in breaks:
                        try:
                            db_h, db_m = map(int, b.get('startTime', '00:00').split(':')[:2])
                            req_h, req_m = map(int, break_in.split(':')[:2])
                            diff = abs((db_h * 60 + db_m) - (req_h * 60 + req_m))
                            if diff < min_diff:
                                min_diff = diff
                                best_break = b
                        except Exception: continue
                    
                    if best_break:
                        print(f"DEBUG: Best match found in record {attn['_id']} with {min_diff} mins diff")
                        best_break['endTime'] = break_out
                        fmt = '%H:%M:%S' if len(break_in.split(':')) == 3 else '%H:%M'
                        t1, t2 = datetime.strptime(break_in, fmt), datetime.strptime(break_out, fmt)
                        best_break['duration'] = str(int((t2 - t1).total_seconds() / 60))
                        updated = True
                    else:
                        # Check if this record's time range covers the requested break
                        try:
                            cin_h, cin_m = map(int, attn['checkIn'].split(':')[:2])
                            cout_h, cout_m = map(int, attn.get('checkOut', '23:59:59').split(':')[:2])
                            req_h, req_m = map(int, break_in.split(':')[:2])
                            if (cin_h * 60 + cin_m) <= (req_h * 60 + req_m) <= (cout_h * 60 + cout_m):
                                print(f"DEBUG: Adding NEW break to record {attn['_id']}")
                                fmt = '%H:%M:%S' if len(break_in.split(':')) == 3 else '%H:%M'
                                t1, t2 = datetime.strptime(break_in, fmt), datetime.strptime(break_out, fmt)
                                breaks.append({
                                    "startTime": break_in if len(break_in.split(':')) == 3 else f"{break_in}:00",
                                    "endTime": break_out if len(break_out.split(':')) == 3 else f"{break_out}:00",
                                    "duration": str(int((t2 - t1).total_seconds() / 60))
                                })
                                updated = True
                        except Exception: pass

                    if updated:
                        await apply_updates(attn, breaks)

            # Case 2: Late Arrival Correction
            if "Late" in reason or "Punch-in" in reason:
                time_match = re.search(r'Actual:\s*(\d{1,2}:\d{2}(?::\d{2})?)', reason)
                if time_match:
                    actual_time = time_match.group(1)
                    if len(actual_time.split(':')[0]) == 1: actual_time = '0' + actual_time
                    print(f"DEBUG: Processing Late Arrival correction: {actual_time}")
                    earliest_attn = min(attn_list, key=lambda x: x.get('checkIn', '23:59:59'))
                    earliest_attn['checkIn'] = actual_time if len(actual_time.split(':')) == 3 else f"{actual_time}:00"
                    await apply_updates(earliest_attn, earliest_attn.get('breaks', []))

            # Case 3: Punch-Out Correction
            if "Punch-Out" in reason:
                time_match = re.search(r'Actual Punch-Out:\s*(\d{1,2}:\d{2}(?::\d{2})?)', reason)
                if time_match:
                    actual_time = time_match.group(1)
                    if len(actual_time.split(':')[0]) == 1: actual_time = '0' + actual_time
                    print(f"DEBUG: Processing Punch-Out correction: {actual_time}")
                    
                    # Apply to the latest record of the day
                    latest_attn = max(attn_list, key=lambda x: x.get('checkIn', '00:00:00'))
                    latest_attn['checkOut'] = actual_time if len(actual_time.split(':')) == 3 else f"{actual_time}:00"
                    await apply_updates(latest_attn, latest_attn.get('breaks', []))

        except Exception as e:
            print(f"Correction logic error: {e}")
    return fix_id(doc)

# Invoice CRUD
async def create_invoice(db, invoice: schemas.InvoiceCreate):
    invoice_dict = invoice.dict()
    invoice_dict["timestamp"] = get_now().isoformat()
    result = await db.invoices.insert_one(invoice_dict)
    invoice_dict["id"] = str(result.inserted_id)
    if "_id" in invoice_dict:
        invoice_dict.pop("_id")
    return invoice_dict

async def get_invoices(db, skip: int = 0, limit: int = 100):
    cursor = db.invoices.find().sort("timestamp", -1).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def get_invoice(db, invoice_id: str):
    row = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    return fix_id(row) if row else None

async def update_invoice(db, invoice_id: str, invoice_update: schemas.InvoiceUpdate):
    update_data = invoice_update.dict(exclude_unset=True)
    await db.invoices.update_one({"_id": ObjectId(invoice_id)}, {"$set": update_data})
    updated_doc = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    return fix_id(updated_doc) if updated_doc else None

async def delete_invoice(db, invoice_id: str):
    await db.invoices.delete_one({"_id": ObjectId(invoice_id)})
    return True

async def get_next_invoice_number(db, invoice_type: str = "Tax Invoice", tax_type: str = "CGST+SGST"):
    import re
    
    cursor = db.invoices.find()
    invoices = await cursor.to_list(length=1000)
    
    settings = await get_system_settings(db)
    
    if invoice_type == "Proforma Invoice":
        prefix = settings.get("proformaInvoicePrefix", "PINV")
    else:
        if tax_type == "No Tax":
            prefix = settings.get("noTaxInvoicePrefix", "NINV")
        else:
            prefix = settings.get("taxInvoicePrefix", "INV")
    
    max_num = 0
    for inv in invoices:
        num_str = inv.get("invoiceNumber", "")
        # ONLY match the current prefix format
        match_simple = re.match(rf'^{prefix}-(\d+)$', num_str)
        
        if match_simple:
            try:
                num = int(match_simple.group(1))
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
                
    next_num = max_num + 1
    return f"{prefix}-{next_num:03d}"

# Referral (Reference) CRUD
async def resolve_referral_status(db, referral: dict) -> dict:
    if not referral:
        return referral
    # Look for matching application by candidateName and phone
    app = await db.applications.find_one({
        "candidateName": referral.get("candidateName"),
        "phone": referral.get("phone")
    })
    if app:
        STAGE_TO_REFERRAL_STATUS = {
            "new": "Contacted",
            "tl_approved": "TL Approved",
            "interview": "Scheduled Interview",
            "selected": "Selected",
            "rejected": "Rejected"
        }
        app_status = app.get("status")
        mapped_status = STAGE_TO_REFERRAL_STATUS.get(app_status)
        if mapped_status:
            referral["status"] = mapped_status
    return referral

async def get_referrals(db, skip: int = 0, limit: int = 10000):
    cursor = db.referrals.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    referrals = [fix_id(row) for row in rows]
    
    resolved_referrals = []
    for ref in referrals:
        resolved = await resolve_referral_status(db, ref)
        # Only return Pending status referrals for the HR's list
        if resolved.get("status") == "Pending":
            resolved_referrals.append(resolved)
    return resolved_referrals

async def get_employee_referrals(db, employee_id: str, skip: int = 0, limit: int = 10000):
    cursor = db.referrals.find({"referredById": employee_id}).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    referrals = [fix_id(row) for row in rows]
    
    resolved_referrals = []
    for ref in referrals:
        resolved = await resolve_referral_status(db, ref)
        resolved_referrals.append(resolved)
    return resolved_referrals

async def create_referral(db, referral: schemas.ReferralCreate):
    referral_dict = referral.dict()
    if not referral_dict.get("submissionDate"):
        referral_dict["submissionDate"] = get_now().strftime("%Y-%m-%d")
    result = await db.referrals.insert_one(referral_dict)
    doc = await db.referrals.find_one({"_id": result.inserted_id})
    return fix_id(doc)

async def update_referral(db, referral_id: str, referral_update: schemas.ReferralUpdate):
    update_data = referral_update.dict(exclude_unset=True)
    
    # Get the existing referral first
    existing = await db.referrals.find_one({"_id": ObjectId(referral_id)})
    
    if update_data:
        await db.referrals.update_one({"_id": ObjectId(referral_id)}, {"$set": update_data})
        
        # If status is being updated to 'Contacted' and it wasn't already Contacted
        if existing and update_data.get("status") == "Contacted" and existing.get("status") != "Contacted":
            # 1. Create a new candidate application in 'new' stage
            app_data = {
                "candidateName": existing.get("candidateName"),
                "email": existing.get("email") or "not_provided@example.com",
                "phone": existing.get("phone") or "N/A",
                "status": "new",
                "appliedDate": get_now().strftime("%Y-%m-%d"),
                "resume": existing.get("resumeUrl") or "",
                "jobTitle": existing.get("jobTitle") or "General",
                "reference": f"Referred by: {existing.get('referredByName')}",
                "skills": "",
                "source": "Employee Referral"
            }
            # Add to applications collection
            app_result = await db.applications.insert_one(app_data)
            
            # Log the application creation activity
            await log_activity(
                db, 
                "Created", 
                existing.get("referredById") or "System", 
                existing.get("referredByName") or "System User", 
                f"Candidate '{existing.get('candidateName')}' was added automatically via Employee Referral.", 
                applicationId=str(app_result.inserted_id)
            )
            
    doc = await db.referrals.find_one({"_id": ObjectId(referral_id)})
    return fix_id(doc)

async def delete_referral(db, referral_id: str):
    await db.referrals.delete_one({"_id": ObjectId(referral_id)})
    return True

# Document Templates CRUD
async def create_document_template(db, template: schemas.DocumentTemplateCreate):
    template_dict = template.dict()
    result = await db.document_templates.insert_one(template_dict)
    doc = await db.document_templates.find_one({"_id": result.inserted_id})
    return fix_id(doc)

async def get_document_templates(db, skip: int = 0, limit: int = 100):
    cursor = db.document_templates.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def get_document_template(db, template_id: str):
    doc = await db.document_templates.find_one({"_id": ObjectId(template_id)})
    if doc:
        return fix_id(doc)
    return None

async def update_document_template(db, template_id: str, template_update: schemas.DocumentTemplateUpdate):
    update_data = template_update.dict(exclude_unset=True)
    if update_data:
        await db.document_templates.update_one({"_id": ObjectId(template_id)}, {"$set": update_data})
    doc = await db.document_templates.find_one({"_id": ObjectId(template_id)})
    return fix_id(doc)

async def delete_document_template(db, template_id: str):
    result = await db.document_templates.delete_one({"_id": ObjectId(template_id)})
    return result.deleted_count > 0
# Asset Category CRUD
async def get_asset_categories(db, skip: int = 0, limit: int = 100):
    cursor = db.asset_categories.find({"is_user_created": True}).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def sync_category_assets(db, category_name: str, total_items: int, performed_by: str = "System", user_name: str = "System User"):
    # 1. Count existing assets in this category
    existing_count = await db.assets.count_documents({"category": category_name})
    
    if existing_count > total_items:
        to_delete = existing_count - total_items
        # Find unallocated assets to delete (status = "Available")
        cursor = db.assets.find({"category": category_name, "status": "Available"}).limit(to_delete)
        assets_to_delete = await cursor.to_list(length=to_delete)
        
        for asset in assets_to_delete:
            asset_id_str = str(asset["_id"])
            await log_activity(
                db, 
                "Deleted", 
                performed_by, 
                user_name, 
                f"Asset '{asset.get('name')}' ({asset.get('assetId')}) was automatically removed because category '{category_name}' capacity was reduced.", 
                assetId=asset_id_str
            )
            await db.assets.delete_one({"_id": asset["_id"]})
        return

    if existing_count == total_items:
        return
        
    # 2. We need to create (total_items - existing_count) new assets
    to_create = total_items - existing_count
    
    # Generate unique assetIds.
    prefix = "".join([c for c in category_name if c.isalnum()]).upper()[:3]
    if not prefix:
        prefix = "AST"
        
    for i in range(to_create):
        index = existing_count + i + 1
        asset_id = f"HK-{prefix}-{index:03d}"
        
        # Make sure assetId is unique in the db
        while await db.assets.find_one({"assetId": asset_id}):
            index += 1
            asset_id = f"HK-{prefix}-{index:03d}"
            
        asset_doc = {
            "assetId": asset_id,
            "name": f"{category_name} {index}",
            "category": category_name,
            "serialNumber": f"SN-{prefix}-{index:04d}",
            "assignedTo": "",
            "status": "Available",
            "condition": "New",
            "location": "",
            "purchaseDate": None,
            "value": 0.0,
            "description": f"Automatically created resource under category '{category_name}'"
        }
        
        # Insert asset
        result = await db.assets.insert_one(asset_doc)
        inserted_id = str(result.inserted_id)
        
        # Give individual logs for the inventory
        await log_activity(
            db, 
            "Created", 
            performed_by, 
            user_name, 
            f"Asset '{asset_doc['name']}' ({asset_doc['assetId']}) was automatically created under category '{category_name}'.", 
            assetId=inserted_id
        )

async def create_asset_category(db, category: schemas.AssetCategoryCreate):
    category_dict = category.dict()
    performed_by = category_dict.pop("performedBy", "System") or "System"
    user_name = category_dict.pop("userName", "System User") or "System User"
    
    category_dict["is_user_created"] = True
    result = await db.asset_categories.insert_one(category_dict)
    category_id = str(result.inserted_id)
    category_dict["id"] = category_id
    if "_id" in category_dict:
        category_dict.pop("_id")
        
    # Give individual log for the category
    await log_activity(
        db,
        "Created",
        performed_by,
        user_name,
        f"Asset Category '{category_dict['name']}' was created with {category_dict.get('totalItems', 0)} total resources.",
        categoryId=category_id
    )
    
    # Auto create resources in inventory
    await sync_category_assets(db, category_dict["name"], category_dict.get("totalItems", 0), performed_by, user_name)
    
    return category_dict

async def update_asset_category(db, category_id: str, category_update: schemas.AssetCategoryUpdate):
    existing = await db.asset_categories.find_one({"_id": ObjectId(category_id)})
    update_data = category_update.dict(exclude_unset=True)
    performed_by = update_data.pop("performedBy", "System") or "System"
    user_name = update_data.pop("userName", "System User") or "System User"
    
    await db.asset_categories.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": update_data}
    )
    updated_doc = await db.asset_categories.find_one({"_id": ObjectId(category_id)})
    
    # Give individual log for the category
    if existing:
        changes = []
        if "name" in update_data and existing.get("name") != update_data["name"]:
            changes.append(f"Name changed from '{existing.get('name')}' to '{update_data['name']}'")
        if "totalItems" in update_data and existing.get("totalItems") != update_data["totalItems"]:
            changes.append(f"Total Resources changed from {existing.get('totalItems', 0)} to {update_data['totalItems']}")
        if "description" in update_data and existing.get("description") != update_data["description"]:
            changes.append("Description updated")
            
        if not changes:
            changes.append("General category details updated")
            
        log_details = f"Asset Category '{existing.get('name')}': " + ", ".join(changes)
        await log_activity(db, "Updated", performed_by, user_name, log_details, categoryId=category_id)
        
        # If name of the category changed, update category name in all associated assets first
        if "name" in update_data and existing.get("name") != update_data["name"]:
            await db.assets.update_many({"category": existing.get("name")}, {"$set": {"category": update_data["name"]}})
            
    # Auto sync/create resources in inventory
    await sync_category_assets(db, updated_doc["name"], updated_doc.get("totalItems", 0), performed_by, user_name)
        
    return fix_id(updated_doc)

async def delete_asset_category(db, category_id: str, performed_by: str = "System", user_name: str = "System User"):
    existing = await db.asset_categories.find_one({"_id": ObjectId(category_id)})
    category_name = existing.get("name") if existing else None

    if existing:
        await log_activity(
            db,
            "Deleted",
            performed_by,
            user_name,
            f"Asset Category '{category_name}' was deleted along with all its resources.",
            categoryId=category_id
        )

    # Delete all assets belonging to this category
    # NOTE: old assets may use "type" field instead of "category" for compatibility
    if category_name:
        assets_cursor = db.assets.find({
            "$or": [
                {"category": category_name},
                {"type": category_name}
            ]
        })
        assets = await assets_cursor.to_list(length=None)
        for asset in assets:
            asset_id_str = str(asset["_id"])
            asset_name = asset.get("name", "Unknown Asset")
            asset_code = asset.get("assetId", "N/A")
            await log_activity(
                db,
                "Deleted",
                performed_by,
                user_name,
                f"Asset '{asset_name}' ({asset_code}) was deleted because its category '{category_name}' was removed.",
                assetId=asset_id_str
            )
        # Delete all matched assets at once
        await db.assets.delete_many({
            "$or": [
                {"category": category_name},
                {"type": category_name}
            ]
        })

    await db.asset_categories.delete_one({"_id": ObjectId(category_id)})
    return True

# --- Schedule Operations ---
async def get_schedules(db, employee_id: str = None, date_str: str = None, date_from: str = None, date_to: str = None):
    query = {}
    if employee_id:
        query["employeeId"] = employee_id
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d")
            query["date"] = {"$in": [date_str, target_date]}
        except Exception:
            query["date"] = date_str
    elif date_from and date_to:
        try:
            start = datetime.strptime(date_from, "%Y-%m-%d")
            end = datetime.strptime(date_to, "%Y-%m-%d")
            # Build list of all date variants (string + datetime) for each day in range
            date_variants = []
            current = start
            while current <= end:
                date_variants.append(current.strftime("%Y-%m-%d"))
                date_variants.append(current)
                current += timedelta(days=1)
            query["date"] = {"$in": date_variants}
        except Exception:
            pass
    cursor = db.schedules.find(query)
    schedules = await cursor.to_list(length=1000)
    return [fix_id(s) for s in schedules]

async def create_schedule(db, schedule_data: dict):
    new_doc = await db.schedules.insert_one(schedule_data)
    created = await db.schedules.find_one({"_id": new_doc.inserted_id})
    return fix_id(created)

async def update_schedule(db, schedule_id: str, schedule_data: dict):
    if not ObjectId.is_valid(schedule_id):
        return None
    await db.schedules.update_one(
        {"_id": ObjectId(schedule_id)},
        {"$set": schedule_data}
    )
    updated = await db.schedules.find_one({"_id": ObjectId(schedule_id)})
    return fix_id(updated) if updated else None

async def delete_schedule(db, schedule_id: str):
    if not ObjectId.is_valid(schedule_id):
        return False
    res = await db.schedules.delete_one({"_id": ObjectId(schedule_id)})
    return res.deleted_count > 0



