'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Clock,
  DollarSign,
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
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: { title: string; href: string }[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    children: [
      { title: 'Overview', href: '/' },
      { title: 'Analytics', href: '/analytics' },
    ],
  },
  {
    title: 'Employee Management',
    href: '/employees',
    icon: Users,
    children: [
      { title: 'All Employees', href: '/employees' },
      { title: 'Add Employee', href: '/employees/add' },
      { title: 'Departments', href: '/employees/departments' },
      { title: 'Designations', href: '/employees/designations' },
      { title: 'Employee Lifecycle', href: '/employees/lifecycle' },
    ],
  },
  {
    title: 'Attendance & Time',
    href: '/attendance',
    icon: Clock,
    children: [
      { title: 'Attendance', href: '/attendance' },
      { title: 'Leave Management', href: '/attendance/leave' },
      { title: 'Late & Penalty', href: '/attendance/late-penalty' },
      { title: 'Shift Management', href: '/attendance/shifts' },
    ],
  },
  {
    title: 'Payroll',
    href: '/payroll',
    icon: DollarSign,
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
    children: [
      { title: 'Job Openings', href: '/recruitment' },
      { title: 'Applications', href: '/recruitment/applications' },
      { title: 'Interviews', href: '/recruitment/interviews' },
      { title: 'Offer Letters', href: '/recruitment/offers' },
    ],
  },
  {
    title: 'Internship Module',
    href: '/internships',
    icon: GraduationCap,
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
    children: [
      { title: 'Asset Management', href: '/assets' },
      { title: 'Assign Assets', href: '/assets/assign' },
    ],
  },
  {
    title: 'Finance & Expenses',
    href: '/expenses',
    icon: Receipt,
    children: [
      { title: 'Expense Claims', href: '/expenses' },
      { title: 'Approvals', href: '/expenses/approvals' },
    ],
  },
  {
    title: 'Communication',
    href: '/communication',
    icon: Bell,
    children: [
      { title: 'Announcements', href: '/communication' },
      { title: 'Notifications', href: '/communication/notifications' },
    ],
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: FileText,
    children: [
      { title: 'HR Documents', href: '/documents' },
      { title: 'Employee Docs', href: '/documents/employee' },
    ],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
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
    children: [
      { title: 'Attendance Report', href: '/reports/attendance' },
      { title: 'Payroll Report', href: '/reports/payroll' },
      { title: 'Employee Report', href: '/reports/employees' },
    ],
  },
]

export function HRMSSidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Dashboard', 'Employee Management'])

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
          {navItems.map((item) => {
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
                    {item.children.map((child) => (
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
