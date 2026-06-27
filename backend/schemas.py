from pydantic import BaseModel as PydanticBaseModel, model_serializer, BeforeValidator, PlainSerializer, SerializationInfo
from typing import List, Optional, Any, Dict, Annotated, Union
from datetime import datetime, date
import pytz

IST = pytz.timezone('Asia/Kolkata')

def parse_robust_date(v: Any) -> Optional[date]:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if not isinstance(v, str):
        raise ValueError("Must be a string or date")
    v_clean = v.strip()
    if not v_clean:
        return None
    
    # Try parsing full datetime/date formats first
    for fmt in (
        "%Y-%m-%d %I:%M %p",
        "%Y-%m-%d %I:%M%p",
        "%d-%m-%Y %I:%M %p",
        "%d-%m-%Y %I:%M%p",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%b %d, %Y",
        "%B %d, %Y",
        "%Y/%m/%d",
        "%d/%m/%Y"
    ):
        try:
            return datetime.strptime(v_clean, fmt).date()
        except ValueError:
            continue
            
    try:
        return datetime.fromisoformat(v_clean.replace('Z', '+00:00')).date()
    except ValueError:
        pass
        
    # Fallback: if there's a space or 'T', try parsing just the first part
    for sep in (' ', 'T'):
        if sep in v_clean:
            first_part = v_clean.split(sep)[0]
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y"):
                try:
                    return datetime.strptime(first_part, fmt).date()
                except ValueError:
                    continue
                    
    raise ValueError(f"Cannot parse date: {v}")

def serialize_robust_date_standard(v: Optional[date], info: SerializationInfo) -> Any:
    if v is None:
        return None
    if info.mode == 'json':
        return v.strftime("%Y-%m-%d")
    return datetime.combine(v, datetime.min.time())

def serialize_robust_date_dmy(v: Optional[date], info: SerializationInfo) -> Any:
    if v is None:
        return None
    if info.mode == 'json':
        return v.strftime("%d-%m-%Y")
    return datetime.combine(v, datetime.min.time())

def parse_robust_datetime(v: Any) -> Optional[datetime]:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, date):
        return datetime.combine(v, datetime.min.time()).replace(tzinfo=IST)
    if not isinstance(v, str):
        raise ValueError("Must be a string or datetime")
    v_clean = v.strip()
    if not v_clean:
        return None
    for fmt in (
        "%Y-%m-%d %I:%M %p",
        "%Y-%m-%d %I:%M%p",
        "%d-%m-%Y %I:%M %p",
        "%d-%m-%Y %I:%M%p",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%Y/%m/%d",
        "%d/%m/%Y"
    ):
        try:
            dt = datetime.strptime(v_clean, fmt)
            if dt.tzinfo is None:
                dt = IST.localize(dt)
            return dt
        except ValueError:
            continue
    try:
        dt = datetime.fromisoformat(v_clean.replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = IST.localize(dt)
        return dt
    except ValueError:
        pass
    raise ValueError(f"Cannot parse datetime: {v}")

def serialize_robust_datetime_standard(v: Optional[datetime], info: SerializationInfo) -> Any:
    if v is None:
        return None
    if info.mode == 'json':
        return v.isoformat()
    return v

def serialize_robust_datetime_dmy(v: Optional[datetime], info: SerializationInfo) -> Any:
    if v is None:
        return None
    if info.mode == 'json':
        return v.strftime("%d-%m-%Y %H:%M")
    return v

RobustDate = Annotated[Optional[date], BeforeValidator(parse_robust_date), PlainSerializer(serialize_robust_date_standard, when_used='always')]
RobustDateDMY = Annotated[Optional[date], BeforeValidator(parse_robust_date), PlainSerializer(serialize_robust_date_dmy, when_used='always')]
RobustDatetime = Annotated[Optional[datetime], BeforeValidator(parse_robust_datetime), PlainSerializer(serialize_robust_datetime_standard, when_used='always')]
RobustDatetimeDMY = Annotated[Optional[datetime], BeforeValidator(parse_robust_datetime), PlainSerializer(serialize_robust_datetime_dmy, when_used='always')]

def parse_robust_assigned_to(v: Any) -> List[str]:
    if v is None:
        return []
    if isinstance(v, list):
        return [str(item) for item in v if item]
    if isinstance(v, str):
        v_clean = v.strip()
        if not v_clean:
            return []
        return [v_clean]
    return []

RobustAssignedTo = Annotated[List[str], BeforeValidator(parse_robust_assigned_to)]

class BaseModel(PydanticBaseModel):
    created_at: Optional[RobustDatetime] = None
    updated_at: Optional[RobustDatetime] = None

    @model_serializer(mode='wrap')
    def serialize_model(self, handler) -> Dict[str, Any]:
        data = handler(self)
        c_present = 'created_at' in data
        u_present = 'updated_at' in data
        c_val = data.pop('created_at', None)
        u_val = data.pop('updated_at', None)
        if c_present:
            data['created_at'] = c_val
        if u_present:
            data['updated_at'] = u_val
        return data

class EmployeeBase(BaseModel):
    employeeId: Optional[str] = None
    name: Optional[str] = None # Full name for display
    firstName: Optional[str] = None
    middleName: Optional[str] = None
    lastName: Optional[str] = None
    email: str
    phone: Optional[str] = None
    password: Optional[str] = None
    dob: Optional[RobustDate] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    joinDate: Optional[RobustDate] = None
    status: Optional[str] = "active"
    gender: Optional[str] = "Male"
    position: Optional[str] = "Intern"
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
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    profilePhoto: Optional[str] = None
    customStatus: Optional[str] = None
    customEmoji: Optional[str] = None
    requiredDocuments: Optional[List[str]] = []
    securityDepositExempt: Optional[bool] = False
    securityDepositDirectPayments: Optional[List[Dict[str, Any]]] = []
    googleCalendarTokens: Optional[Dict[str, Any]] = None

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    firstName: Optional[str] = None
    middleName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    dob: Optional[RobustDate] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    position: Optional[str] = None
    joinDate: Optional[RobustDate] = None
    status: Optional[str] = None
    gender: Optional[str] = None
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
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    profilePhoto: Optional[str] = None
    customStatus: Optional[str] = None
    customEmoji: Optional[str] = None
    requiredDocuments: Optional[List[str]] = None
    securityDepositExempt: Optional[bool] = None
    securityDepositDirectPayments: Optional[List[Dict[str, Any]]] = None

class Employee(EmployeeBase):
    id: str

    @model_serializer(mode='wrap')
    def serialize_model(self, handler) -> Dict[str, Any]:
        data = handler(self)
        # Do not strip password from API responses so admin dashboard can toggle-display it
        # data.pop('password', None)
        # Preserve parent's timestamp reordering
        c_present = 'created_at' in data
        u_present = 'updated_at' in data
        c_val = data.pop('created_at', None)
        u_val = data.pop('updated_at', None)
        if c_present:
            data['created_at'] = c_val
        if u_present:
            data['updated_at'] = u_val
        return data

class Break(BaseModel):
    startTime: str
    endTime: Optional[str] = None
    duration: Optional[str] = None

class PunchLog(BaseModel):
    punchIn: str
    punchOut: Optional[str] = None
 
class AttendanceBase(BaseModel):
    employeeId: str
    employeeName: str
    date: RobustDate
    checkIn: str
    checkOut: Optional[str] = None
    status: str
    workHours: Optional[str] = None
    accumulatedWorkSeconds: Optional[float] = None
    breaks: List[Break] = []
    punches: List[PunchLog] = []
    remarks: Optional[str] = None
    isLate: Optional[bool] = False
 
class Attendance(AttendanceBase):
    id: str

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    employeeId: Optional[str] = None
    employeeName: Optional[str] = None
    date: Optional[RobustDate] = None
    checkIn: Optional[str] = None
    checkOut: Optional[str] = None
    status: Optional[str] = None
    workHours: Optional[str] = None
    accumulatedWorkSeconds: Optional[float] = None
    punches: Optional[List[PunchLog]] = None
    remarks: Optional[str] = None
    isLate: Optional[bool] = None
 
class PunchRequest(BaseModel):
    employeeId: str

class PunchInRequest(BaseModel):
    punch_in_time: Optional[str] = None

class PunchOutRequest(BaseModel):
    punch_out_time: Optional[str] = None

class LeaveRequestBase(BaseModel):
    employee_id: str
    employee_name: str
    type: str  # annual, sick, unpaid, etc.
    start_date: RobustDateDMY
    end_date: RobustDateDMY
    duration: str
    reason: str
    status: str = "Pending"
    requested_on: Optional[RobustDatetimeDMY] = None
    day_type: Optional[str] = "Full Day"
    half_day: bool = False
    approved_by: Optional[str] = None
    approved_by_role: Optional[str] = None
    approved_by_id: Optional[str] = None
    approved_by_photo: Optional[str] = None
    proof_image: Optional[str] = None
    reject_reason: Optional[str] = None
    approve_reason: Optional[str] = None

class LeaveRequestCreate(LeaveRequestBase):
    pass

class LeaveRequestUpdate(BaseModel):
    type: Optional[str] = None
    start_date: Optional[RobustDateDMY] = None
    end_date: Optional[RobustDateDMY] = None
    duration: Optional[str] = None
    reason: Optional[str] = None
    half_day: Optional[bool] = None
    day_type: Optional[str] = None
    status: Optional[str] = None  # Pending, Approved, Rejected, Cancelled
    approved_by: Optional[str] = None
    approved_by_role: Optional[str] = None
    approved_by_id: Optional[str] = None
    approved_by_photo: Optional[str] = None
    proof_image: Optional[str] = None
    reject_reason: Optional[str] = None
    approve_reason: Optional[str] = None

class LeaveRequest(LeaveRequestBase):
    id: str

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    totalEmployees: int
    presentToday: int
    onLeave: int
    newJoinees: int
    pendingLeaves: int
    upcomingBirthdays: int
    upcomingAnniversaries: int
    lateToday: int
    id: str

class AnalyticsOverview(BaseModel):
    departmentDistribution: List[Dict[str, Any]]
    attendanceTrend: List[Dict[str, Any]]
    leaveDistribution: List[Dict[str, Any]]
    hiringTrend: List[Dict[str, Any]]
    performanceDistribution: List[Dict[str, Any]]
    summaryStats: Dict[str, Any]

class AnnouncementBase(BaseModel):
    title: str
    content: str
    author: str
    date: RobustDate
    priority: str

class Announcement(AnnouncementBase):
    id: str

class PayrollBase(BaseModel):
    employeeId: str
    employeeName: str
    month: str
    year: Optional[int] = None
    totalWorkingDays: int = 0
    workedDays: float = 0
    leaveDays: float = 0
    monthlyLeaveDays: float = 0
    lopDays: float = 0
    basicSalary: float
    allowances: float
    bonus: float = 0
    deductions: float
    penalty: float = 0
    securityDeposit: Optional[float] = 0.0
    returnedDeposit: Optional[float] = 0.0
    netSalary: float
    status: str
    deductionRemarks: str = ""
    paymentMode: Optional[str] = "Cash"
    chequeNumber: Optional[str] = "-"
    incentiveDetails: Optional[str] = ""
    incentiveAmount: Optional[float] = 0.0
    incentiveBreakdown: Optional[List[dict]] = []

class Payroll(PayrollBase):
    id: str

class SalaryStructureBase(BaseModel):
    employeeId: str
    basic: float
    hra: float
    conveyance: float
    medical: float
    specialAllowance: float
    pf: float
    esi: float
    professionalTax: float
    tds: float
    monthlyGross: float

class SalaryStructureCreate(SalaryStructureBase):
    pass

class SalaryStructure(SalaryStructureBase):
    id: str

class BonusDeductionBase(BaseModel):
    employeeId: str
    month: str
    year: int
    type: str  # bonus, deduction
    amount: float
    reason: str
    status: str  # active, cancelled
    date: Optional[str] = None

class BonusDeductionCreate(BonusDeductionBase):
    pass

class BonusDeduction(BonusDeductionBase):
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

class DesignationCreate(DesignationBase):
    pass

class DesignationUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None

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


class JobOpeningBase(BaseModel):
    title: str
    department: str
    location: str
    type: str
    applications: int
    status: str
    postedDate: RobustDate
    experience: Optional[str] = None
    salaryRange: Optional[str] = None
    description: Optional[str] = None

class JobOpeningCreate(JobOpeningBase):
    pass

class JobOpeningUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    applications: Optional[int] = None
    status: Optional[str] = None
    postedDate: Optional[RobustDate] = None
    experience: Optional[str] = None
    salaryRange: Optional[str] = None
    description: Optional[str] = None

class JobOpening(JobOpeningBase):
    id: str

class ApplicationBase(BaseModel):
    candidateName: str
    email: str
    phone: str
    status: str
    appliedDate: RobustDate
    resume: Optional[str] = None
    jobTitle: Optional[str] = None
    skills: Optional[str] = None
    source: Optional[str] = None
    reference: Optional[str] = None
    interviewDate: Optional[RobustDate] = None
    interviewTime: Optional[str] = None
    interviewerName: Optional[str] = None
    interviewLink: Optional[str] = None
    interviewNotes: Optional[str] = None
    interviewerId: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    jobTitle: Optional[str] = None
    skills: Optional[str] = None
    source: Optional[str] = None
    reference: Optional[str] = None
    resume: Optional[str] = None
    interviewDate: Optional[RobustDate] = None
    interviewTime: Optional[str] = None
    interviewerName: Optional[str] = None
    interviewLink: Optional[str] = None
    interviewNotes: Optional[str] = None
    interviewerId: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class Application(ApplicationBase):
    id: str

class InternBase(BaseModel):
    name: str
    email: str
    department: str
    mentor: str
    startDate: RobustDate
    endDate: RobustDate
    status: str

class InternCreate(InternBase):
    pass

class InternUpdate(BaseModel):
    department: Optional[str] = None
    mentor: Optional[str] = None
    endDate: Optional[RobustDate] = None
    status: Optional[str] = None

class Intern(InternBase):
    id: str

class AssetBase(BaseModel):
    assetId: str
    name: str
    category: str
    serialNumber: Optional[str] = None
    assignedTo: Optional[str] = None
    status: str # Allocated, Available, Maintenance
    condition: Optional[str] = "New"
    location: Optional[str] = None
    purchaseDate: Optional[RobustDate] = None
    value: Optional[float] = 0
    description: Optional[str] = None

class AssetCreate(AssetBase):
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class AssetUpdate(BaseModel):
    assetId: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    serialNumber: Optional[str] = None
    assignedTo: Optional[str] = None
    status: Optional[str] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    purchaseDate: Optional[RobustDate] = None
    value: Optional[float] = None
    description: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class Asset(AssetBase):
    id: str

class ExpenseClaimBase(BaseModel):
    employeeId: str
    employeeName: str
    category: str
    amount: float
    description: str
    status: str
    submittedDate: RobustDate
    receiptUrl: Optional[str] = None

class ExpenseClaimCreate(ExpenseClaimBase):
    pass

class ExpenseClaimUpdate(BaseModel):
    status: Optional[str] = None

class ExpenseClaim(ExpenseClaimBase):
    id: str

class HolidayBase(BaseModel):
    name: str
    date: RobustDate
    type: str
    company: Optional[str] = None

class HolidayCreate(HolidayBase):
    pass

class HolidayBulkCreate(BaseModel):
    holidays: List[HolidayCreate]

class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[RobustDate] = None
    type: Optional[str] = None
    company: Optional[str] = None

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

class ReviewBase(BaseModel):
    employeeId: str
    employeeName: str
    role: str
    avatar: Optional[str] = None
    department: str
    summary: str
    rating: int
    date: Optional[RobustDate] = None

class ReviewCreate(ReviewBase):
    pass

class ReviewUpdate(BaseModel):
    summary: Optional[str] = None
    rating: Optional[int] = None

class Review(ReviewBase):
    id: str

class RemarkBase(BaseModel):
    employeeId: str
    employeeName: str
    role: str
    avatar: Optional[str] = None
    type: str  # Appreciation, Warning, Performance, General
    details: str
    addedBy: str
    date: Optional[RobustDateDMY] = None
    isDeleted: Optional[bool] = False

class RemarkCreate(RemarkBase):
    pass

class RemarkUpdate(BaseModel):
    type: Optional[str] = None
    details: Optional[str] = None
    isDeleted: Optional[bool] = None

class Remark(RemarkBase):
    id: str

class PenaltyTypeBase(BaseModel):
    name: str
    amount: int

class PenaltyTypeCreate(PenaltyTypeBase):
    pass

class PenaltyTypeUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[int] = None

class PenaltyType(PenaltyTypeBase):
    id: str

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: str

class ChatContext(BaseModel):
    taskId: Optional[str] = None
    projectId: Optional[str] = None
    taskTitle: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    context: Optional[ChatContext] = None
    history: List[ChatMessage] = []

# Dynamic Feedback Forms
class FeedbackFormField(BaseModel):
    id: str
    type: str # text, textarea, rating, radio, checkbox
    label: str
    required: bool = False
    options: Optional[List[str]] = None

class FeedbackFormCreate(BaseModel):
    clientId: str
    title: str
    description: Optional[str] = None
    fields: List[FeedbackFormField] = []

class FeedbackForm(FeedbackFormCreate):
    id: str
    createdAt: str
    createdBy: Optional[str] = None

class FeedbackResponseCreate(BaseModel):
    formId: str
    clientId: str
    projectId: Optional[str] = None
    answers: Dict[str, Any]

class FeedbackResponse(FeedbackResponseCreate):
    id: str
    submittedAt: str

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    message: str
    user: Optional[Employee] = None
    token: Optional[str] = None

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    date: RobustDate
    time: Optional[str] = None
    type: str

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[RobustDate] = None
    time: Optional[str] = None
    type: Optional[str] = None

class Event(EventBase):
    id: str


# Notification Schemas
class NotificationBase(BaseModel):
    employee_id: str
    title: str
    message: str
    type: str  # leave, attendance, payroll, etc.
    reference_id: Optional[str] = None
    is_read: bool = False
    created_at: Optional[RobustDatetime] = None

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: str

    class Config:
        from_attributes = True

# Client Schemas
def parse_campaigns(v: Any) -> List[Dict[str, Any]]:
    if not v:
        return []
    res = []
    for item in v:
        if isinstance(item, str):
            res.append({"name": item, "isActive": True})
        elif isinstance(item, dict):
            res.append(item)
    return res

RobustCampaigns = Annotated[List[Dict[str, Any]], BeforeValidator(parse_campaigns)]

class ClientBase(BaseModel):
    name: str
    companyName: str
    email: Optional[str] = None
    phone: str
    address: Optional[str] = None
    state: Optional[str] = ""
    gstin: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = "active"
    whatsappGroup: Optional[str] = None
    services: Optional[str] = None
    festivalPost: Optional[str] = None
    post: Optional[int] = 0
    graphics: Optional[str] = None
    reel: Optional[int] = 0
    video: Optional[str] = None
    postRequired: Optional[str] = "No"
    reelRequired: Optional[str] = "No"
    graphicsRequired: Optional[str] = "No"
    salesFocused: Optional[str] = "No"
    dailyBudget: Optional[float] = 0
    remarks: Optional[str] = None
    assignedEmployeeId: Optional[str] = None
    assignedEmployeeName: Optional[str] = None
    dailyFollowup: Optional[str] = "No"
    followupType: Optional[str] = "Interval" # 'Interval', 'Weekly', 'Monthly'
    followupIntervalDays: Optional[int] = None
    followupDaysOfWeek: Optional[List[int]] = [] # 0=Monday, 6=Sunday
    followupDatesOfMonth: Optional[List[int]] = [] # 1-31
    lastFollowupDate: Optional[RobustDate] = None
    nextFollowupDate: Optional[RobustDate] = None
    interviewDate: Optional[RobustDate] = None
    interviewTime: Optional[str] = None
    interviewerName: Optional[str] = None
    interviewNotes: Optional[str] = None
    createdDate: Optional[RobustDate] = None
    meetings: Optional[List[dict]] = []
    greetingsMsgSent: Optional[bool] = False
    greetingsLogs: Optional[List[dict]] = []
    paymentFrequency: Optional[str] = "One-Time" # 'One-Time', 'Half-Monthly', 'Monthly', 'Quarterly', 'Yearly', 'Custom'
    paymentCustomDays: Optional[int] = None
    paymentAmount: Optional[float] = 0.0
    paymentDatesOfMonth: Optional[List[int]] = [] # 1-31
    lastPaymentDate: Optional[RobustDate] = None
    nextPaymentDueDate: Optional[RobustDate] = None
    paymentRemarks: Optional[str] = None
    workReviews: Optional[List[dict]] = []
    
    # Creative Team Assignments
    assignedScriptwriterId: Optional[str] = None
    assignedScriptwriterName: Optional[str] = None
    assignedReelEditorId: Optional[str] = None
    assignedReelEditorName: Optional[str] = None
    assignedPostDesignerId: Optional[str] = None
    assignedPostDesignerName: Optional[str] = None
    assignedShooterId: Optional[str] = None
    assignedShooterName: Optional[str] = None
    assignedApproverId: Optional[str] = None
    assignedApproverName: Optional[str] = None
    assignedPosterId: Optional[str] = None
    assignedPosterName: Optional[str] = None
    campaigns: Optional[RobustCampaigns] = []

class ClientCreate(ClientBase):
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    assignedEmployeeId: Optional[str] = None
    assignedEmployeeName: Optional[str] = None
    companyName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    gstin: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    whatsappGroup: Optional[str] = None
    services: Optional[str] = None
    festivalPost: Optional[str] = None
    post: Optional[int] = None
    graphics: Optional[str] = None
    reel: Optional[int] = None
    video: Optional[str] = None
    postRequired: Optional[str] = None
    reelRequired: Optional[str] = None
    graphicsRequired: Optional[str] = None
    salesFocused: Optional[str] = None
    dailyBudget: Optional[float] = None
    remarks: Optional[str] = None
    assignedEmployeeId: Optional[str] = None
    assignedEmployeeName: Optional[str] = None
    meetings: Optional[List[dict]] = []
    dailyFollowup: Optional[str] = None
    interviewDate: Optional[RobustDate] = None
    interviewTime: Optional[str] = None
    interviewerName: Optional[str] = None
    interviewLink: Optional[str] = None
    interviewNotes: Optional[str] = None
    followupType: Optional[str] = None
    followupIntervalDays: Optional[int] = None
    followupDaysOfWeek: Optional[List[int]] = None
    followupDatesOfMonth: Optional[List[int]] = None
    lastFollowupDate: Optional[str] = None
    nextFollowupDate: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None
    greetingsMsgSent: Optional[bool] = None
    greetingsLogs: Optional[List[dict]] = None
    paymentFrequency: Optional[str] = None
    paymentCustomDays: Optional[int] = None
    paymentAmount: Optional[float] = None
    paymentDatesOfMonth: Optional[List[int]] = None
    lastPaymentDate: Optional[RobustDate] = None
    nextPaymentDueDate: Optional[RobustDate] = None
    paymentRemarks: Optional[str] = None
    workReviews: Optional[List[dict]] = None
    campaigns: Optional[RobustCampaigns] = None
    
    assignedScriptwriterId: Optional[str] = None
    assignedScriptwriterName: Optional[str] = None
    assignedReelEditorId: Optional[str] = None
    assignedReelEditorName: Optional[str] = None
    assignedPostDesignerId: Optional[str] = None
    assignedPostDesignerName: Optional[str] = None
    assignedShooterId: Optional[str] = None
    assignedShooterName: Optional[str] = None
    assignedApproverId: Optional[str] = None
    assignedApproverName: Optional[str] = None
    assignedPosterId: Optional[str] = None
    assignedPosterName: Optional[str] = None

class Client(ClientBase):
    id: str

    class Config:
        from_attributes = True

# Project Schemas
class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    clientId: str
    clientName: Optional[str] = None
    leadId: Optional[str] = None
    meetings: Optional[List[dict]] = []
    department: Optional[str] = None
    teamLeaderId: Optional[str] = None
    teamLeaderName: Optional[str] = None
    assignedEmployeeId: Optional[str] = None
    assignedEmployeeName: Optional[str] = None
    startDate: RobustDate
    endDate: Optional[RobustDate] = None
    teamDeadline: Optional[RobustDate] = None
    status: Optional[str] = "planning"
    statusHistory: Optional[List[dict]] = []
    priority: Optional[str] = "medium"
    budget: Optional[float] = 0
    followupType: Optional[str] = "Interval" # 'Interval', 'Weekly', 'Monthly'
    followupIntervalDays: Optional[int] = None
    followupDaysOfWeek: Optional[List[int]] = [] # 0=Monday, 6=Sunday
    followupDatesOfMonth: Optional[List[int]] = [] # 1-31
    lastFollowupDate: Optional[RobustDate] = None
    nextFollowupDate: Optional[RobustDate] = None
    
    # Payment Settings
    paymentStartDate: Optional[RobustDate] = None
    paymentDurationMonths: Optional[int] = None
    paymentEndDate: Optional[RobustDate] = None
    paymentReminderDays: Optional[int] = None
    isPaymentReceived: Optional[bool] = False
    
    # Feedback Collection Fields
    feedbackType: Optional[str] = "Interval" # 'Interval', 'Weekly', 'Monthly'
    feedbackIntervalDays: Optional[int] = None
    feedbackDaysOfWeek: Optional[List[int]] = [] # 0=Monday, 6=Sunday
    feedbackDatesOfMonth: Optional[List[int]] = [] # 1-31
    lastFeedbackDate: Optional[RobustDate] = None
    nextFeedbackDate: Optional[RobustDate] = None
    
    # Creative Tracking Fields
    services: Optional[str] = None
    post: Optional[int] = 0
    reel: Optional[int] = 0
    festivalPost: Optional[str] = "No"
    graphicsRequired: Optional[str] = "No"
    postRequired: Optional[str] = "No"
    reelRequired: Optional[str] = "No"
    assignedScriptwriterId: Optional[str] = None
    assignedReelEditorId: Optional[str] = None
    assignedPostDesignerId: Optional[str] = None
    assignedShooterId: Optional[str] = None
    assignedApproverId: Optional[str] = None
    assignedPosterId: Optional[str] = None
    
    # Phase Wise Project Fields
    isPhaseWise: Optional[bool] = False
    phases: Optional[List[dict]] = []
    modules: Optional[List[dict]] = []

class ProjectCreate(ProjectBase):
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    clientId: Optional[str] = None
    clientName: Optional[str] = None
    leadId: Optional[str] = None
    department: Optional[str] = None
    teamLeaderId: Optional[str] = None
    teamLeaderName: Optional[str] = None
    assignedEmployeeId: Optional[str] = None
    assignedEmployeeName: Optional[str] = None
    startDate: Optional[RobustDate] = None
    endDate: Optional[RobustDate] = None
    teamDeadline: Optional[RobustDate] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    budget: Optional[float] = None
    followupType: Optional[str] = None
    followupIntervalDays: Optional[int] = None
    followupDaysOfWeek: Optional[List[int]] = None
    followupDatesOfMonth: Optional[List[int]] = None
    lastFollowupDate: Optional[RobustDate] = None
    nextFollowupDate: Optional[RobustDate] = None
    
    # Payment Settings
    paymentStartDate: Optional[RobustDate] = None
    paymentDurationMonths: Optional[int] = None
    paymentEndDate: Optional[RobustDate] = None
    paymentReminderDays: Optional[int] = None
    isPaymentReceived: Optional[bool] = None
    
    feedbackType: Optional[str] = None
    feedbackIntervalDays: Optional[int] = None
    feedbackDaysOfWeek: Optional[List[int]] = None
    feedbackDatesOfMonth: Optional[List[int]] = None
    lastFeedbackDate: Optional[RobustDate] = None
    nextFeedbackDate: Optional[RobustDate] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None
    
    # Creative Tracking Fields
    services: Optional[str] = None
    post: Optional[int] = None
    reel: Optional[int] = None
    festivalPost: Optional[str] = None
    graphicsRequired: Optional[str] = None
    postRequired: Optional[str] = None
    reelRequired: Optional[str] = None
    assignedScriptwriterId: Optional[str] = None
    assignedReelEditorId: Optional[str] = None
    assignedPostDesignerId: Optional[str] = None
    assignedShooterId: Optional[str] = None
    assignedApproverId: Optional[str] = None
    assignedPosterId: Optional[str] = None
    
    # Phase Wise Project Fields
    isPhaseWise: Optional[bool] = None
    phases: Optional[List[dict]] = None
    modules: Optional[List[dict]] = None

class Project(ProjectBase):
    id: str

    class Config:
        from_attributes = True

# General Task Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    assignedToId: Optional[str] = None # Employee ID (Legacy)
    assignedToName: Optional[str] = None
    assignedToIds: Optional[List[str]] = []
    assignedToNames: Optional[List[str]] = []
    assignedById: Optional[str] = None # Employee ID who created/assigned the task
    assignedByName: Optional[str] = None
    dueDate: Optional[RobustDate] = None
    status: Optional[str] = "todo" # todo, in-progress, review, completed
    priority: Optional[str] = "medium" # low, medium, high, urgent
    remarks: Optional[str] = None
    createdDate: Optional[RobustDate] = None

class TaskCreate(TaskBase):
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignedToId: Optional[str] = None
    assignedToName: Optional[str] = None
    assignedToIds: Optional[List[str]] = None
    assignedToNames: Optional[List[str]] = None
    dueDate: Optional[RobustDate] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    remarks: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class Task(TaskBase):
    id: str

    class Config:
        from_attributes = True

# Work Management Task Schemas
class WMTaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    projectId: str
    projectName: Optional[str] = None
    assignedToId: str # Employee ID
    assignedToName: Optional[str] = None
    department: Optional[str] = None
    dueDate: Optional[RobustDate] = None
    moduleName: Optional[str] = None
    moduleDeadline: Optional[RobustDate] = None
    status: Optional[str] = "todo" # todo, in-progress, review, completed
    priority: Optional[str] = "medium" # low, medium, high, urgent
    remarks: Optional[str] = None
    createdBy: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None
    
    # Phase & Hierarchy Fields
    phase: Optional[str] = None
    subtasks: Optional[List[dict]] = []
    
    # Graphics specific fields
    postingDate: Optional[RobustDate] = None
    postingDay: Optional[str] = None
    reelPost: Optional[str] = None
    concept: Optional[str] = None
    reference: Optional[str] = None
    scriptLink: Optional[str] = None
    scriptDate: Optional[RobustDate] = None
    shootingLink: Optional[str] = None
    shootDate: Optional[RobustDate] = None
    editingLink: Optional[str] = None
    editingDate: Optional[RobustDate] = None
    reviewByTL: Optional[str] = None
    finalLink: Optional[str] = None
    postingStatus: Optional[str] = None
    
    createdDate: Optional[RobustDate] = None

class WMTaskCreate(WMTaskBase):
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class WMTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    projectId: Optional[str] = None
    projectName: Optional[str] = None
    assignedToId: Optional[str] = None
    assignedToName: Optional[str] = None
    department: Optional[str] = None
    dueDate: Optional[RobustDate] = None
    moduleName: Optional[str] = None
    moduleDeadline: Optional[RobustDate] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    remarks: Optional[str] = None
    
    # Phase & Hierarchy Fields
    phase: Optional[str] = None
    subtasks: Optional[List[dict]] = None
    
    # Graphics specific fields
    postingDate: Optional[RobustDate] = None
    postingDay: Optional[str] = None
    reelPost: Optional[str] = None
    concept: Optional[str] = None
    reference: Optional[str] = None
    scriptLink: Optional[str] = None
    scriptDate: Optional[RobustDate] = None
    shootingLink: Optional[str] = None
    shootDate: Optional[RobustDate] = None
    editingLink: Optional[str] = None
    editingDate: Optional[RobustDate] = None
    reviewByTL: Optional[str] = None
    finalLink: Optional[str] = None
    postingStatus: Optional[str] = None
    
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class WMTask(WMTaskBase):
    id: str

    class Config:
        from_attributes = True

# Activity Log Schemas
class TaskLogBase(BaseModel):
    taskId: Optional[str] = None
    projectId: Optional[str] = None
    clientId: Optional[str] = None
    leadId: Optional[str] = None
    dailyReportId: Optional[str] = None
    monthlyReportId: Optional[str] = None
    action: str
    performedBy: str
    userName: str
    details: str
    diffs: Optional[List[dict]] = []
    timestamp: Optional[RobustDatetime] = None

class TaskLog(TaskLogBase):
    id: str
    class Config:
        from_attributes = True

# Sales Lead Schemas
class FollowUp(BaseModel):
    date: RobustDate
    note: str
    performedBy: Optional[str] = None
    nextFollowUpDate: Optional[RobustDate] = None

class Meeting(BaseModel):
    date: str
    note: str
    performedBy: Optional[str] = None
    type: Optional[str] = None # "Monthly Review", "Strategy Pitch", "Onboarding", "Check-in", "Ad-hoc"
    location: Optional[str] = None # "Google Meet", "Zoom", "Phone Call", "In-Person"
    attendees: Optional[str] = None
    attendeeIds: Optional[List[str]] = []
    status: Optional[str] = None # "Scheduled", "Completed", "Cancelled"
    nextSteps: Optional[str] = None
    duration: Optional[str] = None
    link: Optional[str] = None

class LeadBase(BaseModel):
    company: Optional[str] = ""
    contact: str
    email: Optional[str] = None
    phone: Optional[str] = None
    expectedIncome: Optional[str] = None
    status: Optional[str] = "Lead" # Lead, Contacted, Proposal Sent, Client Won, Client Loss, On Hold
    priority: Optional[str] = "Medium" # Low, Medium, High
    source: Optional[str] = None
    date: Optional[RobustDate] = None
    remarks: Optional[str] = None
    closedDate: Optional[RobustDate] = None
    assignedTo: Optional[Union[str, List[RobustAssignedTo]]] = []
    followUps: Optional[List[FollowUp]] = []
    isHot: Optional[bool] = False
    holdResumeDate: Optional[RobustDate] = None
    createdBy: Optional[str] = None
    createdByUserName: Optional[str] = None
    nextFollowUpDate: Optional[RobustDate] = None

class LeadCreate(LeadBase):
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class LeadUpdate(BaseModel):
    company: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    expectedIncome: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    source: Optional[str] = None
    date: Optional[RobustDate] = None
    remarks: Optional[str] = None
    closedDate: Optional[RobustDate] = None
    assignedTo: Optional[RobustAssignedTo] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None
    isHot: Optional[bool] = None
    holdResumeDate: Optional[RobustDate] = None
    nextFollowUpDate: Optional[RobustDate] = None
    reason: Optional[str] = None

class Lead(LeadBase):
    id: str
    class Config:
        from_attributes = True

# System Settings Schemas
class SystemSettingsBase(BaseModel):
    clientVisibilityAdminOnly: Optional[bool] = True
    latePunchDeductionEnabled: Optional[bool] = True
    dailyProgressRejectDeductionEnabled: Optional[bool] = False
    officeStartTime: Optional[str] = "09:30"
    officeEndTime: Optional[str] = "18:30"
    lateBufferMins: Optional[int] = 10
    inactivityTimeoutEnabled: Optional[bool] = False
    inactivityTimeoutMins: Optional[int] = 5
    allowedMonthlyPaidLeaves: Optional[int] = 1
    companyGstin: Optional[str] = "24AAXFN3372M1ZK"
    companyAddress: Optional[str] = "FLAT-204, 2nd FLOOR, RS NO-67/1, WING-A, HARIKRUSHANA COMPLEX, OPP. BHAGAT NAGAR, VED, GURUKULROAD, KATARGAM, SURAT- 395004, GUJARAT, INDIA."
    companyPhone: Optional[str] = "+91 87805 64463"
    companyEmail: Optional[str] = "billing@hkdigiverse.com"
    companyPan: Optional[str] = "AAXFN3372M"
    companyLlpin: Optional[str] = "ACK-1143"
    companyState: Optional[str] = "24"
    bankName: Optional[str] = "Axis Bank"
    bankAccountNumber: Optional[str] = "924020057377415"
    bankIfscCode: Optional[str] = "UTIB0002891"
    taxInvoicePrefix: Optional[str] = "INV"
    proformaInvoicePrefix: Optional[str] = "PINV"
    noTaxInvoicePrefix: Optional[str] = "NINV"
    invoiceColor1: Optional[str] = "#08304b"
    invoiceColor2: Optional[str] = "#08304b"
    companyLetterheadUrl: Optional[str] = None
    companySignatureUrl: Optional[str] = None
    defaultSac: Optional[str] = ""
    defaultScriptDateOffset: Optional[int] = None
    defaultShootDateOffset: Optional[int] = None
    defaultEditingStartOffset: Optional[int] = None
    defaultApprovalOffset: Optional[int] = None
    paymentDueDays: Optional[int] = 0

class SystemSettingsUpdate(BaseModel):
    clientVisibilityAdminOnly: Optional[bool] = None
    latePunchDeductionEnabled: Optional[bool] = None
    dailyProgressRejectDeductionEnabled: Optional[bool] = None
    officeStartTime: Optional[str] = None
    officeEndTime: Optional[str] = None
    lateBufferMins: Optional[int] = None
    inactivityTimeoutEnabled: Optional[bool] = None
    inactivityTimeoutMins: Optional[int] = None
    allowedMonthlyPaidLeaves: Optional[int] = None
    companyGstin: Optional[str] = None
    companyAddress: Optional[str] = None
    companyPhone: Optional[str] = None
    companyEmail: Optional[str] = None
    companyPan: Optional[str] = None
    companyLlpin: Optional[str] = None
    companyState: Optional[str] = None
    bankName: Optional[str] = None
    bankAccountNumber: Optional[str] = None
    bankIfscCode: Optional[str] = None
    taxInvoicePrefix: Optional[str] = None
    proformaInvoicePrefix: Optional[str] = None
    noTaxInvoicePrefix: Optional[str] = None
    invoiceColor1: Optional[str] = None
    invoiceColor2: Optional[str] = None
    companyLetterheadUrl: Optional[str] = None
    companySignatureUrl: Optional[str] = None
    defaultSac: Optional[str] = None
    defaultScriptDateOffset: Optional[int] = None
    defaultShootDateOffset: Optional[int] = None
    defaultEditingStartOffset: Optional[int] = None
    defaultApprovalOffset: Optional[int] = None
    paymentDueDays: Optional[int] = None

class SystemSettings(SystemSettingsBase):
    id: str
    class Config:
        from_attributes = True

# Marketing Report Schemas
class ProjectDailyRemarkBase(BaseModel):
    projectId: str
    clientId: Optional[str] = None
    date: RobustDate
    remark: Optional[str] = None

class ProjectDailyRemarkCreate(ProjectDailyRemarkBase):
    pass

class ProjectDailyRemarkUpdate(BaseModel):
    remark: Optional[str] = None

class ProjectDailyRemark(ProjectDailyRemarkBase):
    id: str
    class Config:
        from_attributes = True

class MarketingDailyReportBase(BaseModel):
    date: RobustDate
    campaignName: str
    reach: int = 0
    impression: int = 0
    leads: int = 0
    followers: int = 0
    spend: float = 0
    cpl: float = 0
    revenue: float = 0
    remarks: Optional[str] = None
    reason: Optional[str] = None
    campaignOptimization: bool = False
    leadsFileUrl: Optional[str] = None
    isDeleted: Optional[bool] = False

class MarketingDailyReportCreate(MarketingDailyReportBase):
    clientId: Optional[str] = None
    clientName: Optional[str] = None
    projectId: Optional[str] = None
    projectName: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class MarketingDailyReportUpdate(BaseModel):
    clientId: Optional[str] = None
    clientName: Optional[str] = None
    projectId: Optional[str] = None
    projectName: Optional[str] = None
    date: Optional[RobustDate] = None
    campaignName: Optional[str] = None
    reach: Optional[int] = None
    impression: Optional[int] = None
    leads: Optional[int] = None
    followers: Optional[int] = None
    spend: Optional[float] = None
    cpl: Optional[float] = None
    revenue: Optional[float] = None
    remarks: Optional[str] = None
    reason: Optional[str] = None
    campaignOptimization: Optional[bool] = None
    leadsFileUrl: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class MarketingDailyReport(MarketingDailyReportBase):
    id: str
    clientId: Optional[str] = None
    clientName: Optional[str] = None
    projectId: Optional[str] = None
    projectName: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None
    class Config:
        from_attributes = True

class BulkDeleteLeadsRequest(BaseModel):
    ids: List[str]

class MarketingMonthlyReportBase(BaseModel):
    clientName: str
    month: str
    totalSpend: float = 0
    totalLeads: int = 0
    totalSales: int = 0
    avgCPR: float = 0
    avgCPP: float = 0
    totalRevenue: float = 0
    overallROAS: float = 0
    conclusion: Optional[str] = None
    employeeConclusion: Optional[str] = None
    adminConclusion: Optional[str] = None
    clientConclusion: Optional[str] = None

class MarketingMonthlyReportCreate(MarketingMonthlyReportBase):
    clientId: Optional[str] = None
    projectId: Optional[str] = None
    projectName: Optional[str] = None

class MarketingMonthlyReportUpdate(BaseModel):
    clientId: Optional[str] = None
    clientName: Optional[str] = None
    projectId: Optional[str] = None
    projectName: Optional[str] = None
    month: Optional[str] = None
    totalSpend: Optional[float] = None
    totalLeads: Optional[int] = None
    totalSales: Optional[int] = None
    avgCPR: Optional[float] = None
    avgCPP: Optional[float] = None
    totalRevenue: Optional[float] = None
    overallROAS: Optional[float] = None
    employeeConclusion: Optional[str] = None
    adminConclusion: Optional[str] = None
    clientConclusion: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class MarketingMonthlyReport(MarketingMonthlyReportBase):
    id: str
    clientId: Optional[str] = None
    projectId: Optional[str] = None
    projectName: Optional[str] = None
    class Config:
        from_attributes = True


class PollOption(BaseModel):
    id: str
    text: str
    votes: List[str] = [] # User IDs

class Poll(BaseModel):
    question: str
    options: List[PollOption]
    isMultiple: bool = False
    expiresAt: Optional[str] = None

class ChatMessageBase(BaseModel):
    senderId: str
    receiverId: str
    text: str
    type: str = "personal" # personal, group
    isMe: Optional[bool] = None # Helper for frontend
    sender: Optional[str] = None # Resolved sender name
    senderAvatar: Optional[str] = None # Resolved sender avatar photo path
    timestamp: Optional[str] = None
    tempId: Optional[str] = None
    isEdited: bool = False
    isSeen: bool = False
    replyToId: Optional[str] = None
    replyToText: Optional[str] = None
    savedBy: List[str] = []
    isPinned: bool = False
    attachmentUrl: Optional[str] = None
    attachmentName: Optional[str] = None
    groupId: Optional[str] = None
    seenBy: List[str] = []
    archivedBy: List[str] = []
    completedBy: List[str] = []
    forwardedFrom: Optional[str] = None
    reactions: Optional[dict] = {} # { emoji: [userId1, userId2] }
    poll: Optional[Poll] = None
    isVoice: bool = False
    voiceDuration: Optional[float] = None

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    id: str

class ChatMessageUpdate(BaseModel):
    text: str

class ChatGroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    members: List[str] # List of employee IDs
    avatar: Optional[str] = None
    createdBy: str # Employee ID

class ChatGroupCreate(ChatGroupBase):
    pass

class ChatGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    members: Optional[List[str]] = None
    avatar: Optional[str] = None

class ChatGroup(ChatGroupBase):
    id: str
    timestamp: str
    lastMessage: Optional[str] = None
    lastMessageTime: Optional[str] = None

class ChatChannelBase(BaseModel):
    name: str
    description: Optional[str] = None

class ChatChannelCreate(ChatChannelBase):
    pass

class ChatChannelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ChatChannel(ChatChannelBase):
    id: str
    lastMessage: Optional[str] = None
    lastMessageTime: Optional[str] = None

# Employee Document Schemas
class EmployeeDocumentBase(BaseModel):
    employeeId: str
    employeeName: str
    documentName: str
    category: Optional[str] = "Other"
    fileName: str
    fileUrl: str
    uploadDate: RobustDate
    expiryDate: Optional[RobustDate] = None
    status: str = "Rejected" # Accepted, Rejected, Returned to Employee
    remarks: Optional[str] = None
    softCopySubmitted: Optional[str] = "No"
    hardCopySubmitted: Optional[str] = "No"
    adminAcceptance: Optional[str] = "Pending"
    logs: Optional[list] = []

class EmployeeDocumentCreate(EmployeeDocumentBase):
    pass

class EmployeeDocumentUpdate(BaseModel):
    documentName: Optional[str] = None
    category: Optional[str] = None
    expiryDate: Optional[RobustDate] = None
    status: Optional[str] = None
    remarks: Optional[str] = None
    softCopySubmitted: Optional[str] = None
    hardCopySubmitted: Optional[str] = None
    adminAcceptance: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class EmployeeDocument(EmployeeDocumentBase):
    id: str

# Document Request Schemas
class DocumentRequestBase(BaseModel):
    employeeId: str
    employeeName: str
    documentType: str
    reason: Optional[str] = None
    status: str = "Pending" # Pending, Approved, Rejected, Generated, Sent
    requestDate: RobustDate
    fileName: Optional[str] = None
    fileUrl: Optional[str] = None
    generatedDate: Optional[RobustDate] = None
    sentDate: Optional[RobustDate] = None

class DocumentRequestCreate(DocumentRequestBase):
    pass

class DocumentRequestUpdate(BaseModel):
    status: Optional[str] = None
    fileName: Optional[str] = None
    fileUrl: Optional[str] = None
    generatedDate: Optional[RobustDate] = None
    sentDate: Optional[RobustDate] = None

class DocumentRequest(DocumentRequestBase):
    id: str

# Employee Daily Progress/Report Schemas
class EmployeeDailyReportBase(BaseModel):
    employeeId: str
    employeeName: str
    department: str
    date: RobustDate
    tasksCompleted: List[str]
    tasksInProgress: List[str]
    challenges: Optional[str] = None
    nextDayPlan: Optional[str] = None
    hoursWorked: float = 8.0
    status: str = "Submitted" # Submitted, Reviewed
    note: Optional[str] = None

class EmployeeDailyReportCreate(EmployeeDailyReportBase):
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class EmployeeDailyReportUpdate(BaseModel):
    tasksCompleted: Optional[List[str]] = None
    tasksInProgress: Optional[List[str]] = None
    challenges: Optional[str] = None
    nextDayPlan: Optional[str] = None
    hoursWorked: Optional[float] = None
    status: Optional[str] = None
    note: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class EmployeeDailyReport(EmployeeDailyReportBase):
    id: str

# Sales Target Schemas
# Incentive Slab Schemas
class IncentiveSlabBase(BaseModel):
    minAmount: float
    maxAmount: float
    percentage: float
    employees: Optional[List[str]] = []
    clientCategories: Optional[List[str]] = []
    isRecurring: Optional[bool] = False

class IncentiveSlabCreate(IncentiveSlabBase):
    pass

class IncentiveSlabUpdate(BaseModel):
    minAmount: Optional[float] = None
    maxAmount: Optional[float] = None
    percentage: Optional[float] = None
    employees: Optional[List[str]] = None
    clientCategories: Optional[List[str]] = None
    isRecurring: Optional[bool] = None

class IncentiveSlab(IncentiveSlabBase):
    id: str

# Sales Target Schemas
class SalesTargetBase(BaseModel):
    employeeId: str
    employeeName: Optional[str] = "Unknown"
    type: str = "Monthly" # Monthly, Weekly, Custom
    month: Optional[str] = None
    year: Optional[int] = None
    week: Optional[int] = None # 1, 2, 3, 4, 5
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    targetAmount: float = 0
    currentAchievement: float = 0
    incentiveBase: Optional[float] = 0
    incentiveAmount: float = 0
    breakdown: Optional[List[dict]] = []
    status: Optional[str] = "Active"
    createdAt: Optional[str] = None

class SalesTargetCreate(SalesTargetBase):
    pass

class SalesTargetUpdate(BaseModel):
    targetAmount: Optional[float] = None
    currentAchievement: Optional[float] = None
    incentiveAmount: Optional[float] = None
    type: Optional[str] = None
    week: Optional[int] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    status: Optional[str] = None

class SalesTarget(SalesTargetBase):
    id: str
    class Config:
        from_attributes = True

# Permission Schemas
class ModulePermission(BaseModel):
    moduleName: str
    displayName: str
    tabUrl: str
    canAdd: bool = False
    canEdit: bool = False
    canDelete: bool = False
    canView: bool = False

class UserPermissionBase(BaseModel):
    employeeId: str
    permissions: List[ModulePermission]
    presetId: Optional[str] = None

class UserPermissionCreate(UserPermissionBase):
    pass

class UserPermissionUpdate(BaseModel):
    permissions: List[ModulePermission]
    presetId: Optional[str] = None

class UserPermission(UserPermissionBase):
    id: Optional[str] = None

class PermissionPresetBase(BaseModel):
    name: str
    description: Optional[str] = ""
    permissions: List[ModulePermission]

class PermissionPresetCreate(PermissionPresetBase):
    pass

class PermissionPresetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[ModulePermission]] = None

class PermissionPreset(PermissionPresetBase):
    id: str
    class Config:
        from_attributes = True

class TimeRecoveryBase(BaseModel):
    employee_id: str
    employee_name: str
    date: RobustDate
    late_minutes: int
    recovery_minutes: int
    reason: str
    status: str = 'pending' # pending, approved, rejected
    created_at: Optional[RobustDatetime] = None
    recovery_type: Optional[str] = 'break' # 'break', 'meeting', 'work', etc.
    start_time: Optional[str] = None # HH:MM:SS format
    end_time: Optional[str] = None # HH:MM:SS format

class TimeRecoveryCreate(TimeRecoveryBase):
    pass

class TimeRecovery(TimeRecoveryBase):   
    id: str

class InvoiceLineItem(BaseModel):
    description: str
    subDescription: Optional[str] = None
    sac: Optional[str] = ""
    rate: float
    amount: float
    qty: Optional[float] = None
    discount: Optional[float] = None
    discountRate: Optional[float] = 0.0
    discountType: Optional[str] = "amount"

class InvoiceBase(BaseModel):
    clientName: str
    clientAddress: Optional[str] = None
    clientEmail: Optional[str] = None
    clientPhone: Optional[str] = None
    clientDepartment: Optional[str] = None
    clientGstin: Optional[str] = None
    clientState: Optional[str] = ""
    invoiceNumber: str
    issueDate: str
    dueDate: Optional[str] = None
    lineItems: List[InvoiceLineItem]
    discount: float = 0.0
    tax: float = 0.0
    taxType: Optional[str] = "CGST+SGST"
    paymentMode: Optional[str] = "Current Account"
    subtotal: float
    total: float
    notes: Optional[str] = None
    otherBankName: Optional[str] = None
    otherBankAccount: Optional[str] = None
    otherBankIfsc: Optional[str] = None
    otherUpiId: Optional[str] = None
    otherQrUrl: Optional[str] = None
    status: str = "Pending"  # Pending, Paid, Overdue
    invoiceType: str = "Tax Invoice"  # Tax Invoice, Proforma Invoice
    incentiveAmountBase: Optional[float] = None
    createdBy: Optional[str] = None
    createdById: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceUpdate(BaseModel):
    clientName: Optional[str] = None
    clientAddress: Optional[str] = None
    clientEmail: Optional[str] = None
    clientPhone: Optional[str] = None
    clientDepartment: Optional[str] = None
    clientGstin: Optional[str] = None
    clientState: Optional[str] = None
    invoiceNumber: Optional[str] = None
    issueDate: Optional[str] = None
    dueDate: Optional[str] = None
    lineItems: Optional[List[InvoiceLineItem]] = None
    discount: Optional[float] = None
    tax: Optional[float] = None
    subtotal: Optional[float] = None
    total: Optional[float] = None
    notes: Optional[str] = None
    otherBankName: Optional[str] = None
    otherBankAccount: Optional[str] = None
    otherBankIfsc: Optional[str] = None
    otherUpiId: Optional[str] = None
    otherQrUrl: Optional[str] = None
    status: Optional[str] = None
    invoiceType: Optional[str] = None
    incentiveAmountBase: Optional[float] = None
    createdBy: Optional[str] = None
    createdById: Optional[str] = None

class Invoice(InvoiceBase):
    id: str
    timestamp: str
    paymentDate: Optional[str] = None
    class Config:
        from_attributes = True

# Document Type Schemas
class DocumentTypeBase(BaseModel):
    name: str
    description: Optional[str] = None

class DocumentTypeCreate(DocumentTypeBase):
    pass

class DocumentTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class DocumentType(DocumentTypeBase):
    id: str
    class Config:
        from_attributes = True

# Referral (Reference) Schemas
class ReferralBase(BaseModel):
    candidateName: str
    email: Optional[str] = None
    phone: str
    jobTitle: str
    relationship: Optional[str] = None
    resumeUrl: Optional[str] = None
    referredById: str
    referredByName: str
    status: str = "Pending"
    notes: Optional[str] = None
    submissionDate: Optional[RobustDate] = None

class ReferralCreate(ReferralBase):
    pass

class ReferralUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    candidateName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    jobTitle: Optional[str] = None
    relationship: Optional[str] = None
    resumeUrl: Optional[str] = None

class Referral(ReferralBase):
    id: str

# Asset Category Schemas
class AssetCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    totalItems: Optional[int] = 0
    valuation: Optional[float] = 0.0

class AssetCategoryCreate(AssetCategoryBase):
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class AssetCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    totalItems: Optional[int] = None
    valuation: Optional[float] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class AssetCategory(AssetCategoryBase):
    id: str
    class Config:
        from_attributes = True

# Document Templates
class DocumentTemplateBase(BaseModel):
    template_id: str
    name: str
    description: Optional[str] = None
    fields: List[str] = []
    content: str
    file_url: Optional[str] = None

class DocumentTemplateCreate(DocumentTemplateBase):
    pass

class DocumentTemplateUpdate(BaseModel):
    template_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    fields: Optional[List[str]] = None
    content: Optional[str] = None
    file_url: Optional[str] = None

class DocumentTemplate(DocumentTemplateBase):
    id: str
    class Config:
        from_attributes = True

# Schedule Schemas
class ScheduleBase(BaseModel):
    title: str
    description: Optional[str] = None
    employeeId: str
    employeeName: Optional[str] = "Unknown"
    date: RobustDate
    startTime: str
    endTime: str
    type: str  # e.g., 'meeting', 'busy', 'out_of_office', 'work'
    attendees: Optional[List[str]] = []
    createdBy: Optional[str] = None
    googleEventId: Optional[str] = None

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    employeeId: Optional[str] = None
    employeeName: Optional[str] = None
    date: Optional[RobustDate] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    type: Optional[str] = None
    attendees: Optional[List[str]] = None

class Schedule(ScheduleBase):
    id: str
    class Config:
        from_attributes = True


# User Input Stats Schemas
class UserInputStatsBase(BaseModel):
    employeeId: str
    employeeName: str
    date: str  # YYYY-MM-DD
    clicks: int
    keystrokes: int
    lastActive: Optional[RobustDatetime] = None
    applications: Optional[dict] = {}
    domains: Optional[dict] = {}

class UserInputStatsCreate(BaseModel):
    clicks: int
    keystrokes: int
    applications: Optional[dict] = {}
    domains: Optional[dict] = {}

class UserInputStats(UserInputStatsBase):
    id: str


# Registered PC & Restriction Schemas
class RegisteredPCBase(BaseModel):
    hostname: str
    ipAddress: Optional[str] = None
    os: Optional[str] = None
    osVersion: Optional[str] = None
    firstSeen: Optional[RobustDatetime] = None
    lastSeen: Optional[RobustDatetime] = None
    blockChrome: Optional[bool] = False
    blockYoutube: Optional[bool] = False
    blockApps: Optional[List[str]] = []
    blockUrls: Optional[List[str]] = []
    activeEmployee: Optional[str] = ""

class RegisteredPCUpdate(BaseModel):
    blockChrome: Optional[bool] = None
    blockYoutube: Optional[bool] = None
    blockApps: Optional[List[str]] = None
    blockUrls: Optional[List[str]] = None

class RegisteredPC(RegisteredPCBase):
    id: str


# Content Calendar Schemas
class ContentCalendarEntryBase(BaseModel):
    clientId: str
    monthYear: str  # Format: "YYYY-MM"
    postingDate: Optional[str] = None
    postingDay: Optional[str] = None
    postReel: Optional[str] = None
    concept: Optional[str] = None
    topic: Optional[str] = None
    reference: Optional[str] = None
    scriptDate: Optional[str] = None
    scriptLink: Optional[str] = None
    shootDate: Optional[str] = None
    shootLink: Optional[str] = None
    editingStart: Optional[str] = None
    finalReelLink: Optional[str] = None
    finalPostLink: Optional[str] = None
    approval: Optional[str] = None
    isApproved: Optional[str] = None
    thumbnailLink: Optional[str] = None
    postingLinkOfIg: Optional[str] = None
    actualPostingDate: Optional[str] = None
    updatedBy: Optional[str] = None
    logs: Optional[List[dict]] = None
    remark: Optional[str] = None
    remarkStage: Optional[str] = None

class ContentCalendarEntryCreate(ContentCalendarEntryBase):
    pass

class ContentCalendarEntryUpdate(BaseModel):
    monthYear: Optional[str] = None
    postingDate: Optional[str] = None
    postingDay: Optional[str] = None
    postReel: Optional[str] = None
    concept: Optional[str] = None
    topic: Optional[str] = None
    reference: Optional[str] = None
    scriptDate: Optional[str] = None
    scriptLink: Optional[str] = None
    shootDate: Optional[str] = None
    shootLink: Optional[str] = None
    editingStart: Optional[str] = None
    finalReelLink: Optional[str] = None
    finalPostLink: Optional[str] = None
    approval: Optional[str] = None
    isApproved: Optional[str] = None
    thumbnailLink: Optional[str] = None
    postingLinkOfIg: Optional[str] = None
    actualPostingDate: Optional[str] = None
    updatedBy: Optional[str] = None
    remark: Optional[str] = None
    remarkStage: Optional[str] = None

class ContentCalendarEntry(ContentCalendarEntryBase):
    id: str
    class Config:
        from_attributes = True

class ContentCalendarSettingsBase(BaseModel):
    clientId: str
    monthYear: str
    scriptDateOffset: Optional[int] = None
    shootDateOffset: Optional[int] = None
    editingStartOffset: Optional[int] = None
    approvalOffset: Optional[int] = None
    isApproved: bool = False
    approvalStatus: str = "Pending"
    statusLogs: Optional[List[dict]] = []

class ContentCalendarSettingsCreate(ContentCalendarSettingsBase):
    pass

class ContentCalendarSettingsUpdate(BaseModel):
    scriptDateOffset: Optional[int] = None
    shootDateOffset: Optional[int] = None
    editingStartOffset: Optional[int] = None
    approvalOffset: Optional[int] = None
    isApproved: Optional[bool] = None
    approvalStatus: Optional[str] = None
    statusLogs: Optional[List[dict]] = None

class ContentCalendarSettings(ContentCalendarSettingsBase):
    id: str
    class Config:
        from_attributes = True

# --- Other Work ---
class OtherWorkBase(BaseModel):
    title: str
    description: Optional[str] = None
    assigneeId: str
    assigneeName: str
    assignerId: str
    assignerName: str
    deadline: str
    status: str = "Pending"
    taskType: Optional[str] = "other-work"
    logs: Optional[List[dict]] = None

class OtherWorkCreate(OtherWorkBase):
    pass

class OtherWorkUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigneeId: Optional[str] = None
    assigneeName: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[str] = None
    logs: Optional[List[dict]] = None

class OtherWork(OtherWorkBase):
    id: str
    class Config:
        from_attributes = True
