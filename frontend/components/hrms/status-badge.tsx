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
