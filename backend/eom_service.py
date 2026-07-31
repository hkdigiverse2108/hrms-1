from database import db
from datetime import datetime
from bson import ObjectId
import pytz

IST = pytz.timezone('Asia/Kolkata')

FIXED_CRITERIA_DEFAULTS = [
    {"name": "VOTE", "maxScore": 10, "isFixed": True, "order": 1},
    {"name": "DISCIPLINE", "maxScore": 10, "isFixed": True, "order": 2},
    {"name": "Work Completion", "maxScore": 15, "isFixed": True, "order": 3},
    {"name": "ATTENDANCE", "maxScore": 15, "isFixed": True, "order": 4},
    {"name": "Supportive", "maxScore": 15, "isFixed": True, "order": 5},
    {"name": "Communication", "maxScore": 15, "isFixed": False, "order": 6},
    {"name": "PERFORMANCE", "maxScore": 20, "isFixed": False, "order": 7},
]

# --- MASTER TEMPLATE MANAGEMENT ---

async def get_or_init_master_criteria():
    master = await db.eom_master_criteria.find({}).sort("order", 1).to_list(length=100)
    if not master:
        for idx, item in enumerate(FIXED_CRITERIA_DEFAULTS, start=1):
            doc = {
                "name": item["name"],
                "maxScore": item["maxScore"],
                "isFixed": item["isFixed"],
                "order": item["order"],
                "assignedPersonIds": [],
                "createdAt": datetime.now(IST)
            }
            res = await db.eom_master_criteria.insert_one(doc)
            doc["id"] = str(res.inserted_id)
            if "_id" in doc:
                del doc["_id"]
            master.append(doc)
    else:
        for m in master:
            m["id"] = str(m.get("_id", m.get("id")))
            if "_id" in m:
                del m["_id"]
    return master

async def save_master_criteria(criteria_list: list):
    await db.eom_master_criteria.delete_many({})
    saved = []
    for idx, c in enumerate(criteria_list, start=1):
        doc = {
            "name": c.get("name", "").strip(),
            "maxScore": float(c.get("maxScore", 0)),
            "isFixed": c.get("isFixed", False),
            "entryType": c.get("entryType", "direct"),
            "category": c.get("category", "+ve"),
            "order": idx,
            "assignedPersonIds": c.get("assignedPersonIds", []),
            "updatedAt": datetime.now(IST)
        }
        res = await db.eom_master_criteria.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        if "_id" in doc:
            del doc["_id"]
        saved.append(doc)
    return saved

# --- EMPLOYEE OF THE MONTH (PER-MONTH CRITERIA & SCORES) ---

async def get_or_init_criteria(month_year: str):
    criteria = await db.eom_criteria.find({"month_year": month_year}).sort("order", 1).to_list(length=100)
    if not criteria:
        # Copy from Master Template if month-specific criteria don't exist yet!
        master = await get_or_init_master_criteria()
        for idx, item in enumerate(master, start=1):
            doc = {
                "month_year": month_year,
                "name": item["name"],
                "maxScore": item["maxScore"],
                "isFixed": item.get("isFixed", False),
                "entryType": item.get("entryType", "direct"),
                "category": item.get("category", "+ve"),
                "order": idx,
                "assignedPersonIds": item.get("assignedPersonIds", []),
                "createdAt": datetime.now(IST)
            }
            res = await db.eom_criteria.insert_one(doc)
            doc["id"] = str(res.inserted_id)
            if "_id" in doc:
                del doc["_id"]
            criteria.append(doc)
    else:
        for c in criteria:
            c["id"] = str(c.get("_id", c.get("id")))
            if "_id" in c:
                del c["_id"]
    return criteria

async def save_criteria(month_year: str, criteria_list: list, expected_total: float = None):
    total_score = sum(float(c.get("maxScore", 0)) for c in criteria_list)
    if expected_total is not None and abs(total_score - expected_total) > 0.01:
        raise ValueError(f"Total max score must be exactly {expected_total}. Current total is {round(total_score, 2)}.")
    
    # Process and upsert per-month criteria independently from Master Template
    saved_criteria = []
    existing_ids = []
    
    for idx, c in enumerate(criteria_list, start=1):
        cid = c.get("id")
        c_name = c.get("name", "").strip()
        is_fixed = c.get("isFixed", False)
        
        doc = {
            "month_year": month_year,
            "name": c_name,
            "maxScore": float(c.get("maxScore", 0)),
            "isFixed": is_fixed,
            "entryType": c.get("entryType", "direct"),
            "category": c.get("category", "+ve"),
            "order": idx,
            "assignedPersonIds": c.get("assignedPersonIds", []),
            "updatedAt": datetime.now(IST)
        }
        
        if cid and len(cid) == 24:
            await db.eom_criteria.update_one({"_id": ObjectId(cid)}, {"$set": doc})
            doc["id"] = cid
            existing_ids.append(ObjectId(cid))
        else:
            doc["createdAt"] = datetime.now(IST)
            res = await db.eom_criteria.insert_one(doc)
            doc["id"] = str(res.inserted_id)
            existing_ids.append(res.inserted_id)
            if "_id" in doc:
                del doc["_id"]
        saved_criteria.append(doc)

    # Clean up criteria removed in this update for this specific month_year
    await db.eom_criteria.delete_many({
        "month_year": month_year,
        "_id": {"$nin": existing_ids}
    })

    return saved_criteria

def compute_hybrid_rank_and_score(entries: list, category_type: str, max_score: float):
    """
    Dynamic Rank-to-Score Formula Solver:
    Let N = Total number of employees
    Equal Step Width: I = max_score / (N - 1)
    Score for Rank R: Score = max_score - ((R - 1) * I)
    Tied values receive identical ranks (e.g., two Rank 1s). The subsequent rank is skipped (1, 1, 3, 4...).
    """
    N = len(entries)
    if N == 0:
        return []

    I = (max_score / (N - 1)) if N > 1 else 0.0
    has_quantity = any(e.get("quantity") is not None and str(e.get("quantity")).strip() != "" for e in entries)

    if has_quantity:
        reverse = (category_type != "-ve")
        def parse_qty(v):
            try:
                return float(v)
            except (ValueError, TypeError):
                return float('-inf') if reverse else float('inf')

        sorted_entries = sorted(entries, key=lambda x: parse_qty(x.get("quantity")), reverse=reverse)
        computed = []
        for idx, item in enumerate(sorted_entries):
            q_val = parse_qty(item.get("quantity"))
            if idx > 0:
                prev_q = parse_qty(sorted_entries[idx - 1].get("quantity"))
                if q_val == prev_q and q_val not in (float('-inf'), float('inf')):
                    item_rank = computed[-1]["rank"]
                else:
                    item_rank = idx + 1
            else:
                item_rank = 1

            score = max_score - ((item_rank - 1) * I)
            score = max(0.0, min(max_score, score))

            computed.append({
                "employeeId": item["employeeId"],
                "quantity": float(item["quantity"]) if item.get("quantity") is not None and str(item.get("quantity")).strip() != "" else None,
                "rank": item_rank,
                "score": round(score, 2)
            })
        return computed
    else:
        computed = []
        for item in entries:
            r = item.get("manualRank")
            if r is not None and str(r).strip() != "" and int(r) > 0:
                item_rank = int(r)
                score = max_score - ((item_rank - 1) * I)
                score = max(0.0, min(max_score, score))
            else:
                item_rank = None
                try:
                    score = float(item.get("score", 0))
                except (ValueError, TypeError):
                    score = 0.0

            computed.append({
                "employeeId": item["employeeId"],
                "quantity": None,
                "rank": item_rank,
                "score": round(score, 2)
            })
        return computed

async def bulk_save_hybrid_scores(month_year: str, criteria_id: str, category_type: str, max_score: float, entries: list, scored_by: str = "System"):
    computed_results = compute_hybrid_rank_and_score(entries, category_type, max_score)
    saved_scores = []
    for res in computed_results:
        s_doc = await save_score(
            month_year=month_year,
            criteria_id=criteria_id,
            employee_id=res["employeeId"],
            score=res["score"],
            raw_quantity=res.get("quantity"),
            calculated_rank=res.get("rank"),
            scored_by=scored_by
        )
        saved_scores.append(s_doc)
    return saved_scores

async def get_eom_reveal_order(month_year: str):
    criteria_list = await get_or_init_criteria(month_year)
    if not criteria_list:
        return {"month_year": month_year, "stages": [], "totalStages": 0}

    vote_criteria = next((c for c in criteria_list if "vote" in str(c.get("name", "")).lower()), None)
    other_criteria = [c for c in criteria_list if c != vote_criteria]

    stages = []
    if vote_criteria:
        stages.append({
            "stageIndex": 1,
            "type": "VOTE_BASELINE",
            "criteria": vote_criteria
        })
        start_idx = 2
    else:
        start_idx = 1

    for idx, crit in enumerate(other_criteria, start=start_idx):
        is_final = (idx == len(criteria_list))
        stages.append({
            "stageIndex": idx,
            "type": "GRAND_FINALE" if is_final else "PROGRESSIVE_REVEAL",
            "criteria": crit
        })

    return {
        "month_year": month_year,
        "stages": stages,
        "totalStages": len(stages)
    }

ADMIN_ROLES = {"admin", "super admin", "superadmin", "administrator", "founder"}

def is_admin_employee(emp: dict) -> bool:
    role = str(emp.get("role") or emp.get("designation") or "").lower().strip()
    return role in ADMIN_ROLES

async def get_month_config(month_year: str):
    config = await db.eom_month_config.find_one({"month_year": month_year})
    if not config:
        return {
            "month_year": month_year,
            "isConfigured": False,
            "selectedEmployeeIds": None
        }
    return {
        "month_year": month_year,
        "isConfigured": True,
        "selectedEmployeeIds": config.get("selectedEmployeeIds", [])
    }

async def save_month_config(month_year: str, selected_employee_ids: list):
    doc = {
        "month_year": month_year,
        "selectedEmployeeIds": selected_employee_ids,
        "updatedAt": datetime.now(IST)
    }
    await db.eom_month_config.update_one(
        {"month_year": month_year},
        {"$set": doc},
        upsert=True
    )
    return doc

async def clone_criteria(from_month_year: str, to_month_year: str):
    source_criteria = await db.eom_criteria.find({"month_year": from_month_year}).sort("order", 1).to_list(length=100)
    if not source_criteria:
        return await get_or_init_criteria(to_month_year)
    
    # Delete existing criteria for to_month_year
    await db.eom_criteria.delete_many({"month_year": to_month_year})
    
    cloned = []
    for item in source_criteria:
        doc = {
            "month_year": to_month_year,
            "name": item["name"],
            "maxScore": item["maxScore"],
            "isFixed": item.get("isFixed", False),
            "order": item.get("order", 1),
            "assignedPersonIds": item.get("assignedPersonIds", []),
            "createdAt": datetime.now(IST)
        }
        res = await db.eom_criteria.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        if "_id" in doc:
            del doc["_id"]
        cloned.append(doc)
    return cloned

async def save_score(month_year: str, criteria_id: str, employee_id: str, score: float, raw_quantity: float = None, calculated_rank: int = None, scored_by: str = "System"):
    doc = {
        "month_year": month_year,
        "criteriaId": criteria_id,
        "employeeId": employee_id,
        "scoredBy": scored_by,
        "score": float(score),
        "rawQuantity": raw_quantity,
        "calculatedRank": calculated_rank,
        "submittedAt": datetime.now(IST)
    }
    
    await db.eom_scores.update_one(
        {
            "month_year": month_year,
            "criteriaId": criteria_id,
            "employeeId": employee_id,
            "scoredBy": scored_by
        },
        {"$set": doc},
        upsert=True
    )
    return doc

async def get_scores(month_year: str, criteria_id: str = None):
    query = {"month_year": month_year}
    if criteria_id:
        query["criteriaId"] = criteria_id
    scores = await db.eom_scores.find(query).to_list(length=2000)
    for s in scores:
        s["id"] = str(s.get("_id", s.get("id")))
        if "_id" in s:
            del s["_id"]
    return scores

import calendar
from datetime import date, datetime

async def get_eom_attendance_stats(month_year: str, max_score: float = 15.0):
    try:
        parts = month_year.split("-")
        year, month = int(parts[0]), int(parts[1])
    except Exception:
        now_dt = datetime.now()
        year, month = now_dt.year, now_dt.month

    num_days = calendar.monthrange(year, month)[1]
    
    # 1. Calculate Sundays in month
    sundays = 0
    sunday_dates = set()
    for day in range(1, num_days + 1):
        d = date(year, month, day)
        if d.weekday() == 6: # Sunday
            sundays += 1
            sunday_dates.add(f"{year:04d}-{month:02d}-{day:02d}")

    # 2. Fetch Company Holidays for month (excluding Sundays)
    start_dt = datetime(year, month, 1, 0, 0, 0)
    end_dt = datetime(year, month, num_days, 23, 59, 59)
    start_str = f"{year:04d}-{month:02d}-01"
    end_str = f"{year:04d}-{month:02d}-{num_days:02d}"

    holidays_cursor = db.holidays.find({
        "$or": [
            {"date": {"$gte": start_dt, "$lte": end_dt}},
            {"date": {"$gte": start_str, "$lte": end_str}}
        ]
    })
    month_holidays = await holidays_cursor.to_list(length=100)
    
    unique_company_holidays = set()
    for h in month_holidays:
        h_d = h.get("date")
        if isinstance(h_d, (datetime, date)):
            h_str = h_d.strftime("%Y-%m-%d")
        else:
            h_str = str(h_d).split("T")[0] if h_d else ""
        
        if h_str and h_str not in sunday_dates:
            unique_company_holidays.add(h_str)

    total_company_holidays_count = len(unique_company_holidays)
    total_working_days = max(1, num_days - sundays - total_company_holidays_count)

    # 3. Query Attendance Records for month
    att_cursor = db.attendance.find({
        "$or": [
            {"date": {"$gte": start_dt, "$lte": end_dt}},
            {"date": {"$gte": start_str, "$lte": end_str}},
            {"date": {"$regex": f"^{year:04d}-{month:02d}"}}
        ]
    })
    att_records = await att_cursor.to_list(length=10000)

    emp_present_map = {}
    emp_distinct_dates = {}

    for r in att_records:
        emp_id = str(r.get("employeeId") or "")
        emp_name = str(r.get("employeeName") or "").strip().lower()
        st = str(r.get("status", "")).lower().strip()
        check_in = str(r.get("checkIn", "")).strip()
        punches = r.get("punches", [])
        sec = r.get("accumulatedWorkSeconds", 0)

        r_d = r.get("date")
        if isinstance(r_d, (datetime, date)):
            d_str = r_d.strftime("%Y-%m-%d")
        else:
            d_str = str(r_d).split("T")[0] if r_d else ""

        is_present = False
        is_half = False

        if "half" in st:
            is_half = True
        elif "present" in st or "logged" in st or "late" in st or "on time" in st or st == "p":
            is_present = True
        elif check_in and check_in != "--" and check_in != "-":
            is_present = True
        elif isinstance(punches, list) and len(punches) > 0:
            is_present = True
        elif isinstance(sec, (int, float)) and sec > 0:
            is_present = True

        val = 0.5 if is_half else (1.0 if is_present else 0.0)

        if val > 0:
            if emp_id:
                if emp_id not in emp_distinct_dates:
                    emp_distinct_dates[emp_id] = {}
                emp_distinct_dates[emp_id][d_str] = max(emp_distinct_dates[emp_id].get(d_str, 0.0), val)
            
            if emp_name:
                if emp_name not in emp_distinct_dates:
                    emp_distinct_dates[emp_name] = {}
                emp_distinct_dates[emp_name][d_str] = max(emp_distinct_dates[emp_name].get(d_str, 0.0), val)

    for key, dates_dict in emp_distinct_dates.items():
        emp_present_map[key] = sum(dates_dict.values())

    # 4. Fetch Approved Leaves for month (db.leave_requests)
    # ONLY status == "Approved" (case-insensitive) counts!
    try:
        leaves_cursor = db.leave_requests.find({
            "status": {"$regex": "^approved$", "$options": "i"}
        })
        approved_leaves = await leaves_cursor.to_list(length=10000)

        emp_leave_deductions = {}
        from datetime import timedelta

        for l_req in approved_leaves:
            l_emp_id = str(l_req.get("employee_id") or l_req.get("employeeId") or "").strip()
            l_emp_name = str(l_req.get("employee_name") or l_req.get("employeeName") or "").strip().lower()

            is_half = (
                l_req.get("half_day") is True or
                "half" in str(l_req.get("day_type", "")).lower() or
                "half" in str(l_req.get("duration", "")).lower() or
                "half" in str(l_req.get("type", "")).lower()
            )
            deduction_per_day = 0.5 if is_half else 1.0

            s_date_val = l_req.get("start_date") or l_req.get("startDate")
            e_date_val = l_req.get("end_date") or l_req.get("endDate")

            def parse_date(v):
                if isinstance(v, (datetime, date)):
                    return v.date() if isinstance(v, datetime) else v
                s = str(v).split()[0].split("T")[0]
                for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
                    try:
                        return datetime.strptime(s, fmt).date()
                    except ValueError:
                        pass
                return None

            s_d = parse_date(s_date_val)
            e_d = parse_date(e_date_val)

            if s_d and e_d:
                curr = s_d
                while curr <= e_d:
                    if curr.year == year and curr.month == month:
                        d_str = curr.strftime("%Y-%m-%d")
                        if curr.weekday() != 6 and d_str not in unique_company_holidays:
                            if l_emp_id:
                                emp_leave_deductions[l_emp_id] = emp_leave_deductions.get(l_emp_id, 0.0) + deduction_per_day
                            if l_emp_name:
                                emp_leave_deductions[l_emp_name] = emp_leave_deductions.get(l_emp_name, 0.0) + deduction_per_day
                    curr += timedelta(days=1)
            else:
                dur_days = float(l_req.get("leaveDays") or l_req.get("days") or (0.5 if is_half else 1.0))
                if l_emp_id:
                    emp_leave_deductions[l_emp_id] = emp_leave_deductions.get(l_emp_id, 0.0) + dur_days
                if l_emp_name:
                    emp_leave_deductions[l_emp_name] = emp_leave_deductions.get(l_emp_name, 0.0) + dur_days

        # Apply leave deductions to present days count
        for key in list(emp_present_map.keys()):
            base_days = emp_present_map[key]
            deduction = emp_leave_deductions.get(key, 0.0)
            net_days = max(0.0, base_days - deduction)
            emp_present_map[key] = round(net_days, 1)

    except Exception as err:
        print("Error processing approved leave deductions for EOM:", err)

    return {
        "month_year": month_year,
        "totalDaysInMonth": num_days,
        "sundays": sundays,
        "companyHolidays": total_company_holidays_count,
        "totalWorkingDays": total_working_days,
        "maxScore": max_score,
        "formula": f"Score = (Present Days / {total_working_days} Working Days) * {max_score} pts",
        "employeeStats": emp_present_map
    }

async def calculate_eom_leaderboard(month_year: str):
    criteria_list = await get_or_init_criteria(month_year)
    scores_list = await get_scores(month_year)
    
    # Fetch active employees
    inactive_statuses = ["inactive", "Inactive", "INACTIVE", "terminated", "Terminated", "TERMINATED", "resigned", "Resigned", "RESIGNED"]
    raw_employees = await db.employees.find({"status": {"$nin": inactive_statuses}}).to_list(length=1000)

    # Always exclude Admins from EOM candidates
    non_admin_employees = [e for e in raw_employees if not is_admin_employee(e)]

    # Get month configuration for participating employees
    cfg = await get_month_config(month_year)
    if cfg.get("isConfigured") and cfg.get("selectedEmployeeIds") is not None:
        selected_ids = set(cfg.get("selectedEmployeeIds", []))
        employees = [e for e in non_admin_employees if str(e.get("_id")) in selected_ids]
    else:
        employees = non_admin_employees

    submitted_scores = {}
    for s in scores_list:
        c_id = str(s.get("criteriaId"))
        e_id = str(s.get("employeeId"))
        key = (c_id, e_id)
        if key not in submitted_scores:
            submitted_scores[key] = []
        submitted_scores[key].append(float(s.get("score", 0)))

    leaderboard = []
    for emp in employees:
        emp_id = str(emp.get("_id"))
        emp_name = emp.get("name") or f"{emp.get('firstName', '')} {emp.get('lastName', '')}".strip() or "Employee"
        
        c_scores = {}
        total_score = 0.0

        for crit in criteria_list:
            cid = str(crit.get("id"))
            max_sc = float(crit.get("maxScore", 0))
            key = (cid, emp_id)
            sub_list = submitted_scores.get(key, [])
            
            if sub_list:
                avg_sc = sum(sub_list) / len(sub_list)
            else:
                avg_sc = 0.0
            
            avg_sc = min(avg_sc, max_sc) # Cap at maxScore
            c_scores[cid] = round(avg_sc, 2)
            total_score += avg_sc

        leaderboard.append({
            "employeeId": emp_id,
            "name": emp_name,
            "department": emp.get("department", "General"),
            "designation": emp.get("designation", "Staff"),
            "avatar": emp.get("avatar", ""),
            "criteriaScores": c_scores,
            "totalScore": round(total_score, 2),
        })

    leaderboard.sort(key=lambda x: x["totalScore"], reverse=True)
    
    for idx, entry in enumerate(leaderboard, start=1):
        entry["rank"] = idx

    return {
        "month_year": month_year,
        "criteria": criteria_list,
        "leaderboard": leaderboard
    }

async def get_eom_month_history():
    months_cursor = db.eom_criteria.aggregate([
        {"$group": {"_id": "$month_year", "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}}
    ])
    months_list = await months_cursor.to_list(length=100)
    result = []
    for item in months_list:
        m_str = item["_id"]
        lb_res = await calculate_eom_leaderboard(m_str)
        top = lb_res["leaderboard"][0] if lb_res["leaderboard"] else None
        result.append({
            "month_year": m_str,
            "criteriaCount": item["count"],
            "winner": top["name"] if top else "N/A",
            "winnerScore": top["totalScore"] if top else 0
        })
    return result

# --- EMPLOYEE OF THE WEEK (EOW) ---

async def get_weekly_meetings():
    meetings = await db.weekly_meetings.find({}).sort("meetingDate", -1).to_list(length=200)
    result = []
    for m in meetings:
        mid = str(m.get("_id", m.get("id")))
        topics_count = await db.weekly_topics.count_documents({"meetingId": mid})
        result.append({
            "id": mid,
            "meetingDate": m.get("meetingDate", ""),
            "participantEmployeeIds": m.get("participantEmployeeIds", []),
            "topicsCount": topics_count,
            "createdAt": m.get("createdAt", "")
        })
    return result

async def get_weekly_master_topics():
    topics = await db.weekly_master_topics.find({}).sort("order", 1).to_list(length=100)
    if not topics:
        default_master = [
            {"name": "Update Round", "maxMarks": 20.0, "order": 1},
            {"name": "Focus Tasking", "maxMarks": 20.0, "order": 2},
            {"name": "Challenge Discussion", "maxMarks": 20.0, "order": 3},
            {"name": "English Speak", "maxMarks": 10.0, "order": 4},
            {"name": "Innovation", "maxMarks": 30.0, "order": 5},
        ]
        for idx, t in enumerate(default_master, start=1):
            t["createdAt"] = datetime.now(IST)
            res = await db.weekly_master_topics.insert_one(t)
            t["id"] = str(res.inserted_id)
            if "_id" in t:
                del t["_id"]
        return default_master

    for t in topics:
        t["id"] = str(t.get("_id", t.get("id")))
        if "_id" in t:
            del t["_id"]
    return topics

async def save_weekly_master_topics(topics_list: list):
    await db.weekly_master_topics.delete_many({})
    saved = []
    for idx, t in enumerate(topics_list, start=1):
        doc = {
            "name": t.get("name", "").strip(),
            "maxMarks": float(t.get("maxMarks", 20)),
            "order": idx,
            "createdAt": datetime.now(IST)
        }
        res = await db.weekly_master_topics.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        if "_id" in doc:
            del doc["_id"]
        saved.append(doc)
    return saved

async def create_weekly_meeting(meeting_date: str, participant_ids: list, copy_from_meeting_id: str = None):
    # Prevent duplicate meeting creation for same date
    existing = await db.weekly_meetings.find_one({"meetingDate": meeting_date})
    if existing:
        raise ValueError(f"A weekly meeting block for {meeting_date} already exists! Please select a different date.")

    doc = {
        "meetingDate": meeting_date,
        "participantEmployeeIds": participant_ids or [],
        "createdAt": datetime.now(IST)
    }
    res = await db.weekly_meetings.insert_one(doc)
    new_id = str(res.inserted_id)

    if copy_from_meeting_id:
        prev_topics = await db.weekly_topics.find({"meetingId": copy_from_meeting_id}).sort("order", 1).to_list(length=100)
        for t in prev_topics:
            topic_doc = {
                "meetingId": new_id,
                "name": t.get("name", ""),
                "maxMarks": float(t.get("maxMarks", 20)),
                "order": t.get("order", 1),
                "createdAt": datetime.now(IST)
            }
            await db.weekly_topics.insert_one(topic_doc)
    else:
        # Load from Master Topics Template
        master_topics = await get_weekly_master_topics()
        for idx, mt in enumerate(master_topics, start=1):
            topic_doc = {
                "meetingId": new_id,
                "name": mt.get("name", ""),
                "maxMarks": float(mt.get("maxMarks", 20)),
                "order": idx,
                "createdAt": datetime.now(IST)
            }
            await db.weekly_topics.insert_one(topic_doc)

    doc["id"] = new_id
    if "_id" in doc:
        del doc["_id"]
    return doc

async def get_weekly_meeting_detail(meeting_id: str):
    meeting = await db.weekly_meetings.find_one({"_id": ObjectId(meeting_id) if len(meeting_id) == 24 else meeting_id})
    if not meeting:
        return None

    mid = str(meeting.get("_id", meeting.get("id")))
    topics = await db.weekly_topics.find({"meetingId": mid}).sort("order", 1).to_list(length=100)
    for t in topics:
        t["id"] = str(t.get("_id", t.get("id")))
        if "_id" in t:
            del t["_id"]

    entries = await db.weekly_entries.find({"meetingId": mid}).to_list(length=500)
    for e in entries:
        e["id"] = str(e.get("_id", e.get("id")))
        if "_id" in e:
            del e["_id"]

    participant_ids = meeting.get("participantEmployeeIds", [])
    participants = []
    if participant_ids:
        emp_query = [{"_id": ObjectId(pid)} if len(pid) == 24 else {"_id": pid} for pid in participant_ids]
        raw_emps = await db.employees.find({"$or": emp_query}).to_list(length=500)
        for emp in raw_emps:
            participants.append({
                "id": str(emp.get("_id")),
                "name": emp.get("name") or f"{emp.get('firstName', '')} {emp.get('lastName', '')}".strip() or "Employee",
                "designation": emp.get("designation", ""),
                "department": emp.get("department", "")
            })

    return {
        "id": mid,
        "meetingDate": meeting.get("meetingDate"),
        "participantEmployeeIds": participant_ids,
        "participants": participants,
        "topics": topics,
        "entries": entries
    }

async def save_weekly_topics(meeting_id: str, topics_list: list):
    await db.weekly_topics.delete_many({"meetingId": meeting_id})
    saved = []
    for idx, t in enumerate(topics_list, start=1):
        doc = {
            "meetingId": meeting_id,
            "name": t.get("name", "").strip(),
            "maxMarks": float(t.get("maxMarks", 0)),
            "order": idx,
            "createdAt": datetime.now(IST)
        }
        res = await db.weekly_topics.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        if "_id" in doc:
            del doc["_id"]
        saved.append(doc)
    return saved

async def save_weekly_entries(meeting_id: str, entries_list: list):
    saved_entries = []
    for entry in entries_list:
        emp_id = entry.get("employeeId")
        marks_by_topic = entry.get("marksByTopic", {})
        
        sum_marks = sum(float(v) for v in marks_by_topic.values() if v is not None)

        doc = {
            "meetingId": meeting_id,
            "employeeId": emp_id,
            "marksByTopic": marks_by_topic,
            "sumMarks": round(sum_marks, 2),
            "focusTaskNote": entry.get("focusTaskNote", ""),
            "commitmentNote": entry.get("commitmentNote", ""),
            "updatedAt": datetime.now(IST)
        }

        await db.weekly_entries.update_one(
            {"meetingId": meeting_id, "employeeId": emp_id},
            {"$set": doc},
            upsert=True
        )
        saved_entries.append(doc)

    return saved_entries

async def delete_weekly_meeting(meeting_id: str):
    mid_obj = ObjectId(meeting_id) if len(meeting_id) == 24 else meeting_id
    await db.weekly_meetings.delete_one({"_id": mid_obj})
    await db.weekly_topics.delete_many({"meetingId": meeting_id})
    await db.weekly_entries.delete_many({"meetingId": meeting_id})
    return True

async def update_weekly_participants(meeting_id: str, participant_ids: list):
    mid_obj = ObjectId(meeting_id) if len(meeting_id) == 24 else meeting_id
    await db.weekly_meetings.update_one(
        {"$or": [{"_id": mid_obj}, {"id": meeting_id}]},
        {"$set": {"participantEmployeeIds": participant_ids or []}}
    )
    return True
