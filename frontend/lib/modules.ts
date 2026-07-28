import { 
  Users, 
  IndianRupee, 
  Briefcase, 
  Clock, 
  MonitorPlay, 
  MessagesSquare, 
  Settings,
  Layers,
  Landmark
} from 'lucide-react';

export const MODULES_CONFIG = [
  {
    name: 'Employees',
    icon: Users,
    modules: [
      { moduleName: 'employee-list', displayName: 'Employee List', tabUrl: '/employees' },
      { moduleName: 'org-structure', displayName: 'Org Structure', tabUrl: '/employees/organization/departments' },
      { moduleName: 'employee-attendance', displayName: 'Employee Attendance List', tabUrl: '/employees/attendance' },
      { moduleName: 'leave-requests', displayName: 'Leave Requests', tabUrl: '/employees/leave' },
      { moduleName: 'employee-documents', displayName: 'Employee Documents', tabUrl: '/employees/documents' },
      { moduleName: 'document-generator', displayName: 'Document Generator', tabUrl: '/employees/documents/generate' },
    ]
  },
  {
    name: 'Payroll',
    icon: IndianRupee,
    modules: [
      { moduleName: 'salary-structure', displayName: 'Salary Structure', tabUrl: '/payroll/salary-structure' },
      { moduleName: 'payroll-processing', displayName: 'Payroll Processing', tabUrl: '/payroll' },
      { moduleName: 'payslips', displayName: 'Payslips', tabUrl: '/payroll/payslips' },
      { moduleName: 'bonuses-deductions', displayName: 'Bonuses & Deductions', tabUrl: '/payroll/bonuses' },
    ]
  },
  {
    name: 'Company Finance',
    icon: Landmark,
    modules: [
      { moduleName: 'company-finance-transactions', displayName: 'Transactions', tabUrl: '/company-finance' },
      { moduleName: 'company-finance-plan', displayName: 'Plan', tabUrl: '/company-finance/plan' },
      { moduleName: 'company-finance-summary', displayName: 'Summary', tabUrl: '/company-finance/summary' },
      { moduleName: 'company-finance-client-transactions', displayName: 'Client Transactions', tabUrl: '/company-finance/client-transactions' },
      { moduleName: 'company-finance-audit-logs', displayName: 'Audit Logs', tabUrl: '/company-finance/logs' },
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
    name: 'Attendance & Leave',
    icon: Clock,
    modules: [
      { moduleName: 'attendance', displayName: 'Attendance', tabUrl: '/attendance' },
      { moduleName: 'leave', displayName: 'Leave', tabUrl: '/leave' },
      { moduleName: 'schedule', displayName: 'Schedule', tabUrl: '/schedule' },
    ]
  },
  {
    name: 'Work Management',
    icon: Briefcase,
    modules: [
      { moduleName: 'projects', displayName: 'Projects', tabUrl: '/work-management/projects' },
      { moduleName: 'tasks', displayName: 'Development', tabUrl: '/work-management/development' },
      { moduleName: 'personal-tasks', displayName: 'Tasks', tabUrl: '/tasks' },
      { moduleName: 'daily-progress', displayName: 'Daily Progress', tabUrl: '/work-management/daily-progress' },
      { moduleName: 'work-logs', displayName: 'Work Logs', tabUrl: '/work-management/work-logs' },
      { moduleName: 'sales', displayName: 'Sales', tabUrl: '/work-management/sales' },
      { moduleName: 'clients', displayName: 'Clients', tabUrl: '/work-management/clients' },
      { moduleName: 'marketing', displayName: 'Digital Marketing', tabUrl: '/work-management/digital-marketing' },
      { moduleName: 'creative', displayName: 'Social Media Management', tabUrl: '/work-management/smm' },
      { moduleName: 'research', displayName: 'Research', tabUrl: '/work-management/research' },
    ]
  },
  {
    name: 'Workspace',
    icon: MonitorPlay,
    modules: [
      { moduleName: 'seating-arrangement', displayName: 'Seating Arrangement', tabUrl: '/workspace/seating' },
      { moduleName: 'resource-management', displayName: 'Resource Management', tabUrl: '/workspace/resource' },
    ]
  },
  {
    name: 'More',
    icon: MessagesSquare,
    modules: [
      { moduleName: 'remarks', displayName: 'Penalty', tabUrl: '/penalty' },
      { moduleName: 'review', displayName: 'Remarks', tabUrl: '/remarks' },
      { moduleName: 'invoice', displayName: 'Invoice', tabUrl: '/invoice' },
      { moduleName: 'chat', displayName: 'Chat', tabUrl: '/chat' },
      { moduleName: 'activity-tracker', displayName: 'Activity Tracker', tabUrl: '/activity-tracker' },
      { moduleName: 'activity-logs', displayName: 'Activity Logs', tabUrl: '/activity-logs' },
      { moduleName: 'gallery', displayName: 'Gallery', tabUrl: '/workspace/gallery' },
      { moduleName: 'training', displayName: 'Course Library', tabUrl: '/training' },
      { moduleName: 'admin-courses', displayName: 'Manage Courses', tabUrl: '/admin/courses' },
    ]
  },
  {
    name: 'System',
    icon: Settings,
    modules: [
      { moduleName: 'dashboard', displayName: 'Dashboard', tabUrl: '/' },
      { moduleName: 'access-control', displayName: 'Access Control', tabUrl: '/settings' },
      { moduleName: 'settings', displayName: 'Settings', tabUrl: '/settings' },
    ]
  },
];

export const FLAT_MODULES = MODULES_CONFIG.flatMap(g => g.modules);
