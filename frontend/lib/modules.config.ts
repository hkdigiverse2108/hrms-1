import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  Calendar, 
  Briefcase, 
  DollarSign, 
  MonitorPlay, 
  MessagesSquare, 
  Star, 
  FileText, 
  Settings 
} from 'lucide-react'

export interface ModuleDef {
  moduleName: string
  displayName: string
  tabUrl: string
}

export interface PermissionGroup {
  name: string
  icon: any
  modules: ModuleDef[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: 'General',
    icon: LayoutDashboard,
    modules: [
      { moduleName: 'dashboard', displayName: 'Dashboard', tabUrl: '/' },
    ]
  },
  {
    name: 'Employees',
    icon: Users,
    modules: [
      { moduleName: 'employee-list', displayName: 'Employee List', tabUrl: '/employees' },
      { moduleName: 'org-structure', displayName: 'Org Structure', tabUrl: '/employees/organization/departments' },
      { moduleName: 'employee-attendance', displayName: 'Employee Attendance', tabUrl: '/employees/attendance' },
      { moduleName: 'leave-requests', displayName: 'Leave Requests', tabUrl: '/employees/leave' },
      { moduleName: 'employee-documents', displayName: 'Employee Documents', tabUrl: '/employees/documents' },
      { moduleName: 'document-generator', displayName: 'Document Generator', tabUrl: '/employees/documents/generate' },
    ]
  },
  {
    name: 'Payroll',
    icon: DollarSign,
    modules: [
      { moduleName: 'salary-structure', displayName: 'Salary Structure', tabUrl: '/payroll/salary-structure' },
      { moduleName: 'payroll-processing', displayName: 'Payroll Processing', tabUrl: '/payroll' },
      { moduleName: 'payslips', displayName: 'Payslips', tabUrl: '/payroll/payslips' },
      { moduleName: 'bonuses-deductions', displayName: 'Bonuses & Deductions', tabUrl: '/payroll/bonuses' },
    ]
  },
  {
    name: 'Recruitment',
    icon: Briefcase,
    modules: [
      { moduleName: 'interviews', displayName: 'Interviews', tabUrl: '/recruitment/hiring-board' },
      { moduleName: 'hirings', displayName: 'Hirings', tabUrl: '/recruitment' },
    ]
  },
  {
    name: 'Attendance',
    icon: Clock,
    modules: [
      { moduleName: 'attendance', displayName: 'Attendance', tabUrl: '/attendance' },
    ]
  },
  {
    name: 'Leave',
    icon: Calendar,
    modules: [
      { moduleName: 'leave', displayName: 'Leave', tabUrl: '/leave' },
    ]
  },
  {
    name: 'Workspace',
    icon: MonitorPlay,
    modules: [
      { moduleName: 'blank-canvas', displayName: 'Blank Canvas', tabUrl: '/workspace/blank-canvas' },
      { moduleName: 'seating-arrangement', displayName: 'Seating Arrangement', tabUrl: '/workspace/seating' },
      { moduleName: 'resource-management', displayName: 'Resource Management', tabUrl: '/workspace/resource' },
    ]
  },
  {
    name: 'Remarks',
    icon: MessagesSquare,
    modules: [
      { moduleName: 'remarks', displayName: 'Remarks', tabUrl: '/remarks' },
    ]
  },
  {
    name: 'Remarks',
    icon: Star,
    modules: [
      { moduleName: 'review', displayName: 'Remarks', tabUrl: '/review' },
    ]
  },
  {
    name: 'Invoice',
    icon: FileText,
    modules: [
      { moduleName: 'invoice', displayName: 'Invoice', tabUrl: '/invoice' },
    ]
  },
  {
    name: 'Chat',
    icon: MessagesSquare,
    modules: [
      { moduleName: 'chat', displayName: 'Chat', tabUrl: '/chat' },
    ]
  },
  {
    name: 'Work Management',
    icon: Briefcase,
    modules: [
      { moduleName: 'projects', displayName: 'Projects', tabUrl: '/work-management/projects' },
      { moduleName: 'tasks', displayName: 'Tasks', tabUrl: '/work-management/tasks' },
      { moduleName: 'daily-progress', displayName: 'Daily Progress', tabUrl: '/work-management/daily-progress' },
      { moduleName: 'sales', displayName: 'Sales', tabUrl: '/work-management/sales' },
      { moduleName: 'clients', displayName: 'Clients', tabUrl: '/work-management/clients' },
      { moduleName: 'marketing', displayName: 'Marketing Reports', tabUrl: '/work-management/marketing-reports' },
    ]
  },
  {
    name: 'Settings',
    icon: Settings,
    modules: [
      { moduleName: 'access-control', displayName: 'Access Control', tabUrl: '/employees/permissions' },
      { moduleName: 'settings', displayName: 'Settings', tabUrl: '/settings' },
    ]
  },
]

export const ALL_MODULES = PERMISSION_GROUPS.flatMap(g => g.modules)
