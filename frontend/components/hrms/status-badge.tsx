import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusType =
  | 'active'
  | 'inactive'
  | 'probation'
  | 'present'
  | 'absent'
  | 'late'
  | 'half-day'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'processed'
  | 'paid'
  | 'reimbursed'
  | 'open'
  | 'closed'
  | 'on-hold'
  | 'new'
  | 'screening'
  | 'interview'
  | 'offered'
  | 'hired'
  | 'completed'
  | 'terminated'
  | 'available'
  | 'assigned'
  | 'maintenance'
  | 'retired'
  | 'excellent'
  | 'good'
  | 'average'
  | 'poor'
  | 'low'
  | 'medium'
  | 'high'
  | 'public'
  | 'company'
  | 'optional'

const statusStyles: Record<StatusType, string> = {
  // Employee/General status
  active: 'bg-green-100 text-green-700 border-green-200',
  inactive: 'bg-gray-100 text-gray-700 border-gray-200',
  probation: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  
  // Attendance
  present: 'bg-green-100 text-green-700 border-green-200',
  absent: 'bg-red-100 text-red-700 border-red-200',
  late: 'bg-orange-100 text-orange-700 border-orange-200',
  'half-day': 'bg-blue-100 text-blue-700 border-blue-200',
  
  // Leave/Expense/Payroll status
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  processed: 'bg-blue-100 text-blue-700 border-blue-200',
  paid: 'bg-green-100 text-green-700 border-green-200',
  reimbursed: 'bg-green-100 text-green-700 border-green-200',
  
  // Job status
  open: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-700 border-gray-200',
  'on-hold': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  
  // Application status
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  screening: 'bg-purple-100 text-purple-700 border-purple-200',
  interview: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  offered: 'bg-teal-100 text-teal-700 border-teal-200',
  hired: 'bg-green-100 text-green-700 border-green-200',
  
  // Intern status
  completed: 'bg-green-100 text-green-700 border-green-200',
  terminated: 'bg-red-100 text-red-700 border-red-200',
  
  // Asset status
  available: 'bg-green-100 text-green-700 border-green-200',
  assigned: 'bg-blue-100 text-blue-700 border-blue-200',
  maintenance: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  retired: 'bg-gray-100 text-gray-700 border-gray-200',
  
  // Performance ratings
  excellent: 'bg-green-100 text-green-700 border-green-200',
  good: 'bg-blue-100 text-blue-700 border-blue-200',
  average: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  poor: 'bg-red-100 text-red-700 border-red-200',
  
  // Priority
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-red-100 text-red-700 border-red-200',
  
  // Holiday type
  public: 'bg-green-100 text-green-700 border-green-200',
  company: 'bg-blue-100 text-blue-700 border-blue-200',
  optional: 'bg-gray-100 text-gray-700 border-gray-200',
}

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'capitalize font-medium',
        statusStyles[status] || 'bg-gray-100 text-gray-700 border-gray-200',
        className
      )}
    >
      {status.replace('-', ' ')}
    </Badge>
  )
}
