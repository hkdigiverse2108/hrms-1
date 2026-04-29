from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import crud, schemas, database
import uvicorn
import os
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

@app.get("/")
async def root():
    return {"message": "HRMS API is running", "status": "ok"}

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

@app.get("/applications", response_model=List[schemas.Application])
async def read_applications(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_applications(db, skip, limit)
@app.post("/applications", response_model=schemas.Application)
async def create_application(app: schemas.ApplicationCreate, db=Depends(get_db)): return await crud.create_application(db, app)

@app.get("/interns", response_model=List[schemas.Intern])
async def read_interns(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_interns(db, skip, limit)
@app.post("/interns", response_model=schemas.Intern)
async def create_intern(intern: schemas.InternCreate, db=Depends(get_db)): return await crud.create_intern(db, intern)

# Asset & Expense Endpoints
@app.get("/assets", response_model=List[schemas.Asset])
async def read_assets(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_assets(db, skip, limit)
@app.post("/assets", response_model=schemas.Asset)
async def create_asset(asset: schemas.AssetCreate, db=Depends(get_db)): return await crud.create_asset(db, asset)

@app.get("/expense-claims", response_model=List[schemas.ExpenseClaim])
async def read_expense_claims(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_expense_claims(db, skip, limit)
@app.post("/expense-claims", response_model=schemas.ExpenseClaim)
async def create_expense_claim(claim: schemas.ExpenseClaimCreate, db=Depends(get_db)): return await crud.create_expense_claim(db, claim)

# Holiday & Performance Endpoints
@app.get("/holidays", response_model=List[schemas.Holiday])
async def read_holidays(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_holidays(db, skip, limit)
@app.post("/holidays", response_model=schemas.Holiday)
async def create_holiday(holiday: schemas.HolidayCreate, db=Depends(get_db)): return await crud.create_holiday(db, holiday)

@app.get("/kpi-records", response_model=List[schemas.KPI])
async def read_kpi_records(skip: int = 0, limit: int = 100, db=Depends(get_db)): return await crud.get_kpi_records(db, skip, limit)
@app.post("/kpi-records", response_model=schemas.KPI)
async def create_kpi_record(kpi: schemas.KPICreate, db=Depends(get_db)): return await crud.create_kpi_record(db, kpi)

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
