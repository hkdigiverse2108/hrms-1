'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Printer, Download, Mail, Building2, User, Calendar, CreditCard, Loader2 } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { useApi } from '@/hooks/useApi'

function PayslipContent() {
  const searchParams = useSearchParams()
  const payrollId = searchParams.get('id')
  const [record, setRecord] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (payrollId) fetchDetails()
    else setLoading(false)
  }, [payrollId])

  const fetchDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/payroll`)
      if (response.ok) {
        const data = await response.json()
        const payrollRecord = data.find((p: any) => p.id === payrollId)
        if (payrollRecord) {
          setRecord(payrollRecord)
          // Fetch employee details
          const empRes = await fetch(`${API_URL}/employees/${payrollRecord.employeeId}`)
          if (empRes.ok) setEmployee(await empRes.json())
        }
      }
    } catch (error) {
      console.error('Error fetching payslip details:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0)
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
    </div>
  )

  if (!record) return (
    <div className="text-center py-12 text-slate-500">
      Select a payslip from the Payroll Processing list to view.
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-end gap-3 no-print">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button className="bg-brand-teal hover:bg-brand-teal/90">
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <div className="bg-white p-12 rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 rounded-xl">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase">IT Solution Tech</h2>
              <p className="text-sm text-slate-500 font-medium">123 Tech Park, Silicon Valley, CA</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-black text-slate-900 uppercase">Payslip</h1>
            <p className="text-slate-500 font-bold">{record.month} {record.year}</p>
          </div>
        </div>

        {/* Employee Info */}
        <div className="grid grid-cols-2 gap-12 py-10 border-b border-slate-100">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest">Employee Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Name</span>
                <span className="font-bold text-slate-900">{record.employeeName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Employee ID</span>
                <span className="font-bold text-slate-900">{employee?.employeeId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Designation</span>
                <span className="font-bold text-slate-900">{employee?.designation}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Department</span>
                <span className="font-bold text-slate-900">{employee?.department}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest">Payment Info</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Bank Name</span>
                <span className="font-bold text-slate-900">{employee?.bankName || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Account No.</span>
                <span className="font-bold text-slate-900">{employee?.accountNumber || 'xxxx-xxxx-xxxx'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">IFSC Code</span>
                <span className="font-bold text-slate-900">{employee?.ifscCode || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Payment Status</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-black uppercase tracking-widest">{record.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Salary Components */}
        <div className="grid grid-cols-2 gap-0 py-0 border-b border-slate-900">
          <div className="border-r border-slate-100 p-8">
            <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-6 bg-slate-50 p-2 text-center rounded">Earnings</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Basic Salary</span>
                <span className="font-bold">{formatCurrency(record.basicSalary)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Allowances</span>
                <span className="font-bold text-emerald-600">+{formatCurrency(record.allowances)}</span>
              </div>
              {record.bonus > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Bonus</span>
                  <span className="font-bold text-emerald-600">+{formatCurrency(record.bonus)}</span>
                </div>
              )}
              <div className="pt-4 border-t border-slate-50 flex justify-between">
                <span className="font-bold text-slate-900">Gross Earnings</span>
                <span className="font-black text-slate-900">{formatCurrency(record.basicSalary + record.allowances + (record.bonus || 0))}</span>
              </div>
            </div>
          </div>
          <div className="p-8 bg-slate-50/30">
            <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-6 bg-slate-50 p-2 text-center rounded">Deductions</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Standard Deductions</span>
                <span className="font-bold text-rose-600">-{formatCurrency(record.deductions - (record.penalty || 0))}</span>
              </div>
              {record.penalty > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Penalties</span>
                  <span className="font-bold text-rose-600">-{formatCurrency(record.penalty)}</span>
                </div>
              )}
              <div className="pt-4 border-t border-slate-100 flex justify-between">
                <span className="font-bold text-slate-900">Total Deductions</span>
                <span className="font-black text-rose-600">{formatCurrency(record.deductions)}</span>
              </div>
              {record.deductionRemarks && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                   <p className="text-[10px] font-bold text-red-800 uppercase mb-1">Deduction Breakdown</p>
                   <p className="text-[11px] text-red-600 italic leading-tight">{record.deductionRemarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Net Salary */}
        <div className="mt-12 p-8 bg-slate-900 rounded-2xl flex justify-between items-center text-white">
          <div>
            <h4 className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mb-1">Net Payable Amount</h4>
            <p className="text-xs text-slate-500">Amount in words: One Thousand Five Hundred Dollars Only</p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black tracking-tighter">{formatCurrency(record.netSalary)}</span>
          </div>
        </div>

        <div className="mt-12 flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 italic">This is a system-generated payslip and does not require a physical signature.</p>
            <p className="text-[10px] font-bold text-slate-500">Generated on: {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-center w-48 border-t border-slate-200 pt-2">
            <p className="text-xs font-bold text-slate-900">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PayslipsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-teal" /></div>}>
      <PageHeader title="Employee Payslip" description="Detailed monthly salary breakdown and payment proof." />
      <PayslipContent />
    </Suspense>
  )
}
