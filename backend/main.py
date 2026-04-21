from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import crud, schemas, database

app = FastAPI(title="HRMS API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js default and fallback ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to HRMS API"}

@app.get("/employees", response_model=List[schemas.Employee])
async def read_employees(skip: int = 0, limit: int = 100, db=Depends(database.get_db)):
    employees = await crud.get_employees(db, skip=skip, limit=limit)
    return employees

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
