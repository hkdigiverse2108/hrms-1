import os

# Load environment variables manually from root .env if it exists
def load_env():
    # Go up one level from 'backend' to reach the root where .env is located
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    print(f"DEBUG: Looking for .env at: {env_path}")
    if os.path.exists(env_path):
        print(f"DEBUG: .env found! Loading...")
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key] = value

load_env()

from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List
import crud, schemas, database
import shutil
from bson import ObjectId
import uuid
import uvicorn
 
app = FastAPI(title="HRMS API")
 
# Resolve directory paths correctly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
 
# Ensure uploads directory exists
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
 
# Mount uploads directory to serve static files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
 
# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3535",
        "http://127.0.0.1:3535",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3535",
        "http://0.0.0.0:3000",

    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type.")
 
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)
 
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
 
    photo_url = f"http://localhost:8000/uploads/{filename}"
    return {"filename": filename, "url": photo_url}
 
@app.post("/upload-profile-photo/{employee_id}")
async def upload_profile_photo(employee_id: str, file: UploadFile = File(...), db=Depends(database.get_db)):
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type.")
 
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{employee_id}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)
 
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
 
    photo_url = f"http://localhost:8000/uploads/{filename}"
    employee_update = schemas.EmployeeUpdate(profilePhoto=photo_url)
    updated_employee = await crud.update_employee(db, employee_id=employee_id, employee_update=employee_update)
    
    if not updated_employee:
        raise HTTPException(status_code=404, detail="Employee not found")
 
    return updated_employee
 
@app.get("/")
def read_root():
    return {"message": "Welcome to HRMS API"}
 
@app.get("/employees", response_model=List[schemas.Employee])
async def read_employees(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_employees(db, skip=skip, limit=limit)
 
@app.get("/employees/{employee_id}", response_model=schemas.Employee)
async def read_employee(employee_id: str, db=Depends(database.get_db)):
    employee = await crud.get_employee(db, employee_id=employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee
 
@app.get("/attendance", response_model=List[schemas.Attendance])
async def read_attendance(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_attendance(db, skip=skip, limit=limit)
 
@app.get("/leave-requests", response_model=List[schemas.LeaveRequest])
async def read_leave_requests(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_leave_requests(db, skip=skip, limit=limit)
 
@app.get("/announcements", response_model=List[schemas.Announcement])
async def read_announcements(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_announcements(db, skip=skip, limit=limit)
 
@app.get("/dashboard-stats", response_model=schemas.DashboardStats)
async def read_dashboard_stats(db=Depends(database.get_db)):
    stats = await crud.get_dashboard_stats(db)
    if stats is None:
        raise HTTPException(status_code=404, detail="Stats not found")
    return stats
 
@app.get("/payroll", response_model=List[schemas.Payroll])
async def read_payroll(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_payroll(db, skip=skip, limit=limit)
 
@app.get("/departments", response_model=List[schemas.Department])
async def read_departments(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_departments(db, skip=skip, limit=limit)
 
@app.get("/designations", response_model=List[schemas.Designation])
async def read_designations(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_designations(db, skip=skip, limit=limit)
 
@app.get("/companies", response_model=List[schemas.Company])
async def read_companies(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_companies(db, skip=skip, limit=limit)
 
@app.get("/roles", response_model=List[schemas.Role])
async def read_roles(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_roles(db, skip=skip, limit=limit)
 
@app.get("/relations", response_model=List[schemas.Relation])
async def read_relations(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_relations(db, skip=skip, limit=limit)
 
@app.get("/positions", response_model=List[schemas.Position])
async def read_positions(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_positions(db, skip=skip, limit=limit)
 
@app.get("/job-openings", response_model=List[schemas.JobOpening])
async def read_job_openings(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_job_openings(db, skip=skip, limit=limit)
 
@app.get("/applications", response_model=List[schemas.Application])
async def read_applications(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_applications(db, skip=skip, limit=limit)
 
@app.get("/interns", response_model=List[schemas.Intern])
async def read_interns(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_interns(db, skip=skip, limit=limit)
 
@app.get("/assets", response_model=List[schemas.Asset])
async def read_assets(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_assets(db, skip=skip, limit=limit)
 
@app.get("/expense-claims", response_model=List[schemas.ExpenseClaim])
async def read_expense_claims(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_expense_claims(db, skip=skip, limit=limit)
 
@app.get("/holidays", response_model=List[schemas.Holiday])
async def read_holidays(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_holidays(db, skip=skip, limit=limit)
 
@app.get("/events", response_model=List[schemas.Event])
async def read_events(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_events(db, skip=skip, limit=limit)
 
@app.post("/events", response_model=schemas.Event)
async def create_event(event: schemas.EventCreate, db=Depends(database.get_db)):
    return await crud.create_event(db, event=event)
 
@app.put("/events/{event_id}", response_model=schemas.Event)
async def update_event(event_id: str, event_update: schemas.EventUpdate, db=Depends(database.get_db)):
    updated_event = await crud.update_event(db, event_id=event_id, update=event_update)
    if updated_event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return updated_event
 
@app.delete("/events/{event_id}")
async def delete_event(event_id: str, db=Depends(database.get_db)):
    success = await crud.delete_event(db, event_id=event_id)
    if not success:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}
 
@app.get("/kpi-records", response_model=List[schemas.KPI])
async def read_kpi_records(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_kpi_records(db, skip=skip, limit=limit)
 
@app.post("/employees", response_model=schemas.Employee)
async def create_employee(employee: schemas.EmployeeCreate, db=Depends(database.get_db)):
    return await crud.create_employee(db, employee=employee)
 
@app.put("/employees/{employee_id}", response_model=schemas.Employee)
async def update_employee(employee_id: str, employee_update: schemas.EmployeeUpdate, db=Depends(database.get_db)):
    updated_employee = await crud.update_employee(db, employee_id=employee_id, employee_update=employee_update)
    if updated_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return updated_employee
 
@app.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, db=Depends(database.get_db)):
    success = await crud.delete_employee(db, employee_id=employee_id)
    if not success:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted successfully"}
 
@app.post("/login", response_model=schemas.LoginResponse)
async def login(login_data: schemas.LoginRequest, db=Depends(database.get_db)):
    user = await crud.authenticate_user(db, login_data)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"message": "Login successful", "user": user}
 
@app.get("/attendance/status/{employee_id}")
async def get_attendance_status(employee_id: str, db=Depends(database.get_db)):
    status = await crud.get_attendance_status(db, employee_id)
    return {"isPunchedIn": status is not None, "record": status}
 
@app.post("/attendance/punch-in")
async def punch_in(request: schemas.PunchRequest, db=Depends(database.get_db)):
    existing = await crud.get_attendance_status(db, request.employeeId)
    if existing:
        raise HTTPException(status_code=400, detail="Already punched in")
    record = await crud.punch_in(db, request.employeeId)
    if not record:
        raise HTTPException(status_code=404, detail="Employee not found")
    return record
 
@app.post("/attendance/punch-out")
async def punch_out(request: schemas.PunchRequest, db=Depends(database.get_db)):
    record = await crud.punch_out(db, request.employeeId)
    if not record:
        raise HTTPException(status_code=400, detail="Not punched in")
    return record
 
@app.post("/attendance/break-in")
async def break_in(request: schemas.PunchRequest, db=Depends(database.get_db)):
    record = await crud.break_in(db, request.employeeId)
    if not record:
        raise HTTPException(status_code=400, detail="Cannot take break")
    return record
 
@app.post("/attendance/break-out")
async def break_out(request: schemas.PunchRequest, db=Depends(database.get_db)):
    record = await crud.break_out(db, request.employeeId)
    if not record:
        raise HTTPException(status_code=400, detail="Not on break")
    return record

@app.post("/leaves", response_model=schemas.LeaveRequest)
async def create_leave_request(leave: schemas.LeaveRequestCreate, db=Depends(database.get_db)):
    return await crud.create_leave_request(db, leave=leave)

@app.get("/leaves", response_model=List[schemas.LeaveRequest])
async def read_all_leaves(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    print("DEBUG: GET /leaves hit!")
    leaves = await crud.get_all_leave_requests(db, skip=skip, limit=limit)
    print(f"DEBUG: Found {len(leaves)} leaves")
    return leaves


@app.get("/leaves/employee/{employee_id}", response_model=List[schemas.LeaveRequest])
async def read_user_leaves(employee_id: str, skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_user_leave_requests(db, employee_id=employee_id, skip=skip, limit=limit)

@app.put("/leaves/{leave_id}", response_model=schemas.LeaveRequest)
async def update_leave_status(leave_id: str, status_update: schemas.LeaveRequestUpdate, db=Depends(database.get_db)):
    # Convert Pydantic model to dict, excluding None values
    update_data = status_update.dict(exclude_unset=True)
    updated_leave = await crud.update_leave_request(db, leave_id=leave_id, update_data=update_data)

    if not updated_leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return updated_leave

@app.delete("/leaves/{leave_id}")
async def delete_leave(leave_id: str, db=Depends(database.get_db)):
    success = await crud.delete_leave_request(db, leave_id=leave_id)
    if not success:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return {"message": "Leave request deleted successfully"}

    if not updated_leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return updated_leave

# Notification Endpoints
@app.get("/notifications/{employee_id}", response_model=List[schemas.Notification])
async def read_notifications(employee_id: str, skip: int = 0, limit: int = 50, db=Depends(database.get_db)):
    return await crud.get_notifications_by_user(db, employee_id=employee_id, skip=skip, limit=limit)

@app.put("/notifications/{notification_id}/read", response_model=schemas.Notification)
async def mark_read(notification_id: str, db=Depends(database.get_db)):
    updated = await crud.mark_notification_as_read(db, notification_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Notification not found")
    return updated

 
# Client Endpoints
@app.get("/clients", response_model=List[schemas.Client])
async def read_clients(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    return await crud.get_clients(db, skip=skip, limit=limit)

@app.post("/clients", response_model=schemas.Client)
async def create_client(client: schemas.ClientCreate, db=Depends(database.get_db)):
    return await crud.create_client(db, client=client)

@app.put("/clients/{client_id}", response_model=schemas.Client)
async def update_client(client_id: str, client_update: schemas.ClientUpdate, db=Depends(database.get_db)):
    updated = await crud.update_client(db, client_id, client_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Client not found")
    return updated

@app.delete("/clients/{client_id}")
async def delete_client(client_id: str, db=Depends(database.get_db)):
    success = await crud.delete_client(db, client_id)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}

if __name__ == "__main__":
    port = int(os.environ.get("BACKEND_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
