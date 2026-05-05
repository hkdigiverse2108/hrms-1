from bson import ObjectId
from datetime import datetime, timedelta
import schemas

def fix_id(doc):
    if doc:
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
async def log_activity(db, action: str, performedBy: str, userName: str, details: str, taskId: str = None, projectId: str = None, clientId: str = None, dailyReportId: str = None, monthlyReportId: str = None):
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
    if dailyReportId: log_entry["dailyReportId"] = dailyReportId
    if monthlyReportId: log_entry["monthlyReportId"] = monthlyReportId
    
    await db.task_logs.insert_one(log_entry)

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
    await log_task_activity(db, None, "Lead Created", performedBy, userName, f"Lead for '{lead_dict['company']}' was created.")
    
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
        await log_task_activity(db, None, "Lead Updated", performedBy, userName, f"Lead '{lead_id}' was updated.")
        
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
    await log_task_activity(db, None, "Follow-up Added", performedBy, userName, f"Follow-up added to lead '{lead_id}'.")
    
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
