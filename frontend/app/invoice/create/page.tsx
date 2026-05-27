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
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import dayjs from "dayjs";

interface LineItem {
  id: number;
  description: string;
  subDescription: string;
  rate: string;
  amount: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientDepartment, setClientDepartment] = useState("Billing Department");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("Payment is due within 14 days of the invoice date. A late fee of 1.5% per month will be applied to all overdue balances.");

  const [items, setItems] = useState<LineItem[]>([
    { id: 1, description: "Website Redesign & Development", subDescription: "Complete overhaul of corporate website including UI/UX design, frontend development, and CMS integration.", rate: "12000.00", amount: 12000.00 },
    { id: 2, description: "", subDescription: "", rate: "0.00", amount: 0.00 }
  ]);

  const [clients, setClients] = useState<any[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isCustomClient, setIsCustomClient] = useState(false);

  // Generate unique invoice number and default dates on mount
  useEffect(() => {
    generateInvoiceNumber();
    const today = dayjs();
    setIssueDate(today.format("MMM DD, YYYY"));
    setDueDate(today.add(14, "day").format("MMM DD, YYYY"));
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

  const generateInvoiceNumber = async () => {
    try {
      const res = await fetch(`${API_URL}/invoices/next-number`);
      if (res.ok) {
        const data = await res.json();
        setInvoiceNumber(data.nextInvoiceNumber);
      } else {
        const random = Math.floor(1000 + Math.random() * 9000);
        const currentYear = dayjs().year();
        setInvoiceNumber(`INV-${currentYear}-${random}`);
      }
    } catch (err) {
      console.error("Error fetching next invoice number:", err);
      const random = Math.floor(1000 + Math.random() * 9000);
      const currentYear = dayjs().year();
      setInvoiceNumber(`INV-${currentYear}-${random}`);
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: "", subDescription: "", rate: "0.00", amount: 0.00 }]);
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
        if (field === "rate") {
          const rateVal = parseFloat(value) || 0.0;
          updated.amount = rateVal;
        }
        return updated;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
  const discountRate = parseFloat(discount) || 0;
  const taxRate = parseFloat(tax) || 0;
  
  const discountAmount = subtotal * (discountRate / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);
  const totalDue = taxableAmount + taxAmount;

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      toast.error("Please enter a client name");
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
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        clientDepartment: clientDepartment || null,
        invoiceNumber,
        issueDate,
        dueDate,
        lineItems: items.map(item => ({
          description: item.description,
          subDescription: item.subDescription || null,
          rate: parseFloat(item.rate) || 0.0,
          amount: item.amount
        })),
        discount: discountRate,
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
                  placeholder="Type custom client name..." 
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
                        setClientPhone("");
                        setClientDepartment("");
                      } else {
                        setClientName(val);
                        const found = clients.find(c => (c.companyName || c.name) === val);
                        if (found) {
                          setClientAddress(found.address || "");
                          setClientEmail(found.email || "");
                          setClientPhone(found.phone || "");
                          setClientDepartment(found.department || "Billing Department");
                        } else {
                          setClientAddress("");
                          setClientEmail("");
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
                    placeholder="Enter client address..." 
                    className="bg-white border-border h-11 font-medium text-slate-700" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Client Email</label>
                  <Input 
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="Enter client email..." 
                    className="bg-white border-border h-11 font-medium text-slate-700" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Client Department</label>
                  <Input 
                    value={clientDepartment}
                    onChange={(e) => setClientDepartment(e.target.value)}
                    placeholder="e.g. Billing Department" 
                    className="bg-white border-border h-11 font-medium text-slate-700" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Client Phone (Optional)</label>
                  <Input 
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Enter client phone number..." 
                    className="bg-white border-border h-11 font-medium text-slate-700" 
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Invoice Number</label>
              <div className="flex gap-2">
                <Input value={invoiceNumber} className="bg-gray-50 flex-1 font-bold text-slate-700 h-11" readOnly />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={generateInvoiceNumber}
                  className="shrink-0 h-11 w-11 bg-white shadow-sm border-border"
                >
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Date of Issue</label>
              <div className="relative">
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input 
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="bg-white pr-10 h-11 font-medium" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Due Date</label>
              <div className="relative">
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  placeholder="Select due date..." 
                  className="bg-white pr-10 h-11 font-medium" 
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
              <div className="col-span-8">Item Description</div>
              <div className="col-span-2">Rate (₹)</div>
              <div className="col-span-2 text-right pr-12">Amount</div>
            </div>

            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start relative">
                <div className="col-span-12 md:col-span-8 space-y-2">
                  <Input 
                    placeholder="Item name / title" 
                    value={item.description}
                    onChange={(e) => updateItemField(item.id, "description", e.target.value)}
                    className="bg-white font-bold border-border text-slate-700" 
                  />
                  <Textarea 
                    placeholder="Add description details (optional)" 
                    value={item.subDescription}
                    onChange={(e) => updateItemField(item.id, "subDescription", e.target.value)}
                    className="bg-white text-xs resize-none h-16 min-h-[60px] border-border text-slate-500 font-medium" 
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <Input 
                    value={item.rate}
                    onChange={(e) => updateItemField(item.id, "rate", e.target.value)}
                    className="bg-white font-bold border-border text-center text-slate-700" 
                  />
                </div>
                <div className="col-span-6 md:col-span-2 flex items-center justify-between gap-4">
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
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment is due within 14 days..." 
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
                    <span className="text-muted-foreground font-semibold">Discount (%)</span>
                    <div className="w-24">
                      <Input 
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="bg-white h-9 text-right font-extrabold text-slate-700" 
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-semibold">Tax (%)</span>
                    <div className="w-24">
                      <Input 
                        value={tax}
                        onChange={(e) => setTax(e.target.value)}
                        className="bg-white h-9 text-right font-extrabold text-slate-700" 
                      />
                    </div>
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
