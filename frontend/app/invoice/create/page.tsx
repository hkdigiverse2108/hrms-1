"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon,
  Send,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/common/PageHeader";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import dayjs from "dayjs";

interface LineItem {
  id: number;
  description: string;
  rate: string;
  qty: string;
  discount: string;
  amount: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientGstin, setClientGstin] = useState("");
  const [clientDepartment, setClientDepartment] = useState("Billing Department");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceType, setInvoiceType] = useState("Tax Invoice");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [discount, setDiscount] = useState("0");
  const [cgst, setCgst] = useState("9");
  const [sgst, setSgst] = useState("9");
  const [isCgstEditable, setIsCgstEditable] = useState(false);
  const [isSgstEditable, setIsSgstEditable] = useState(false);
  const [isRoundedTotalEditable, setIsRoundedTotalEditable] = useState(false);
  const [roundedTotalInput, setRoundedTotalInput] = useState("");
  const [notes, setNotes] = useState("1. Payment is due within 3 days of the invoice date.\n2. Late payments may incur additional charges.\n3. All disputes are subject to Gujarat Jurisdiction.");

  const [items, setItems] = useState<LineItem[]>([
    { id: 1, description: "", rate: "", qty: "", discount: "", amount: 0.00 }
  ]);

  const [clients, setClients] = useState<any[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isCustomClient, setIsCustomClient] = useState(false);

  // Update invoice type if URL param changes
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "Proforma") {
      setInvoiceType("Proforma Invoice");
    } else {
      setInvoiceType("Tax Invoice");
    }
  }, [searchParams]);

  // Generate default dates and fetch clients on mount
  useEffect(() => {
    const today = dayjs();
    setIssueDate(today.format("YYYY-MM-DD"));
    setDueDate(today.add(3, "day").format("YYYY-MM-DD"));
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/clients`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setIsLoadingClients(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchNumber = async () => {
      try {
        const res = await fetch(`${API_URL}/invoices/next-number?type=${encodeURIComponent(invoiceType)}`);
        if (res.ok) {
          const data = await res.json();
          if (active) setInvoiceNumber(data.nextInvoiceNumber);
        } else {
          if (active) {
            const prefix = invoiceType === "Proforma Invoice" ? "PINV" : "INV";
            const random = Math.floor(100 + Math.random() * 900);
            setInvoiceNumber(`${prefix}-${random}`);
          }
        }
      } catch (err) {
        console.error("Error fetching next invoice number:", err);
        if (active) {
          const prefix = invoiceType === "Proforma Invoice" ? "PINV" : "INV";
          const random = Math.floor(100 + Math.random() * 900);
          setInvoiceNumber(`${prefix}-${random}`);
        }
      }
    };
    fetchNumber();
    return () => { active = false; };
  }, [invoiceType]);

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: "", rate: "0.00", qty: "1", discount: "0", amount: 0.00 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItemField = (id: number, field: keyof LineItem, value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "rate" || field === "qty") {
          const qtyVal = parseFloat(field === "qty" ? value : item.qty) || 0.0;
          const rateVal = parseFloat(field === "rate" ? value : item.rate) || 0.0;
          updated.amount = qtyVal * rateVal;
        }
        return updated;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
  const cgstRate = parseFloat(cgst) || 0;
  const sgstRate = parseFloat(sgst) || 0;
  const taxRate = cgstRate + sgstRate;
  
  const totalDiscountAmount = items.reduce((acc, item) => {
    const pct = parseFloat(item.discount) || 0;
    return acc + (item.amount * (pct / 100));
  }, 0);
  const taxableAmount = subtotal - totalDiscountAmount;
  const cgstAmount = taxableAmount * (cgstRate / 100);
  const sgstAmount = taxableAmount * (sgstRate / 100);
  const taxAmount = cgstAmount + sgstAmount;
  const actualTotal = taxableAmount + taxAmount;

  // Calculate roundOff and totalDue based on roundedTotalInput
  const roundedTotal = roundedTotalInput !== "" ? (parseFloat(roundedTotalInput) || 0) : Math.round(actualTotal);
  const roundOff = roundedTotal - actualTotal;
  const totalDue = roundedTotal;

  // Sync rounded total input with actualTotal on initialization or changes
  useEffect(() => {
    setRoundedTotalInput(Math.round(actualTotal).toFixed(2));
  }, [actualTotal]);

  const updateNotesDays = (currentNotes: string, days: number) => {
    const regex = /within \d+ days?/i;
    if (regex.test(currentNotes)) {
      return currentNotes.replace(regex, `within ${days} ${days === 1 ? 'day' : 'days'}`);
    }
    return currentNotes;
  };

  const handleIssueDateChange = (newIssueDate: string) => {
    setIssueDate(newIssueDate);
    if (newIssueDate && dueDate) {
      const diff = dayjs(dueDate).diff(dayjs(issueDate), "day");
      const preservedDiff = diff >= 0 ? diff : 3;
      const newDueDate = dayjs(newIssueDate).add(preservedDiff, "day").format("YYYY-MM-DD");
      setDueDate(newDueDate);
      
      // Update notes with the preserved difference
      setNotes(prev => updateNotesDays(prev, preservedDiff));
    }
  };

  const handleDueDateChange = (newDueDate: string) => {
    setDueDate(newDueDate);
    if (issueDate && newDueDate) {
      const diff = dayjs(newDueDate).diff(dayjs(issueDate), "day");
      if (diff >= 0) {
        setNotes(prev => updateNotesDays(prev, diff));
      }
    }
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    
    // Parse for "within X days" or "within X day"
    const match = newNotes.match(/within (\d+) days?/i);
    if (match && issueDate) {
      const days = parseInt(match[1], 10);
      if (!isNaN(days)) {
        const newDueDate = dayjs(issueDate).add(days, "day").format("YYYY-MM-DD");
        setDueDate(newDueDate);
      }
    }
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      toast.error("Please select or enter a client name");
      return;
    }

    if (!clientAddress.trim()) {
      toast.error("Please enter client address");
      return;
    }

    if (!clientDepartment.trim()) {
      toast.error("Please enter client department");
      return;
    }

    if (!clientPhone.trim()) {
      toast.error("Please enter client phone number");
      return;
    }

    if (!clientGstin.trim()) {
      toast.error("Please enter client GSTIN");
      return;
    }

    if (!issueDate) {
      toast.error("Please select a date of issue");
      return;
    }

    if (!dueDate) {
      toast.error("Please select a due date");
      return;
    }

    if (items.some(item => !item.description.trim())) {
      toast.error("All items must have a description");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        clientName,
        clientAddress: clientAddress || null,
        clientEmail: clientEmail.trim() || null,
        clientGstin: clientGstin.trim() || null,
        clientPhone: clientPhone || null,
        clientDepartment: clientDepartment || null,
        invoiceNumber,
        invoiceType,
        issueDate: dayjs(issueDate).format("MMM DD, YYYY"),
        dueDate: dayjs(dueDate).format("MMM DD, YYYY"),
        lineItems: items.map(item => {
          const pct = parseFloat(item.discount) || 0.0;
          const itemDiscountAmt = item.amount * (pct / 100);
          
          return {
            description: item.description,
            rate: parseFloat(item.rate) || 0.0,
            amount: item.amount,
            qty: parseFloat(item.qty) || 1.0,
            discount: itemDiscountAmt
          };
        }),
        discount: 0,
        tax: taxRate,
        subtotal,
        total: totalDue,
        notes: notes || null,
        status: "Pending"
      };

      const res = await fetch(`${API_URL}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Invoice created successfully!");
        router.push(`/invoice/${data.id}`);
      } else {
        toast.error("Failed to create invoice");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create invoice due to network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="Create Invoice" 
        description="Draft a new invoice to send to your client."
      >
        <div className="flex items-center gap-3">
          <Button variant="outline" className="px-6 h-10 font-medium bg-white" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm h-10 px-6"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Create & Send</>
            )}
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Invoice Details Card */}
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-base font-bold text-foreground">Invoice Details</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {isCustomClient ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-foreground">Billed To (Client)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomClient(false);
                      setClientName("");
                      setClientAddress("");
                      setClientEmail("");
                      setClientPhone("");
                      setClientDepartment("");
                    }}
                    className="text-xs font-bold text-brand-teal hover:underline"
                  >
                    Select from list
                  </button>
                </div>
                <Input 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Acme Corporation" 
                  className="bg-white border-border h-11 font-medium" 
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Billed To (Client)</label>
                {isLoadingClients ? (
                  <div className="flex items-center gap-2 h-11 bg-white border border-border rounded-md px-3">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
                    <span className="text-sm text-muted-foreground font-medium">Loading clients...</span>
                  </div>
                ) : (
                  <select
                    value={clientName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "CUSTOM_VALUE") {
                        setIsCustomClient(true);
                        setClientName("");
                        setClientAddress("");
                        setClientEmail("");
                        setClientGstin("");
                        setClientPhone("");
                        setClientDepartment("");
                      } else {
                        setClientName(val);
                        const found = clients.find(c => (c.companyName || c.name) === val);
                        if (found) {
                          setClientAddress(found.address || "");
                          if (found.email) {
                            if (found.email.includes('@')) {
                              setClientEmail(found.email);
                              setClientGstin("");
                            } else {
                              setClientGstin(found.email);
                              setClientEmail("");
                            }
                          } else {
                            setClientEmail("");
                            setClientGstin("");
                          }
                          setClientPhone(found.phone || "");
                          setClientDepartment(found.department || "Billing Department");
                        } else {
                          setClientAddress("");
                          setClientEmail("");
                          setClientGstin("");
                          setClientPhone("");
                          setClientDepartment("");
                        }
                      }
                    }}
                    className="w-full px-3 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer h-11 font-medium text-slate-700"
                  >
                    <option value="">Select a client...</option>
                    {clients.map((client) => {
                      const displayName = client.companyName || client.name;
                      return (
                        <option key={client.id} value={displayName}>
                          {displayName} {client.name && client.companyName ? `(${client.name})` : ""}
                        </option>
                      );
                    })}
                    <option value="CUSTOM_VALUE">-- Type Custom Client --</option>
                  </select>
                )}
              </div>
            )}
            
            {clientName && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Client Address</label>
                  <Input 
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Enter client address" 
                    className="bg-white border-border h-11 font-medium text-slate-700" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Client Department</label>
                  <Input 
                    value={clientDepartment}
                    onChange={(e) => setClientDepartment(e.target.value)}
                    placeholder="e.g. Finance & Accounts" 
                    className="bg-white border-border h-11 font-medium text-slate-700" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Client Phone</label>
                  <Input 
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Enter client phone number" 
                    className="bg-white border-border h-11 font-medium text-slate-700" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Client GSTIN</label>
                  <Input 
                    value={clientGstin}
                    onChange={(e) => setClientGstin(e.target.value)}
                    placeholder="Enter client GSTIN" 
                    className="bg-white border-border h-11 font-medium text-slate-700" 
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Invoice Type</label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="w-full px-3 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer h-11 font-medium text-slate-700"
              >
                <option value="Tax Invoice">Tax Invoice</option>
                <option value="Proforma Invoice">Proforma Invoice</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Invoice Number</label>
              <Input value={invoiceNumber} className="bg-gray-50 w-full font-bold text-slate-700 h-11" readOnly />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Date of Issue</label>
              <div className="relative">
                <Input 
                  type="date"
                  value={issueDate}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  className="bg-white h-11 font-medium cursor-pointer" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Due Date</label>
              <div className="relative">
                <Input 
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="bg-white h-11 font-medium cursor-pointer" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Card */}
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Line Items</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="hidden md:grid grid-cols-12 gap-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              <div className="col-span-5">Item Description</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-2 text-center">Rate (₹)</div>
              <div className="col-span-2 text-center">Disc. (%)</div>
              <div className="col-span-2 text-right pr-12">Amount</div>
            </div>

            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start relative">
                <div className="col-span-12 md:col-span-5">
                  <Input 
                    placeholder="Enter product/service name" 
                    value={item.description}
                    onChange={(e) => updateItemField(item.id, "description", e.target.value)}
                    className="bg-white font-bold border-border text-slate-700" 
                  />
                </div>
                <div className="col-span-6 md:col-span-1">
                  <Input 
                    value={item.qty}
                    onChange={(e) => updateItemField(item.id, "qty", e.target.value)}
                    placeholder="0"
                    className="bg-white font-bold border-border text-center text-slate-700" 
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <Input 
                    value={item.rate}
                    onChange={(e) => updateItemField(item.id, "rate", e.target.value)}
                    placeholder="0.00"
                    className="bg-white font-bold border-border text-center text-slate-700" 
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <Input 
                    value={item.discount}
                    onChange={(e) => updateItemField(item.id, "discount", e.target.value)}
                    placeholder="0.00"
                    className="bg-white font-bold border-border text-center text-slate-700" 
                  />
                </div>
                <div className="col-span-12 md:col-span-2 flex items-center justify-between gap-4">
                  <div className="flex-1 text-right font-extrabold text-slate-800 pt-2.5">
                    ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeItem(item.id)}
                    className={cn(
                      "h-10 w-10 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-full",
                      items.length === 1 && "opacity-30 cursor-not-allowed"
                    )}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button 
              variant="outline" 
              onClick={addItem}
              className="mt-2 text-brand-teal border-brand-teal/20 bg-brand-teal/5 hover:bg-brand-teal/10 font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Item
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-10 mt-6 border-t border-border">
              <div className="lg:col-span-7 space-y-3">
                <label className="text-sm font-semibold text-foreground">Notes / Terms</label>
                <Textarea 
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Enter custom terms, payment instructions, bank details, or additional notes here..." 
                  className="h-32 resize-none bg-white border-border text-sm leading-relaxed font-medium text-slate-600" 
                />
              </div>
              
              <div className="lg:col-span-5">
                <div className="bg-gray-50/50 rounded-xl p-6 border border-border space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-semibold">Subtotal</span>
                    <span className="text-slate-800 font-extrabold">₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-semibold">Total Discount</span>
                    <span className="text-slate-800 font-extrabold">₹ {totalDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-semibold">CGST (%)</span>
                    <div>
                      {isCgstEditable ? (
                        <div className="w-24">
                          <Input 
                            value={cgst}
                            onChange={(e) => setCgst(e.target.value)}
                            onBlur={() => setIsCgstEditable(false)}
                            autoFocus
                            className="bg-white h-9 text-right font-extrabold text-slate-700" 
                          />
                        </div>
                      ) : (
                        <span 
                          onClick={() => setIsCgstEditable(true)}
                          className="text-slate-800 font-extrabold cursor-pointer hover:text-brand-teal transition-colors select-none"
                        >
                          {cgst}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-semibold">SGST (%)</span>
                    <div>
                      {isSgstEditable ? (
                        <div className="w-24">
                          <Input 
                            value={sgst}
                            onChange={(e) => setSgst(e.target.value)}
                            onBlur={() => setIsSgstEditable(false)}
                            autoFocus
                            className="bg-white h-9 text-right font-extrabold text-slate-700" 
                          />
                        </div>
                      ) : (
                        <span 
                          onClick={() => setIsSgstEditable(true)}
                          className="text-slate-800 font-extrabold cursor-pointer hover:text-brand-teal transition-colors select-none"
                        >
                          {sgst}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Actual Total */}
                  <div className="flex items-center justify-between text-sm border-t border-dashed border-border pt-3 mt-1">
                    <span className="text-muted-foreground font-semibold">Actual Total</span>
                    <span className="text-slate-800 font-extrabold">₹ {actualTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Rounded Total Input */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-semibold">Rounded Total (₹)</span>
                    <div>
                      {isRoundedTotalEditable ? (
                        <div className="w-28">
                          <Input 
                            value={roundedTotalInput}
                            onChange={(e) => setRoundedTotalInput(e.target.value)}
                            onBlur={() => setIsRoundedTotalEditable(false)}
                            autoFocus
                            placeholder="0.00"
                            className="bg-white h-9 text-right font-extrabold text-slate-700" 
                          />
                        </div>
                      ) : (
                        <span 
                          onClick={() => setIsRoundedTotalEditable(true)}
                          className="text-slate-800 font-extrabold cursor-pointer hover:text-brand-teal transition-colors select-none"
                        >
                          ₹ {(parseFloat(roundedTotalInput) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Calculated Round Off */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-semibold">Calculated Round Off</span>
                    <span className="text-slate-800 font-extrabold">
                      {roundOff >= 0 ? "+" : ""}₹ {roundOff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="pt-4 mt-2 border-t border-border flex items-center justify-between">
                    <span className="text-foreground font-extrabold uppercase text-[11px] tracking-wider">Total Due</span>
                    <span className="text-brand-teal font-black text-xl">₹ {totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
