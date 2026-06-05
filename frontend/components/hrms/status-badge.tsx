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
import React from "react"
import { Badge } from "@/components/ui/badge"

export function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  let color = "bg-gray-100 text-gray-800";
  const s = status.toLowerCase();
  
  if (['approved', 'active', 'completed', 'paid', 'excellent', 'hired', 'won', 'client won', 'logged'].includes(s)) {
    color = "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200";
  } else if (['pending', 'processing', 'in-progress', 'good', 'scheduled', 'review', 'contacted', 'proposal sent', 'on break'].includes(s)) {
    color = "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border border-yellow-200";
  } else if (['rejected', 'inactive', 'failed', 'overdue', 'cancelled', 'needs improvement', 'client loss', 'absent'].includes(s)) {
    color = "bg-red-100 text-red-800 hover:bg-red-100 border border-red-200";
  } else if (['todo', 'new', 'lead', 'applied', 'leave'].includes(s)) {
    color = "bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-200";
  }

  return <Badge className={`${color} font-medium capitalize px-2.5 py-0.5`}>{status}</Badge>;
}
