from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from contextlib import asynccontextmanager
import crud, schemas, database, auth
import uvicorn
import os
import uuid
from bson import ObjectId
from database import get_db
import holidays as pyholidays
from websocket import manager as ws_manager

import asyncio
print("MAIN PATH:", __file__, flush=True)

@asynccontextmanager
async def lifespan(app):
    # --- Startup ---
    pass
    
    # Seed the employee_id counter if it doesn't exist yet
    try:
        from database import db
        existing_counter = await db.counters.find_one({"_id": "employee_id"})
        if not existing_counter:
            count = await db.employees.count_documents({})
            await db.counters.insert_one({"_id": "employee_id", "seq": count})
            print(f"Seeded employee_id counter at {count}")
    except Exception as e:
        print(f"Error seeding employee counter: {e}")
    # Seed default document types if they don't exist
    try:
        from database import db
        existing_types = await db.document_types.count_documents({})
        if existing_types == 0:
            defaults = [
                {"name": "Security Cheque", "description": "Cheque collected for security purpose"},
                {"name": "Degree Certificate", "description": "Highest education degree certificate"},
                {"name": "10th Marksheet", "description": "10th grade marksheet/certificate"},
                {"name": "12th Marksheet", "description": "12th grade marksheet/certificate"},
                {"name": "Passport Photo", "description": "Recent passport size photograph"},
                {"name": "Security Deposite (Employee - 10000)", "description": "Security deposit for standard employee structure (INR 10,000)"},
                {"name": "Security Deposite (Intern - 2000)", "description": "Security deposit for intern structure (INR 2,000)"}
            ]
            await db.document_types.insert_many(defaults)
            print("Seeded default document types")
    except Exception as e:
        print(f"Error seeding default document types: {e}")
    
    # Start the global input tracker
    try:
        import platform
        import os
        from database import db
        import input_tracker
        run_tracker = os.environ.get("RUN_TRACKER", "true").lower() == "true"
        if platform.system() != "Linux" and run_tracker:
            input_tracker.start_tracker(db)
        else:
            print("[Tracker] Skipping input tracker start (disabled or running on Linux/Production server).")
    except Exception as e:
        print(f"Error starting global input tracker: {e}")

    # Auto-register local PC device
    try:
        from database import db
        import socket
        import platform
        hostname = socket.gethostname()
        os_name = platform.system()
        os_version = platform.release()
        
        local_ip = "127.0.0.1"
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
        except Exception:
            pass
            
        if os_name != "Linux":
            await crud.register_pc_device(db, hostname, local_ip, os_name, os_version)
            print(f"[PC Registration] Registered device: {hostname} ({local_ip})")
        else:
            print("[PC Registration] Skipping registration (running on Linux/Production server).")
    except Exception as e:
        print(f"[PC Registration] Failed to register PC: {e}")

    yield
    # --- Shutdown ---
    try:
        import input_tracker
        input_tracker.stop_tracker()
    except Exception as e:
        print(f"Error stopping global input tracker: {e}")
    # Reload trigger: 1

app = FastAPI(title="HRMS API", lifespan=lifespan)

# CORS: read allowed origins from env (comma-separated), fallback to localhost for dev
_default_origins = "http://localhost:3535,http://127.0.0.1:3535,http://localhost:3550,http://127.0.0.1:3550"
_allowed_origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import shutil
from fastapi.staticfiles import StaticFiles

class SafeStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except Exception as ex:
            if hasattr(ex, "status_code") and ex.status_code == 404:
                ext = os.path.splitext(path)[1].lower()
                if ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']:
                    placeholder_svg = (
                        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="%23cbd5e1" stroke-width="1.5">'
                        '<rect width="20" height="20" x="2" y="2" rx="2" ry="2" fill="%23f8fafc"/>'
                        '<circle cx="8.5" cy="8.5" r="1.5" fill="%23cbd5e1"/>'
                        '<path d="m22 14-4.586-4.586a2 2 0 0 0-2.828 0L4 20"/>'
                        '</svg>'
                    )
                    return Response(content=placeholder_svg, media_type="image/svg+xml")
            raise ex

# Ensure uploads directory exists
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app.mount("/uploads", SafeStaticFiles(directory=UPLOAD_DIR), name="uploads")

from fastapi import Request
from jose import jwt

EXEMPT_PATHS = ["/login", "/time", "/", "/docs", "/openapi.json", "/redoc"]

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
        
    path = request.url.path
    if path in EXEMPT_PATHS or path.startswith("/uploads") or path.startswith("/chat/upload") or path.startswith("/ws") or path.startswith("/socket.io"):
        return await call_next(request)
        
    # Temporarily disabled per user request
    # authorization = request.headers.get("Authorization")
    # if not authorization or not authorization.startswith("Bearer "):
    #     return JSONResponse(status_code=401, content={"detail": "Could not validate credentials"})
        
    # token = authorization.split(" ")[1]
    # try:
    #     payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
    #     request.state.user_id = payload.get("sub")
    # except Exception as e:
    #     print(f"Auth error: {e}")
    #     return JSONResponse(status_code=401, content={"detail": "Could not validate credentials"})
        
    response = await call_next(request)
    return response

@app.get("/")
async def root():
    return {"message": "Welcome to HRMS API"}

MAX_FILE_SIZE = 512 * 1024 * 1024  # 512 MB

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 512 MB limit")
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        buffer.write(contents)
    return {"url": f"/uploads/{filename}"}

@app.post("/upload-profile-photo/{user_id}")
async def upload_profile_photo(user_id: str, file: UploadFile = File(...), db=Depends(get_db)):
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 512 MB limit")

    # Fetch the employee first so we can grab the old photo filename
    user = await crud.get_employee(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_photo = user.get("profilePhoto") if isinstance(user, dict) else getattr(user, "profilePhoto", None)

    filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    update_data = schemas.EmployeeUpdate(profilePhoto=filename)
    updated_user = await crud.update_employee(db, user_id, update_data)

    if not updated_user:
        # DB update failed – remove the newly uploaded file to avoid orphaned files
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail="Failed to update user profile photo")

    # Delete the old profile photo from disk now that the DB is updated
    if old_photo:
        old_file_path = os.path.join(UPLOAD_DIR, old_photo)
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except Exception as e:
                print(f"Warning: could not delete old profile photo '{old_photo}': {e}")

    return updated_user

@app.post("/chat/upload")
async def upload_chat_file(file: UploadFile = File(...)):
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 512 MB limit")
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        buffer.write(contents)
    return {"url": f"/uploads/{filename}", "filename": filename}

# Auth
@app.post("/login", response_model=schemas.LoginResponse)
async def login(login_data: schemas.LoginRequest, db=Depends(get_db)):
    user = await crud.authenticate_user(db, login_data)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("status", "").lower() == "inactive":
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact the administrator.")
    
    token = user.pop("token", None)
    return {"message": "Login successful", "user": user, "token": token}

# Employee Endpoints
@app.get("/time")
async def get_system_time():
    now = crud.get_now()
    return {
        "datetime": now.isoformat(),
        "timestamp": now.timestamp(),
        "timezone": "Asia/Kolkata"
    }

@app.get("/employees", response_model=List[schemas.Employee])
async def read_employees(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_employees(db, skip=skip, limit=limit)

@app.get("/employees/{employee_id}", response_model=schemas.Employee)
async def read_employee(employee_id: str, db=Depends(get_db)):
    employee = await crud.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@app.post("/employees", response_model=schemas.Employee)
async def create_employee(employee: schemas.EmployeeCreate, db=Depends(get_db)):
    return await crud.create_employee(db, employee)

@app.put("/employees/{employee_id}", response_model=schemas.Employee)
async def update_employee(employee_id: str, employee_update: schemas.EmployeeUpdate, db=Depends(get_db)):
    updated = await crud.update_employee(db, employee_id, employee_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Employee not found")
    return updated

@app.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, db=Depends(get_db)):
    await crud.delete_employee(db, employee_id)
    return {"message": "Employee deleted successfully"}

# Attendance Endpoints
@app.get("/attendance", response_model=List[schemas.Attendance])
async def read_attendance(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_attendance(db, skip=skip, limit=limit)

@app.get("/attendance/status/{employee_id}")
async def get_attendance_status(employee_id: str, db=Depends(get_db)):
    status = await crud.get_attendance_status(db, employee_id)
    return status if status else {"status": "Logged Out"}

@app.post("/attendance/punch-in/{employee_id}")
async def punch_in(employee_id: str, payload: Optional[schemas.PunchInRequest] = None, db=Depends(get_db)):
    punch_in_time = payload.punch_in_time if payload else None
    result = await crud.punch_in(db, employee_id, punch_in_time=punch_in_time)
    if not result:
        raise HTTPException(status_code=400, detail="Punch in failed")
    return result



@app.post("/attendance", response_model=schemas.Attendance)
async def create_attendance(attendance: schemas.AttendanceCreate, db=Depends(get_db)):
    return await crud.create_manual_attendance(db, attendance)

@app.put("/attendance/{attendance_id}", response_model=schemas.Attendance)
async def update_attendance(attendance_id: str, attendance_update: schemas.AttendanceUpdate, db=Depends(get_db)):
    updated = await crud.update_attendance(db, attendance_id, attendance_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return updated

@app.delete("/attendance/{attendance_id}")
async def delete_attendance(attendance_id: str, db=Depends(get_db)):
    success = await crud.delete_attendance(db, attendance_id)
    if not success:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return {"message": "Attendance record deleted successfully"}



@app.post("/attendance/multi-delete")
async def delete_multiple_attendance(request: dict, db=Depends(get_db)):
    attendance_ids = request.get("ids", [])
    if not attendance_ids:
        raise HTTPException(status_code=400, detail="List of IDs required")
    await crud.delete_multiple_attendance(db, attendance_ids)
    return {"message": f"Deleted {len(attendance_ids)} records"}

@app.post("/attendance/punch-out/{employee_id}")
async def punch_out(employee_id: str, payload: Optional[schemas.PunchOutRequest] = None, db=Depends(get_db)):
    punch_out_time = payload.punch_out_time if payload else None
    result = await crud.punch_out(db, employee_id, punch_out_time=punch_out_time)
    if not result:
        raise HTTPException(status_code=400, detail="Punch out failed")
    return result

@app.post("/attendance/break-in/{employee_id}")
async def break_in(employee_id: str, db=Depends(get_db)):
    result = await crud.break_in(db, employee_id)
    if not result:
        raise HTTPException(status_code=400, detail="Break in failed")
    return result

@app.post("/attendance/break-out/{employee_id}")
async def break_out(employee_id: str, db=Depends(get_db)):
    result = await crud.break_out(db, employee_id)
    if not result:
        raise HTTPException(status_code=400, detail="Break out failed")
    return result

# Leave Endpoints
@app.get("/leaves", response_model=List[schemas.LeaveRequest])
async def read_leave_requests(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_all_leave_requests(db, skip=skip, limit=limit)

@app.get("/leaves/employee/{employee_id}", response_model=List[schemas.LeaveRequest])
async def read_user_leave_requests(employee_id: str, skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_user_leave_requests(db, employee_id, skip=skip, limit=limit)

@app.post("/leaves", response_model=schemas.LeaveRequest)
async def create_leave_request(leave: schemas.LeaveRequestCreate, db=Depends(get_db)):
    return await crud.create_leave_request(db, leave)

@app.put("/leaves/{leave_id}", response_model=schemas.LeaveRequest)
async def update_leave_request(leave_id: str, leave_update: schemas.LeaveRequestUpdate, db=Depends(get_db)):
    return await crud.update_leave_request(db, leave_id, leave_update.dict(exclude_unset=True))

@app.patch("/leaves/{leave_id}/status", response_model=schemas.LeaveRequest)
async def update_leave_status(leave_id: str, update_data: schemas.LeaveRequestUpdate, db=Depends(get_db)):
    return await crud.update_leave_request_status(
        db, 
        leave_id, 
        update_data.status, 
        update_data.approved_by, 
        update_data.approved_by_role,
        update_data.approved_by_id,
        update_data.approved_by_photo,
        update_data.reject_reason,
        update_data.approve_reason
    )

@app.delete("/leaves/{leave_id}")
async def delete_leave_request(leave_id: str, db=Depends(get_db)):
    success = await crud.delete_leave_request(db, leave_id)
    if not success:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return {"message": "Leave request deleted successfully"}

# Announcement Endpoints
@app.get("/announcements", response_model=List[schemas.Announcement])
async def read_announcements(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_announcements(db, skip=skip, limit=limit)

# Dashboard Endpoints
@app.get("/dashboard-stats", response_model=schemas.DashboardStats)
async def read_dashboard_stats(db=Depends(get_db)):
    return await crud.get_dashboard_stats(db)

@app.get("/analytics/overview", response_model=schemas.AnalyticsOverview)
async def read_analytics_overview(months: int = 6, db=Depends(get_db)):
    return await crud.get_analytics_overview(db, months=months)

# Payroll Endpoints
@app.get("/payroll", response_model=List[schemas.Payroll])
async def read_payroll(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_payroll(db, skip=skip, limit=limit)

@app.post("/payroll/process")
async def process_payroll(request: dict, db=Depends(get_db)):
    # request should contain month and year
    month = request.get("month")
    year = request.get("year")
    if not month or not year:
        raise HTTPException(status_code=400, detail="Month and year required")
    return await crud.run_payroll_processing(db, month, year)

@app.put("/payroll/{payroll_id}", response_model=schemas.Payroll)
async def update_payroll(payroll_id: str, request: dict, db=Depends(get_db)):
    res = await crud.update_item(db, "payroll", payroll_id, request)
    if not res:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    return res

@app.get("/salary-structures", response_model=List[schemas.SalaryStructure])
async def read_salary_structures(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_salary_structures(db, skip=skip, limit=limit)

@app.get("/salary-structures/{employee_id}", response_model=schemas.SalaryStructure)
async def read_salary_structure(employee_id: str, db=Depends(get_db)):
    res = await crud.get_salary_structure_by_employee(db, employee_id)
    if not res:
        raise HTTPException(status_code=404, detail="Salary structure not found")
    return res

@app.post("/salary-structures", response_model=schemas.SalaryStructure)
async def upsert_salary_structure(salary: schemas.SalaryStructureCreate, db=Depends(get_db)):
    return await crud.create_or_update_salary_structure(db, salary)

@app.get("/bonus-deductions", response_model=List[schemas.BonusDeduction])
async def read_bonus_deductions(month: Optional[str] = None, year: Optional[int] = None, db=Depends(get_db)):
    return await crud.get_bonus_deductions_with_remarks(db, month, year)

@app.post("/bonus-deductions", response_model=schemas.BonusDeduction)
async def create_bonus_deduction(item: schemas.BonusDeductionCreate, db=Depends(get_db)):
    return await crud.create_bonus_deduction(db, item)

@app.put("/bonus-deductions/{item_id}", response_model=schemas.BonusDeduction)
async def update_bonus_deduction(item_id: str, request: dict, db=Depends(get_db)):
    res = await crud.update_item(db, "bonus_deductions", item_id, request)
    if not res:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    return res

@app.delete("/bonus-deductions/{item_id}")
async def delete_bonus_deduction(item_id: str, db=Depends(get_db)):
    await crud.update_item(db, "bonus_deductions", item_id, {"status": "deleted"})
    return {"message": "Adjustment deleted successfully"}

# Notification Endpoints
@app.get("/notifications/{employee_id}", response_model=List[schemas.Notification])
async def read_notifications(employee_id: str, db=Depends(get_db)):
    return await crud.get_notifications_by_user(db, employee_id)

@app.post("/notifications", response_model=schemas.Notification)
async def create_notification(notification: schemas.NotificationCreate, db=Depends(get_db)):
    return await crud.create_notification(db, notification)

@app.put("/notifications/{notification_id}/read", response_model=schemas.Notification)
async def mark_notification_read(notification_id: str, db=Depends(get_db)):
    return await crud.mark_notification_as_read(db, notification_id)

@app.put("/notifications/read-all/{employee_id}")
async def mark_all_notifications_read(employee_id: str, db=Depends(get_db)):
    return await crud.mark_all_notifications_as_read(db, employee_id)

# Department Endpoints
@app.get("/departments", response_model=List[schemas.Department])
async def read_departments(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_departments(db, skip=skip, limit=limit)

@app.post("/departments", response_model=schemas.Department)
async def create_department(department: schemas.DepartmentCreate, db=Depends(get_db)):
    return await crud.create_department(db, department)

@app.put("/departments/{department_id}", response_model=schemas.Department)
async def update_department(department_id: str, department_update: schemas.DepartmentUpdate, db=Depends(get_db)):
    return await crud.update_department(db, department_id, department_update)

@app.delete("/departments/{department_id}")
async def delete_department(department_id: str, db=Depends(get_db)):
    await crud.delete_department(db, department_id)
    return {"message": "Department deleted successfully"}

# Designation Endpoints
@app.get("/designations", response_model=List[schemas.Designation])
async def read_designations(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_designations(db, skip=skip, limit=limit)

@app.post("/designations", response_model=schemas.Designation)
async def create_designation(designation: schemas.DesignationCreate, db=Depends(get_db)):
    return await crud.create_designation(db, designation)

@app.put("/designations/{designation_id}", response_model=schemas.Designation)
async def update_designation(designation_id: str, designation_update: schemas.DesignationUpdate, db=Depends(get_db)):
    return await crud.update_designation(db, designation_id, designation_update)

@app.delete("/designations/{designation_id}")
async def delete_designation(designation_id: str, db=Depends(get_db)):
    await crud.delete_designation(db, designation_id)
    return {"message": "Designation deleted successfully"}

# Configuration Endpoints (Companies, Roles, Relations)
@app.get("/companies", response_model=List[schemas.Company])
async def read_companies(skip: int = 0, limit: int = 10000, db=Depends(get_db)): return await crud.get_companies(db, skip, limit)
@app.post("/companies", response_model=schemas.Company)
async def create_company(company: schemas.CompanyCreate, db=Depends(get_db)): return await crud.create_company(db, company)

@app.get("/roles", response_model=List[schemas.Role])
async def read_roles(skip: int = 0, limit: int = 10000, db=Depends(get_db)): return await crud.get_roles(db, skip, limit)
@app.post("/roles", response_model=schemas.Role)
async def create_role(role: schemas.RoleCreate, db=Depends(get_db)): return await crud.create_role(db, role)

@app.get("/relations", response_model=List[schemas.Relation])
async def read_relations(skip: int = 0, limit: int = 10000, db=Depends(get_db)): return await crud.get_relations(db, skip, limit)
@app.post("/relations", response_model=schemas.Relation)
async def create_relation(relation: schemas.RelationCreate, db=Depends(get_db)): return await crud.create_relation(db, relation)


# Recruitment Endpoints
@app.get("/job-openings", response_model=List[schemas.JobOpening])
async def read_job_openings(skip: int = 0, limit: int = 10000, db=Depends(get_db)): return await crud.get_job_openings(db, skip, limit)
@app.post("/job-openings", response_model=schemas.JobOpening)
async def create_job_opening(job: schemas.JobOpeningCreate, db=Depends(get_db)): return await crud.create_job_opening(db, job)
@app.put("/job-openings/{job_id}", response_model=schemas.JobOpening)
async def update_job_opening(job_id: str, job_update: schemas.JobOpeningUpdate, db=Depends(get_db)):
    return await crud.update_job_opening(db, job_id, job_update)
@app.delete("/job-openings/{job_id}")
async def delete_job_opening(job_id: str, db=Depends(get_db)):
    await crud.delete_job_opening(db, job_id)
    return {"message": "Job opening deleted successfully"}

@app.get("/applications", response_model=List[schemas.Application])
async def read_applications(skip: int = 0, limit: int = 10000, db=Depends(get_db)): return await crud.get_applications(db, skip, limit)
@app.post("/applications", response_model=schemas.Application)
async def create_application(app: schemas.ApplicationCreate, db=Depends(get_db)): return await crud.create_application(db, app)
@app.put("/applications/{app_id}", response_model=schemas.Application)
async def update_application(app_id: str, app_update: schemas.ApplicationUpdate, db=Depends(get_db)):
    return await crud.update_application(db, app_id, app_update)
@app.delete("/applications/{app_id}")
async def delete_application(app_id: str, db=Depends(get_db)):
    await crud.delete_application(db, app_id)
    return {"message": "Application deleted successfully"}

@app.get("/applications/{app_id}/logs")
async def read_application_logs(app_id: str, db=Depends(get_db)):
    return await crud.get_application_logs(db, app_id)

@app.get("/interns", response_model=List[schemas.Intern])
async def read_interns(skip: int = 0, limit: int = 10000, db=Depends(get_db)): return await crud.get_interns(db, skip, limit)
@app.post("/interns", response_model=schemas.Intern)
async def create_intern(intern: schemas.InternCreate, db=Depends(get_db)): return await crud.create_intern(db, intern)

# Referral / Job Reference Endpoints
@app.get("/referrals", response_model=List[schemas.Referral])
async def read_referrals(employee_id: Optional[str] = None, db=Depends(get_db)):
    if employee_id:
        return await crud.get_employee_referrals(db, employee_id)
    return await crud.get_referrals(db)

@app.post("/referrals", response_model=schemas.Referral)
async def create_referral(referral: schemas.ReferralCreate, db=Depends(get_db)):
    return await crud.create_referral(db, referral)

@app.put("/referrals/{referral_id}", response_model=schemas.Referral)
async def update_referral(referral_id: str, referral_update: schemas.ReferralUpdate, db=Depends(get_db)):
    return await crud.update_referral(db, referral_id, referral_update)

@app.delete("/referrals/{referral_id}")
async def delete_referral(referral_id: str, db=Depends(get_db)):
    await crud.delete_referral(db, referral_id)
    return {"message": "Referral deleted successfully"}

# Asset & Expense Endpoints
@app.get("/assets", response_model=List[schemas.Asset])
async def read_assets(skip: int = 0, limit: int = 10000, db=Depends(get_db)): return await crud.get_assets(db, skip, limit)
@app.post("/assets", response_model=schemas.Asset)
async def create_asset(asset: schemas.AssetCreate, db=Depends(get_db)): return await crud.create_asset(db, asset)
@app.put("/assets/{asset_id}", response_model=schemas.Asset)
async def update_asset(asset_id: str, asset_update: schemas.AssetUpdate, db=Depends(get_db)): return await crud.update_asset(db, asset_id, asset_update)
@app.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, performedBy: Optional[str] = None, userName: Optional[str] = None, db=Depends(get_db)):
    await crud.delete_asset(db, asset_id, performedBy=performedBy, userName=userName)
    return {"message": "Asset deleted successfully"}

@app.delete("/assets/by-category/{category_name}")
async def delete_assets_by_category(category_name: str, performedBy: Optional[str] = None, userName: Optional[str] = None, db=Depends(get_db)):
    """Delete all assets belonging to a specific category (handles both 'category' and 'type' fields)."""
    result = await db.assets.delete_many({
        "$or": [
            {"category": category_name},
            {"type": category_name}
        ]
    })
    return {"deleted": result.deleted_count, "category": category_name}

@app.get("/assets/logs")
async def read_asset_logs(asset_id: Optional[str] = None, db=Depends(get_db)):
    return await crud.get_asset_logs(db, asset_id)

# Asset Category Endpoints
@app.get("/asset-categories", response_model=List[schemas.AssetCategory])
async def read_asset_categories(skip: int = 0, limit: int = 100, db=Depends(get_db)):
    return await crud.get_asset_categories(db, skip, limit)

@app.post("/asset-categories", response_model=schemas.AssetCategory)
async def create_asset_category(category: schemas.AssetCategoryCreate, db=Depends(get_db)):
    return await crud.create_asset_category(db, category)

@app.put("/asset-categories/{category_id}", response_model=schemas.AssetCategory)
async def update_asset_category(category_id: str, category_update: schemas.AssetCategoryUpdate, db=Depends(get_db)):
    return await crud.update_asset_category(db, category_id, category_update)

@app.delete("/asset-categories/{category_id}")
async def delete_asset_category(category_id: str, performedBy: Optional[str] = None, userName: Optional[str] = None, db=Depends(get_db)):
    await crud.delete_asset_category(db, category_id, performed_by=performedBy, user_name=userName)
    return {"message": "Category deleted successfully"}

@app.get("/asset-categories/logs")
async def read_category_logs(category_id: Optional[str] = None, db=Depends(get_db)):
    return await crud.get_category_logs(db, category_id)

@app.get("/expense-claims", response_model=List[schemas.ExpenseClaim])
async def read_expense_claims(skip: int = 0, limit: int = 10000, db=Depends(get_db)): return await crud.get_expense_claims(db, skip, limit)
@app.post("/expense-claims", response_model=schemas.ExpenseClaim)
async def create_expense_claim(claim: schemas.ExpenseClaimCreate, db=Depends(get_db)): return await crud.create_expense_claim(db, claim)

# Holiday & Performance Endpoints
@app.get("/holidays", response_model=List[schemas.Holiday])
async def read_holidays(skip: int = 0, limit: int = 10000, db=Depends(get_db)): return await crud.get_holidays(db, skip, limit)
@app.post("/holidays", response_model=schemas.Holiday)
async def create_holiday(holiday: schemas.HolidayCreate, db=Depends(get_db)): return await crud.create_holiday(db, holiday)
@app.put("/holidays/{holiday_id}", response_model=schemas.Holiday)
async def update_holiday(holiday_id: str, holiday: schemas.HolidayUpdate, db=Depends(get_db)): return await crud.update_holiday(db, holiday_id, holiday)
@app.delete("/holidays/{holiday_id}")
async def delete_holiday(holiday_id: str, db=Depends(get_db)):
    await crud.delete_holiday(db, holiday_id)
    return {"message": "Holiday deleted"}

@app.delete("/holidays")
async def delete_all_holidays(db=Depends(get_db)):
    await crud.delete_all_holidays(db)
    return {"message": "All holidays deleted"}

import urllib.request

GOOGLE_ICS_MAP = {
    "IN": "en.indian#holiday@group.v.calendar.google.com",
    "US": "en.usa#holiday@group.v.calendar.google.com",
    "GB": "en.uk#holiday@group.v.calendar.google.com",
    "AU": "en.australian#holiday@group.v.calendar.google.com",
    "CA": "en.canadian#holiday@group.v.calendar.google.com"
}

@app.get("/holidays/fetch-external")
async def fetch_external_holidays(country: str = "IN", year: int = 2026):
    try:
        fetched = []
        if country in GOOGLE_ICS_MAP:
            calendar_id = GOOGLE_ICS_MAP[country]
            url = f"https://calendar.google.com/calendar/ical/{calendar_id.replace('#', '%23').replace('@', '%40')}/public/basic.ics"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                content = response.read().decode('utf-8')
            
            current_event = {}
            for line in content.splitlines():
                if line.startswith('BEGIN:VEVENT'):
                    current_event = {}
                elif line.startswith('DTSTART;VALUE=DATE:'):
                    date_str = line.split(':')[1]
                    if date_str.startswith(str(year)):
                        current_event['date'] = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
                elif line.startswith('SUMMARY:'):
                    current_event['name'] = line.split(':', 1)[1]
                elif line.startswith('END:VEVENT'):
                    if 'date' in current_event and 'name' in current_event:
                        # Avoid duplicates on the exact same date and name
                        if not any(f['date'] == current_event['date'] and f['name'] == current_event['name'] for f in fetched):
                            fetched.append({
                                "date": current_event['date'],
                                "name": current_event['name'],
                                "type": "National",
                                "company": ""
                            })
        else:
            # Fallback to python holidays package
            country_holidays = pyholidays.country_holidays(country, years=year)
            for date, name in country_holidays.items():
                fetched.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "name": name,
                    "type": "National",
                    "company": ""
                })
        
        # Sort by date
        fetched.sort(key=lambda x: x["date"])
        return fetched
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching holidays: {str(e)}")

@app.post("/holidays/bulk")
async def create_holidays_bulk(payload: schemas.HolidayBulkCreate, db=Depends(get_db)):
    return await crud.create_holidays_bulk(db, payload)

@app.get("/kpi-records", response_model=List[schemas.KPI])
async def read_kpi_records(skip: int = 0, limit: int = 10000, db=Depends(get_db)): return await crud.get_kpi_records(db, skip, limit)
@app.post("/kpi-records", response_model=schemas.KPI)
async def create_kpi_record(kpi: schemas.KPICreate, db=Depends(get_db)): return await crud.create_kpi_record(db, kpi)

@app.get("/reviews", response_model=List[schemas.Review])
async def read_reviews(employeeId: Optional[str] = None, skip: int = 0, limit: int = 10000, db=Depends(get_db)): return await crud.get_reviews(db, employeeId, skip, limit)
@app.post("/reviews", response_model=schemas.Review)
async def create_review(review: schemas.ReviewCreate, db=Depends(get_db)): return await crud.create_review(db, review)
@app.put("/reviews/{review_id}", response_model=schemas.Review)
async def update_review(review_id: str, update: schemas.ReviewUpdate, db=Depends(get_db)): return await crud.update_review(db, review_id, update)
@app.delete("/reviews/{review_id}")
async def delete_review(review_id: str, db=Depends(get_db)): return await crud.delete_review(db, review_id)

@app.get("/remarks", response_model=List[schemas.Remark])
async def read_remarks(skip: int = 0, limit: int = 10000, db=Depends(get_db)): return await crud.get_remarks(db, skip, limit)
@app.post("/remarks", response_model=schemas.Remark)
async def create_remark(remark: schemas.RemarkCreate, db=Depends(get_db)): return await crud.create_remark(db, remark)
@app.put("/remarks/{remark_id}", response_model=schemas.Remark)
async def update_remark(remark_id: str, update: schemas.RemarkUpdate, db=Depends(get_db)): return await crud.update_remark(db, remark_id, update)
@app.delete("/remarks/{remark_id}")
async def delete_remark(remark_id: str, db=Depends(get_db)):
    await crud.delete_remark(db, remark_id)
    return {"message": "Remark soft-deleted successfully"}

@app.post("/remarks/{remark_id}/restore")
async def restore_remark(remark_id: str, db=Depends(get_db)):
    await crud.restore_remark(db, remark_id)
    return {"message": "Remark restored successfully"}

@app.delete("/remarks/{remark_id}/permanent")
async def permanently_delete_remark(remark_id: str, db=Depends(get_db)):
    await crud.permanently_delete_remark(db, remark_id)
    return {"message": "Remark permanently deleted"}

# Penalty Type Endpoints
@app.get("/penalty-types", response_model=List[schemas.PenaltyType])
async def read_penalty_types(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_penalty_types(db, skip=skip, limit=limit)

@app.post("/penalty-types", response_model=schemas.PenaltyType)
async def create_penalty_type(penalty_type: schemas.PenaltyTypeCreate, db=Depends(get_db)):
    return await crud.create_penalty_type(db, penalty_type)

@app.put("/penalty-types/{penalty_id}", response_model=schemas.PenaltyType)
async def update_penalty_type(penalty_id: str, penalty_update: schemas.PenaltyTypeUpdate, db=Depends(get_db)):
    return await crud.update_penalty_type(db, penalty_id, penalty_update)

@app.delete("/penalty-types/{penalty_id}")
async def delete_penalty_type(penalty_id: str, db=Depends(get_db)):
    await crud.delete_penalty_type(db, penalty_id)
    return {"message": "Penalty type deleted successfully"}

# Event Endpoints
@app.get("/events", response_model=List[schemas.Event])
async def read_events(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    events = await crud.get_events(db, skip, limit)
    holidays = await crud.get_holidays(db, 0, 1000)
    for h in holidays:
        title = h["name"] if "Holiday" in h["name"] else f"{h['name']} (Holiday)"
        events.append({
            "id": h["id"],
            "title": title,
            "description": f"{h.get('type', 'Public')} Holiday",
            "date": h["date"],
            "time": "All Day",
            "type": "Holiday"
        })
    # Sort by date — normalize mixed types (datetime, date, str, None) to comparable strings
    def _sort_key(x):
        d = x.get("date") if isinstance(x, dict) else getattr(x, "date", None)
        if d is None:
            return ""
        if hasattr(d, "isoformat"):
            return d.isoformat()
        return str(d)
    events.sort(key=_sort_key)
    return events
@app.post("/events", response_model=schemas.Event)
async def create_event(event: schemas.EventCreate, db=Depends(get_db)): return await crud.create_event(db, event)
@app.put("/events/{event_id}", response_model=schemas.Event)
async def update_event(event_id: str, event_update: schemas.EventUpdate, db=Depends(get_db)): return await crud.update_event(db, event_id, event_update)
@app.delete("/events/{event_id}")
async def delete_event(event_id: str, db=Depends(get_db)): return await crud.delete_event(db, event_id)

# Client Endpoints
@app.get("/clients", response_model=List[schemas.Client])
async def read_clients(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_clients(db, skip=skip, limit=limit)

@app.get("/clients/{client_id}", response_model=schemas.Client)
async def read_client(client_id: str, db=Depends(get_db)):
    client = await crud.get_client(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@app.post("/clients", response_model=schemas.Client)
async def create_client(client: schemas.ClientCreate, db=Depends(get_db)):
    return await crud.create_client(db, client=client)

@app.put("/clients/{client_id}", response_model=schemas.Client)
async def update_client(client_id: str, client_update: schemas.ClientUpdate, db=Depends(get_db)):
    print("DEBUG: update_client incoming payload:", client_update.dict(exclude_unset=True))
    return await crud.update_client(db, client_id, client_update)

@app.post("/clients/{client_id}/meetings", response_model=schemas.Client)
async def add_client_meeting(client_id: str, meeting: schemas.Meeting, performedBy: Optional[str] = None, userName: Optional[str] = None, db=Depends(get_db)):
    return await crud.add_client_meeting(db, client_id, meeting, performedBy=performedBy, userName=userName)

@app.put("/clients/{client_id}/meetings/{meeting_idx}", response_model=schemas.Client)
async def update_client_meeting(client_id: str, meeting_idx: int, meeting: schemas.Meeting, performedBy: Optional[str] = None, userName: Optional[str] = None, db=Depends(get_db)):
    return await crud.update_client_meeting(db, client_id, meeting_idx, meeting, performedBy=performedBy, userName=userName)

@app.delete("/clients/{client_id}/meetings/{meeting_idx}", response_model=schemas.Client)
async def delete_client_meeting(client_id: str, meeting_idx: int, performedBy: Optional[str] = None, userName: Optional[str] = None, db=Depends(get_db)):
    return await crud.delete_client_meeting(db, client_id, meeting_idx, performedBy=performedBy, userName=userName)

@app.delete("/clients/{client_id}")
async def delete_client(client_id: str, db=Depends(get_db)):
    success = await crud.delete_client(db, client_id)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}

# Project Endpoints
@app.get("/projects", response_model=List[schemas.Project])
async def read_projects(userId: Optional[str] = None, role: Optional[str] = None, skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_projects(db, userId=userId, role=role, skip=skip, limit=limit)

@app.post("/projects", response_model=schemas.Project)
async def create_project(project: schemas.ProjectCreate, db=Depends(get_db)):
    return await crud.create_project(db, project=project)

@app.put("/projects/{project_id}", response_model=schemas.Project)
async def update_project(project_id: str, project_update: schemas.ProjectUpdate, db=Depends(get_db)):
    return await crud.update_project(db, project_id, project_update)

@app.delete("/projects/{project_id}")
async def delete_project(project_id: str, db=Depends(get_db)):
    success = await crud.delete_project(db, project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}

# WM Task Endpoints
# General Task Endpoints
@app.get("/tasks", response_model=List[schemas.Task])
async def get_tasks_api(userId: str = None, role: str = None, skip: int = 0, limit: int = 100, db=Depends(get_db)):
    return await crud.get_tasks(db, userId, role, skip, limit)

@app.post("/tasks", response_model=schemas.Task)
async def create_task_api(task: schemas.TaskCreate, db=Depends(get_db)):
    new_task = await crud.create_task(db, task)
    await ws_manager.broadcast_all("task_update", {"taskId": str(new_task.get("id"))})
    return new_task

@app.put("/tasks/{task_id}", response_model=schemas.Task)
async def update_task_api(task_id: str, task: schemas.TaskUpdate, db=Depends(get_db)):
    updated = await crud.update_task(db, task_id, task)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    await ws_manager.broadcast_all("task_update", {"taskId": task_id})
    return updated

@app.delete("/tasks/{task_id}")
async def delete_task_api(task_id: str, db=Depends(get_db)):
    success = await crud.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    await ws_manager.broadcast_all("task_update", {"taskId": task_id})
    return {"message": "Task deleted successfully"}

@app.get("/tasks/{task_id}/activities")
async def read_task_activities(task_id: str, db=Depends(get_db)):
    return await crud.get_task_activities(db, task_id)

@app.get("/wm-tasks", response_model=List[schemas.WMTask])
async def read_wm_tasks(userId: Optional[str] = None, role: Optional[str] = None, skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_wm_tasks(db, userId=userId, role=role, skip=skip, limit=limit)

@app.post("/wm-tasks", response_model=schemas.WMTask)
async def create_wm_task(task: schemas.WMTaskCreate, db=Depends(get_db)):
    return await crud.create_wm_task(db, task=task)

@app.put("/wm-tasks/{task_id}", response_model=schemas.WMTask)
async def update_wm_task(task_id: str, task_update: schemas.WMTaskUpdate, db=Depends(get_db)):
    updated = await crud.update_wm_task(db, task_id, task_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated

@app.delete("/wm-tasks/{task_id}")
async def delete_wm_task(task_id: str, db=Depends(get_db)):
    success = await crud.delete_wm_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

# Activity Log Endpoints
@app.get("/task-logs", response_model=List[schemas.TaskLog])
async def read_task_logs(
    taskId: Optional[str] = None, 
    projectId: Optional[str] = None, 
    clientId: Optional[str] = None, 
    dailyReportId: Optional[str] = None,
    monthlyReportId: Optional[str] = None,
    db=Depends(get_db)
):
    return await crud.get_task_logs(db, taskId=taskId, projectId=projectId, clientId=clientId, dailyReportId=dailyReportId, monthlyReportId=monthlyReportId)

@app.post("/task-logs", response_model=schemas.TaskLog)
async def create_task_log(log: schemas.TaskLogBase, db=Depends(get_db)):
    await crud.log_activity(
        db=db,
        action=log.action,
        performedBy=log.performedBy,
        userName=log.userName,
        details=log.details,
        taskId=log.taskId,
        projectId=log.projectId,
        clientId=log.clientId,
        leadId=log.leadId,
        dailyReportId=log.dailyReportId,
        monthlyReportId=log.monthlyReportId
    )
    # Fetch the latest log we just created
    doc = await db.task_logs.find_one({"clientId": log.clientId, "action": log.action}, sort=[("_id", -1)])
    if doc:
        from bson import ObjectId
        doc["id"] = str(doc["_id"])
    return doc
# Marketing Reports Endpoints
@app.post("/marketing/reports/daily", response_model=schemas.MarketingDailyReport)
async def create_marketing_daily_report(report: schemas.MarketingDailyReportCreate, db=Depends(get_db)):
    return await crud.create_marketing_daily_report(db, report)

@app.get("/marketing/reports/daily", response_model=List[schemas.MarketingDailyReport])
async def get_marketing_daily_reports(client_id: str = None, date: str = None, db=Depends(get_db)):
    return await crud.get_marketing_daily_reports(db, client_id, date)

@app.put("/marketing/reports/daily/{report_id}", response_model=schemas.MarketingDailyReport)
async def update_marketing_daily_report(report_id: str, report: schemas.MarketingDailyReportUpdate, db=Depends(get_db)):
    updated = await crud.update_marketing_daily_report(db, report_id, report)
    if not updated:
        raise HTTPException(status_code=404, detail="Daily report not found")
    return updated

@app.delete("/marketing/reports/daily/{report_id}")
async def delete_marketing_daily_report(report_id: str, db=Depends(get_db)):
    success = await crud.delete_marketing_daily_report(db, report_id)
    if not success:
        raise HTTPException(status_code=404, detail="Daily report not found")
    return {"message": "Daily report deleted"}

@app.post("/marketing/reports/monthly", response_model=schemas.MarketingMonthlyReport)
async def create_marketing_monthly_report(report: schemas.MarketingMonthlyReportCreate, db=Depends(get_db)):
    return await crud.create_marketing_monthly_report(db, report)

@app.get("/marketing/reports/monthly", response_model=List[schemas.MarketingMonthlyReport])
async def get_marketing_monthly_reports(client_id: str = None, month: str = None, db=Depends(get_db)):
    return await crud.get_marketing_monthly_reports(db, client_id, month)

@app.put("/marketing/reports/monthly/{report_id}", response_model=schemas.MarketingMonthlyReport)
async def update_marketing_monthly_report(report_id: str, report: schemas.MarketingMonthlyReportUpdate, db=Depends(get_db)):
    updated = await crud.update_marketing_monthly_report(db, report_id, report)
    if not updated:
        raise HTTPException(status_code=404, detail="Monthly report not found")
    return updated

@app.delete("/marketing/reports/monthly/{report_id}")
async def delete_marketing_monthly_report(report_id: str, db=Depends(get_db)):
    success = await crud.delete_marketing_monthly_report(db, report_id)
    if not success:
        raise HTTPException(status_code=404, detail="Monthly report not found")
    return {"message": "Monthly report deleted"}
# Chat Endpoints
@app.get("/chat/messages/{sender_id}/{receiver_id}", response_model=List[schemas.ChatMessage])
async def read_chat_messages(sender_id: str, receiver_id: str, group_id: Optional[str] = None, db=Depends(get_db)):
    return await crud.get_messages(db, sender_id, receiver_id, group_id)

@app.get("/chat/groups/{user_id}", response_model=List[schemas.ChatGroup])
async def read_chat_groups(user_id: str, db=Depends(get_db)):
    return await crud.get_chat_groups(db, user_id)

@app.post("/chat/groups", response_model=schemas.ChatGroup)
async def create_chat_group(group: schemas.ChatGroupCreate, db=Depends(get_db)):
    return await crud.create_chat_group(db, group)

@app.put("/chat/groups/{group_id}", response_model=schemas.ChatGroup)
async def update_chat_group(group_id: str, group: schemas.ChatGroupUpdate, db=Depends(get_db)):
    return await crud.update_chat_group(db, group_id, group)

@app.delete("/chat/groups/{group_id}")
async def delete_chat_group(group_id: str, db=Depends(get_db)):
    await crud.delete_chat_group(db, group_id)
    return {"message": "Group deleted successfully"}

@app.post("/chat/messages", response_model=schemas.ChatMessage)
async def create_chat_message(message: schemas.ChatMessageCreate, db=Depends(get_db)):
    saved_msg = await crud.create_message(db, message)
    
    # Broadcast to active clients in real-time
    try:
        from fastapi.encoders import jsonable_encoder
        json_msg = jsonable_encoder(saved_msg)
        
        group_id = json_msg.get("groupId")
        if group_id:
            # Group or general channel message
            is_group = await db.chat_groups.find_one({"_id": ObjectId(group_id)}) if len(group_id) == 24 else None
            
            member_ids = []
            if is_group:
                member_ids = [str(m) for m in is_group.get("members", [])]
            else:
                # General channel: broadcast to all active employees
                employees = await db.employees.find().to_list(length=1000)
                member_ids = [str(emp["_id"]) for emp in employees]
                
            await ws_manager.broadcast_to_group(member_ids, "new_message", json_msg)
        else:
            # Personal message: broadcast to both receiver and sender
            receiver_id = json_msg.get("receiverId")
            sender_id = json_msg.get("senderId")
            recipients = [receiver_id, sender_id]
            await ws_manager.broadcast_to_group(recipients, "new_message", json_msg)
    except Exception as e:
        import logging
        logging.getLogger("websocket").warning(f"Error broadcasting new message: {e}")
        
    return saved_msg

@app.put("/chat/messages/{message_id}", response_model=schemas.ChatMessage)
async def update_chat_message(message_id: str, update: schemas.ChatMessageUpdate, db=Depends(get_db)):
    updated = await crud.update_message(db, message_id, update.text)
    if not updated:
        raise HTTPException(status_code=404, detail="Message not found")
    return updated

@app.delete("/chat/messages/{message_id}")
async def delete_chat_message(message_id: str, db=Depends(get_db)):
    await crud.delete_message(db, message_id)
    return {"message": "Message deleted successfully"}

@app.post("/chat/mark-seen/{sender_id}/{receiver_id}")
async def mark_messages_as_seen(sender_id: str, receiver_id: str, db=Depends(get_db)):
    await crud.mark_messages_as_seen(db, sender_id, receiver_id)
    
    # Broadcast seen event to active clients in real-time
    try:
        is_group = await db.chat_groups.find_one({"_id": ObjectId(sender_id)}) if len(sender_id) == 24 else None
        is_channel = await db.chat_channels.find_one({"_id": ObjectId(sender_id)}) if len(sender_id) == 24 else None
        
        event_data = {
            "chatId": sender_id,
            "userId": receiver_id
        }
        
        if is_group or is_channel or sender_id.startswith("gen-"):
            # Group or General channel
            member_ids = []
            if is_group:
                member_ids = [str(m) for m in is_group.get("members", [])]
            else:
                # General channel
                employees = await db.employees.find().to_list(length=1000)
                member_ids = [str(emp["_id"]) for emp in employees]
            # Filter out the reader themselves
            recipients = [m for m in member_ids if m != receiver_id]
            await ws_manager.broadcast_to_group(recipients, "messages_seen", event_data)
        else:
            # Personal chat: send to the other user (sender_id)
            personal_event_data = {
                "chatId": receiver_id, # From the other user's perspective, this chat is with receiver_id
                "userId": receiver_id
            }
            await ws_manager.send_personal_message(sender_id, "messages_seen", personal_event_data)
    except Exception as e:
        import logging
        logging.getLogger("websocket").warning(f"Error broadcasting messages_seen event: {e}")
        
    return {"message": "Messages marked as seen"}

@app.get("/chat/unread-counts/{user_id}")
async def get_unread_counts(user_id: str, db=Depends(get_db)):
    # Aggregated counts for both personal and group chats
    unread_counts = {}
    
    # Support both string and ObjectId user ID types to prevent database type mismatch bugs
    user_id_obj = ObjectId(user_id) if len(user_id) == 24 else None
    user_ids = [user_id]
    if user_id_obj:
        user_ids.append(user_id_obj)
    
    # Get all valid employee IDs to filter out deleted or external users not in the chat list
    employees = await db.employees.find({}, {"_id": 1}).to_list(length=10000)
    valid_employee_ids = [str(e["_id"]) for e in employees]
    valid_employee_objs = [ObjectId(e_id) for e_id in valid_employee_ids if len(e_id) == 24]
    valid_senders = valid_employee_ids + valid_employee_objs

    # 1. Personal Chats: messages where receiverId == user_id (string or Obj) and seenBy does not contain user_id
    cursor_personal = db.messages._collection.aggregate([
        {"$match": {
            "$or": [{"receiverId": user_id}, {"receiverId": user_id_obj}],
            "senderId": {"$nin": user_ids, "$in": valid_senders},
            "seenBy": {"$nin": user_ids}
        }},
        {"$group": {"_id": "$senderId", "count": {"$sum": 1}}}
    ])
    personal_results = await cursor_personal.to_list(length=1000)
    for r in personal_results:
        unread_counts[str(r["_id"])] = r["count"]
        
    # 2. Group Chats: messages where groupId is present and seenBy does not contain user_id
    user_groups = await crud.get_chat_groups(db, user_id)
    group_ids = [g["id"] for g in user_groups]
    channels = await crud.get_chat_channels(db)
    channel_ids = [c["id"] for c in channels]
    group_ids.extend(channel_ids)
    
    # Ensure query_group_ids contains both string and ObjectId formats for every group ID to prevent Mongo type mismatch bugs
    query_group_ids = []
    for g_id in group_ids:
        query_group_ids.append(g_id)
        if len(g_id) == 24:
            try:
                query_group_ids.append(ObjectId(g_id))
            except:
                pass
    
    cursor_groups = db.messages._collection.aggregate([
        {"$match": {
            "groupId": {"$in": query_group_ids},
            "senderId": {"$nin": user_ids},
            "seenBy": {"$nin": user_ids}
        }},
        {"$group": {"_id": "$groupId", "count": {"$sum": 1}}}
    ])
    group_results = await cursor_groups.to_list(length=1000)
    for r in group_results:
        unread_counts[str(r["_id"])] = r["count"]
        
    return unread_counts

@app.get("/chat/summaries/{user_id}")
async def get_chat_summaries(user_id: str, db=Depends(get_db)):
    return await crud.get_chat_summaries(db, user_id)

@app.post("/chat/messages/{message_id}/toggle-save")
async def toggle_save_message(message_id: str, user_id: str, db=Depends(get_db)):
    status = await crud.toggle_save_message(db, message_id, user_id)
    return {"isSaved": status}

@app.post("/chat/messages/{message_id}/toggle-pin")
async def toggle_pin_message(message_id: str, db=Depends(get_db)):
    status = await crud.toggle_pin_message(db, message_id)
    return {"isPinned": status}

# Chat Channels
@app.get("/chat/channels", response_model=List[schemas.ChatChannel])
async def get_chat_channels(db=Depends(get_db)):
    return await crud.get_chat_channels(db)

@app.post("/chat/channels", response_model=schemas.ChatChannel)
async def create_chat_channel(channel: schemas.ChatChannelCreate, db=Depends(get_db)):
    return await crud.create_chat_channel(db, channel)

@app.put("/chat/channels/{channel_id}", response_model=schemas.ChatChannel)
async def update_chat_channel(channel_id: str, channel: schemas.ChatChannelUpdate, db=Depends(get_db)):
    return await crud.update_chat_channel(db, channel_id, channel)

@app.delete("/chat/channels/{channel_id}")
async def delete_chat_channel(channel_id: str, db=Depends(get_db)):
    return await crud.delete_chat_channel(db, channel_id)

@app.get("/chat/saved-messages/{user_id}")
async def get_saved_messages(user_id: str, db=Depends(get_db)):
    return await crud.get_saved_messages(db, user_id)

@app.get("/chat/files/{user_id}/{other_id}")
async def get_chat_files(user_id: str, other_id: str, is_group: bool = False, db=Depends(get_db)):
    return await crud.get_chat_files(db, user_id, other_id, is_group)

@app.post("/chat/messages/{message_id}/toggle-archive")
async def toggle_archive_message(message_id: str, user_id: str, db=Depends(get_db)):
    status = await crud.toggle_archive_message(db, message_id, user_id)
    return {"isArchived": status}

@app.post("/chat/messages/{message_id}/toggle-complete")
async def toggle_complete_message(message_id: str, user_id: str, db=Depends(get_db)):
    status = await crud.toggle_complete_message(db, message_id, user_id)
    return {"isCompleted": status}

@app.post("/chat/messages/{message_id}/reaction")
async def toggle_reaction(message_id: str, user_id: str, emoji: str, db=Depends(get_db)):
    reactions = await crud.toggle_reaction(db, message_id, user_id, emoji)
    if reactions is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"reactions": reactions}

@app.put("/employees/{employee_id}/status")
async def update_employee_status(employee_id: str, status: Optional[str] = None, emoji: Optional[str] = None, db=Depends(get_db)):
    return await crud.update_employee_status(db, employee_id, status, emoji)

@app.post("/chat/messages/{message_id}/vote")
async def vote_on_poll(message_id: str, user_id: str, option_id: str, db=Depends(get_db)):
    options = await crud.vote_poll(db, message_id, user_id, option_id)
    if options is None:
        raise HTTPException(status_code=404, detail="Poll not found")
    return {"options": options}

@app.post("/chat/typing")
async def set_typing_status(chat_id: str, user_id: str, is_typing: bool, db=Depends(get_db)):
    await crud.set_typing_status(db, chat_id, user_id, is_typing)
    return {"status": "ok"}

@app.get("/chat/online-users")
async def get_online_users(db=Depends(get_db)):
    return list(ws_manager.active_connections.keys())

@app.get("/chat/typing/{chat_id}")
async def get_typing_status(chat_id: str, user_id: str, db=Depends(get_db)):
    typing_users = await crud.get_typing_users(db, chat_id, user_id)
    return {"typingUsers": typing_users}

@app.get("/chat/ws-info")
async def get_ws_info(request: Request):
    backend_port = os.environ.get("BACKEND_PORT", "8000")
    try:
        port_val = int(backend_port)
    except ValueError:
        port_val = 8000
    
    backend_url = os.environ.get("BACKEND_URL", "")
    ws_url = None
    if backend_url:
        scheme = "wss" if backend_url.startswith("https") else "ws"
        clean_url = backend_url.replace("https://", "").replace("http://", "").rstrip("/")
        if "localhost" not in clean_url and "127.0.0.1" not in clean_url and not clean_url.endswith("/api"):
            ws_url = f"{scheme}://{clean_url}/api/chat/ws"
        else:
            ws_url = f"{scheme}://{clean_url}/chat/ws"
    else:
        # Fallback using request host
        scheme = "wss" if request.url.scheme == "https" else "ws"
        clean_url = request.url.netloc.rstrip("/")
        if "localhost" not in clean_url and "127.0.0.1" not in clean_url:
            ws_url = f"{scheme}://{clean_url}/api/chat/ws"
        else:
            ws_url = f"{scheme}://{clean_url}/chat/ws"
        
    return {"port": port_val, "url": ws_url}

@app.websocket("/chat/ws/{user_id}")
async def chat_websocket_endpoint(websocket: WebSocket, user_id: str):
    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            # Await client-sent JSON messages
            data = await websocket.receive_json()
            if isinstance(data, dict):
                msg_type = data.get("type")
                if msg_type == "typing":
                    chat_id = data.get("chatId")
                    is_typing = data.get("isTyping", False)
                    if chat_id:
                        event_data = {
                            "chatId": chat_id,
                            "userId": user_id,
                            "isTyping": is_typing
                        }
                        # Find recipient list
                        is_group = await database.db.chat_groups.find_one({"_id": ObjectId(chat_id)}) if len(chat_id) == 24 else None
                        is_channel = await database.db.chat_channels.find_one({"_id": ObjectId(chat_id)}) if len(chat_id) == 24 else None
                        
                        if is_group or is_channel or chat_id.startswith("gen-"):
                            # Broadcast to group members
                            member_ids = []
                            if is_group:
                                # Convert ObjectId members to strings
                                member_ids = [str(m) for m in is_group.get("members", [])]
                            else:
                                # General channel: broadcast to all active employees
                                employees = await database.db.employees.find().to_list(length=1000)
                                member_ids = [str(emp["_id"]) for emp in employees]
                            
                            # Filter out the typing user themselves to avoid echo
                            recipients = [m for m in member_ids if m != user_id]
                            await ws_manager.broadcast_to_group(recipients, "typing_status", event_data)
                        else:
                            # Personal chat: send directly to the recipient (which is chat_id)
                            personal_event_data = {
                                "chatId": user_id,
                                "userId": user_id,
                                "isTyping": is_typing
                            }
                            await ws_manager.send_personal_message(chat_id, "typing_status", personal_event_data)
    except WebSocketDisconnect:
        await ws_manager.disconnect(user_id)
    except Exception as e:
        import logging
        logging.getLogger("websocket").warning(f"WebSocket error for user {user_id}: {e}")
        await ws_manager.disconnect(user_id)

# Employee Document Endpoints
@app.post("/employee-documents", response_model=schemas.EmployeeDocument)
async def create_employee_document(document: schemas.EmployeeDocumentCreate, db=Depends(get_db)):
    return await crud.create_employee_document(db, document)

@app.get("/employee-documents", response_model=List[schemas.EmployeeDocument])
async def read_employee_documents(employeeId: Optional[str] = None, db=Depends(get_db)):
    return await crud.get_employee_documents(db, employee_id=employeeId)

@app.put("/employee-documents/{doc_id}", response_model=schemas.EmployeeDocument)
async def update_employee_document(doc_id: str, doc_update: schemas.EmployeeDocumentUpdate, db=Depends(get_db)):
    updated = await crud.update_employee_document(db, doc_id, doc_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Document not found")
    return updated

@app.delete("/employee-documents/{doc_id}")
async def delete_employee_document(doc_id: str, db=Depends(get_db)):
    success = await crud.delete_employee_document(db, doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}

# Document Type Endpoints
@app.post("/document-types", response_model=schemas.DocumentType)
async def create_document_type(doc_type: schemas.DocumentTypeCreate, db=Depends(get_db)):
    return await crud.create_document_type(db, doc_type)

@app.get("/document-types", response_model=List[schemas.DocumentType])
async def read_document_types(db=Depends(get_db)):
    return await crud.get_document_types(db)

@app.put("/document-types/{type_id}", response_model=schemas.DocumentType)
async def update_document_type(type_id: str, type_update: schemas.DocumentTypeUpdate, db=Depends(get_db)):
    updated = await crud.update_document_type(db, type_id, type_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Document type not found")
    return updated

@app.delete("/document-types/{type_id}")
async def delete_document_type(type_id: str, db=Depends(get_db)):
    success = await crud.delete_document_type(db, type_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document type not found")
    return {"message": "Document type deleted successfully"}


# Document Templates Endpoints
@app.post("/document-templates", response_model=schemas.DocumentTemplate)
async def create_document_template(template: schemas.DocumentTemplateCreate, db=Depends(get_db)):
    return await crud.create_document_template(db, template)

@app.get("/document-templates", response_model=List[schemas.DocumentTemplate])
async def read_document_templates(skip: int = 0, limit: int = 100, db=Depends(get_db)):
    return await crud.get_document_templates(db, skip=skip, limit=limit)

@app.get("/document-templates/{template_id}", response_model=schemas.DocumentTemplate)
async def read_document_template(template_id: str, db=Depends(get_db)):
    template = await crud.get_document_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Document template not found")
    return template

@app.put("/document-templates/{template_id}", response_model=schemas.DocumentTemplate)
async def update_document_template(template_id: str, template_update: schemas.DocumentTemplateUpdate, db=Depends(get_db)):
    updated = await crud.update_document_template(db, template_id, template_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Document template not found")
    return updated

@app.delete("/document-templates/{template_id}")
async def delete_document_template(template_id: str, db=Depends(get_db)):
    success = await crud.delete_document_template(db, template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document template not found")
    return {"message": "Document template deleted successfully"}


# Document Request Endpoints
@app.post("/document-requests", response_model=schemas.DocumentRequest)
async def create_document_request(request: schemas.DocumentRequestCreate, db=Depends(get_db)):
    return await crud.create_document_request(db, request)

@app.get("/document-requests", response_model=List[schemas.DocumentRequest])
async def read_document_requests(employeeId: Optional[str] = None, db=Depends(get_db)):
    return await crud.get_document_requests(db, employee_id=employeeId)

@app.put("/document-requests/{req_id}", response_model=schemas.DocumentRequest)
async def update_document_request(req_id: str, req_update: schemas.DocumentRequestUpdate, db=Depends(get_db)):
    updated = await crud.update_document_request(db, req_id, req_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Request not found")
    return updated

@app.delete("/document-requests/{req_id}")
async def delete_document_request(req_id: str, db=Depends(get_db)):
    success = await crud.delete_document_request(db, req_id)
    if not success:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request deleted successfully"}

# Employee Daily Report Endpoints
@app.post("/employee-daily-reports", response_model=schemas.EmployeeDailyReport)
async def create_daily_report(report: schemas.EmployeeDailyReportCreate, db=Depends(get_db)):
    return await crud.create_employee_daily_report(db, report)

@app.get("/employee-daily-reports", response_model=List[schemas.EmployeeDailyReport])
async def read_daily_reports(employeeId: Optional[str] = None, department: Optional[str] = None, date: Optional[str] = None, db=Depends(get_db)):
    return await crud.get_employee_daily_reports(db, employee_id=employeeId, department=department, date=date)

@app.put("/employee-daily-reports/{report_id}", response_model=schemas.EmployeeDailyReport)
async def update_daily_report(report_id: str, report_update: schemas.EmployeeDailyReportUpdate, db=Depends(get_db)):
    updated = await crud.update_employee_daily_report(db, report_id, report_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Report not found")
    return updated

@app.get("/leads/{lead_id}/logs", response_model=List[schemas.TaskLog])
async def read_lead_logs(lead_id: str, db=Depends(get_db)):
    return await crud.get_lead_logs(db, lead_id)

# System Settings Endpoints
@app.get("/system-settings", response_model=schemas.SystemSettings)
async def get_system_settings(db=Depends(get_db)):
    return await crud.get_system_settings(db)

@app.put("/system-settings", response_model=schemas.SystemSettings)
async def update_system_settings(settings_update: schemas.SystemSettingsUpdate, db=Depends(get_db)):
    return await crud.update_system_settings(db, settings_update)

# Seating Arrangement Endpoints
@app.get("/seating-arrangement")
async def get_seating_arrangement(db=Depends(get_db)):
    arrangement = await db.seating_arrangement.find_one({})
    if not arrangement:
        return {"desks": []}
    return {"desks": arrangement.get("desks", [])}

@app.post("/seating-arrangement")
async def save_seating_arrangement(payload: dict, db=Depends(get_db)):
    desks = payload.get("desks", [])
    await db.seating_arrangement.update_one({}, {"$set": {"desks": desks}}, upsert=True)
    return {"status": "success", "desks": desks}

# Sales Lead Endpoints
@app.get("/leads", response_model=List[schemas.Lead])
async def read_leads(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_leads(db, skip=skip, limit=limit)

@app.post("/leads", response_model=schemas.Lead)
async def create_lead(lead: schemas.LeadCreate, db=Depends(get_db)):
    return await crud.create_lead(db, lead)

@app.put("/leads/{lead_id}", response_model=schemas.Lead)
async def update_lead(lead_id: str, lead_update: schemas.LeadUpdate, db=Depends(get_db)):
    result = await crud.update_lead(db, lead_id, lead_update)
    if not result:
        raise HTTPException(status_code=404, detail="Lead not found")
    return result
        
@app.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, db=Depends(get_db)):
    success = await crud.delete_lead(db, lead_id)
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted successfully"}

@app.post("/leads/{lead_id}/follow-ups", response_model=schemas.Lead)
async def add_lead_follow_up(lead_id: str, follow_up: schemas.FollowUp, performedBy: Optional[str] = None, userName: Optional[str] = None, db=Depends(get_db)):
    return await crud.add_lead_follow_up(db, lead_id, follow_up, performedBy=performedBy, userName=userName)

@app.put("/leads/{lead_id}/follow-ups/{follow_up_idx}", response_model=schemas.Lead)
async def update_lead_follow_up(lead_id: str, follow_up_idx: int, follow_up: schemas.FollowUp, performedBy: Optional[str] = None, userName: Optional[str] = None, db=Depends(get_db)):
    return await crud.update_lead_follow_up(db, lead_id, follow_up_idx, follow_up, performedBy=performedBy, userName=userName)

# Sales Target Routes
@app.get("/sales-targets", response_model=List[schemas.SalesTarget])
async def read_sales_targets(month: Optional[str] = None, year: Optional[int] = None, type: Optional[str] = None, db=Depends(get_db)):
    return await crud.get_sales_targets(db, month, year, type)

@app.post("/sales-targets", response_model=schemas.SalesTarget)
async def upsert_sales_target(target: schemas.SalesTargetCreate, db=Depends(get_db)):
    return await crud.create_or_update_sales_target(db, target)

@app.put("/sales-targets/{target_id}", response_model=schemas.SalesTarget)
async def update_sales_target(target_id: str, target_update: schemas.SalesTargetUpdate, db=Depends(get_db)):
    updated = await crud.update_sales_target(db, target_id, target_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Target not found")
    return updated

@app.delete("/sales-targets/{target_id}")
async def delete_sales_target(target_id: str, db=Depends(get_db)):
    await crud.delete_sales_target(db, target_id)
    return {"message": "Sales target deleted successfully"}

# Incentive Slab Routes
@app.get("/incentive-slabs", response_model=List[schemas.IncentiveSlab])
async def read_incentive_slabs(db=Depends(get_db)):
    return await crud.get_incentive_slabs(db)

@app.post("/incentive-slabs", response_model=schemas.IncentiveSlab)
async def create_incentive_slab(slab: schemas.IncentiveSlabCreate, db=Depends(get_db)):
    return await crud.create_incentive_slab(db, slab)

@app.put("/incentive-slabs/{slab_id}", response_model=schemas.IncentiveSlab)
async def update_incentive_slab(slab_id: str, slab_update: schemas.IncentiveSlabUpdate, db=Depends(get_db)):
    updated = await crud.update_incentive_slab(db, slab_id, slab_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Slab not found")
    return updated

@app.delete("/incentive-slabs/{slab_id}")
async def delete_incentive_slab(slab_id: str, db=Depends(get_db)):
    await crud.delete_incentive_slab(db, slab_id)
    return {"message": "Incentive slab deleted successfully"}

# User Permission Routes
@app.get("/user-permissions/{employee_id}", response_model=Optional[schemas.UserPermission])
async def read_user_permissions(employee_id: str, db=Depends(get_db)):
    return await crud.get_user_permissions(db, employee_id)

@app.post("/user-permissions/{employee_id}", response_model=schemas.UserPermission)
async def update_user_permissions(employee_id: str, permissions: schemas.UserPermissionUpdate, db=Depends(get_db)):
    return await crud.save_user_permissions(db, employee_id, permissions)

# Permission Presets Routes
@app.get("/permission-presets", response_model=List[schemas.PermissionPreset])
async def read_permission_presets(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_permission_presets(db, skip, limit)

@app.get("/permission-presets/{preset_id}", response_model=Optional[schemas.PermissionPreset])
async def read_permission_preset(preset_id: str, db=Depends(get_db)):
    preset = await crud.get_permission_preset(db, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    return preset

@app.post("/permission-presets", response_model=schemas.PermissionPreset)
async def create_permission_preset(preset: schemas.PermissionPresetCreate, db=Depends(get_db)):
    return await crud.create_permission_preset(db, preset)

@app.put("/permission-presets/{preset_id}", response_model=schemas.PermissionPreset)
async def update_permission_preset(preset_id: str, preset: schemas.PermissionPresetUpdate, db=Depends(get_db)):
    updated = await crud.update_permission_preset(db, preset_id, preset)
    if not updated:
        raise HTTPException(status_code=404, detail="Preset not found")
    return updated

@app.delete("/permission-presets/{preset_id}")
async def delete_permission_preset(preset_id: str, db=Depends(get_db)):
    deleted = await crud.delete_permission_preset(db, preset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Preset not found")
    return {"message": "Preset deleted"}

# Department Routes
# (Using existing routes defined earlier in the file)

# Time Recovery Endpoints
@app.post('/time-recovery', response_model=schemas.TimeRecovery)
async def create_time_recovery(recovery: schemas.TimeRecoveryCreate, db=Depends(get_db)):
    return await crud.create_time_recovery(db, recovery)

@app.get('/time-recovery', response_model=List[schemas.TimeRecovery])
async def read_time_recoveries(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_time_recoveries(db, skip=skip, limit=limit)

@app.get('/time-recovery/employee/{employee_id}', response_model=List[schemas.TimeRecovery])
async def read_employee_time_recoveries(employee_id: str, db=Depends(get_db)):
    return await crud.get_employee_time_recoveries(db, employee_id)

@app.put('/time-recovery/{recovery_id}/status', response_model=schemas.TimeRecovery)
async def update_time_recovery_status(recovery_id: str, status: str, db=Depends(get_db)):
    return await crud.update_time_recovery_status(db, recovery_id, status)

# Invoice Endpoints
@app.post("/invoices", response_model=schemas.Invoice)
async def create_invoice(invoice: schemas.InvoiceCreate, db=Depends(get_db)):
    return await crud.create_invoice(db, invoice)

@app.get("/invoices", response_model=List[schemas.Invoice])
async def read_invoices(skip: int = 0, limit: int = 10000, db=Depends(get_db)):
    return await crud.get_invoices(db, skip=skip, limit=limit)

@app.get("/invoices/next-number")
async def get_next_number(type: str = "Tax Invoice", taxType: str = "CGST+SGST", db=Depends(get_db)):
    next_num = await crud.get_next_invoice_number(db, invoice_type=type, tax_type=taxType)
    return {"nextInvoiceNumber": next_num}

@app.get("/invoices/{invoice_id}", response_model=schemas.Invoice)
async def read_invoice(invoice_id: str, db=Depends(get_db)):
    db_invoice = await crud.get_invoice(db, invoice_id)
    if db_invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return db_invoice

@app.put("/invoices/{invoice_id}", response_model=schemas.Invoice)
async def update_invoice(invoice_id: str, invoice_update: schemas.InvoiceUpdate, db=Depends(get_db)):
    updated = await crud.update_invoice(db, invoice_id, invoice_update)
    if updated is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return updated

@app.post("/invoices/{invoice_id}/convert-to-tax", response_model=schemas.Invoice)
async def convert_invoice_to_tax(invoice_id: str, db=Depends(get_db)):
    db_invoice = await crud.get_invoice(db, invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if db_invoice.get("invoiceType") != "Proforma Invoice":
        raise HTTPException(status_code=400, detail="Only Proforma Invoices can be converted")
    
    next_num = await crud.get_next_invoice_number(db, invoice_type="Tax Invoice")
    
    # Copy data to create a new invoice
    new_invoice_data = dict(db_invoice)
    new_invoice_data.pop("id", None)
    new_invoice_data.pop("_id", None)
    
    new_invoice_data["invoiceType"] = "Tax Invoice"
    new_invoice_data["invoiceNumber"] = next_num
    
    # Use schema to validate and parse
    new_invoice = schemas.InvoiceCreate(**new_invoice_data)
    created_invoice = await crud.create_invoice(db, new_invoice)
    
    return created_invoice

@app.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, db=Depends(get_db)):
    success = await crud.delete_invoice(db, invoice_id)
    if not success:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted successfully"}


# --- Schedules API ---
@app.get("/schedules", response_model=List[schemas.Schedule])
async def get_schedules(employeeId: Optional[str] = None, date: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None, db=Depends(get_db)):
    return await crud.get_schedules(db, employee_id=employeeId, date_str=date, date_from=date_from, date_to=date_to)

@app.post("/schedules", response_model=schemas.Schedule)
async def create_schedule(schedule: schemas.ScheduleCreate, db=Depends(get_db)):
    from datetime import datetime, date
    # Check for overlaps
    existing_schedules = await crud.get_schedules(db, employee_id=schedule.employeeId, date_str=str(schedule.date))
    if existing_schedules:
        for existing in existing_schedules:
            ex_start = existing.get("startTime")
            ex_end = existing.get("endTime")
            if ex_start and ex_end:
                if max(schedule.startTime, ex_start) < min(schedule.endTime, ex_end):
                    raise HTTPException(status_code=400, detail="Schedule overlaps with an existing schedule for this employee on this date.")

    schedule_data = schedule.model_dump()
    dt_val = schedule_data.get("date")
    if type(dt_val) is date:
        schedule_data["date"] = datetime.combine(dt_val, datetime.min.time())
    elif isinstance(dt_val, str):
        schedule_data["date"] = datetime.strptime(dt_val, "%Y-%m-%d")

    return await crud.create_schedule(db, schedule_data)

@app.put("/schedules/{schedule_id}", response_model=schemas.Schedule)
async def update_schedule(schedule_id: str, schedule: schemas.ScheduleUpdate, db=Depends(get_db)):
    from datetime import datetime, date
    update_data = schedule.model_dump(exclude_unset=True)
    dt_val = update_data.get("date")
    if dt_val is not None:
        if type(dt_val) is date:
            update_data["date"] = datetime.combine(dt_val, datetime.min.time())
        elif isinstance(dt_val, str):
            update_data["date"] = datetime.strptime(dt_val, "%Y-%m-%d")

    updated = await crud.update_schedule(db, schedule_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return updated

@app.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, db=Depends(get_db)):
    success = await crud.delete_schedule(db, schedule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted successfully"}


# --- User Activity Input Tracking API ---
@app.post("/activity/track/{employee_id}", response_model=schemas.UserInputStats)
async def track_activity(employee_id: str, input_data: schemas.UserInputStatsCreate, db=Depends(get_db)):
    return await crud.track_user_activity(db, employee_id, input_data.clicks, input_data.keystrokes)

@app.get("/activity/stats", response_model=List[schemas.UserInputStats])
async def get_activity_stats(employeeId: Optional[str] = None, db=Depends(get_db)):
    return await crud.get_user_activity_stats(db, employee_id=employeeId)


@app.post("/activity/session-active/{employee_id}")
async def set_active_session(employee_id: str, db=Depends(get_db)):
    import input_tracker
    await input_tracker.set_active_user(employee_id)
    
    # Update activeEmployee in registered_pcs for current hostname
    import socket
    from bson import ObjectId
    user_doc = await db.employees.find_one(
        {"_id": ObjectId(employee_id)} if len(employee_id) == 24 else {"_id": employee_id}
    )
    if user_doc:
        await db.registered_pcs.update_one(
            {"hostname": socket.gethostname()},
            {"$set": {"activeEmployee": user_doc.get("name", "Unknown")}}
        )
    return {"message": "Session tracking started"}

@app.post("/activity/session-inactive")
async def clear_active_session(db=Depends(get_db)):
    import input_tracker
    input_tracker.clear_active_user()
    
    # Clear activeEmployee in registered_pcs for current hostname
    import socket
    await db.registered_pcs.update_one(
        {"hostname": socket.gethostname()},
        {"$set": {"activeEmployee": ""}}
    )
    return {"message": "Session tracking stopped"}

# --- PC Device Restrictions & Broadcasts APIs ---
import socket
import platform

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

@app.get("/system/info")
async def get_system_info():
    return {
        "hostname": socket.gethostname(),
        "ipAddress": get_local_ip(),
        "os": platform.system(),
        "osVersion": platform.release()
    }

@app.get("/restrictions/pcs", response_model=List[schemas.RegisteredPC])
async def read_registered_pcs(
    db=Depends(get_db),
    _token=Depends(auth.require_auth)  # Must be logged in to see PC list
):
    return await crud.get_registered_pcs(db)

@app.put("/restrictions/pcs/{hostname}", response_model=schemas.RegisteredPC)
async def update_pcs_restrictions(
    hostname: str,
    pc_update: schemas.RegisteredPCUpdate,
    db=Depends(get_db),
    _admin=Depends(auth.require_admin)  # Admin ONLY — employees cannot modify restrictions
):
    updated = await crud.update_pc_restrictions(
        db,
        hostname,
        block_chrome=pc_update.blockChrome,
        block_youtube=pc_update.blockYoutube,
        block_apps=pc_update.blockApps,
        block_urls=pc_update.blockUrls
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Registered PC not found")
    return updated

@app.post("/system/broadcast")
async def system_broadcast(
    payload: dict,
    _admin=Depends(auth.require_admin)  # Admin ONLY — employees cannot send broadcasts
):
    title = payload.get("title", "System Broadcast")
    message = payload.get("message", "")
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    await ws_manager.broadcast_all("system_alert", {"title": title, "message": message})
    return {"message": "Announcement broadcasted successfully"}



@app.get("/security/alerts")
async def get_security_alerts(
    resolved: bool = None,
    db=Depends(get_db),
    _token=Depends(auth.require_auth)  # Any logged-in user (admin sees panel)
):
    """Return all security tamper alerts from MongoDB, newest first."""
    query = {}
    if resolved is not None:
        query["resolved"] = resolved
    cursor = db.security_alerts.find(query).sort("timestamp", -1).limit(200)
    alerts = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        alerts.append(doc)
    return alerts

@app.put("/security/alerts/{alert_id}/resolve")
async def resolve_security_alert(
    alert_id: str,
    db=Depends(get_db),
    _admin=Depends(auth.require_admin)  # Admin only
):
    """Mark a security alert as resolved."""
    from bson import ObjectId as ObjId
    try:
        result = await db.security_alerts.update_one(
            {"_id": ObjId(alert_id)},
            {"$set": {"resolved": True, "resolvedAt": datetime.utcnow()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"message": "Alert marked as resolved"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Content Calendar API ---
@app.get("/content-calendar", response_model=List[schemas.ContentCalendarEntry])
async def get_content_calendar_entries(clientId: str, monthYear: Optional[str] = None, db=Depends(get_db)):
    return await crud.get_content_calendar_entries(db, client_id=clientId, month_year=monthYear)

@app.post("/content-calendar", response_model=schemas.ContentCalendarEntry)
async def create_content_calendar_entry(entry: schemas.ContentCalendarEntryCreate, db=Depends(get_db)):
    return await crud.create_content_calendar_entry(db, entry.model_dump())

@app.put("/content-calendar/{entry_id}", response_model=schemas.ContentCalendarEntry)
async def update_content_calendar_entry(entry_id: str, entry: schemas.ContentCalendarEntryUpdate, db=Depends(get_db)):
    updated = await crud.update_content_calendar_entry(db, entry_id, entry.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Entry not found")
    return updated

@app.delete("/content-calendar/{entry_id}")
async def delete_content_calendar_entry(entry_id: str, db=Depends(get_db)):
    success = await crud.delete_content_calendar_entry(db, entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted successfully"}

@app.get("/content-calendar-settings", response_model=schemas.ContentCalendarSettingsBase)
async def get_content_calendar_settings(clientId: str, monthYear: str, db=Depends(get_db)):
    settings = await crud.get_content_calendar_settings(db, clientId, monthYear)
    if settings:
        return settings
    # Return defaults if not found
    return {
        "clientId": clientId,
        "monthYear": monthYear,
        "scriptDateOffset": 14,
        "shootDateOffset": 12,
        "editingStartOffset": 6,
        "approvalOffset": 5
    }

@app.post("/content-calendar-settings", response_model=schemas.ContentCalendarSettings)
async def upsert_content_calendar_settings(settings: schemas.ContentCalendarSettingsBase, db=Depends(get_db)):
    return await crud.upsert_content_calendar_settings(
        db, settings.clientId, settings.monthYear, settings.model_dump()
    )

# Dynamic Feedback Forms

@app.post("/forms", response_model=schemas.FeedbackForm)
async def create_feedback_form(form: schemas.FeedbackFormCreate, createdBy: Optional[str] = None, db=Depends(get_db)):
    return await crud.create_feedback_form(db, form, createdBy=createdBy or "Unknown")

@app.get("/forms/{form_id}", response_model=schemas.FeedbackForm)
async def get_feedback_form(form_id: str, db=Depends(get_db)):
    form = await crud.get_feedback_form(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form

@app.get("/forms/client/{client_id}", response_model=List[schemas.FeedbackForm])
async def get_client_feedback_forms(client_id: str, db=Depends(get_db)):
    return await crud.get_client_feedback_forms(db, client_id)

@app.put("/forms/{form_id}", response_model=schemas.FeedbackForm)
async def update_feedback_form(form_id: str, form: schemas.FeedbackFormCreate, db=Depends(get_db)):
    updated_form = await crud.update_feedback_form(db, form_id, form)
    if not updated_form:
        raise HTTPException(status_code=404, detail="Form not found")
    return updated_form

@app.delete("/forms/{form_id}")
async def delete_feedback_form(form_id: str, db=Depends(get_db)):
    deleted = await crud.delete_feedback_form(db, form_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Form not found")
    return {"message": "Form deleted successfully"}

@app.post("/forms/{form_id}/responses", response_model=schemas.FeedbackResponse)
async def submit_feedback_response(form_id: str, response: schemas.FeedbackResponseCreate, db=Depends(get_db)):
    if response.formId != form_id:
        raise HTTPException(status_code=400, detail="Form ID mismatch")
    return await crud.create_feedback_response(db, response)

@app.get("/forms/{form_id}/responses", response_model=List[schemas.FeedbackResponse])
async def get_form_responses(form_id: str, db=Depends(get_db)):
    return await crud.get_form_responses(db, form_id)

@app.get("/forms/client/{client_id}/responses", response_model=List[schemas.FeedbackResponse])
async def get_client_form_responses(client_id: str, db=Depends(get_db)):
    return await crud.get_client_form_responses(db, client_id)

if __name__ == "__main__":
    port = int(os.environ.get("BACKEND_PORT", 8000))
    print(f"Starting HRMS Backend on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
