"use client";

import { 
  Download,
  Edit2,
  ChevronLeft,
  CheckCircle2,
  ShieldHalf
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ViewInvoicePage() {
  const router = useRouter();

  return (
    <div className="space-y-6 pb-20">
      {/* Success Alert */}
      <div className="bg-brand-teal text-white px-6 py-3 rounded-lg flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <CheckCircle2 className="w-5 h-5 text-white/90" />
        <span className="text-sm font-medium">Invoice INV-2026-001 has been successfully created and sent to Acme Corp.</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9 border border-border" onClick={() => router.push('/invoice')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">INV-2026-001</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wide">Sent</span>
          </div>
          <div className="text-sm text-muted-foreground ml-2 hidden sm:block">Billed to Acme Corp</div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-10 px-4 font-medium">
            <Edit2 className="w-3.5 h-3.5 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="h-10 px-4 font-medium">
            <Download className="w-3.5 h-3.5 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice Document Layout */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-white border border-border rounded-xl shadow-lg p-10 md:p-16 min-h-[1000px] relative overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-start mb-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-border">
                <ShieldHalf className="w-8 h-8 text-brand-teal" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-slate-800 font-extrabold text-[18px] tracking-tight">HariKrushn</span>
                <span className="text-brand-teal font-bold text-[16px] -mt-1">DigiVerse LLP</span>
              </div>
            </div>
            
            <div className="text-right">
              <h2 className="text-4xl font-light text-slate-400 uppercase tracking-[0.2em] mb-4">Invoice</h2>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-end gap-4">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Invoice Number</span>
                  <span className="text-slate-800 font-bold min-w-[100px]">INV-2026-001</span>
                </div>
                <div className="flex justify-end gap-4">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Date of Issue</span>
                  <span className="text-slate-800 font-bold min-w-[100px]">Oct 25, 2026</span>
                </div>
                <div className="flex justify-end gap-4">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Due Date</span>
                  <span className="text-slate-800 font-bold min-w-[100px]">Nov 08, 2026</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-16">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">From</h3>
              <div className="text-sm leading-relaxed text-muted-foreground">
                <p className="font-bold text-slate-800 mb-1">HariKrushn DigiVerse LLP</p>
                <p>501, 502 Silver Trade Center,</p>
                <p>Mota Varachha, Surat, India 395006</p>
                <p className="mt-2 text-brand-teal font-medium">contact@digiverse.llp</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Billed To</h3>
              <div className="text-sm leading-relaxed text-muted-foreground">
                <p className="font-bold text-slate-800 mb-1">Acme Corp</p>
                <p>456 Business Avenue</p>
                <p>Suite 200</p>
                <p>Mumbai, MH 400001</p>
                <p className="mt-2 text-brand-teal font-medium">billing@acmecorp.com</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-16">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-slate-800">
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-4 text-left font-bold">Description</th>
                  <th className="py-4 text-right w-32 font-bold">Rate</th>
                  <th className="py-4 text-right w-32 font-bold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="group">
                  <td className="py-8 pr-10">
                    <p className="font-bold text-slate-800 text-[15px] mb-2">Website Redesign & Development</p>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
                      Complete overhaul of corporate website including UI/UX design, frontend development, and CMS integration.
                    </p>
                  </td>
                  <td className="py-8 text-right font-medium text-slate-600 align-top">₹ 12,000.00</td>
                  <td className="py-8 text-right font-bold text-slate-800 align-top">₹ 12,000.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex justify-end mb-16">
            <div className="w-64 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Subtotal</span>
                <span className="text-slate-800 font-bold">₹ 12,000.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Discount (0%)</span>
                <span className="text-slate-800 font-bold">₹ 0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Tax (0%)</span>
                <span className="text-slate-800 font-bold">₹ 0.00</span>
              </div>
              <div className="pt-4 border-t-2 border-slate-800 flex justify-between items-center">
                <span className="text-slate-800 font-extrabold uppercase text-[12px] tracking-widest">Total Due</span>
                <span className="text-slate-800 font-extrabold text-xl">₹ 12,000.00</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-auto border-t border-slate-100 pt-10">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Notes & Terms</h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Payment is due within 14 days of the invoice date. A late fee of 1.5% per month will be applied to all overdue balances. 
              Please include the invoice number on your check or transfer reference.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
