export interface Employee {
  id: string
  name: string
  firstName?: string
  middleName?: string
  lastName?: string
  email: string
  phone: string
  password?: string
  dob?: string
  department: string
  designation: string
  joinDate: string
  status: 'active' | 'inactive' | 'probation'
  avatar?: string
  salary: number
  employeeId: string
  company?: string
  role?: string
  upiId?: string
  accountNumber?: string
  ifscCode?: string
  bankName?: string
  accountHolderName?: string
  parentName?: string
  parentNumber?: string
  relation?: string
  aadharCard?: string
  panCard?: string
  startTime?: string
  endTime?: string
  profilePhoto?: string
}

export interface Department {
  id: string
  name: string
  head: string
  employeeCount: number
}

export interface Designation {
  id: string
  title: string
  department: string
}

export interface Attendance {
  id: string
  employeeId: string
  employeeName: string
  date: string
  checkIn: string
  checkOut: string
  status: 'present' | 'absent' | 'late' | 'half-day'
  workHours: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  employee_name: string
  type: string
  start_date: string
  end_date: string
  duration: string
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
  requested_on: string
  day_type?: string
  half_day?: boolean
  approved_by?: string
  approved_by_role?: string
  approved_by_id?: string
  approved_by_photo?: string
}

export interface Payroll {
  id: string
  employeeId: string
  employeeName: string
  month: string
  year: number
  basicSalary: number
  allowances: number
  bonus: number
  deductions: number
  penalty: number
  securityDeposit?: number
  returnedDeposit?: number
  netSalary: number
  status: 'processed' | 'pending' | 'paid'
  totalWorkingDays: number
  workedDays: number
  leaveDays: number
  monthlyLeaveDays: number
  lopDays: number
  deductionRemarks?: string
}

export interface JobOpening {
  id: string
  title: string
  department: string
  location: string
  type: 'full-time' | 'part-time' | 'contract' | 'intern'
  applications: number
  status: 'open' | 'closed' | 'on-hold'
  postedDate: string
  experience?: string
  salaryRange?: string
}

export interface Application {
  id: string
  candidateName: string
  email: string
  phone: string
  status: 'new' | 'awaiting_approval' | 'tl_approved' | 'screening' | 'interview' | 'offered' | 'hired' | 'rejected'
  appliedDate: string
  resume?: string
  jobTitle?: string
  reference?: string
  interviewDate?: string
  interviewTime?: string
  interviewerName?: string
  interviewerId?: string
  interviewLink?: string
  interviewNotes?: string
}

export interface Intern {
  id: string
  name: string
  email: string
  department: string
  mentor: string
  startDate: string
  endDate: string
  status: 'active' | 'completed' | 'terminated'
}

export interface Asset {
  id: string
  name: string
  type: string
  serialNumber: string
  assignedTo?: string
  status: 'available' | 'assigned' | 'maintenance' | 'retired'
  purchaseDate: string
  value: number
}

export interface ExpenseClaim {
  id: string
  employeeId: string
  employeeName: string
  category: string
  amount: number
  description: string
  status: 'pending' | 'approved' | 'rejected' | 'reimbursed'
  submittedDate: string
  receiptUrl?: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  author: string
  date: string
  priority: 'low' | 'medium' | 'high'
  department?: string
}

export interface Holiday {
  id: string
  name: string
  date: string
  type: 'public' | 'company' | 'optional'
}

export interface KPI {
  id: string
  employeeId: string
  employeeName: string
  period: string
  score: number
  goals: number
  achieved: number
  rating: 'excellent' | 'good' | 'average' | 'poor'
}

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: { title: string; href: string }[]
}

export interface Client {
  id: string
  name: string
  companyName: string
  email: string
  phone: string
  address?: string
  department?: string
  status: 'active' | 'inactive'
  createdDate?: string
  greetingsMsgSent?: boolean
  greetingsLogs?: { timestamp: string; sentBy: string; status: boolean }[]
  workReviews?: {
    id: string;
    date: string;
    addedBy: string;
    content: string;
    type: string;
    status: 'Pending' | 'Approved' | 'Needs Revision';
    adminComment?: string;
  }[]
}
export interface WMTask {
  id: string
  title: string
  description?: string
  projectId: string
  projectName?: string
  assignedToId: string
  assignedToName?: string
  dueDate?: string
  status: 'todo' | 'in-progress' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdDate?: string
}
