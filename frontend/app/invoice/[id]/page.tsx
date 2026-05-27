"use client";

import { useState, useEffect } from "react";
import { 
  Download,
  CheckCircle2,
  ShieldHalf,
  Loader2,
  ChevronLeft,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { API_URL } from "@/lib/config";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";

export default function ViewInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    // Dynamic import/load of external PDF dependencies
    const scripts = [
      'https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    ];
    scripts.forEach(src => {
      if (!document.querySelector(`script[src="${src}"]`)) {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        document.body.appendChild(script);
      }
    });
  }, []);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceDetails();
    }
  }, [invoiceId]);

  const fetchInvoiceDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/invoices/${invoiceId}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
      } else {
        toast.error("Failed to load invoice details");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error loading invoice details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setIsDownloading(true);
    try {
      const node = document.querySelector('.invoice-card-container') as HTMLElement;
      if (!node) {
        toast.error('Invoice element not found');
        setIsDownloading(false);
        return;
      }

      const domtoimage = (window as any).domtoimage;
      const { jsPDF } = (window as any).jspdf;

      if (!domtoimage || !jsPDF) {
        toast.error('Libraries not loaded yet. Please wait a second.');
        setIsDownloading(false);
        return;
      }

      const rect = node.getBoundingClientRect();
      const nodeWidth = rect.width || 800;
      const nodeHeight = rect.height || 1131;
      
      const clone = node.cloneNode(true) as HTMLElement;
      
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = `${nodeWidth}px`;
      container.style.height = `${nodeHeight}px`;
      container.style.overflow = 'hidden';
      container.style.background = 'white';
      container.appendChild(clone);
      document.body.appendChild(container);

      clone.style.width = `${nodeWidth}px`;
      clone.style.height = `${nodeHeight}px`;
      clone.style.margin = '0';
      clone.style.padding = '0';
      clone.style.position = 'relative';
      clone.style.transform = 'none';
      clone.style.border = 'none';
      clone.style.boxShadow = 'none';

      const scale = 2;
      const dataUrl = await domtoimage.toPng(clone, {
        bgcolor: '#ffffff',
        width: nodeWidth * scale,
        height: nodeHeight * scale,
        cacheBust: true,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${nodeWidth}px`,
          height: `${nodeHeight}px`,
        }
      });

      document.body.removeChild(container);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (nodeHeight * pdfWidth) / nodeWidth;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);
      toast.success('Downloaded successfully!');
    } catch (error) {
      console.error('PDF Error:', error);
      toast.error('Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`${API_URL}/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Paid" })
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoice(updated);
        toast.success("Invoice successfully marked as Paid!");
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error updating status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-brand-teal animate-spin" />
        <span className="text-sm font-semibold text-muted-foreground">Loading invoice details...</span>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <div className="text-lg font-bold text-slate-700">Invoice Not Found</div>
        <p className="text-sm text-muted-foreground max-w-sm">The invoice you are trying to view does not exist or may have been deleted.</p>
        <Button onClick={() => router.push('/invoice')} className="bg-brand-teal text-white">Back to Invoices</Button>
      </div>
    );
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Paid": return "bg-emerald-50 text-[#15803D] border-emerald-100";
      case "Pending": return "bg-amber-50 text-amber-700 border-amber-200/60";
      case "Overdue": return "bg-red-50 text-red-700 border-red-200/60";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const discountRate = invoice.discount || 0;
  const taxRate = invoice.tax || 0;
  
  const discountAmount = invoice.subtotal * (discountRate / 100);
  const taxableAmount = invoice.subtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);

  return (
    <div className="space-y-6 pb-20">


      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9 border border-border bg-white" onClick={() => router.push('/invoice')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#111827]">{invoice.invoiceNumber}</h1>
            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wide", getStatusStyles(invoice.status))}>
              {invoice.status}
            </span>
          </div>
          <div className="text-sm text-muted-foreground ml-2 hidden sm:block font-medium">Billed to {invoice.clientName}</div>
        </div>
        
        <div className="flex items-center gap-3">
          {invoice.status !== "Paid" && (
            <Button 
              className="bg-[#15803D] hover:bg-[#15803D]/90 text-white font-medium h-10 px-4"
              onClick={handleMarkAsPaid}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Processing...</>
              ) : (
                <><DollarSign className="w-3.5 h-3.5 mr-2" />Mark as Paid</>
              )}
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 px-4 font-medium bg-white"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Downloading...</>
            ) : (
              <><Download className="w-3.5 h-3.5 mr-2" />Download PDF</>
            )}
          </Button>
        </div>
      </div>

      {/* Invoice Document Layout */}
      <div className="flex justify-center overflow-x-auto py-4">
        <div className="invoice-card-container bg-white border border-border rounded-xl shadow-lg min-h-[1123px] w-[794px] shrink-0 relative overflow-hidden flex flex-col">
          {/* Edge-to-Edge Corporate Brand Banner Header */}
          <div className="w-full mb-12 select-none pointer-events-none border-slate-100">
            <img 
              src="/header.png" 
              alt="HariKrushn DigiVerse LLP" 
              className="w-full h-auto block" 
              style={{ 
                imageRendering: 'pixelated', 
                msInterpolationMode: 'nearest-neighbor' 
              } as any}
            />
          </div>

          {/* Invoice Meta and Billing Information Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16 border-b border-slate-100 pb-12 px-10 md:px-12">
            {/* Column 1: Billed From */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-widest border-b border-slate-200 pb-1.5">From</h3>
              <div className="text-sm leading-relaxed text-muted-foreground font-medium">
                <p className="font-extrabold text-[#111827] mb-1 text-[15px]">HariKrushn DigiVerse LLP</p>
                <p>501, 502 Silver Trade Center,</p>
                <p>Mota Varachha, Surat, India 395006</p>
                <p className="mt-2 text-[#4B5563] font-semibold">contact@digiverse.llp</p>
              </div>
            </div>

            {/* Column 2: Billed To */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-widest border-b border-slate-200 pb-1.5">Billed To</h3>
              <div className="text-sm leading-relaxed text-muted-foreground font-medium">
                <p className="font-extrabold text-[#111827] mb-1 text-[15px]">{invoice.clientName}</p>
                <p className="whitespace-pre-wrap">{invoice.clientAddress || "Corporate Office Address"}</p>
                <p>{invoice.clientDepartment || "Billing Department"}</p>
                {invoice.clientPhone && <p>Phone: {invoice.clientPhone}</p>}
                <p className="mt-2 text-[#4B5563] font-semibold">
                  {invoice.clientEmail || `billing@${invoice.clientName.toLowerCase().replace(/\s+/g, "")}.com`}
                </p>
              </div>
            </div>

            {/* Column 3: Invoice Numbers/Dates */}
            <div className="space-y-3 md:text-right">
              <h3 className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-widest border-b border-slate-200 pb-1.5 md:text-right">Invoice Details</h3>
              <div className="space-y-2 text-sm text-muted-foreground font-medium">
                <div className="flex md:justify-end gap-4">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Invoice ID</span>
                  <span className="text-[#111827] font-extrabold min-w-[100px] text-left md:text-right">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex md:justify-end gap-4">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Issue Date</span>
                  <span className="text-[#111827] font-extrabold min-w-[100px] text-left md:text-right">{invoice.issueDate}</span>
                </div>
                <div className="flex md:justify-end gap-4">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Due Date</span>
                  <span className="text-[#111827] font-extrabold min-w-[100px] text-left md:text-right">{invoice.dueDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-16 px-10 md:px-12">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-slate-800">
                <tr className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-widest">
                  <th className="py-4 text-left font-bold">Description</th>
                  <th className="py-4 text-right w-32 font-bold">Rate</th>
                  <th className="py-4 text-right w-32 font-bold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.lineItems.map((item: any, idx: number) => (
                  <tr key={idx} className="group">
                    <td className="py-8 pr-10">
                      <p className="font-extrabold text-[#111827] text-[15px] mb-2">{item.description}</p>
                      {item.subDescription && (
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-lg font-semibold text-slate-500">
                          {item.subDescription}
                        </p>
                      )}
                    </td>
                    <td className="py-8 text-right font-bold text-slate-600 align-top">
                      ₹ {item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-8 text-right font-black text-[#111827] align-top">
                      ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex justify-end mb-16 mt-auto px-10 md:px-12">
            <div className="w-64 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-semibold">Subtotal</span>
                <span className="text-[#111827] font-extrabold">₹ {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-semibold">Discount ({discountRate}%)</span>
                <span className="text-[#111827] font-extrabold">₹ {discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-semibold">Tax ({taxRate}%)</span>
                <span className="text-[#111827] font-extrabold">₹ {taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-4 border-t-2 border-slate-800 flex justify-between items-center">
                <span className="text-[#111827] font-black uppercase text-[12px] tracking-widest">Total Due</span>
                <span className="text-[#111827] font-black text-xl">₹ {invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t border-slate-100 pt-10 px-10 md:px-12 pb-12">
              <h3 className="text-[10px] font-extrabold text-[#4B5563] uppercase tracking-widest mb-4">Notes & Terms</h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl font-semibold text-slate-500">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
