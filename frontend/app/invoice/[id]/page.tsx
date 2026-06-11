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
import { useConfirm } from "@/context/ConfirmContext";
import { API_URL } from "@/lib/config";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";

function convertNumberToWords(num: number): string {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + numToWords(n % 10000000) : '');
  };

  const roundedNum = Math.floor(num);
  const paisa = Math.round((num - roundedNum) * 100);
  
  let words = numToWords(roundedNum) + ' Rupees';
  if (paisa > 0) {
    words += ' and ' + numToWords(paisa) + ' Paisa';
  }
  words += ' Only';
  return words;
}

function getGradientContrastColor(color1: string, color2: string): string {
  const parseHex = (hexColor: string) => {
    const hex = (hexColor || "#08304b").replace('#', '');
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16)
      };
    }
    return {
      r: parseInt(hex.substr(0, 2), 16) || 0,
      g: parseInt(hex.substr(2, 2), 16) || 0,
      b: parseInt(hex.substr(4, 2), 16) || 0
    };
  };

  const c1 = parseHex(color1);
  const c2 = parseHex(color2);

  const r = (c1.r + c2.r) / 2;
  const g = (c1.g + c2.g) / 2;
  const b = (c1.b + c2.b) / 2;

  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 140) ? '#111827' : '#ffffff';
}

export default function ViewInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const { confirm } = useConfirm();

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/system-settings`);
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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

  const handleConvertToTaxInvoice = async () => {
    if (!invoice) return;
    const isConfirmed = await confirm({
      title: "Convert to Tax Invoice",
      message: "Are you sure you want to convert this Proforma Invoice to a Tax Invoice? This will generate a new Tax Invoice number.",
      confirmText: "Convert"
    });
    if (!isConfirmed) return;
    
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`${API_URL}/invoices/${invoiceId}/convert-to-tax`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const newInvoice = await res.json();
        toast.success("Successfully converted to Tax Invoice!");
        router.push(`/invoice/${newInvoice.id}`);
      } else {
        const errorData = await res.json();
        toast.error(errorData.detail || "Failed to convert invoice");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error converting invoice");
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

  const color1 = settings?.invoiceColor1 || "#08304b";
  const color2 = settings?.invoiceColor2 || "#08304b";
  const textColor = getGradientContrastColor(color1, color2);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Paid": return "bg-emerald-50 text-[#15803D] border-emerald-100";
      case "Pending": return "bg-amber-50 text-amber-700 border-amber-200/60";
      case "Overdue": return "bg-red-50 text-red-700 border-red-200/60";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const additionalDiscount = invoice.discount || 0;
  const taxRate = invoice.tax || 0;
  
  const discountAmount = invoice.lineItems.reduce((acc: number, item: any) => {
    const itemDiscount = typeof item.discount === 'number' ? item.discount : 0;
    return acc + itemDiscount;
  }, 0);
  const taxableAmount = invoice.subtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);

  const amountInWords = convertNumberToWords(invoice.total);
  const clientAddress = invoice.clientAddress || "";
  const companyState = settings?.companyState || "24";
  
  const stateMap: { [key: string]: string } = {
    "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
    "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
    "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
    "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "25": "Daman and Diu", "26": "Dadra and Nagar Haveli", "27": "Maharashtra", "29": "Karnataka",
    "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
    "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh",
    "38": "Ladakh"
  };
  
  const companyStateName = stateMap[companyState] || "Gujarat";
  
  let isSameState = true;
  if (invoice.clientState) {
    isSameState = invoice.clientState === companyState;
  } else if (invoice.clientGstin && /^\d{2}/.test(invoice.clientGstin.trim())) {
    isSameState = invoice.clientGstin.trim().substring(0, 2) === String(companyState);
  } else if (clientAddress) {
    isSameState = clientAddress.toLowerCase().includes(companyStateName.toLowerCase());
  }
  
  let placeOfSupply = companyStateName;
  if (invoice.clientState && stateMap[invoice.clientState]) {
    placeOfSupply = stateMap[invoice.clientState];
  } else if (!isSameState && clientAddress) {
    const foundState = Object.values(stateMap).find(stateName => 
      clientAddress.toLowerCase().includes(stateName.toLowerCase())
    );
    if (foundState) {
      placeOfSupply = foundState;
    } else {
      placeOfSupply = clientAddress.split(',').pop()?.replace(/[\d\s-]/g, '').trim() || companyStateName;
    }
  }
  const roundOff = invoice.total - (taxableAmount + taxAmount - additionalDiscount);

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
          {invoice.invoiceType === "Proforma Invoice" && (
            <Button 
              className="bg-brand-teal hover:bg-brand-teal/90 text-white font-medium h-10 px-4"
              onClick={handleConvertToTaxInvoice}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Processing...</>
              ) : (
                <><CheckCircle2 className="w-3.5 h-3.5 mr-2" />Convert to Tax Invoice</>
              )}
            </Button>
          )}
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
          {/* Header Layout */}
          <div className="px-12 pt-12 pb-5 flex justify-between items-start">
            <div className="flex gap-4 items-start max-w-[72%]">
              <div className="w-[52px] h-[60px] rounded-lg overflow-hidden shrink-0 mt-5 select-none pointer-events-none relative">
                <img 
                  src="/logo.png" 
                  alt="HK Icon" 
                  className="absolute top-0 left-0 w-[140px] h-[52px] max-w-none object-cover object-left" 
                  style={{ objectPosition: '0% 50%' }}
                />
              </div>
              <div>
                <h2 className="text-[#111827] font-bold text-[17px] tracking-tight leading-snug mb-0.5">
                  Harikrushn DigiVerse LLP
                </h2>
                <p className="text-[10.5px] font-semibold text-gray-700 leading-[1.5] tracking-wide whitespace-pre-wrap">
                  {settings?.companyAddress || (
                    <>
                      FLAT-204, 2nd FLOOR, RS NO-67/1, WING-A, HARIKRUSHANA<br />
                      COMPLEX, OPP. BHAGAT NAGAR, VED,<br />
                      GURUKULROAD, KATARGAM, SURAT- 395004, GUJARAT, INDIA.
                    </>
                  )}
                  <br />
                  Ph: {settings?.companyPhone || "+91 87805 64463"} | {settings?.companyEmail || "billing@hkdigiverse.com"} <br />
                  GSTIN: {settings?.companyGstin || "24AAXFN3372M1ZK"} | PAN: {settings?.companyPan || "AAXFN3372M"} | LLPIN: {settings?.companyLlpin || "ACK-1143"} | State: {settings?.companyState || "24"}
                </p>
              </div>
            </div>

            <div 
              className="px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider shadow-sm select-none"
              style={{ background: `linear-gradient(135deg, ${color1}, ${color2})`, color: textColor }}
            >
              {invoice.invoiceType ? invoice.invoiceType.toUpperCase() : "TAX INVOICE"}
            </div>
          </div>

          {/* Logo Brand Navy Horizontal Accent Divider Line */}
          <div 
            className="mx-12 h-[2px]" 
            style={{ background: `linear-gradient(90deg, ${color1}, ${color2})`, opacity: 0.3 }}
          />

          {/* Billing & Metadata Row */}
          <div className="px-12 pt-3 pb-2 space-y-1.5">
            {/* Row 1: BILL TO header */}
            <div className="flex justify-between items-end mb-1">
              <span className="text-[9.5px] font-bold text-gray-500 uppercase tracking-[0.18em] block select-none pointer-events-none">
                BILL TO
              </span>
              <div></div>
            </div>

            {/* Row 2: Client Name & Invoice No. */}
            <div className="flex justify-between items-baseline">
              <h3 className="font-bold text-[#111827] text-[14px] leading-none">
                {invoice.clientName}
              </h3>
              <div className="flex justify-between w-[210px] text-[12px] font-medium text-gray-500">
                <span className="text-gray-500">Invoice No.</span>
                <span className="text-[#111827] font-bold text-[13px] leading-none">{invoice.invoiceNumber}</span>
              </div>
            </div>

            {/* Row 3: Address & Date */}
            <div className="flex justify-between items-baseline">
              <p className="text-[12px] text-gray-700 font-medium leading-[1.2] max-w-[480px]">
                {invoice.clientAddress || ""}
              </p>
              <div className="flex justify-between w-[210px] text-[12px] font-medium text-gray-500">
                <span className="text-gray-500">Date</span>
                <span className="text-[#111827] font-bold text-[13px] leading-[1.2]">{dayjs(invoice.issueDate).format('YYYY-MM-DD')}</span>
              </div>
            </div>

            {/* Row 4: Phone & Place of Supply */}
            <div className="flex justify-between items-baseline">
              <p className="text-[12px] text-gray-700 font-medium leading-[1.2]">
                {invoice.clientPhone ? `Ph: ${invoice.clientPhone}` : ""}
              </p>
              <div className="flex justify-between w-[210px] text-[12px] font-medium text-gray-500">
                <span className="text-gray-500">Place of Supply</span>
                <span className="text-[#111827] font-bold text-[13px] leading-[1.2]">{placeOfSupply}</span>
              </div>
            </div>

            {/* Row 5: GSTIN */}
            {(invoice.clientGstin || (invoice.clientEmail && !invoice.clientEmail.includes('@'))) && (
              <div className="flex justify-between items-baseline">
                <p className="text-[12px] text-gray-700 font-medium leading-[1.2]">
                  GSTIN: {invoice.clientGstin || invoice.clientEmail}
                </p>
                <div className="w-[210px]"></div>
              </div>
            )}
          </div>

          {/* Table Details */}
          <div className="px-12 my-2 mb-0">
            <table className="w-full text-[11.5px] font-semibold">
              <thead>
                <tr 
                  className="font-bold text-center"
                  style={{ background: `linear-gradient(135deg, ${color1}, ${color2})`, color: textColor }}
                >
                  <th className="py-1 px-1 text-center w-10 font-bold" style={{ color: textColor }}>S.No</th>
                  <th className="py-1 px-1.5 text-left font-bold pl-2" style={{ color: textColor }}>Product Description</th>
                  <th className="py-1 px-1 w-14 text-center font-bold" style={{ color: textColor }}>SAC</th>
                  <th className="py-1 px-1 w-10 text-center font-bold" style={{ color: textColor }}>Qty</th>
                  <th className="py-1 px-1 w-20 text-center font-bold" style={{ color: textColor }}>Rate</th>
                  <th className="py-1 px-1 w-20 text-center font-bold" style={{ color: textColor }}>Amount</th>
                  <th className="py-1 px-1 w-20 text-center font-bold" style={{ color: textColor }}>Disc.</th>
                  <th className="py-1 px-1 w-22 text-center font-bold" style={{ color: textColor }}>Taxable Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.lineItems.map((item: any, idx: number) => {
                  const qty = typeof item.qty === 'number' ? item.qty : (item.rate > 0 ? Math.round(item.amount / item.rate) : 1);
                  const itemDiscount = typeof item.discount === 'number' ? item.discount : 0;
                  const itemTaxableAmt = item.amount - itemDiscount;
 
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-1 text-center text-slate-900 font-medium">{idx + 1}</td>
                      <td className="py-2 px-1.5 text-left pl-2">
                        <p className="text-slate-800 text-[#111827] text-[12.5px] whitespace-pre-wrap break-words leading-[1.2]">
                          {item.description}
                        </p>
                      </td>
                      <td className="py-2 px-1 text-center text-slate-900">{item.sac || settings?.defaultSac || ""}</td>
                      <td className="py-2 px-1 text-center text-slate-900">{qty}</td>
                      <td className="py-2 px-1 text-center text-slate-900">
                        {item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-900">
                        {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-900">
                        {item.discountType === "amount" ? `₹${(item.discountRate || itemDiscount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `${item.discountRate !== undefined ? item.discountRate : ((item.amount ? (itemDiscount / item.amount) * 100 : 0).toFixed(0))}%`}
                      </td>
                      <td className="py-2 px-1 text-end font-bold text-[#111827]">
                        {itemTaxableAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
 
                {/* Total Row */}
                <tr className="font-bold text-slate-900 border-t-2 border-slate-200">
                  <td colSpan={2} className="py-2 px-1.5 text-left pl-2 font-bold">Total</td>
                  <td className="py-2 px-1"></td>
                  <td className="py-2 px-1 text-center text-slate-900">
                    {invoice.lineItems.reduce((acc: number, item: any) => acc + (typeof item.qty === 'number' ? item.qty : (item.rate > 0 ? Math.round(item.amount / item.rate) : 1)), 0)}
                  </td>
                  <td className="py-2 px-1"></td>
                  <td className="py-2 px-1 text-center text-slate-900">
                    {invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-1 text-center text-slate-900">
                    {discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-1 text-end text-[#111827]">
                    {taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Calculations Summary block (Right Aligned) */}
          <div className="flex justify-end px-12">
            <div className="w-[280px] space-y-1.5 text-[12px] font-medium text-gray-500 pt-2.5">
              <div className="flex justify-between items-center border-b-2 border-slate-300">
                <span className="text-gray-500">Total Before Tax</span>
                <span className="text-[#111827] text-slate-900">
                  ₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              {invoice.taxType === "No Tax" ? null : invoice.taxType === "IGST" || (!invoice.taxType && !isSameState) ? (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Add: IGST @ {taxRate}%</span>
                  <span className="text-[#111827] text-slate-900">
                    ₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Add: CGST @ {(taxRate / 2)}%</span>
                    <span className="text-[#111827] text-slate-900">
                      ₹{(taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Add: SGST @ {(taxRate / 2)}%</span>
                    <span className="text-[#111827] text-slate-900">
                      ₹{(taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Total Tax Amount</span>
                <span className="text-[#111827] font-bold">
                  ₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {additionalDiscount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Less: Additional Discount</span>
                  <span className="text-[#111827] text-slate-900 font-bold">
                    -₹{additionalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Round Off</span>
                <span className="text-[#111827] text-slate-900">
                  {roundOff >= 0 ? '+' : ''}₹{roundOff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Total After Tax Banner */}
              <div 
                className="flex justify-between items-center px-3 py-1 rounded-sm shadow-sm select-none"
                style={{ background: `linear-gradient(135deg, ${color1}, ${color2})`, color: textColor }}
              >
                <span className="font-bold text-[11.5px] tracking-wider" style={{ color: textColor }}>Total After Tax</span>
                <span className="font-bold text-[14px]" style={{ color: textColor }}>
                  ₹{invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Amount In Words Banner */}
          <div className="mx-12 my-2.5 bg-[#F1F5F9] border border-slate-200/40 rounded-sm px-4 py-1.5 flex items-center justify-between shadow-sm leading-[1]">
            <div className="text-[11.5px] font-medium text-gray-500">
              Amount In Words: <span className="font-bold text-[#111827] text-[12.5px] ml-1.5">{amountInWords}</span>
            </div>
          </div>

          {/* Bank Details */}
          {invoice.paymentMode !== "Cash" && (
            <div className="mx-12 my-3 border border-slate-200 rounded-md px-4 py-2.5 flex flex-col gap-2 bg-white shadow-sm">
              <span className="text-[9.5px] font-bold text-slate-400 tracking-wider uppercase leading-none">
                BANK DETAILS
              </span>
              {invoice.paymentMode === "Other Account" ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-x-8 gap-y-2 text-[11.5px] text-slate-500 font-medium">
                    {invoice.otherBankName && (
                      <div>
                        Bank: <span className="font-bold text-[#111827] ml-0.5">{invoice.otherBankName}</span>
                      </div>
                    )}
                    {invoice.otherBankAccount && (
                      <div>
                        A/c: <span className="font-bold text-[#111827] ml-0.5">{invoice.otherBankAccount}</span>
                      </div>
                    )}
                    {invoice.otherBankIfsc && (
                      <div>
                        IFSC: <span className="font-bold text-[#111827] ml-0.5">{invoice.otherBankIfsc}</span>
                      </div>
                    )}
                    {invoice.otherUpiId && (
                      <div>
                        UPI: <span className="font-bold text-[#111827] ml-0.5">{invoice.otherUpiId}</span>
                      </div>
                    )}
                    {!invoice.otherBankName && !invoice.otherBankAccount && !invoice.otherBankIfsc && !invoice.otherUpiId && !invoice.otherQrUrl && (
                      <span>N/A</span>
                    )}
                  </div>
                  {invoice.otherQrUrl && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9.5px] font-bold text-slate-400 tracking-wider uppercase leading-none">
                        SCAN TO PAY
                      </span>
                      <img 
                        src={invoice.otherQrUrl.startsWith('http') ? invoice.otherQrUrl : `${API_URL}${invoice.otherQrUrl}`}
                        alt="QR Code"
                        className="w-16 h-16 object-contain rounded border border-slate-200 p-1"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-12 text-[11.5px] text-slate-500 font-medium">
                  <div>
                    Bank: <span className="font-bold text-[#111827] ml-0.5">{settings?.bankName || "Axis Bank"}</span>
                  </div>
                  <div>
                    A/c: <span className="font-bold text-[#111827] ml-0.5">{settings?.bankAccountNumber || "924020057377415"}</span>
                  </div>
                  <div>
                    IFSC: <span className="font-bold text-[#111827] ml-0.5">{settings?.bankIfscCode || "UTIB0002891"}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Terms & Authorized Signatory Row */}
          <div className="mx-12 mt-6 mb-8 grid grid-cols-2 gap-8 items-end">
            {/* Terms and Conditions */}
            <div className="space-y-2">
              <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                TERMS & CONDITIONS
              </span>
              {invoice.notes ? (
                <div className="text-[11px] text-gray-600 font-semibold leading-relaxed whitespace-pre-wrap">
                  {invoice.notes}
                </div>
              ) : (
                <ol className="list-decimal pl-3.5 text-[11px] text-gray-600 font-semibold leading-relaxed">
                  <li>Payment is due within 3 days of the invoice date.</li>
                  <li>Late payments may incur additional charges.</li>
                  <li>All disputes are subject to Gujarat Jurisdiction.</li>
                </ol>
              )}
            </div>

            {/* Signature Block */}
            <div className="flex flex-col items-center justify-end justify-self-end text-center space-y-1 self-end select-none">
              {settings?.companySignatureUrl && (
                <div className="relative mb-1 overflow-hidden max-h-16 w-36 flex items-center justify-center pointer-events-none">
                  <img 
                    src={settings.companySignatureUrl.startsWith('http') ? settings.companySignatureUrl : `${API_URL}${settings.companySignatureUrl}`} 
                    alt="Authorized Signature" 
                    className="max-h-16 object-contain" 
                  />
                </div>
              )}
              <div className="w-44 h-[2px] bg-black" />
              <h4 className="font-bold text-[#111827] text-[11.5px] uppercase tracking-wide leading-none">
                MANGUKIYA HET RAJESHBHAI
              </h4>
              <p className="text-[9.5px] font-medium text-slate-500 tracking-wide">
                For Harikrushn DigiVerse LLP
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
