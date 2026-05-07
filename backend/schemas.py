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
    status: Optional[str] = "active"
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
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    profilePhoto: Optional[str] = None

class Employee(EmployeeBase):
    id: str

class Break(BaseModel):
    startTime: str
    endTime: Optional[str] = None
    duration: Optional[str] = None
 
class AttendanceBase(BaseModel):
    employeeId: str
    employeeName: str
    date: str
    checkIn: str
    checkOut: Optional[str] = None
    status: str
    workHours: Optional[str] = None
    breaks: List[Break] = []
 
class Attendance(AttendanceBase):
    id: str

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    employeeId: Optional[str] = None
    employeeName: Optional[str] = None
    date: Optional[str] = None
    checkIn: Optional[str] = None
    checkOut: Optional[str] = None
    status: Optional[str] = None
    workHours: Optional[str] = None
 
class PunchRequest(BaseModel):
    employeeId: str

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
    year: Optional[int] = None
    totalWorkingDays: int = 0
    workedDays: int = 0
    leaveDays: int = 0
    lopDays: int = 0
    basicSalary: float
    allowances: float
    bonus: float = 0
    deductions: float
    penalty: float = 0
    netSalary: float
    status: str
    deductionRemarks: str = ""

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
    postedDate: str

class JobOpeningCreate(JobOpeningBase):
    pass

class JobOpeningUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    applications: Optional[int] = None
    status: Optional[str] = None
    postedDate: Optional[str] = None

class JobOpening(JobOpeningBase):
    id: str

class ApplicationBase(BaseModel):
    candidateName: str
    email: str
    phone: str
    status: str
    appliedDate: str
    resume: Optional[str] = None
    jobTitle: Optional[str] = None
    skills: Optional[str] = None
    source: Optional[str] = None
    interviewDate: Optional[str] = None
    interviewTime: Optional[str] = None
    interviewerName: Optional[str] = None
    interviewLink: Optional[str] = None
    interviewNotes: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    jobTitle: Optional[str] = None
    skills: Optional[str] = None
    source: Optional[str] = None
    resume: Optional[str] = None
    interviewDate: Optional[str] = None
    interviewTime: Optional[str] = None
    interviewerName: Optional[str] = None
    interviewLink: Optional[str] = None
    interviewNotes: Optional[str] = None

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
    assetId: str
    name: str
    category: str
    serialNumber: Optional[str] = None
    assignedTo: Optional[str] = None
    status: str # Allocated, Available, Maintenance
    condition: Optional[str] = "New"
    location: Optional[str] = None
    purchaseDate: Optional[str] = None
    value: Optional[float] = 0
    description: Optional[str] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    serialNumber: Optional[str] = None
    assignedTo: Optional[str] = None
    status: Optional[str] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    purchaseDate: Optional[str] = None
    value: Optional[float] = None
    description: Optional[str] = None

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
    company: Optional[str] = None

class HolidayCreate(HolidayBase):
    pass

class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None
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
    date: Optional[str] = None

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
    date: Optional[str] = None

class RemarkCreate(RemarkBase):
    pass

class RemarkUpdate(BaseModel):
    type: Optional[str] = None
    details: Optional[str] = None

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

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    message: str
    user: Optional[Employee] = None

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    date: str
    time: Optional[str] = None
    type: str

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    type: Optional[str] = None

class Event(EventBase):
    id: str

# Leave Request Schemas
class LeaveRequestBase(BaseModel):
    employee_id: str
    employee_name: str
    type: str  # annual, sick, unpaid
    start_date: str
    end_date: str
    duration: str
    reason: str
    half_day: bool = False
    day_type: str = "Full Day"
    requested_on: str = ""

class LeaveRequestCreate(LeaveRequestBase):
    pass

class LeaveRequestUpdate(BaseModel):
    type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration: Optional[str] = None
    reason: Optional[str] = None
    half_day: Optional[bool] = None
    day_type: Optional[str] = None
    status: Optional[str] = None  # Pending, Approved, Rejected, Cancelled

class LeaveRequest(LeaveRequestBase):
    id: str
    status: str = "Pending"

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationBase(BaseModel):
    employee_id: str
    title: str
    message: str
    type: str  # leave, attendance, payroll, etc.
    is_read: bool = False
    created_at: str = ""

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: str

    class Config:
        from_attributes = True

# Client Schemas
class ClientBase(BaseModel):
    name: str
    companyName: str
    email: str
    phone: str
    address: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = "active"
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
    responsibility: Optional[str] = None
    dailyFollowup: Optional[str] = "No"
    interviewDate: Optional[str] = None
    interviewTime: Optional[str] = None
    interviewerName: Optional[str] = None
    interviewNotes: Optional[str] = None
    createdDate: Optional[str] = None

class ClientCreate(ClientBase):
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    companyName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
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
    responsibility: Optional[str] = None
    dailyFollowup: Optional[str] = None
    interviewDate: Optional[str] = None
    interviewTime: Optional[str] = None
    interviewerName: Optional[str] = None
    interviewLink: Optional[str] = None
    interviewNotes: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

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
    department: Optional[str] = None
    teamLeaderId: Optional[str] = None
    teamLeaderName: Optional[str] = None
    startDate: str
    endDate: Optional[str] = None
    status: Optional[str] = "planning"
    priority: Optional[str] = "medium"
    budget: Optional[float] = 0

class ProjectCreate(ProjectBase):
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    clientId: Optional[str] = None
    clientName: Optional[str] = None
    department: Optional[str] = None
    teamLeaderId: Optional[str] = None
    teamLeaderName: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    budget: Optional[float] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class Project(ProjectBase):
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
    dueDate: Optional[str] = None
    status: Optional[str] = "todo" # todo, in-progress, review, completed
    priority: Optional[str] = "medium" # low, medium, high, urgent
    remarks: Optional[str] = None
    
    # Graphics specific fields
    postingDate: Optional[str] = None
    postingDay: Optional[str] = None
    reelPost: Optional[str] = None
    concept: Optional[str] = None
    reference: Optional[str] = None
    scriptLink: Optional[str] = None
    scriptDate: Optional[str] = None
    shootingLink: Optional[str] = None
    shootDate: Optional[str] = None
    editingLink: Optional[str] = None
    editingDate: Optional[str] = None
    reviewByTL: Optional[str] = None
    finalLink: Optional[str] = None
    postingStatus: Optional[str] = None
    
    createdDate: Optional[str] = None

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
    dueDate: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    remarks: Optional[str] = None
    
    # Graphics specific fields
    postingDate: Optional[str] = None
    postingDay: Optional[str] = None
    reelPost: Optional[str] = None
    concept: Optional[str] = None
    reference: Optional[str] = None
    scriptLink: Optional[str] = None
    scriptDate: Optional[str] = None
    shootingLink: Optional[str] = None
    shootDate: Optional[str] = None
    editingLink: Optional[str] = None
    editingDate: Optional[str] = None
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
    timestamp: Optional[str] = None

class TaskLog(TaskLogBase):
    id: str
    class Config:
        from_attributes = True

# Sales Lead Schemas
class FollowUp(BaseModel):
    date: str
    note: str
    performedBy: Optional[str] = None

class LeadBase(BaseModel):
    company: str
    contact: str
    email: Optional[str] = None
    phone: Optional[str] = None
    expectedIncome: Optional[str] = None
    status: Optional[str] = "Lead" # Lead, Contacted, Proposal Sent, Client Won, Client Loss
    priority: Optional[str] = "Medium" # Low, Medium, High
    source: Optional[str] = None
    date: Optional[str] = None
    remarks: Optional[str] = None
    closedDate: Optional[str] = None
    assignedTo: Optional[str] = None
    followUps: Optional[List[FollowUp]] = []

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
    date: Optional[str] = None
    remarks: Optional[str] = None
    closedDate: Optional[str] = None
    assignedTo: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class Lead(LeadBase):
    id: str
    class Config:
        from_attributes = True

# System Settings Schemas
class SystemSettingsBase(BaseModel):
    clientVisibilityAdminOnly: Optional[bool] = True

class SystemSettingsUpdate(BaseModel):
    clientVisibilityAdminOnly: Optional[bool] = None

class SystemSettings(SystemSettingsBase):
    id: str
    class Config:
        from_attributes = True

# Marketing Report Schemas
class MarketingDailyReportBase(BaseModel):
    date: str
    campaignName: str
    reach: int = 0
    impression: int = 0
    leads: int = 0
    spend: float = 0
    cpl: float = 0

class MarketingDailyReportCreate(MarketingDailyReportBase):
    clientId: Optional[str] = None
    clientName: Optional[str] = None

class MarketingDailyReportUpdate(BaseModel):
    clientId: Optional[str] = None
    clientName: Optional[str] = None
    date: Optional[str] = None
    campaignName: Optional[str] = None
    reach: Optional[int] = None
    impression: Optional[int] = None
    leads: Optional[int] = None
    spend: Optional[float] = None
    cpl: Optional[float] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class MarketingDailyReport(MarketingDailyReportBase):
    id: str
    clientId: Optional[str] = None
    clientName: Optional[str] = None
    class Config:
        from_attributes = True

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

class MarketingMonthlyReportCreate(MarketingMonthlyReportBase):
    clientId: Optional[str] = None

class MarketingMonthlyReportUpdate(BaseModel):
    clientId: Optional[str] = None
    clientName: Optional[str] = None
    month: Optional[str] = None
    totalSpend: Optional[float] = None
    totalLeads: Optional[int] = None
    totalSales: Optional[int] = None
    avgCPR: Optional[float] = None
    avgCPP: Optional[float] = None
    totalRevenue: Optional[float] = None
    overallROAS: Optional[float] = None
    conclusion: Optional[str] = None
    performedBy: Optional[str] = None
    userName: Optional[str] = None

class MarketingMonthlyReport(MarketingMonthlyReportBase):
    id: str
    clientId: Optional[str] = None
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
    timestamp: Optional[str] = None
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

# Employee Document Schemas
class EmployeeDocumentBase(BaseModel):
    employeeId: str
    employeeName: str
    documentName: str
    category: str # ID Proof, Education, Experience, Other
    fileName: str
    fileUrl: str
    uploadDate: str
    expiryDate: Optional[str] = None
    status: str = "Active" # Active, Expired, Revoked
    remarks: Optional[str] = None

class EmployeeDocumentCreate(EmployeeDocumentBase):
    pass

class EmployeeDocumentUpdate(BaseModel):
    documentName: Optional[str] = None
    category: Optional[str] = None
    expiryDate: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None

class EmployeeDocument(EmployeeDocumentBase):
    id: str

# Employee Daily Progress/Report Schemas
class EmployeeDailyReportBase(BaseModel):
    employeeId: str
    employeeName: str
    department: str
    date: str
    tasksCompleted: List[str]
    tasksInProgress: List[str]
    challenges: Optional[str] = None
    nextDayPlan: Optional[str] = None
    hoursWorked: float = 8.0
    status: str = "Submitted" # Submitted, Reviewed

class EmployeeDailyReportCreate(EmployeeDailyReportBase):
    pass

class EmployeeDailyReportUpdate(BaseModel):
    tasksCompleted: Optional[List[str]] = None
    tasksInProgress: Optional[List[str]] = None
    challenges: Optional[str] = None
    nextDayPlan: Optional[str] = None
    hoursWorked: Optional[float] = None
    status: Optional[str] = None

class EmployeeDailyReport(EmployeeDailyReportBase):
    id: str

