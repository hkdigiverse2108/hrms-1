'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Printer, Download, Mail, Building2, User, Calendar, CreditCard, Loader2 } from 'lucide-react'
import { API_URL } from '@/lib/config'

function PayslipContent() {
  const searchParams = useSearchParams()
  const payrollId = searchParams.get('id')
  const [allPayrolls, setAllPayrolls] = useState<any[]>([])
  const [record, setRecord] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)

  const numberToWords = (num: number) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : '';
    return str;
  }

  const handleDownloadPDF = () => {
    setIsDownloading(true)
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = src
        script.onload = resolve
        script.onerror = reject
        document.body.appendChild(script)
      })
    }

    const generate = async () => {
      try {
        if (!(window as any).domtoimage) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js')
        }
        if (!(window as any).jspdf) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        }
        
        const node = document.getElementById('payslip-card')
        if (!node) return

        const dataUrl = await (window as any).domtoimage.toPng(node, {
          bgcolor: '#ffffff',
          style: { margin: '0', transform: 'scale(1)', borderRadius: '0' }
        })

        const { jsPDF } = (window as any).jspdf
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgProps = pdf.getImageProperties(dataUrl)
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)
        pdf.save(`Payslip_${record?.employeeName?.replace(/\s+/g, '_')}_${record?.month}.pdf`)
      } catch (error) {
        console.error('PDF Generation Error:', error)
        window.print()
      } finally {
        setIsDownloading(false)
      }
    }
    generate()
  }

  useEffect(() => {
    fetchDetails()
  }, [payrollId])

  const fetchDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/payroll`)
      if (response.ok) {
        const data = await response.json()
        setAllPayrolls(data)
        
        if (payrollId) {
          const payrollRecord = data.find((p: any) => p.id === payrollId)
          if (payrollRecord) {
            setRecord(payrollRecord)
            const empRes = await fetch(`${API_URL}/employees/${payrollRecord.employeeId}`)
            if (empRes.ok) setEmployee(await empRes.json())
          }
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

  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
  const currentUser = userStr ? JSON.parse(userStr) : null
  const isAdminOrHR = currentUser?.role === 'Admin' || currentUser?.role === 'HR'

  if (!record) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center bg-white rounded-xl border border-slate-100 shadow-sm">
        <Loader2 className="h-10 w-10 animate-spin text-brand-teal mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Please select a payslip from the payroll dashboard to view details.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: auto; margin: 10mm; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body * { visibility: hidden !important; }
          #payslip-card, #payslip-card * { visibility: visible !important; }
          #payslip-card { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            max-width: 100% !important;
            margin: 0 !important; 
            padding: 10mm !important;
            box-shadow: none !important; 
            border: none !important;
            border-radius: 0 !important;
          }
          .no-print { display: none !important; }
        }
      `}} />

      <div className="flex justify-end items-center no-print">
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.print()} className="border-slate-300">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isDownloading}
            className="bg-brand-teal hover:bg-brand-teal/90 shadow-md min-w-[140px]"
          >
            {isDownloading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" />Download PDF</>
            )}
          </Button>
        </div>
      </div>

      <div id="payslip-card" className="bg-white p-16 rounded-lg shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 font-sans">
        {/* Header - Brand Section */}
        <div className="flex justify-between items-start pb-10 border-b border-slate-100">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-[#1F2937] rounded flex items-center justify-center">
               <span className="text-white font-black text-2xl">HK</span>
             </div>
             <div className="flex flex-col leading-tight">
               <span className="text-[20px] font-black text-slate-900 tracking-tight">HK DigiVerse</span>
               <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">& IT Consultancy</span>
             </div>
          </div>
          <div className="text-right text-[12px] text-slate-600 space-y-0.5 font-medium">
            <p>Email: <span className="text-slate-900 font-bold">hrmangukiya3494@gmail.com</span></p>
            <p>Contact No: <span className="text-slate-900 font-bold">8866005029</span></p>
          </div>
        </div>

        {/* Metadata Section */}
        <div className="grid grid-cols-4 gap-8 py-10">
          <div className="space-y-1">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Invoice No.</p>
            <p className="text-[14px] font-black text-slate-900 uppercase">INV-{record.year}{record.month.slice(0,3).toUpperCase()}-{record.id.slice(-6).toUpperCase()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Date</p>
            <p className="text-[14px] font-black text-slate-900">{new Date().toLocaleDateString('en-GB')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Payment Status</p>
            <p className="text-[14px] font-black text-slate-900 uppercase tracking-tighter">{record.status || 'Draft'}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Total Amount</p>
            <p className="text-[18px] font-black text-slate-900">₹{record.netSalary?.toLocaleString()}</p>
          </div>
        </div>

        {/* Employee Info Section */}
        <div className="grid grid-cols-2 gap-x-24 gap-y-5 py-10">
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-slate-400 font-bold">Name :</span>
            <span className="font-black text-slate-900 text-right">{record.employeeName}</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-slate-400 font-bold">Department :</span>
            <span className="font-black text-slate-900 text-right">{employee?.department}</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-slate-400 font-bold">Designation :</span>
            <span className="font-black text-slate-900 text-right">{employee?.designation}</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-slate-400 font-bold">Position :</span>
            <span className="font-black text-slate-900 text-right">{employee?.role || 'Employee'}</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-slate-400 font-bold">Email :</span>
            <span className="font-black text-slate-900 text-right">{employee?.email}</span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-slate-400 font-bold">Phone :</span>
            <span className="font-black text-slate-900 text-right">{employee?.phone}</span>
          </div>
        </div>

        {/* Salary Details Section */}
        <div className="mt-8">
          <div className="bg-[#111827] text-white px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.2em] border-b-[32px] border-[#111827] relative">
            <span className="absolute inset-0 flex items-center px-5">Salary Details</span>
          </div>
          <div className="px-5 py-6 space-y-4">
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-400 font-bold">Base Salary</span>
              <span className="font-black text-slate-900">{record.basicSalary?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-400 font-bold">Bonus / Incentives</span>
              <span className="font-black text-slate-900">{( (record.bonus || 0) + (record.allowances || 0) ).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Deductions Section */}
        <div className="mt-4">
          <div className="bg-[#111827] text-white px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.2em] border-b-[32px] border-[#111827] relative">
            <span className="absolute inset-0 flex items-center px-5">Deductions</span>
          </div>
          <div className="px-5 py-6 space-y-4 border-b border-slate-100">
            <div className="flex justify-between text-[13px]">
              <span className="text-slate-400 font-bold">Loss of Pay (LOP)</span>
              <span className="font-black text-rose-600">-{ (record.deductions - (record.penalty || 0)).toLocaleString() }</span>
            </div>
            {record.penalty > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-400 font-bold">Performance Penalties</span>
                <span className="font-black text-rose-600">-{record.penalty?.toLocaleString()}</span>
              </div>
            )}
            
            {record.deductionRemarks && (
              <div className="mt-6 p-5 bg-slate-50/80 rounded-lg border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-black mb-1.5 tracking-widest">Remarks</p>
                <p className="text-[11px] text-slate-600 font-bold italic whitespace-pre-wrap leading-relaxed">{record.deductionRemarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Final Summary Section */}
        <div className="mt-16 flex justify-end px-5">
           <div className="flex items-center gap-12">
             <span className="text-[14px] font-black text-slate-300 uppercase tracking-[0.2em]">Total Salary</span>
             <span className="text-[28px] font-black text-slate-900 tracking-tighter">₹{record.netSalary?.toLocaleString()}</span>
           </div>
        </div>

        {/* Footer Area */}
        <div className="mt-20 grid grid-cols-2 gap-24 items-end px-5">
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Amount in words</p>
            <p className="text-[13px] font-black text-slate-700 capitalize italic leading-tight">Rupees {numberToWords(Math.round(record.netSalary))}</p>
          </div>
          <div className="text-center">
            <div className="w-full border-t border-slate-800 pt-4">
              <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Authorized Signatory</p>
            </div>
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
