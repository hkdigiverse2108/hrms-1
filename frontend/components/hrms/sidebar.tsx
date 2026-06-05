'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Clock,
  IndianRupee,
  Briefcase,
  GraduationCap,
  Target,
  Package,
  Receipt,
  Bell,
  FileText,
  Settings,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Building2,
  Calendar,
} from 'lucide-react'

import { useUserContext } from '@/context/UserContext'
 
 interface NavItem {
   title: string
   href: string
   icon: React.ComponentType<{ className?: string }>
   children?: { title: string; href: string }[]
   roles?: string[]
   moduleName?: string
 }
 
 const navItems: NavItem[] = [
   {
     title: 'Dashboard',
     href: '/',
     icon: LayoutDashboard,
     moduleName: 'dashboard',
     children: [
       { title: 'Overview', href: '/' },
       { title: 'Analytics', href: '/analytics' },
     ],
   },
   {
     title: 'Employee Management',
     href: '/employees',
     icon: Users,
     roles: ['admin', 'hr'],
     moduleName: 'employees',
     children: [
       { title: 'All Employees', href: '/employees' },
       { title: 'Org Structure', href: '/employees/organization/departments' },
       { title: 'Employee Documents', href: '/employees/documents' },
       { title: 'Document Generator', href: '/employees/documents/generate' },
       { title: 'Employee Lifecycle', href: '/employees/lifecycle' },
     ],
   },
   {
     title: 'Attendance & Time',
     href: '/attendance',
     icon: Clock,
     moduleName: 'attendance',
     children: [
       { title: 'Attendance', href: '/attendance' },
       { title: 'Late & Penalty', href: '/attendance/late-penalty' },
       { title: 'Shift Management', href: '/attendance/shifts' },
     ],
   },
   {
     title: 'Leave Requests',
     href: '/leave',
     icon: Calendar,
     moduleName: 'leave',
     children: [
       { title: 'All Leave Requests', href: '/leave' },
     ],
   },
   {
     title: 'Schedule',
     href: '/schedule',
     icon: Calendar,
     moduleName: 'schedule',
   },
   {
     title: 'Payroll',
     href: '/payroll',
     icon: IndianRupee,
     roles: ['admin', 'hr'],
     moduleName: 'payroll',
     children: [
       { title: 'Salary Structure', href: '/payroll/salary-structure' },
       { title: 'Payroll Processing', href: '/payroll' },
       { title: 'Payslips', href: '/payroll/payslips' },
       { title: 'Bonuses & Deductions', href: '/payroll/bonuses' },
     ],
   },
   {
     title: 'Recruitment',
     href: '/recruitment',
     icon: Briefcase,
     roles: ['admin', 'hr'],
     moduleName: 'recruitment',
     children: [
       { title: 'Interviews', href: '/recruitment/hiring-board' },
       { title: 'Hirings', href: '/recruitment' },
       { title: 'Applications', href: '/recruitment/applications' },
       { title: 'Interviews (Old)', href: '/recruitment/interviews' },
       { title: 'Offer Letters', href: '/recruitment/offers' },
     ],
   },
   {
     title: 'Internship Module',
     href: '/internships',
     icon: GraduationCap,
     roles: ['admin', 'hr'],
     moduleName: 'internships',
     children: [
       { title: 'Intern List', href: '/internships' },
       { title: 'Internship Offers', href: '/internships/offers' },
       { title: 'Certificates', href: '/internships/certificates' },
     ],
   },
   {
     title: 'Performance',
     href: '/performance',
     icon: Target,
     moduleName: 'performance',
     children: [
       { title: 'KPI Tracking', href: '/performance' },
       { title: 'Reviews', href: '/performance/reviews' },
       { title: 'Targets', href: '/performance/targets' },
     ],
   },
   {
     title: 'Assets',
     href: '/assets',
     icon: Package,
     moduleName: 'assets',
     children: [
       { title: 'Asset Management', href: '/assets' },
       { title: 'Assign Assets', href: '/assets/assign' },
     ],
   },
   {
     title: 'Finance & Expenses',
     href: '/expenses',
     icon: Receipt,
     moduleName: 'expenses',
     children: [
       { title: 'Expense Claims', href: '/expenses' },
       { title: 'Approvals', href: '/expenses/approvals' },
     ],
   },
   {
     title: 'Communication',
     href: '/communication',
     icon: Bell,
     moduleName: 'communication',
     children: [
       { title: 'Announcements', href: '/communication' },
       { title: 'Notifications', href: '/communication/notifications' },
     ],
   },
   {
     title: 'Documents',
     href: '/documents',
     icon: FileText,
     moduleName: 'documents',
     children: [
       { title: 'HR Documents', href: '/documents' },
       { title: 'Employee Docs', href: '/documents/employee' },
     ],
   },
   {
     title: 'Settings',
     href: '/settings',
     icon: Settings,
     roles: ['admin'],
     moduleName: 'settings',
     children: [
       { title: 'Company Settings', href: '/settings' },
       { title: 'Roles & Permissions', href: '/settings/roles' },
       { title: 'Leave Policy', href: '/settings/leave-policy' },
       { title: 'Holiday Calendar', href: '/settings/holidays' },
     ],
   },
   {
     title: 'Reports',
     href: '/reports',
     icon: BarChart3,
     roles: ['admin', 'hr'],
     moduleName: 'reports',
     children: [
       { title: 'Attendance Report', href: '/reports/attendance' },
       { title: 'Payroll Report', href: '/reports/payroll' },
       { title: 'Employee Report', href: '/reports/employees' },
     ],
   },
 ]
 
 export function HRMSSidebar() {
   const pathname = usePathname()
   const { user } = useUserContext()
   const [expandedItems, setExpandedItems] = useState<string[]>(['Dashboard'])
 
   const userRole = user?.role?.toLowerCase() || 'employee'
 
   const filteredNavItems = navItems.filter((item) => {
     // Admin always sees everything
     if (userRole === 'admin') return true;
     
     // Check granular permissions first
     if (item.moduleName && user?.permissions) {
       const perm = user.permissions.find((p: any) => p.moduleName === item.moduleName);
       if (perm) return perm.canView;
     }

     // Fallback to role-based access if no granular permission found
     if (!item.roles) return true
     return item.roles.includes(userRole)
   })
 
   const toggleExpanded = (title: string) => {
     setExpandedItems((prev) =>
       prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]
     )
   }
 
   const isActive = (href: string) => {
     if (href === '/') return pathname === '/'
     return pathname.startsWith(href)
   }

  const isChildActive = (children?: { title: string; href: string }[]) => {
    if (!children) return false
    return children.some((child) => pathname === child.href)
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Building2 className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">HRMS</h1>
          <p className="text-xs text-sidebar-foreground/60">Management System</p>
        </div>
      </div>

      <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isExpanded = expandedItems.includes(item.title)
            const hasActiveChild = isChildActive(item.children)

            return (
              <li key={item.title}>
                <button
                  onClick={() => toggleExpanded(item.title)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    hasActiveChild || isActive(item.href)
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    {item.title}
                  </span>
                  {item.children && (
                    <span className="text-sidebar-foreground/60">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </button>

                {item.children && isExpanded && (
                  <ul className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-4">
                    {item.children
                      .filter(child => {
                        if (child.title === 'Roles & Permissions' && userRole !== 'admin') return false
                        return true
                      })
                      .map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className={cn(
                            'block rounded-lg px-3 py-2 text-sm transition-colors',
                            pathname === child.href
                              ? 'bg-primary text-primary-foreground'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                          )}
                        >
                          {child.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
