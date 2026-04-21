import type {
  Employee,
  Department,
  Designation,
  Attendance,
  LeaveRequest,
  Payroll,
  JobOpening,
  Application,
  Intern,
  Asset,
  ExpenseClaim,
  Announcement,
  Holiday,
  KPI,
} from './types'

// All data is now managed dynamically via the backend database.
// These arrays are kept as empty exports to prevent build breaks 
// in any legacy components while the full transition completes.

export const employees: Employee[] = []
export const departments: Department[] = []
export const designations: Designation[] = []
export const companies: any[] = []
export const roles: any[] = []
export const relations: any[] = []
export const positions: any[] = []
export const attendanceRecords: Attendance[] = []
export const leaveRequests: LeaveRequest[] = []
export const payrollRecords: Payroll[] = []
export const jobOpenings: JobOpening[] = []
export const applications: Application[] = []
export const interns: Intern[] = []
export const assets: Asset[] = []
export const expenseClaims: ExpenseClaim[] = []
export const announcements: Announcement[] = []
export const holidays: Holiday[] = []
export const kpiRecords: KPI[] = []

export const dashboardStats = {
  totalEmployees: 0,
  presentToday: 0,
  onLeave: 0,
  newJoinees: 0,
  pendingLeaves: 0,
  openPositions: 0,
  upcomingBirthdays: 0,
  upcomingAnniversaries: 0,
}
