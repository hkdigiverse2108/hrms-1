from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import crud, schemas, database
import uvicorn
import os
from bson import ObjectId
from database import get_db

app = FastAPI(title="HRMS API")

# Improved CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import shutil
from fastapi.staticfiles import StaticFiles

# Ensure uploads directory exists
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
async def root():
    return {"message": "Welcome to HRMS API"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    # Note: API_URL might not be available here directly, using relative path or placeholder
    return {"url": f"/uploads/{file.filename}"}

@app.post("/chat/upload")
async def upload_chat_file(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    # Use relative path or dynamic host in production
    return {"url": f"/uploads/{file.filename}", "filename": file.filename}

# Auth
@app.post("/login", response_model=schemas.LoginResponse)
async def login(login_data: schemas.LoginRequest, db=Depends(get_db)):
    user = await crud.authenticate_user(db, login_data)
    if not user:
        return {"message": "Invalid credentials", "user": None}
    return {"message": "Login successful", "user": user}

# Employee Endpoints
@app.get("/employees", response_model=List[schemas.Employee])
async def read_employees(skip: int = 0, limit: int = 100, db=Depends(get_db)):
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
async def read_attendance(skip: int = 0, limit: int = 100, db=Depends(get_db)):
    return await crud.get_attendance(db, skip=skip, limit=limit)

@app.get("/attendance/status/{employee_id}")
async def get_attendance_status(employee_id: str, db=Depends(get_db)):
    status = await crud.get_attendance_status(db, employee_id)
    return status if status else {"status": "Logged Out"}

@app.post("/attendance/punch-in/{employee_id}")
async def punch_in(employee_id: str, db=Depends(get_db)):
    result = await crud.punch_in(db, employee_id)
    if not result:
        raise HTTPException(status_code=400, detail="Punch in failed")
    return result

@app.post("/attendance/bulk-generate")
async def generate_bulk_attendance(request: dict, db=Depends(get_db)):
    employee_id = request.get("employeeId")
    month = request.get("month")
    year = request.get("year")
    if not all([employee_id, month, year]):
        raise HTTPException(status_code=400, detail="EmployeeId, month, and year required")
    result = await crud.generate_bulk_attendance(db, employee_id, month, year)
    if result is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": f"Generated {len(result)} records", "records": result}

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

@app.post("/attendance/bulk-delete")
async def bulk_delete_attendance(request: dict, db=Depends(get_db)):
    employee_id = request.get("employeeId")
    month = request.get("month")
    year = request.get("year")
    if not all([employee_id, month, year]):
        raise HTTPException(status_code=400, detail="EmployeeId, month, and year required")
    deleted_count = await crud.delete_bulk_attendance(db, employee_id, month, year)
    return {"message": f"Deleted {deleted_count} records", "count": deleted_count}

@app.post("/attendance/multi-delete")
async def delete_multiple_attendance(request: dict, db=Depends(get_db)):
    attendance_ids = request.get("ids", [])
    if not attendance_ids:
        raise HTTPException(status_code=400, detail="List of IDs required")
    await crud.delete_multiple_attendance(db, attendance_ids)
    return {"message": f"Deleted {len(attendance_ids)} records"}

@app.post("/attendance/punch-out/{employee_id}")
async def punch_out(employee_id: str, db=Depends(get_db)):
    result = await crud.punch_out(db, employee_id)
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
async def read_leave_requests(skip: int = 0, limit: int = 100, db=Depends(get_db)):
    return await crud.get_all_leave_requests(db, skip=skip, limit=limit)

@app.get("/leaves/employee/{employee_id}", response_model=List[schemas.LeaveRequest])
async def read_user_leave_requests(employee_id: str, skip: int = 0, limit: int = 100, db=Depends(get_db)):
    return await crud.get_user_leave_requests(db, employee_id, skip=skip, limit=limit)

@app.post("/leaves", response_model=schemas.LeaveRequest)
async def create_leave_request(leave: schemas.LeaveRequestCreate, db=Depends(get_db)):
    return await crud.create_leave_request(db, leave)

@app.put("/leaves/{leave_id}", response_model=schemas.LeaveRequest)
async def update_leave_request(leave_id: str, leave_update: schemas.LeaveRequestUpdate, db=Depends(get_db)):
    return await crud.update_leave_request(db, leave_id, leave_update.dict(exclude_unset=True))

@app.patch("/leaves/{leave_id}/status", response_model=schemas.LeaveRequest)
async def update_leave_status(leave_id: str, status: str, db=Depends(get_db)):
    return await crud.update_leave_request_status(db, leave_id, status)

@app.delete("/leaves/{leave_id}")
async def delete_leave_request(leave_id: str, db=Depends(get_db)):
    success = await crud.delete_leave_request(db, leave_id)
    if not success:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return {"message": "Leave request deleted successfully"}

# Announcement Endpoints
@app.get("/announcements", response_model=List[schemas.Announcement])
async def read_announcements(skip: int = 0, limit: int = 100, db=Depends(get_db)):
    return await crud.get_announcements(db, skip=skip, limit=limit)

# Dashboard Endpoints
@app.get("/dashboard-stats", response_model=schemas.DashboardStats)
async def read_dashboard_stats(db=Depends(get_db)):
    return await crud.get_dashboard_stats(db)

# Payroll Endpoints
@app.get("/payroll", response_model=List[schemas.Payroll])
async def read_payroll(skip: int = 0, limit: int = 100, db=Depends(get_db)):
    return await crud.get_payroll(db, skip=skip, limit=limit)

@app.post("/payroll/process")
async def process_payroll(request: dict, db=Depends(get_db)):
    # request should contain month and year
    month = request.get("month")
    year = request.get("year")
    if not month or not year:
        raise HTTPException(status_code=400, detail="Month and year required")
    return await crud.run_payroll_processing(db, month, year)

@app.get("/salary-structures", response_model=List[schemas.SalaryStructure])
async def read_salary_structures(skip: int = 0, limit: int = 100, db=Depends(get_db)):
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
    return await crud.get_bonus_deductions(db, month, year)

@app.post("/bonus-deductions", response_model=schemas.BonusDeduction)
async def create_bonus_deduction(item: schemas.BonusDeductionCreate, db=Depends(get_db)):
    return await crud.create_bonus_deduction(db, item)

# Notification Endpoints
@app.get("/notifications/{employee_id}", response_model=List[schemas.Notification])
async def read_notifications(employee_id: str, db=Depends(get_db)):
    return await crud.get_notifications_by_user(db, employee_id)

@app.put("/notifications/{notification_id}/read", response_model=schemas.Notification)
async def mark_notification_read(notification_id: str, db=Depends(get_db)):
    return await crud.mark_notification_as_read(db, notification_id)

# Department Endpoints
@app.get("/departments", response_model=List[schemas.Department])
async def read_departments(skip: int = 0, limit: int = 100, db=Depends(get_db)):
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
async def read_designations(skip: int = 0, limit: int = 100, db=Depends(get_db)):
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
async def read_companies(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_companies(db, skip, limit)
@app.post("/companies", response_model=schemas.Company)
async def create_company(company: schemas.CompanyCreate, db=Depends(get_db)): return await crud.create_company(db, company)

@app.get("/roles", response_model=List[schemas.Role])
async def read_roles(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_roles(db, skip, limit)
@app.post("/roles", response_model=schemas.Role)
async def create_role(role: schemas.RoleCreate, db=Depends(get_db)): return await crud.create_role(db, role)

@app.get("/relations", response_model=List[schemas.Relation])
async def read_relations(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_relations(db, skip, limit)
@app.post("/relations", response_model=schemas.Relation)
async def create_relation(relation: schemas.RelationCreate, db=Depends(get_db)): return await crud.create_relation(db, relation)


# Recruitment Endpoints
@app.get("/job-openings", response_model=List[schemas.JobOpening])
async def read_job_openings(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_job_openings(db, skip, limit)
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
async def read_applications(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_applications(db, skip, limit)
@app.post("/applications", response_model=schemas.Application)
async def create_application(app: schemas.ApplicationCreate, db=Depends(get_db)): return await crud.create_application(db, app)
@app.put("/applications/{app_id}", response_model=schemas.Application)
async def update_application(app_id: str, app_update: schemas.ApplicationUpdate, db=Depends(get_db)):
    return await crud.update_application(db, app_id, app_update)
@app.delete("/applications/{app_id}")
async def delete_application(app_id: str, db=Depends(get_db)):
    await crud.delete_application(db, app_id)
    return {"message": "Application deleted successfully"}

@app.get("/interns", response_model=List[schemas.Intern])
async def read_interns(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_interns(db, skip, limit)
@app.post("/interns", response_model=schemas.Intern)
async def create_intern(intern: schemas.InternCreate, db=Depends(get_db)): return await crud.create_intern(db, intern)

# Asset & Expense Endpoints
@app.get("/assets", response_model=List[schemas.Asset])
async def read_assets(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_assets(db, skip, limit)
@app.post("/assets", response_model=schemas.Asset)
async def create_asset(asset: schemas.AssetCreate, db=Depends(get_db)): return await crud.create_asset(db, asset)
@app.put("/assets/{asset_id}", response_model=schemas.Asset)
async def update_asset(asset_id: str, asset_update: schemas.AssetUpdate, db=Depends(get_db)): return await crud.update_asset(db, asset_id, asset_update)
@app.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, db=Depends(get_db)):
    await crud.delete_asset(db, asset_id)
    return {"message": "Asset deleted successfully"}

@app.get("/expense-claims", response_model=List[schemas.ExpenseClaim])
async def read_expense_claims(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_expense_claims(db, skip, limit)
@app.post("/expense-claims", response_model=schemas.ExpenseClaim)
async def create_expense_claim(claim: schemas.ExpenseClaimCreate, db=Depends(get_db)): return await crud.create_expense_claim(db, claim)

# Holiday & Performance Endpoints
@app.get("/holidays", response_model=List[schemas.Holiday])
async def read_holidays(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_holidays(db, skip, limit)
@app.post("/holidays", response_model=schemas.Holiday)
async def create_holiday(holiday: schemas.HolidayCreate, db=Depends(get_db)): return await crud.create_holiday(db, holiday)
@app.put("/holidays/{holiday_id}", response_model=schemas.Holiday)
async def update_holiday(holiday_id: str, holiday: schemas.HolidayUpdate, db=Depends(get_db)): return await crud.update_holiday(db, holiday_id, holiday)
@app.delete("/holidays/{holiday_id}")
async def delete_holiday(holiday_id: str, db=Depends(get_db)):
    await crud.delete_holiday(db, holiday_id)
    return {"message": "Holiday deleted"}

@app.get("/kpi-records", response_model=List[schemas.KPI])
async def read_kpi_records(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_kpi_records(db, skip, limit)
@app.post("/kpi-records", response_model=schemas.KPI)
async def create_kpi_record(kpi: schemas.KPICreate, db=Depends(get_db)): return await crud.create_kpi_record(db, kpi)

@app.get("/reviews", response_model=List[schemas.Review])
async def read_reviews(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_reviews(db, skip, limit)
@app.post("/reviews", response_model=schemas.Review)
async def create_review(review: schemas.ReviewCreate, db=Depends(get_db)): return await crud.create_review(db, review)
@app.put("/reviews/{review_id}", response_model=schemas.Review)
async def update_review(review_id: str, update: schemas.ReviewUpdate, db=Depends(get_db)): return await crud.update_review(db, review_id, update)
@app.delete("/reviews/{review_id}")
async def delete_review(review_id: str, db=Depends(get_db)): return await crud.delete_review(db, review_id)

@app.get("/remarks", response_model=List[schemas.Remark])
async def read_remarks(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_remarks(db, skip, limit)
@app.post("/remarks", response_model=schemas.Remark)
async def create_remark(remark: schemas.RemarkCreate, db=Depends(get_db)): return await crud.create_remark(db, remark)
@app.put("/remarks/{remark_id}", response_model=schemas.Remark)
async def update_remark(remark_id: str, update: schemas.RemarkUpdate, db=Depends(get_db)): return await crud.update_remark(db, remark_id, update)
@app.delete("/remarks/{remark_id}")
async def delete_remark(remark_id: str, db=Depends(get_db)): return await crud.delete_remark(db, remark_id)

# Penalty Type Endpoints
@app.get("/penalty-types", response_model=List[schemas.PenaltyType])
async def read_penalty_types(skip: int = 0, limit: int = 100, db=Depends(get_db)):
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
async def read_events(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_events(db, skip, limit)
@app.post("/events", response_model=schemas.Event)
async def create_event(event: schemas.EventCreate, db=Depends(get_db)): return await crud.create_event(db, event)
@app.put("/events/{event_id}", response_model=schemas.Event)
async def update_event(event_id: str, event_update: schemas.EventUpdate, db=Depends(get_db)): return await crud.update_event(db, event_id, event_update)
@app.delete("/events/{event_id}")
async def delete_event(event_id: str, db=Depends(get_db)): return await crud.delete_event(db, event_id)

# Client Endpoints
@app.get("/clients", response_model=List[schemas.Client])
async def read_clients(skip: int = 0, limit: int = 100, db=Depends(get_db)):
    return await crud.get_clients(db, skip=skip, limit=limit)

@app.post("/clients", response_model=schemas.Client)
async def create_client(client: schemas.ClientCreate, db=Depends(get_db)):
    return await crud.create_client(db, client=client)

@app.put("/clients/{client_id}", response_model=schemas.Client)
async def update_client(client_id: str, client_update: schemas.ClientUpdate, db=Depends(get_db)):
    return await crud.update_client(db, client_id, client_update)

@app.delete("/clients/{client_id}")
async def delete_client(client_id: str, db=Depends(get_db)):
    success = await crud.delete_client(db, client_id)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}

# Project Endpoints
@app.get("/projects", response_model=List[schemas.Project])
async def read_projects(userId: Optional[str] = None, role: Optional[str] = None, skip: int = 0, limit: int = 100, db=Depends(get_db)):
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
@app.get("/wm-tasks", response_model=List[schemas.WMTask])
async def read_wm_tasks(skip: int = 0, limit: int = 100, db=Depends(get_db)):
    return await crud.get_wm_tasks(db, skip=skip, limit=limit)

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
async def get_marketing_monthly_reports(client_id: str = None, db=Depends(get_db)):
    return await crud.get_marketing_monthly_reports(db, client_id)

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
    return await crud.create_message(db, message)

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
    return {"message": "Messages marked as seen"}

@app.get("/chat/unread-counts/{user_id}")
async def get_unread_counts(user_id: str, db=Depends(get_db)):
    # Aggregated counts for both personal and group chats
    unread_counts = {}
    
    # 1. Personal Chats: messages where receiverId == user_id and seenBy does not contain user_id
    cursor_personal = db.messages.aggregate([
        {"$match": {"receiverId": user_id, "senderId": {"$ne": user_id}, "seenBy": {"$ne": user_id}}},
        {"$group": {"_id": "$senderId", "count": {"$sum": 1}}}
    ])
    personal_results = await cursor_personal.to_list(length=1000)
    for r in personal_results:
        unread_counts[r["_id"]] = r["count"]
        
    # 2. Group Chats: messages where groupId is present and seenBy does not contain user_id
    # We need to only count groups the user is actually in
    user_groups = await crud.get_chat_groups(db, user_id)
    group_ids = [g["id"] for g in user_groups]
    # Add general channels
    group_ids.extend(["gen-announcements", "gen-general", "gen-tech", "gen-hr"])
    
    cursor_groups = db.messages.aggregate([
        {"$match": {"groupId": {"$in": group_ids}, "senderId": {"$ne": user_id}, "seenBy": {"$ne": user_id}}},
        {"$group": {"_id": "$groupId", "count": {"$sum": 1}}}
    ])
    group_results = await cursor_groups.to_list(length=1000)
    for r in group_results:
        unread_counts[r["_id"]] = r["count"]
        
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

@app.get("/chat/typing/{chat_id}")
async def get_typing_status(chat_id: str, user_id: str, db=Depends(get_db)):
    typing_users = await crud.get_typing_users(db, chat_id, user_id)
    return {"typingUsers": typing_users}

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

# Sales Lead Endpoints
@app.get("/leads", response_model=List[schemas.Lead])
async def read_leads(skip: int = 0, limit: int = 100, db=Depends(get_db)):
    return await crud.get_leads(db, skip=skip, limit=limit)

@app.post("/leads", response_model=schemas.Lead)
async def create_lead(lead: schemas.LeadCreate, db=Depends(get_db)):
    return await crud.create_lead(db, lead)

@app.put("/leads/{lead_id}", response_model=schemas.Lead)
async def update_lead(lead_id: str, lead_update: schemas.LeadUpdate, db=Depends(get_db)):
    return await crud.update_lead(db, lead_id, lead_update)

@app.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, db=Depends(get_db)):
    success = await crud.delete_lead(db, lead_id)
    if not success:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted successfully"}

@app.post("/leads/{lead_id}/follow-ups", response_model=schemas.Lead)
async def add_lead_follow_up(lead_id: str, follow_up: schemas.FollowUp, performedBy: Optional[str] = None, userName: Optional[str] = None, db=Depends(get_db)):
    return await crud.add_lead_follow_up(db, lead_id, follow_up, performedBy=performedBy, userName=userName)

if __name__ == "__main__":
    port = int(os.environ.get("BACKEND_PORT", 8000))
    # Using 127.0.0.1 explicitly can sometimes resolve connection issues on local machines
    print(f"Starting HRMS Backend on http://127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port)
