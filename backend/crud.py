from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Optional, Dict
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
    except:
        pass
    return None

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

async def get_bonus_deductions_with_remarks(db, month: str = None, year: int = None):
    # 1. Get manual adjustments
    adjustments = await get_bonus_deductions(db, month, year)
    
    # 2. Get penalty types for lookup
    penalty_types = await get_penalty_types(db)
    penalty_names = [p["name"] for p in penalty_types]
    
    # 3. Get remarks
    remark_query = {}
    if month and year:
        month_short = month[:3]
        remark_query["date"] = {"$regex": f"{month_short}.* {year}"}
    
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

        try:
            date_parts = r["date"].split(" ")
            r_month = date_parts[0]
            r_year = int(date_parts[-1])
        except:
            r_month = month or "Unknown"
            r_year = year or 2026

        p_amount = next((p["amount"] for p in penalty_types if p["name"] == r["type"]), 0)
        
        # Calculate one-day salary for Late Punch-in if amount is 0
        if r["type"] == "Late Punch-in" and p_amount == 0:
            salary_struct = await get_salary_structure_by_employee(db, r["employeeId"])
            if salary_struct:
                # Replicate working days calculation for accuracy
                try:
                    date_parts = r["date"].split(" ")
                    r_month_name = date_parts[0].replace(",", "")
                    r_year = int(date_parts[-1])
                    # Use month_abbr for "May", "Jun", etc.
                    try:
                        month_num = list(calendar.month_abbr).index(r_month_name)
                    except ValueError:
                        month_num = list(calendar.month_name).index(r_month_name)
                        
                    _, num_days = calendar.monthrange(r_year, month_num)
                    
                    sundays = sum(1 for d in range(1, num_days + 1) if calendar.weekday(r_year, month_num, d) == 6)
                    total_working_days = max(1, num_days - sundays)
                    p_amount = round(salary_struct["monthlyGross"] / total_working_days, 2)
                except Exception as e:
                    print(f"Error calculating p_amount in merged list: {e}")
                    p_amount = round(salary_struct["monthlyGross"] / 30, 2)

        adjustments.append({
            "id": f"remark_{str(r['_id'])}",
            "employeeId": r["employeeId"],
            "month": r_month,
            "year": r_year,
            "type": "deduction",
            "amount": p_amount, # Note: Late punch will show 0 here as it's calculated at payroll
            "reason": f"[Remark] {r['type']}: {r['details']}",
            "status": "active"
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

        # 1. Map out approved leaves for this month with deduction factors
        # Robust query checking both camelCase and snake_case for employee ID
        leave_cursor = db.leave_requests.find({
            "$or": [
                {"employee_id": emp_id},
                {"employeeId": emp_id}
            ],
            "status": "Approved",
            # We fetch all and filter dates in Python to handle multiple formats robustly
        })
        all_emp_leaves = await leave_cursor.to_list(length=100)
        
        leave_map = {} # date -> deduction_factor (1.0 for Full, 0.5 for Half)
        for l in all_emp_leaves:
            try:
                # Check both snake_case and camelCase for day type
                day_type = l.get("day_type") or l.get("dayType") or "Full Day"
                factor = 0.5 if day_type in ["Half Day", "First Half", "Second Half"] else 1.0
                
                # Check both snake_case and camelCase for dates
                raw_start = l.get("start_date") or l.get("startDate")
                raw_end = l.get("end_date") or l.get("endDate")
                
                if not raw_start or not raw_end:
                    continue

                # Try to parse different date formats robustly
                def parse_date(d_str):
                    for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
                        try:
                            return datetime.strptime(d_str, fmt)
                        except ValueError:
                            continue
                    return None

                s = parse_date(raw_start)
                e = parse_date(raw_end)
                
                if not s or not e:
                    continue

                curr = s
                while curr <= e:
                    # Only map if it falls within the requested month
                    if curr.month == month_num and curr.year == year:
                        d_str = curr.strftime("%Y-%m-%d")
                        leave_map[d_str] = max(leave_map.get(d_str, 0), factor)
                    curr += timedelta(days=1)
                    # Safety break to prevent infinite loops
                    if (curr - s).days > 365:
                        break
            except Exception as ex:
                print(f"Robust leave parse error: {ex}")
                pass

        # 2. Map out actual presence
        attendance_cursor = db.attendance.find({
            "employeeId": emp_id,
            "date": {"$gte": start_date_str, "$lte": end_date_str}
        })
        attendance_records = await attendance_cursor.to_list(length=100)
        attendance_dates = {att["date"] for att in attendance_records}
        
        # 3. Calculate worked/absent based on priority: Leave > Attendance
        sunday_dates_set = set(sunday_dates)
        holiday_dates_set = {h["date"] for h in month_holidays if "date" in h}
        
        actual_worked_days = 0.0
        lop_days = 0.0

        for d in range(1, num_days + 1):
            date_str = f"{year}-{str(month_num).zfill(2)}-{str(d).zfill(2)}"
            
            # We only care about scheduled working days
            if date_str not in sunday_dates_set and date_str not in holiday_dates_set:
                if date_str in leave_map:
                    factor = leave_map[date_str]
                    lop_days += factor
                    actual_worked_days += (1.0 - factor)
                elif date_str in attendance_dates:
                    actual_worked_days += 1
                else:
                    lop_days += 1
        
        total_working_days = num_days - sundays - unique_holidays
        
        per_day_gross = salary["monthlyGross"] / total_working_days
        lop_amount = lop_days * per_day_gross
        
        deduction_details = []
        if lop_days > 0:
            leave_types = {l.get("type") or l.get("leaveType") for l in all_emp_leaves if l.get("type") or l.get("leaveType")}
            leave_desc = f" ({', '.join(leave_types)})" if leave_types else ""
            deduction_details.append(f"LOP/Leave{leave_desc} - {round(lop_days, 1)} days: ₹{round(lop_amount, 2)}")

        # Ad-hoc Bonus/Deductions
        adjustments = await get_bonus_deductions(db, month, year)
        emp_adjustments = [a for a in adjustments if a["employeeId"] == emp_id and a["status"] == "active"]
        
        # Fetch Sales Incentive
        sales_target = await db.sales_targets.find_one({
            "employeeId": emp_id,
            "month": month,
            "year": year
        })
        incentive_amount = sales_target.get("incentiveAmount", 0) if sales_target else 0

        total_bonus = 0
        total_adhoc_deduction = 0
        for a in emp_adjustments:
            if a["type"] == "bonus":
                total_bonus += a["amount"]
            elif a["type"] == "deduction":
                total_adhoc_deduction += a["amount"]
                deduction_details.append(f"{a['reason']}: ₹{a.get('amount', 0)}")
        
        # Add sales incentive to allowances (previously bonus)
        # We will track it in deduction_details but it will be added to allowances field
        if incentive_amount > 0:
            deduction_details.append(f"Sales Incentive: ₹{incentive_amount}")
        
        # Fetch Penalties from Remarks
        month_short = month[:3]
        remark_query = {
            "employeeId": emp_id,
            "date": {"$regex": f"{month_short}.* {year}"}
        }
        remarks_cursor = db.remarks.find(remark_query)
        emp_remarks = await remarks_cursor.to_list(length=100)
        
        penalty_total = 0
            
        for r in emp_remarks:
            remark_type = r.get("type")
            if remark_type == "Late Punch-in":
                if late_punch_deduction_enabled:
                    penalty_total += per_day_gross
                    deduction_details.append(f"Late Punch-in ({r.get('date')}): ₹{round(per_day_gross, 2)}")
                continue

            p_amount = next((p["amount"] for p in penalty_types if p["name"] == remark_type), 0)
            if p_amount > 0:
                penalty_total += p_amount
                deduction_details.append(f"{r['type']} ({r['date']}): ₹{p_amount}")
        
        net_salary = (salary["monthlyGross"] - lop_amount + total_bonus + incentive_amount - total_adhoc_deduction - penalty_total) - (salary["pf"] + salary["esi"] + salary["professionalTax"] + salary["tds"])
        
        payroll_record = {
            "employeeId": emp_id,
            "employeeName": emp["name"],
            "month": month,
            "year": year,
            "totalWorkingDays": int(total_working_days),
            "workedDays": round(actual_worked_days, 1),
            "leaveDays": round(lop_days, 1),
            "lopDays": round(lop_days, 1),
            "basicSalary": salary["basic"],
            "allowances": salary["hra"] + salary["conveyance"] + salary["medical"] + salary["specialAllowance"] + incentive_amount,
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
                    date_parts = item["date"].split(" ")
                    r_month_name = date_parts[0].replace(",", "")
                    r_year = int(date_parts[-1])
                    try:
                        month_num = list(calendar.month_abbr).index(r_month_name)
                    except ValueError:
                        month_num = list(calendar.month_name).index(r_month_name)

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

async def generate_bulk_attendance(db, employee_id: str, month: str, year: int):
    employee = await get_employee(db, employee_id)
    if not employee:
        return None
    
    try:
        month_num = list(calendar.month_name).index(month)
    except ValueError:
        month_map = {m: i for i, m in enumerate(calendar.month_name)}
        month_num = month_map.get(month.capitalize(), 1)
        
    _, num_days = calendar.monthrange(year, month_num)
    
    # Get holidays to skip
    holiday_query = {
        "date": {"$regex": f"^{year}-{str(month_num).zfill(2)}"}
    }
    emp_company = employee.get("company")
    if emp_company:
        holiday_query["$or"] = [{"company": emp_company}, {"company": None}, {"company": ""}]
    
    holidays = await db.holidays.find(holiday_query).to_list(length=31)
    holiday_dates = [h["date"] for h in holidays]

    # Get approved leaves to skip
    start_date_str = f"{year}-{str(month_num).zfill(2)}-01"
    end_date_str = f"{year}-{str(month_num).zfill(2)}-{num_days}"
    leave_cursor = db.leave_requests.find({
        "employeeId": employee_id,
        "status": "Approved",
        "startDate": {"$lte": end_date_str},
        "endDate": {"$gte": start_date_str}
    })
    leaves = await leave_cursor.to_list(length=100)
    leave_dates = set()
    for l in leaves:
        try:
            from datetime import datetime, timedelta
            s = datetime.strptime(l["startDate"], "%Y-%m-%d")
            e = datetime.strptime(l["endDate"], "%Y-%m-%d")
            curr = s
            while curr <= e:
                leave_dates.add(curr.strftime("%Y-%m-%d"))
                curr += timedelta(days=1)
        except:
            pass
    
    attendance_records = []
    
    import random
    
    # Identify available working days
    available_working_days = []
    for d in range(1, num_days + 1):
        date_str = f"{year}-{str(month_num).zfill(2)}-{str(d).zfill(2)}"
        if calendar.weekday(year, month_num, d) == 6: continue
        if date_str in holiday_dates: continue
        if date_str in leave_dates: continue
        existing = await db.attendance.find_one({"employeeId": employee_id, "date": date_str})
        if existing: continue
        available_working_days.append(d)
    
    # Pick 1-2 random days to be 'late'
    late_days_indices = random.sample(available_working_days, min(random.randint(1, 2), len(available_working_days))) if available_working_days else []
    
    for d in available_working_days:
        date_str = f"{year}-{str(month_num).zfill(2)}-{str(d).zfill(2)}"
        
        # Generate random punch times
        is_late = d in late_days_indices
        if is_late:
            # Late: 09:45 - 10:15
            in_hour = 9
            in_min = random.randint(45, 59)
            if random.random() > 0.5:
                in_hour = 10
                in_min = random.randint(0, 15)
        else:
            # On-time: 09:00 - 09:35
            in_hour = 9
            in_min = random.randint(0, 35)
            
        check_in = f"{str(in_hour).zfill(2)}:{str(in_min).zfill(2)}:00"
        
        # 18:00 - 19:00
        out_hour = 18
        out_min = random.randint(0, 59)
        check_out = f"{str(out_hour).zfill(2)}:{str(out_min).zfill(2)}:00"
        
        # Calculate working minutes correctly
        start_min = in_hour * 60 + in_min
        end_min = out_hour * 60 + out_min
        total_min = end_min - start_min
        h, m = divmod(total_min, 60)
        work_hours = f"{h}h {m}m"
        
        record = {
            "employeeId": employee_id,
            "employeeName": employee["name"],
            "date": date_str,
            "checkIn": check_in,
            "checkOut": check_out,
            "status": "Logged",
            "workHours": work_hours,
            "breaks": []
        }
        
        result = await db.attendance.insert_one(record)
        record["id"] = str(result.inserted_id)
        attendance_records.append(fix_id(record))
    
    return attendance_records

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

async def create_manual_attendance(db, attendance: schemas.AttendanceCreate):
    attendance_dict = attendance.dict()
    result = await db.attendance.insert_one(attendance_dict)
    attendance_dict["id"] = str(result.inserted_id)
    if "_id" in attendance_dict:
        attendance_dict.pop("_id")
    return attendance_dict

async def update_attendance(db, attendance_id: str, attendance_update: schemas.AttendanceUpdate):
    update_data = attendance_update.dict(exclude_unset=True)
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

async def delete_bulk_attendance(db, employee_id: str, month: str, year: int):
    try:
        month_num = list(calendar.month_name).index(month)
    except ValueError:
        month_map = {m: i for i, m in enumerate(calendar.month_name)}
        month_num = month_map.get(month.capitalize(), 1)
        
    pattern = f"^{year}-{str(month_num).zfill(2)}"
    result = await db.attendance.delete_many({
        "employeeId": employee_id,
        "date": {"$regex": pattern}
    })
    return result.deleted_count

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

async def update_leave_request_status(db, leave_id: str, status: str, approved_by: str = None, approved_by_role: str = None, approved_by_id: str = None, approved_by_photo: str = None):
    update_data = {"status": status}
    if approved_by:
        update_data["approved_by"] = approved_by
    if approved_by_role:
        update_data["approved_by_role"] = approved_by_role
    if approved_by_id:
        update_data["approved_by_id"] = approved_by_id
    if approved_by_photo:
        update_data["approved_by_photo"] = approved_by_photo
    return await update_leave_request(db, leave_id, update_data)


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
            "latePunchDeductionEnabled": True
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
        sundays = 0
        for d in range(1, num_days + 1):
            if calendar.weekday(year, month_num, d) == 6: # Sunday
                sundays += 1
        
        # Count Holidays for this employee's company
        emp_company = employee.get("company")
        holiday_query = {"date": {"$regex": f"^{year}-{str(month_num).zfill(2)}"}}
        if emp_company:
            holiday_query["$or"] = [{"company": emp_company}, {"company": None}, {"company": ""}]
        
        holidays_count = await db.holidays.count_documents(holiday_query)
        total_working_days = max(1, num_days - sundays - holidays_count)
        
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
                status="active"
            )
            await create_bonus_deduction(db, deduction)
            
            # Add Remark for visibility
            date_str = dt.strftime("%b %d, %Y")
            if ", " in date_str and date_str[4] == '0': # Handle "May 05" -> "May 5"
                date_str = date_str[:4] + date_str[5:]
                
            remark_data = {
                "employeeId": employee_id,
                "employeeName": employee["name"],
                "role": employee.get("designation", "Staff"),
                "avatar": employee.get("profilePhoto", ""),
                "type": "Performance",
                "details": f"Daily work report for {report_date} was rejected by Team Leader. Automatic full-day salary deduction applied.",
                "addedBy": "System",
                "date": date_str
            }
            await db.remarks.insert_one(remark_data)
            
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

# Sales Target CRUD
async def get_sales_targets(db, month: Optional[str] = None, year: Optional[int] = None):
    query = {}
    if month: query["month"] = month
    if year: query["year"] = year
    cursor = db.sales_targets.find(query)
    rows = await cursor.to_list(length=500)
    return [fix_id(row) for row in rows]

async def create_or_update_sales_target(db, target: schemas.SalesTargetCreate):
    target_dict = target.dict()
    # Check if exists for this month/year/employee
    existing = await db.sales_targets.find_one({
        "employeeId": target_dict["employeeId"],
        "month": target_dict["month"],
        "year": target_dict["year"]
    })
    
    if existing:
        await db.sales_targets.update_one(
            {"_id": existing["_id"]},
            {"$set": {"targetAmount": target_dict["targetAmount"]}}
        )
        doc = await db.sales_targets.find_one({"_id": existing["_id"]})
    else:
        result = await db.sales_targets.insert_one(target_dict)
        doc = await db.sales_targets.find_one({"_id": result.inserted_id})
    
    return fix_id(doc)

async def update_sales_target(db, target_id: str, target_update: schemas.SalesTargetUpdate):
    update_data = {k: v for k, v in target_update.dict().items() if v is not None}
    result = await db.sales_targets.find_one_and_update(
        {"_id": ObjectId(target_id)},
        {"$set": update_data},
        return_document=True
    )
    return fix_id(result)

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
