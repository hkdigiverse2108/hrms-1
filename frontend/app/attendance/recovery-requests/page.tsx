'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { API_URL } from '@/lib/config'
import { toast } from 'sonner'
import { Clock, CheckCircle2, XCircle, ArrowLeft, User, Calendar } from 'lucide-react'
import Link from 'next/link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export default function RecoveryRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/time-recovery`)
      if (res.ok) {
        const data = await res.json()
        setRequests(data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      }
    } catch (err) {
      console.error('Error fetching requests:', err)
      toast.error('Failed to load requests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_URL}/time-recovery/${id}/status?status=${status}`, {
        method: 'PUT'
      })
      if (res.ok) {
        toast.success(`Request ${status} successfully`)
        fetchRequests()
      }
    } catch (err) {
      console.error('Error updating status:', err)
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/attendance">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <PageHeader 
          title="Time Recovery Requests" 
          description="Review and manage employee requests for break-time recovery."
        />
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            No recovery requests found.
          </Card>
        ) : (
          requests.map((req) => (
            <Card key={req.id} className="p-4 hover:shadow-md transition-shadow border-slate-200">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-brand-teal font-bold text-xs">
                      {req.employee_name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-base leading-tight">{req.employee_name}</h3>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="w-2.5 h-2.5" /> {req.employee_id}
                      </p>
                    </div>
                    <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'destructive'} className="ml-2 capitalize text-[10px] h-5 px-1.5">
                      {req.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 text-brand-teal" />
                      <span className="font-semibold text-slate-600 tracking-tight">Date:</span> {dayjs(req.date).format('MMM D, YYYY')}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 text-brand-teal" />
                      <span className="font-semibold text-slate-600 tracking-tight">Sent:</span> {dayjs(req.created_at).fromNow()}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                    <h4 className="text-[9px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Reason</h4>
                    <p className="text-xs text-slate-600 leading-snug">{req.reason}</p>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col justify-end gap-2 md:min-w-[120px] self-center">
                  {req.status === 'pending' && (
                    <>
                      <Button 
                        onClick={() => handleUpdateStatus(req.id, 'approved')}
                        className="h-8 flex-1 bg-brand-teal hover:bg-brand-teal-light text-white text-xs gap-1.5 px-3"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleUpdateStatus(req.id, 'rejected')}
                        className="h-8 flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs gap-1.5 px-3"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {req.status !== 'pending' && (
                    <div className="text-[10px] text-muted-foreground text-center italic py-1 bg-slate-50 rounded px-2 border border-slate-100">
                      Resolved
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
