from bson import ObjectId
from datetime import datetime, timedelta
import schemas
import calendar

def fix_id(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc

async def delete_employee(db, employee_id: str):
    await db.employees.delete_one({"_id": ObjectId(employee_id)})
    return True

async def get_employee(db, employee_id: str):
    doc = await db.employees.find_one({"_id": ObjectId(employee_id)})
    return fix_id(doc)

async def update_employee(db, employee_id: str, employee_update: schemas.EmployeeUpdate):
    # Fetch existing employee first to handle name recalculation
    existing = await db.employees.find_one({"_id": ObjectId(employee_id)})
    if not existing:
        return None
    
    update_data = employee_update.dict(exclude_unset=True)
    
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
    return fix_id(doc)

async def get_payroll(db, skip: int = 0, limit: int = 100):
    cursor = db.payroll.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def get_salary_structures(db, skip: int = 0, limit: int = 100):
    cursor = db.salary_structures.find().skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def get_salary_structure_by_employee(db, employee_id: str):
    doc = await db.salary_structures.find_one({"employeeId": employee_id})
    return fix_id(doc)

async def create_or_update_salary_structure(db, salary: schemas.SalaryStructureCreate):
    salary_dict = salary.dict()
    await db.salary_structures.update_one(
        {"employeeId": salary.employeeId},
        {"$set": salary_dict},
        upsert=True
    )
    doc = await db.salary_structures.find_one({"employeeId": salary.employeeId})
    return fix_id(doc)

async def get_bonus_deductions(db, month: str = None, year: int = None):
    query = {}
    if month: query["month"] = month
    if year: query["year"] = year
    cursor = db.bonus_deductions.find(query)
    rows = await cursor.to_list(length=1000)
    return [fix_id(row) for row in rows]

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
    payroll_results = []
    
    for emp in employees:
        emp_id = emp["id"]
        # Get salary structure
        salary = await get_salary_structure_by_employee(db, emp_id)
        if not salary:
            continue 
            
        # Start/End date strings
        start_date_str = f"{year}-{str(month_num).zfill(2)}-01"
        end_date_str = f"{year}-{str(month_num).zfill(2)}-{num_days}"
        
        # Count attendance
        attendance_count = await db.attendance.count_documents({
            "employeeId": emp_id,
            "date": {"$gte": start_date_str, "$lte": end_date_str}
        })
        
        # Approved Leaves
        leave_cursor = db.leave_requests.find({
            "employeeId": emp_id,
            "status": "Approved",
            "startDate": {"$gte": start_date_str},
            "endDate": {"$lte": end_date_str}
        })
        leaves = await leave_cursor.to_list(length=100)
        leave_days = 0
        for l in leaves:
            try:
                s = datetime.strptime(l["startDate"], "%Y-%m-%d")
                e = datetime.strptime(l["endDate"], "%Y-%m-%d")
                leave_days += (e - s).days + 1
            except:
                pass
        
        # Count Weekends (Sundays only)
        sundays = 0
        sunday_dates = []
        for d in range(1, num_days + 1):
            if calendar.weekday(year, month_num, d) == 6: # Sunday
                sundays += 1
                sunday_dates.append(f"{year}-{str(month_num).zfill(2)}-{str(d).zfill(2)}")
        
        # Count Holidays for this employee's company
        emp_company = emp.get("company")
        holiday_query = {
            "date": {"$regex": f"^{year}-{str(month_num).zfill(2)}"}
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
            if h["date"] not in sunday_dates:
                unique_holidays += 1
        
        total_working_days = num_days - sundays - unique_holidays
        
        # LOP days are calculated based on missing working days
        # attendance_count includes any day worked (even weekends)
        # leave_days are approved leaves
        actual_worked_plus_leaves = attendance_count + leave_days
        lop_days = max(0, total_working_days - actual_worked_plus_leaves)
        
        per_day_gross = salary["monthlyGross"] / total_working_days
        lop_amount = lop_days * per_day_gross
        
        # Ad-hoc Bonus/Deductions
        adjustments = await get_bonus_deductions(db, month, year)
        emp_adjustments = [a for a in adjustments if a["employeeId"] == emp_id and a["status"] == "active"]
        total_bonus = sum([a["amount"] for a in emp_adjustments if a["type"] == "bonus"])
        total_adhoc_deduction = sum([a["amount"] for a in emp_adjustments if a["type"] == "deduction"])
        
        # Fetch Penalties from Remarks
        # Remarks date format: "May 7, 2026"
        month_short = month[:3]
        remark_query = {
            "employeeId": emp_id,
            "date": {"$regex": f"{month_short}.* {year}"}
        }
        remarks_cursor = db.remarks.find(remark_query)
        emp_remarks = await remarks_cursor.to_list(length=100)
        
        penalty_total = 0
        deduction_details = []
        if lop_amount > 0:
            deduction_details.append(f"LOP ({lop_days} days): ₹{round(lop_amount, 2)}")
            
        for r in emp_remarks:
            p_amount = next((p["amount"] for p in penalty_types if p["name"] == r["type"]), 0)
            if p_amount > 0:
                penalty_total += p_amount
                deduction_details.append(f"{r['type']}: ₹{p_amount}")
        
        net_salary = (salary["monthlyGross"] - lop_amount + total_bonus - total_adhoc_deduction - penalty_total) - (salary["pf"] + salary["esi"] + salary["professionalTax"] + salary["tds"])
        
        payroll_record = {
            "employeeId": emp_id,
            "employeeName": emp["name"],
            "month": month,
            "year": year,
            "basicSalary": salary["basic"],
            "allowances": salary["hra"] + salary["conveyance"] + salary["medical"] + salary["specialAllowance"],
            "bonus": total_bonus,
            "deductions": salary["pf"] + salary["esi"] + salary["professionalTax"] + salary["tds"] + lop_amount + total_adhoc_deduction + penalty_total,
            "penalty": penalty_total,
            "netSalary": round(net_salary, 2),
            "status": "processed",
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
    # Calculate sequential employeeId
    count = await db.employees.count_documents({})
    next_id = f"EMP{str(count + 1).zfill(3)}"
    
    # Calculate full name
    name = f"{employee.firstName} {employee.lastName}"
    if employee.middleName:
        name = f"{employee.firstName} {employee.middleName} {employee.lastName}"
    
    employee_dict = employee.dict()
    employee_dict["name"] = name
    employee_dict["employeeId"] = next_id # Override frontend generation
    
    result = await db.employees.insert_one(employee_dict)
    employee_dict["id"] = str(result.inserted_id)
    if "_id" in employee_dict:
        employee_dict.pop("_id")
    
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
async def create_application(db, app: schemas.ApplicationCreate): return await create_item(db, "applications", app.dict())
async def update_application(db, app_id: str, update: schemas.ApplicationUpdate): return await update_item(db, "applications", app_id, update.dict(exclude_unset=True))
async def delete_application(db, app_id: str): return await delete_item(db, "applications", app_id)

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
async def create_asset(db, asset: schemas.AssetCreate): return await create_item(db, "assets", asset.dict())
async def update_asset(db, asset_id: str, update: schemas.AssetUpdate): return await update_item(db, "assets", asset_id, update.dict(exclude_unset=True))
async def delete_asset(db, asset_id: str): return await delete_item(db, "assets", asset_id)

async def get_expense_claims(db, skip: int = 0, limit: int = 100): return await get_items(db, "expense_claims", skip, limit)
async def create_expense_claim(db, claim: schemas.ExpenseClaimCreate): return await create_item(db, "expense_claims", claim.dict())
async def update_expense_claim(db, claim_id: str, update: schemas.ExpenseClaimUpdate): return await update_item(db, "expense_claims", claim_id, update.dict(exclude_unset=True))
async def delete_expense_claim(db, claim_id: str): return await delete_item(db, "expense_claims", claim_id)

async def get_holidays(db, skip: int = 0, limit: int = 100): return await get_items(db, "holidays", skip, limit)
async def create_holiday(db, holiday: schemas.HolidayCreate): return await create_item(db, "holidays", holiday.dict())
async def update_holiday(db, holiday_id: str, update: schemas.HolidayUpdate): return await update_item(db, "holidays", holiday_id, update.dict(exclude_unset=True))
async def delete_holiday(db, holiday_id: str): return await delete_item(db, "holidays", holiday_id)

async def get_kpi_records(db, skip: int = 0, limit: int = 100): return await get_items(db, "kpi_records", skip, limit)
async def create_kpi_record(db, kpi: schemas.KPICreate): return await create_item(db, "kpi_records", kpi.dict())
async def update_kpi_record(db, kpi_id: str, update: schemas.KPIUpdate): return await update_item(db, "kpi_records", kpi_id, update.dict(exclude_unset=True))
async def delete_kpi_record(db, kpi_id: str): return await delete_item(db, "kpi_records", kpi_id)

async def get_reviews(db, skip: int = 0, limit: int = 100): return await get_items(db, "reviews", skip, limit)
async def create_review(db, review: schemas.ReviewCreate): 
    review_dict = review.dict()
    if not review_dict.get("date"):
        review_dict["date"] = datetime.now().strftime("%Y-%m-%d")
    return await create_item(db, "reviews", review_dict)
async def update_review(db, review_id: str, update: schemas.ReviewUpdate): return await update_item(db, "reviews", review_id, update.dict(exclude_unset=True))
async def delete_review(db, review_id: str): return await delete_item(db, "reviews", review_id)

async def get_remarks(db, skip: int = 0, limit: int = 100): return await get_items(db, "remarks", skip, limit)
async def create_remark(db, remark: schemas.RemarkCreate): 
    remark_dict = remark.dict()
    if not remark_dict.get("date"):
        remark_dict["date"] = datetime.now().strftime("%d-%m-%Y")
    return await create_item(db, "remarks", remark_dict)
async def update_remark(db, remark_id: str, update: schemas.RemarkUpdate): return await update_item(db, "remarks", remark_id, update.dict(exclude_unset=True))
async def delete_remark(db, remark_id: str): return await delete_item(db, "remarks", remark_id)

async def get_events(db, skip: int = 0, limit: int = 100): return await get_items(db, "events", skip, limit)
async def create_event(db, event: schemas.EventCreate): return await create_item(db, "events", event.dict())
async def update_event(db, event_id: str, update: schemas.EventUpdate): return await update_item(db, "events", event_id, update.dict(exclude_unset=True))
async def delete_event(db, event_id: str): return await delete_item(db, "events", event_id)

async def authenticate_user(db, login_data: schemas.LoginRequest):
    user = await db.employees.find_one({"email": login_data.email})
    if user and user.get("password") == login_data.password:
        return fix_id(user)
    return None

async def get_attendance_status(db, employee_id: str):
    today = datetime.now().strftime("%Y-%m-%d")
    # Find active punch for today (checkIn present, checkOut missing)
    record = await db.attendance.find_one({
        "employeeId": employee_id,
        "date": today,
        "checkOut": None
    })
    return fix_id(record)

async def punch_in(db, employee_id: str):
    employee = await get_employee(db, employee_id)
    if not employee:
        return None
    
    today = datetime.now()
    attendance_data = {
        "employeeId": employee_id,
        "employeeName": employee["name"],
        "date": today.strftime("%Y-%m-%d"),
        "checkIn": today.strftime("%H:%M:%S"),
        "checkOut": None,
        "status": "Active",
        "workHours": None
    }
    
    # Check for late punch-in (10 mins buffer from startTime)
    try:
        start_time_str = employee.get("startTime", "09:30")
        start_time_obj = datetime.strptime(start_time_str, "%H:%M")
        limit_time_obj = start_time_obj + timedelta(minutes=10)
        
        current_time_str = today.strftime("%H:%M")
        current_time_obj = datetime.strptime(current_time_str, "%H:%M")
        
        if current_time_obj > limit_time_obj:
            date_str = today.strftime("%b %d, %Y")
            if ", " in date_str and date_str[4] == '0': # Handle "May 05, 2026" -> "May 5, 2026"
                date_str = date_str[:4] + date_str[5:]

            remark_data = {
                "employeeId": employee_id,
                "employeeName": employee["name"],
                "role": employee.get("designation", "Staff"),
                "avatar": employee.get("profilePhoto", ""),
                "type": "Late Punch-in",
                "details": f"Late Punch-in detected at {current_time_str}. Shift starts at {start_time_str} with a 10-minute buffer (Limit: {limit_time_obj.strftime('%H:%M')}).",
                "addedBy": "System",
                "date": date_str
            }
            await db.remarks.insert_one(remark_data)
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
    
    now = datetime.now()
    check_in_time = datetime.strptime(f"{status['date']} {status['checkIn']}", "%Y-%m-%d %H:%M:%S")
    
    duration = now - check_in_time
    hours, remainder = divmod(duration.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    work_hours = f"{hours}h {minutes}m"
    
    update_data = {
        "checkOut": now.strftime("%H:%M:%S"),
        "workHours": work_hours,
        "status": "Logged"
    }
    
    await db.attendance.update_one(
        {"_id": ObjectId(status["id"])},
        {"$set": update_data}
    )
    
    updated_doc = await db.attendance.find_one({"_id": ObjectId(status["id"])})
    return fix_id(updated_doc)

async def break_in(db, employee_id: str):
    status = await get_attendance_status(db, employee_id)
    if not status or status.get("status") == "On Break":
        return None
    
    new_break = {
        "startTime": datetime.now().strftime("%H:%M:%S"),
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
    today = datetime.now().strftime("%Y-%m-%d")
    record = await db.attendance.find_one({
        "employeeId": employee_id,
        "date": today,
        "status": "On Break"
    })
    
    if not record or not record.get("breaks"):
        return None
    
    # Get the last break which should have no endTime
    last_break_idx = len(record["breaks"]) - 1
    last_break = record["breaks"][last_break_idx]
    
    now = datetime.now()
    start_time = datetime.strptime(f"{record['date']} {last_break['startTime']}", "%Y-%m-%d %H:%M:%S")
    
    duration_delta = now - start_time
    minutes = duration_delta.seconds // 60
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
    leave_dict["requested_on"] = datetime.now().strftime("%d-%m-%Y")
    result = await db.leave_requests.insert_one(leave_dict)
    leave_dict["id"] = str(result.inserted_id)
    if "_id" in leave_dict:
        leave_dict.pop("_id")
    return leave_dict

async def get_all_leave_requests(db, skip: int = 0, limit: int = 100):
    cursor = db.leave_requests.find().sort("requested_on", -1).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def get_user_leave_requests(db, employee_id: str, skip: int = 0, limit: int = 100):
    cursor = db.leave_requests.find({"employee_id": employee_id}).sort("requested_on", -1).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def update_leave_request(db, leave_id: str, update_data: dict):
    # Fetch current leave request
    leave = await db.leave_requests.find_one({"_id": ObjectId(leave_id)})
    if not leave:
        return None
    
    # Don't allow updates if already approved/rejected unless it's just a status change by Admin
    # (Actually, let's just update whatever is passed for now, frontend handles permission)
    
    await db.leave_requests.update_one(
        {"_id": ObjectId(leave_id)},
        {"$set": update_data}
    )
    
    # Create notification if status changed
    if "status" in update_data and update_data["status"] in ["Approved", "Rejected", "Cancelled"]:
        await create_notification(db, schemas.NotificationCreate(
            employee_id=leave["employee_id"],
            title=f"Leave Request {update_data['status']}",
            message=f"Your {leave['type']} request from {leave['start_date']} to {leave['end_date']} has been {update_data['status'].lower()}.",
            type="leave",
            created_at=datetime.now().strftime("%d-%m-%Y %H:%M")
        ))
        
    result = await db.leave_requests.find_one({"_id": ObjectId(leave_id)})
    return fix_id(result)

async def update_leave_request_status(db, leave_id: str, status: str):
    return await update_leave_request(db, leave_id, {"status": status})


# Notification CRUD
async def create_notification(db, notification: schemas.NotificationCreate):
    notification_dict = notification.dict()
    if not notification_dict.get("created_at"):
        notification_dict["created_at"] = datetime.now().strftime("%d-%m-%Y %H:%M")
    result = await db.notifications.insert_one(notification_dict)
    notification_dict["id"] = str(result.inserted_id)
    if "_id" in notification_dict:
        notification_dict.pop("_id")
    return notification_dict

async def get_notifications_by_user(db, employee_id: str, skip: int = 0, limit: int = 50):
    cursor = db.notifications.find({"employee_id": employee_id}).sort("created_at", -1).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [fix_id(row) for row in rows]

async def mark_notification_as_read(db, notification_id: str):
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": True}}
    )
    result = await db.notifications.find_one({"_id": ObjectId(notification_id)})
    return fix_id(result)

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
        client_dict["createdDate"] = datetime.now().strftime("%Y-%m-%d")
    result = await db.clients.insert_one(client_dict)
    clientId = str(result.inserted_id)
    
    await log_activity(db, "Created", performedBy, userName, f"Client '{client_dict['companyName']}' was created.", clientId=clientId)
    
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
        
    doc = await db.clients.find_one({"_id": ObjectId(client_id)})
    return fix_id(doc)

async def delete_client(db, client_id: str):
    client = await db.clients.find_one({"_id": ObjectId(client_id)})
    result = await db.clients.delete_one({"_id": ObjectId(client_id)})
    if result.deleted_count > 0 and client:
        await log_activity(db, "Deleted", "Admin", "N/A", f"Client '{client.get('companyName')}' was deleted.", clientId=client_id)
    return result.deleted_count > 0

# Project CRUD
async def get_projects(db, userId: str = None, role: str = None, skip: int = 0, limit: int = 100):
    query = {}
    if role and role.lower() != "admin" and userId:
        # Get projects where user is Team Leader
        # OR projects where user has assigned tasks
        
        # 1. Get projects where user is TL
        tl_query = {"teamLeaderId": userId}
        
        # 2. Get projects where user has tasks
        task_cursor = db.wm_tasks.find({"assignedToId": userId})
        task_list = await task_cursor.to_list(length=1000)
        project_ids_from_tasks = list(set([task.get("projectId") for task in task_list if task.get("projectId")]))
        
        # Combine using $or
        or_conditions = [{"teamLeaderId": userId}]
        if project_ids_from_tasks:
            # Handle both string and ObjectId if necessary, but usually they are strings in the db for simplicity or vice versa
            # Let's check for both
            project_ids_as_obj = []
            for pid in project_ids_from_tasks:
                try:
                    project_ids_as_obj.append(ObjectId(pid))
                except:
                    pass
            
            or_conditions.append({"_id": {"$in": project_ids_as_obj}})
            or_conditions.append({"id": {"$in": project_ids_from_tasks}}) # fallback for string IDs
            
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
        
    doc = await db.projects.find_one({"_id": ObjectId(project_id)})
    return fix_id(doc)

async def delete_project(db, project_id: str):
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    result = await db.projects.delete_one({"_id": ObjectId(project_id)})
    if result.deleted_count > 0 and project:
        await log_activity(db, "Deleted", "Admin", "N/A", f"Project '{project.get('title')}' was deleted.", projectId=project_id)
    return result.deleted_count > 0

# Work Management Task CRUD
async def get_wm_tasks(db, skip: int = 0, limit: int = 100):
    cursor = db.wm_tasks.find().skip(skip).limit(limit)
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
    
    if not task_dict.get("assignedToName") and task_dict.get("assignedToId"):
        employee = await db.employees.find_one({"_id": ObjectId(task_dict["assignedToId"])})
        if employee:
            task_dict["assignedToName"] = f"{employee.get('firstName')} {employee.get('lastName')}"

    if not task_dict.get("createdDate"):
        task_dict["createdDate"] = datetime.now().strftime("%Y-%m-%d")
        
    result = await db.wm_tasks.insert_one(task_dict)
    taskId = str(result.inserted_id)
    
    # Log the creation
    await log_task_activity(db, taskId, "Created", performedBy, userName, f"Task '{task_dict['title']}' was created.")
    
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
        
        if update_data.get("assignedToId") and not update_data.get("assignedToName"):
            employee = await db.employees.find_one({"_id": ObjectId(update_data["assignedToId"])})
            if employee:
                update_data["assignedToName"] = f"{employee.get('firstName')} {employee.get('lastName')}"
                
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
async def log_activity(db, action: str, performedBy: str, userName: str, details: str, taskId: str = None, projectId: str = None, clientId: str = None, leadId: str = None, dailyReportId: str = None, monthlyReportId: str = None):
    log_entry = {
        "action": action,
        "performedBy": performedBy,
        "userName": userName,
        "details": details,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    if taskId: log_entry["taskId"] = taskId
    if projectId: log_entry["projectId"] = projectId
    if clientId: log_entry["clientId"] = clientId
    if leadId: log_entry["leadId"] = leadId
    if dailyReportId: log_entry["dailyReportId"] = dailyReportId
    if monthlyReportId: log_entry["monthlyReportId"] = monthlyReportId
    
    await db.task_logs.insert_one(log_entry)

async def get_lead_logs(db, lead_id: str):
    cursor = db.task_logs.find({"leadId": lead_id}).sort("timestamp", -1)
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
        lead_dict["date"] = datetime.now().strftime("%Y-%m-%d")
        
    result = await db.leads.insert_one(lead_dict)
    lead_id = str(result.inserted_id)
    
    # Log the creation
    await log_activity(db, "Lead Created", performedBy, userName, f"Lead for '{lead_dict['company']}' was created.", leadId=lead_id)
    
    doc = await db.leads.find_one({"_id": result.inserted_id})
    return fix_id(doc)

async def update_lead(db, lead_id: str, lead_update: schemas.LeadUpdate):
    update_data = lead_update.dict(exclude_unset=True)
    performedBy = update_data.pop("performedBy", "Unknown")
    userName = update_data.pop("userName", "Unknown User")
    
    if update_data:
        # If status changed to 'Client Won', set closedDate if not provided
        if update_data.get("status") == "Client Won" and not update_data.get("closedDate"):
            update_data["closedDate"] = datetime.now().strftime("%Y-%m-%d")
            
        await db.leads.update_one({"_id": ObjectId(lead_id)}, {"$set": update_data})
        
        # Log the update
        await log_activity(db, "Lead Updated", performedBy, userName, f"Lead details were updated. Status: {update_data.get('status', 'Unchanged')}", leadId=lead_id)
        
    doc = await db.leads.find_one({"_id": ObjectId(lead_id)})
    return fix_id(doc)

async def delete_lead(db, lead_id: str):
    result = await db.leads.delete_one({"_id": ObjectId(lead_id)})
    return result.deleted_count > 0

async def add_lead_follow_up(db, lead_id: str, follow_up: schemas.FollowUp, performedBy: str = "Unknown", userName: str = "Unknown User"):
    follow_up_dict = follow_up.dict()
    if not follow_up_dict.get("date"):
        follow_up_dict["date"] = datetime.now().strftime("%Y-%m-%d %H:%M")
        
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$push": {"followUps": follow_up_dict}}
    )
    
    # Log activity
    await log_activity(db, "Follow-up Added", performedBy, userName, f"Added follow-up: {follow_up_dict.get('notes', 'No notes provided')}", leadId=lead_id)
    
    doc = await db.leads.find_one({"_id": ObjectId(lead_id)})
    return fix_id(doc)

# System Settings CRUD
async def get_system_settings(db):
    settings = await db.system_settings.find_one({})
    if not settings:
        # Create default settings if none exist
        default_settings = {"clientVisibilityAdminOnly": True}
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

async def get_marketing_monthly_reports(db, client_id: str = None):
    query = {}
    if client_id:
        query["clientId"] = client_id
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
    message_dict["timestamp"] = datetime.now().isoformat()
    result = await db.messages.insert_one(message_dict)
    message_dict["id"] = str(result.inserted_id)
    if "_id" in message_dict:
        message_dict.pop("_id")
    return message_dict

async def create_chat_group(db, group: schemas.ChatGroupCreate):
    group_dict = group.dict()
    group_dict["timestamp"] = datetime.now().isoformat()
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
    return [fix_id(row) for row in rows]

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
    return [fix_id(row) for row in rows]

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
    # If other_id is a group, mark all messages in that group as seen by this user
    is_group = await db.chat_groups.find_one({"_id": ObjectId(other_id)}) if len(other_id) == 24 else None
    
    if is_group or other_id.startswith("gen-"):
        # Group or General channel
        await db.messages.update_many(
            {"groupId": other_id, "seenBy": {"$ne": user_id}},
            {"$push": {"seenBy": user_id}}
        )
    else:
        # Personal chat
        await db.messages.update_many(
            {"senderId": other_id, "receiverId": user_id, "seenBy": {"$ne": user_id}},
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
    return [fix_id(row) for row in rows]

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
            {"$set": {"timestamp": datetime.now()}},
            upsert=True
        )
    else:
        await db.typing.delete_one({"chatId": chat_id, "userId": user_id})
    return True

async def get_typing_users(db, chat_id: str, current_user_id: str):
    # Get users typing in this chat in the last 10 seconds
    threshold = datetime.now() - timedelta(seconds=10)
    cursor = db.typing.find({
        "chatId": chat_id, 
        "userId": {"$ne": current_user_id},
        "timestamp": {"$gt": threshold}
    })
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
    
    await db.employee_documents.update_one({"_id": ObjectId(doc_id)}, {"$set": update_data})
    doc = await db.employee_documents.find_one({"_id": ObjectId(doc_id)})
    return fix_id(doc)

async def delete_employee_document(db, doc_id: str):
    result = await db.employee_documents.delete_one({"_id": ObjectId(doc_id)})
    return result.deleted_count > 0

# Employee Daily Report CRUD
async def apply_work_rejection_penalty(db, employee_id: str, report_date: str):
    employee = await get_employee(db, employee_id)
    if not employee or employee.get("department") != "Development":
        return
    
    salary_struct = await get_salary_structure_by_employee(db, employee_id)
    if not salary_struct:
        return
    
    try:
        dt = datetime.strptime(report_date, "%Y-%m-%d")
        month_name = calendar.month_name[dt.month]
        year = dt.year
        _, num_days = calendar.monthrange(year, dt.month)
        
        per_day_salary = salary_struct["monthlyGross"] / num_days
        reason = f"Work rejected by TL on {report_date}"
        
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
                status="active"
            )
            await create_bonus_deduction(db, deduction)
    except Exception as e:
        print(f"Error applying work rejection penalty: {e}")

async def create_employee_daily_report(db, report: schemas.EmployeeDailyReportCreate):
    report_dict = report.dict()
    result = await db.employee_daily_reports.insert_one(report_dict)
    report_dict["id"] = str(result.inserted_id)
    # Log activity
    await log_task_activity(db, None, "Daily Report Submitted", report_dict["employeeId"], report_dict["employeeName"], f"Submitted daily report for {report_dict['date']}")
    
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
        query["date"] = date
    
    cursor = db.employee_daily_reports.find(query).sort("date", -1)
    reports = []
    async for doc in cursor:
        reports.append(fix_id(doc))
    return reports

async def update_employee_daily_report(db, report_id: str, report_update: schemas.EmployeeDailyReportUpdate):
    update_data = report_update.dict(exclude_unset=True)
    if not update_data:
        return fix_id(await db.employee_daily_reports.find_one({"_id": ObjectId(report_id)}))
    
    # Fetch existing to check status change
    existing = await db.employee_daily_reports.find_one({"_id": ObjectId(report_id)})
    
    await db.employee_daily_reports.update_one({"_id": ObjectId(report_id)}, {"$set": update_data})
    
    # Apply penalty if status changed to Rejected
    if update_data.get("status") == "Rejected" and existing and existing.get("status") != "Rejected":
        await apply_work_rejection_penalty(db, existing["employeeId"], existing["date"])
        
    doc = await db.employee_daily_reports.find_one({"_id": ObjectId(report_id)})
    return fix_id(doc)
