from pydantic import BaseModel
from typing import List, Optional

class EmployeeBase(BaseModel):
    employeeId: Optional[str] = None
    name: Optional[str] = None # Full name for display
    firstName: Optional[str] = None
    middleName: Optional[str] = None
    lastName: Optional[str] = None
    email: str
    phone: str
    password: Optional[str] = None
    dob: Optional[str] = None
    department: str
    designation: str
    joinDate: str
    status: str
    salary: float
    company: Optional[str] = None
    role: Optional[str] = None
    upiId: Optional[str] = None
    accountNumber: Optional[str] = None
    ifscCode: Optional[str] = None
    bankName: Optional[str] = None
    accountHolderName: Optional[str] = None
    parentName: Optional[str] = None
    parentNumber: Optional[str] = None
    relation: Optional[str] = None
    aadharCard: Optional[str] = None
    panCard: Optional[str] = None
    position: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    profilePhoto: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    firstName: Optional[str] = None
    middleName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    dob: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    joinDate: Optional[str] = None
    status: Optional[str] = None
    salary: Optional[float] = None
    company: Optional[str] = None
    role: Optional[str] = None
    upiId: Optional[str] = None
    accountNumber: Optional[str] = None
    ifscCode: Optional[str] = None
    bankName: Optional[str] = None
    accountHolderName: Optional[str] = None
    parentName: Optional[str] = None
    parentNumber: Optional[str] = None
    relation: Optional[str] = None
    aadharCard: Optional[str] = None
    panCard: Optional[str] = None
    position: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    profilePhoto: Optional[str] = None

class Employee(EmployeeBase):
    id: str

class AttendanceBase(BaseModel):
    employeeId: str
    employeeName: str
    date: str
    checkIn: str
    checkOut: str
    status: str
    workHours: str

class Attendance(AttendanceBase):
    id: str

class LeaveRequestBase(BaseModel):
    employeeId: str
    employeeName: str
    leaveType: str
    startDate: str
    endDate: str
    days: int
    reason: str
    status: str
    appliedOn: str

class LeaveRequest(LeaveRequestBase):
    id: str

class DashboardStats(BaseModel):
    totalEmployees: int
    presentToday: int
    onLeave: int
    newJoinees: int
    pendingLeaves: int
    openPositions: int
    upcomingBirthdays: int
    upcomingAnniversaries: int
    id: str

class AnnouncementBase(BaseModel):
    title: str
    content: str
    author: str
    date: str
    priority: str

class Announcement(AnnouncementBase):
    id: str

class PayrollBase(BaseModel):
    employeeId: str
    employeeName: str
    month: str
    basicSalary: float
    allowances: float
    deductions: float
    netSalary: float
    status: str

class Payroll(PayrollBase):
    id: str

class DepartmentBase(BaseModel):
    name: str
    head: Optional[str] = None
    employeeCount: Optional[int] = 0

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    head: Optional[str] = None

class Department(DepartmentBase):
    id: str

class DesignationBase(BaseModel):
    title: str
    department: str
    level: str

class DesignationCreate(DesignationBase):
    pass

class DesignationUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    level: Optional[str] = None

class Designation(DesignationBase):
    id: str

class CompanyBase(BaseModel):
    name: str

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None

class Company(CompanyBase):
    id: str

class RoleBase(BaseModel):
    name: str

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    name: Optional[str] = None

class Role(RoleBase):
    id: str

class RelationBase(BaseModel):
    name: str

class RelationCreate(RelationBase):
    pass

class RelationUpdate(BaseModel):
    name: Optional[str] = None

class Relation(RelationBase):
    id: str

class PositionBase(BaseModel):
    name: str

class PositionCreate(PositionBase):
    pass

class PositionUpdate(BaseModel):
    name: Optional[str] = None

class Position(PositionBase):
    id: str

class JobOpeningBase(BaseModel):
    title: str
    department: str
    location: str
    type: str
    applications: int
    status: str
    postedDate: str

class JobOpeningCreate(JobOpeningBase):
    pass

class JobOpeningUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None

class JobOpening(JobOpeningBase):
    id: str

class ApplicationBase(BaseModel):
    candidateName: str
    email: str
    phone: str
    position: str
    status: str
    appliedDate: str
    resume: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None

class Application(ApplicationBase):
    id: str

class InternBase(BaseModel):
    name: str
    email: str
    department: str
    mentor: str
    startDate: str
    endDate: str
    status: str

class InternCreate(InternBase):
    pass

class InternUpdate(BaseModel):
    department: Optional[str] = None
    mentor: Optional[str] = None
    endDate: Optional[str] = None
    status: Optional[str] = None

class Intern(InternBase):
    id: str

class AssetBase(BaseModel):
    name: str
    type: str
    serialNumber: str
    assignedTo: Optional[str] = None
    status: str
    purchaseDate: str
    value: float

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    assignedTo: Optional[str] = None
    status: Optional[str] = None
    value: Optional[float] = None

class Asset(AssetBase):
    id: str

class ExpenseClaimBase(BaseModel):
    employeeId: str
    employeeName: str
    category: str
    amount: float
    description: str
    status: str
    submittedDate: str
    receiptUrl: Optional[str] = None

class ExpenseClaimCreate(ExpenseClaimBase):
    pass

class ExpenseClaimUpdate(BaseModel):
    status: Optional[str] = None

class ExpenseClaim(ExpenseClaimBase):
    id: str

class HolidayBase(BaseModel):
    name: str
    date: str
    type: str

class HolidayCreate(HolidayBase):
    pass

class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None
    type: Optional[str] = None

class Holiday(HolidayBase):
    id: str

class KPIBase(BaseModel):
    employeeId: str
    employeeName: str
    period: str
    score: int
    goals: int
    achieved: int
    rating: str

class KPICreate(KPIBase):
    pass

class KPIUpdate(BaseModel):
    score: Optional[int] = None
    goals: Optional[int] = None
    achieved: Optional[int] = None
    rating: Optional[str] = None

class KPI(KPIBase):
    id: str

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    message: str
    user: Optional[Employee] = None
