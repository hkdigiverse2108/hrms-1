"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon,
  Send,
  RefreshCw,
  Loader2,
  Upload,
  ChevronsUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/common/PageHeader";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import dayjs from "dayjs";
import { INDIAN_STATES } from "@/lib/constants";

interface LineItem {
  id: number;
  description: string;
  sac?: string;
  rate: string;
  qty: string;
  discount: string;
  discountType?: "percentage" | "amount";
  amount: number;
  isAmountEditable?: boolean;
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
  const [clientState, setClientState] = useState("");
  const [clientDepartment, setClientDepartment] = useState("Billing Department");
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceType, setInvoiceType] = useState("Tax Invoice");
  const [issueDate, setIssueDate] = useState("");
  const [discount, setDiscount] = useState("0");
  const [cgst, setCgst] = useState("9");
  const [sgst, setSgst] = useState("9");
  const [igst, setIgst] = useState("18");
  const [taxType, setTaxType] = useState("CGST+SGST");
  const [paymentMode, setPaymentMode] = useState("Current Account");
  const [isIgstEditable, setIsIgstEditable] = useState(false);
  const [isCgstEditable, setIsCgstEditable] = useState(false);
  const [isSgstEditable, setIsSgstEditable] = useState(false);
  const [isRoundedTotalEditable, setIsRoundedTotalEditable] = useState(false);
  const [isDiscountEditable, setIsDiscountEditable] = useState(false);
  const [companyState, setCompanyState] = useState("24");
  const [roundedTotalInput, setRoundedTotalInput] = useState("");
  const [notes, setNotes] = useState("1. Payment is due within 3 days of the invoice date.\n2. Late payments may incur additional charges.\n3. All disputes are subject to Gujarat Jurisdiction.");
  const [otherBankName, setOtherBankName] = useState("");
  const [otherBankAccount, setOtherBankAccount] = useState("");
  const [otherBankIfsc, setOtherBankIfsc] = useState("");
  const [otherUpiId, setOtherUpiId] = useState("");
  const [otherQrUrl, setOtherQrUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [items, setItems] = useState<LineItem[]>([
    { id: 1, description: "", sac: "", rate: "", qty: "", discount: "", discountType: "amount", amount: 0.00 }
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

  // Generate default dates, fetch clients and settings on mount
  useEffect(() => {
    const today = dayjs();
    setIssueDate(today.format("YYYY-MM-DD"));
    fetchClients();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/system-settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.companyState) {
          setCompanyState(data.companyState);
        }
        if (data.invoiceClientDepartments) {
          setAvailableDepartments(data.invoiceClientDepartments);
        }
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

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
        const res = await fetch(`${API_URL}/invoices/next-number?type=${encodeURIComponent(invoiceType)}&taxType=${encodeURIComponent(taxType)}`);
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
  }, [invoiceType, taxType]);

  // Adjust tax type based on payment mode
  // Adjust tax type based on payment mode and client state code / address
  useEffect(() => {
    if (paymentMode === "Cash" || paymentMode === "Other Account") {
      setTaxType("No Tax");
    } else {
      let isSameState = true;
      if (clientState) {
        isSameState = clientState === companyState;
      } else if (clientGstin && /^\d{2}/.test(clientGstin.trim())) {
        const clientStateCode = clientGstin.trim().substring(0, 2);
        isSameState = clientStateCode === String(companyState);
      } else if (clientAddress) {
        const stateMap: { [key: string]: string } = {
          "01": "jammu", "02": "himachal", "03": "punjab", "04": "chandigarh",
          "05": "uttarakhand", "06": "haryana", "07": "delhi", "08": "rajasthan",
          "09": "uttar pradesh", "10": "bihar", "11": "sikkim", "12": "arunachal",
          "13": "nagaland", "14": "manipur", "15": "mizoram", "16": "tripura",
          "17": "meghalaya", "18": "assam", "19": "west bengal", "20": "jharkhand",
          "21": "odisha", "22": "chhattisgarh", "23": "madhya pradesh", "24": "gujarat",
          "25": "daman", "26": "dadra", "27": "maharashtra", "29": "karnataka",
          "30": "goa", "31": "lakshadweep", "32": "kerala", "33": "tamil nadu",
          "34": "puducherry", "35": "andaman", "36": "telangana", "37": "andhra pradesh",
          "38": "ladakh"
        };
        const companyStateName = stateMap[companyState];
        if (companyStateName) {
          isSameState = clientAddress.toLowerCase().includes(companyStateName);
        }
      }
      setTaxType(isSameState ? "CGST+SGST" : "IGST");
    }
  }, [paymentMode, clientGstin, clientAddress, companyState, clientState]);

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: "", sac: "", rate: "0.00", qty: "1", discount: "0", discountType: "amount", amount: 0.00 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItemField = (id: number, field: keyof LineItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "rate" || field === "qty") {
          const qtyVal = parseFloat(field === "qty" ? value : item.qty) || 0.0;
          const rateVal = parseFloat(field === "rate" ? value : item.rate) || 0.0;
          updated.amount = qtyVal * rateVal;
        } else if (field === "amount") {
          const netAmt = parseFloat(value) || 0.0;
          const discountVal = parseFloat(item.discount) || 0.0;
          let grossAmt = netAmt;
          if (item.discountType === "amount") {
            grossAmt = netAmt + discountVal;
          } else {
            const pct = discountVal / 100;
            if (pct < 1) {
              grossAmt = netAmt / (1 - pct);
            }
          }
          updated.amount = grossAmt;
          
          const qtyVal = parseFloat(item.qty) || 1.0;
          if (qtyVal > 0) {
            updated.rate = (grossAmt / qtyVal).toFixed(2);
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
  const cgstRate = taxType === "CGST+SGST" ? (parseFloat(cgst) || 0) : 0;
  const sgstRate = taxType === "CGST+SGST" ? (parseFloat(sgst) || 0) : 0;
  const igstRate = taxType === "IGST" ? (parseFloat(igst) || 0) : 0;
  const taxRate = cgstRate + sgstRate + igstRate;
  
  const totalDiscountAmount = items.reduce((acc, item) => {
    const val = parseFloat(item.discount) || 0;
    if (item.discountType === "amount") {
      return acc + val;
    } else {
      return acc + (item.amount * (val / 100));
    }
  }, 0);
  const taxableAmount = subtotal - totalDiscountAmount;
  const cgstAmount = taxableAmount * (cgstRate / 100);
  const sgstAmount = taxableAmount * (sgstRate / 100);
  const igstAmount = taxableAmount * (igstRate / 100);
  const taxAmount = cgstAmount + sgstAmount + igstAmount;
  const additionalDiscount = parseFloat(discount) || 0;
  const actualTotal = taxableAmount + taxAmount - additionalDiscount;

  // Calculate roundOff and totalDue based on roundedTotalInput
  const roundedTotal = roundedTotalInput !== "" ? (parseFloat(roundedTotalInput) || 0) : Math.round(actualTotal);
  const roundOff = roundedTotal - actualTotal;
  const totalDue = roundedTotal;

  // Sync rounded total input with actualTotal on initialization or changes
  useEffect(() => {
    setRoundedTotalInput(Math.round(actualTotal).toFixed(2));
  }, [actualTotal]);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setOtherQrUrl(data.url);
        toast.success("QR Code uploaded successfully!");
      } else {
        toast.error("Failed to upload image.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleIssueDateChange = (newIssueDate: string) => {
    setIssueDate(newIssueDate);
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
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

    if (taxType !== "No Tax" && !clientGstin.trim()) {
      toast.error("Please enter client GSTIN");
      return;
    }

    if (!issueDate) {
      toast.error("Issue date is required");
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
        clientState: clientState || "",
        clientPhone: clientPhone || null,
        clientDepartment: clientDepartment || null,
        invoiceNumber,
        invoiceType,
        issueDate: dayjs(issueDate).format("MMM DD, YYYY"),
        lineItems: items.map(item => {
          const val = parseFloat(item.discount) || 0.0;
          const itemDiscountAmt = item.discountType === "amount" ? val : item.amount * (val / 100);
          
          return {
            description: item.description,
            sac: item.sac || "",
            rate: parseFloat(item.rate) || 0.0,
            amount: item.amount,
            qty: parseFloat(item.qty) || 1.0,
            discount: itemDiscountAmt,
            discountRate: val,
            discountType: item.discountType || "amount"
          };
        }),
        discount: parseFloat(discount) || 0,
        tax: taxRate,
        taxType: taxType,
        paymentMode: paymentMode,
        subtotal,
        total: totalDue,
        notes: notes || null,
        otherBankName: paymentMode === "Other Account" ? (otherBankName || null) : null,
        otherBankAccount: paymentMode === "Other Account" ? (otherBankAccount || null) : null,
        otherBankIfsc: paymentMode === "Other Account" ? (otherBankIfsc || null) : null,
        otherUpiId: paymentMode === "Other Account" ? (otherUpiId || null) : null,
        otherQrUrl: paymentMode === "Other Account" ? (otherQrUrl || null) : null,
        status: "Pending",
        createdBy: typeof window !== 'undefined' && localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).name : null,
        createdById: typeof window !== 'undefined' && localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : null,
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
                      setClientState("");
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
                        setClientState("");
                      } else {
                        setClientName(val);
                        const found = clients.find(c => (c.companyName || c.name) === val);
                        if (found) {
                          setClientAddress(found.address || "");
                          setClientEmail(found.email || "");
                          setClientGstin(found.gstin || "");
                          setClientPhone(found.phone || "");
                          setClientDepartment(found.department || "Billing Department");
                          setClientState(found.state || "");
                        } else {
                          setClientAddress("");
                          setClientEmail("");
                          setClientGstin("");
                          setClientPhone("");
                          setClientDepartment("");
                          setClientState("");
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
                  <label className="text-sm font-semibold text-foreground">State / UT (Optional)</label>
                  <select
                    value={clientState}
                    onChange={(e) => setClientState(e.target.value)}
                    className="w-full px-3 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer h-11 font-medium text-slate-700"
                  >
                    <option value="">Select State...</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.code} - {state.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Client Department</label>
                  {availableDepartments.length > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-11 border-border bg-white text-slate-700 font-medium"
                        >
                          <span className="truncate">
                            {clientDepartment || "Select Departments..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <div className="max-h-[250px] overflow-y-auto p-2 space-y-1">
                          {availableDepartments.map(dept => {
                            const isSelected = (clientDepartment || "").split(",").map(d => d.trim()).filter(Boolean).includes(dept);
                            return (
                              <div
                                key={dept}
                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-brand-teal/5 rounded-md cursor-pointer transition-colors"
                                onClick={() => {
                                  const currentDepts = clientDepartment ? clientDepartment.split(",").map(d => d.trim()).filter(Boolean) : [];
                                  if (currentDepts.includes(dept)) {
                                    setClientDepartment(currentDepts.filter(d => d !== dept).join(", "));
                                  } else {
                                    setClientDepartment([...currentDepts, dept].join(", "));
                                  }
                                }}
                              >
                                <Checkbox 
                                  checked={isSelected}
                                  className={cn("data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal")}
                                />
                                <span className={cn("text-sm font-medium", isSelected ? "text-brand-teal" : "text-slate-700")}>
                                  {dept}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Input 
                      value={clientDepartment}
                      onChange={(e) => setClientDepartment(e.target.value)}
                      placeholder="e.g. Finance & Accounts" 
                      className="bg-white border-border h-11 font-medium text-slate-700" 
                    />
                  )}
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
                  <label className="text-sm font-semibold text-foreground">
                    Client GSTIN {taxType !== "No Tax" && <span className="text-red-500">*</span>}
                  </label>
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
              <label className="text-sm font-semibold text-foreground">Mode of Payment</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 border border-border rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-brand-teal cursor-pointer h-11 font-medium text-slate-700"
              >
                <option value="Current Account">Current Account</option>
                <option value="Cash with GST">Cash with GST</option>
                <option value="Cash">Cash</option>
                <option value="Other Account">Other Account</option>
              </select>
            </div>
            {paymentMode === "Other Account" && (
              <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-slate-50 p-4 border border-slate-200 rounded-lg mt-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Bank Name</label>
                  <Input 
                    value={otherBankName}
                    onChange={(e) => setOtherBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank" 
                    className="bg-white border-border h-11 font-medium text-slate-700" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Account Number</label>
                  <Input 
                    value={otherBankAccount}
                    onChange={(e) => setOtherBankAccount(e.target.value)}
                    placeholder="Enter Account Number" 
                    className="bg-white border-border h-11 font-medium text-slate-700" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">IFSC Code</label>
                  <Input 
                    value={otherBankIfsc}
                    onChange={(e) => setOtherBankIfsc(e.target.value)}
                    placeholder="Enter IFSC Code" 
                    className="bg-white border-border h-11 font-medium text-slate-700" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">UPI ID (Optional)</label>
                  <Input 
                    value={otherUpiId}
                    onChange={(e) => setOtherUpiId(e.target.value)}
                    placeholder="e.g. user@upi" 
                    className="bg-white border-border h-11 font-medium text-slate-700 mb-2" 
                  />
                  <div className="flex items-center gap-4">
                    {otherQrUrl && (
                      <div className="relative border border-slate-200 rounded p-1 bg-white inline-block">
                        <img 
                          src={otherQrUrl.startsWith('http') ? otherQrUrl : `${API_URL}${otherQrUrl}`} 
                          alt="QR Code" 
                          className="h-10 w-10 object-contain rounded" 
                        />
                        <button 
                          type="button"
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                          onClick={() => setOtherQrUrl(null)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <Button asChild variant="outline" className="h-11 border-dashed border-2 text-slate-500 bg-white flex-1">
                      <label className="cursor-pointer flex justify-center w-full items-center">
                        {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        {otherQrUrl ? "Replace QR Photo" : "Upload QR Photo"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={isUploading} />
                      </label>
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
          </div>
        </div>

        {/* Line Items Card */}
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">Line Items</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="hidden md:grid grid-cols-12 gap-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              <div className="col-span-4">Item Description</div>
              <div className="col-span-1 text-center">SAC</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-2 text-center">Rate (₹)</div>
              <div className="col-span-2 text-center">Discount</div>
              <div className="col-span-2 text-right pr-12">Amount</div>
            </div>

            {items.map((item) => {
              const discountVal = parseFloat(item.discount) || 0;
              const itemDiscount = item.discountType === "amount" ? discountVal : item.amount * (discountVal / 100);
              const netAmount = item.amount - itemDiscount;

              return (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start relative">
                  <div className="col-span-12 md:col-span-4">
                    <Input 
                      placeholder="Enter product/service name" 
                      value={item.description}
                      onChange={(e) => updateItemField(item.id, "description", e.target.value)}
                      className="bg-white font-bold border-border text-slate-700" 
                    />
                  </div>
                  <div className="col-span-6 md:col-span-1">
                    <Input 
                      placeholder="SAC" 
                      value={item.sac || ""}
                      onChange={(e) => updateItemField(item.id, "sac", e.target.value)}
                      className="bg-white font-bold border-border text-center text-slate-700" 
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
                    <div className="flex border border-border rounded-md overflow-hidden bg-white shadow-xs focus-within:ring-1 focus-within:ring-brand-teal focus-within:border-brand-teal h-9 w-full">
                      <input 
                        type="text"
                        value={item.discount}
                        onChange={(e) => updateItemField(item.id, "discount", e.target.value)}
                        placeholder="0.00"
                        className="bg-transparent font-bold text-center text-slate-700 w-full h-full px-2 outline-none border-0 text-sm focus:ring-0" 
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newType = item.discountType === "amount" ? "percentage" : "amount";
                          updateItemField(item.id, "discountType", newType);
                        }}
                        className="px-2.5 bg-slate-50 border-l border-border text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 select-none shrink-0 transition-colors h-full flex items-center justify-center cursor-pointer"
                      >
                        {item.discountType === "amount" ? "₹" : "%"}
                      </button>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-2 flex items-center justify-between gap-4">
                    {item.isAmountEditable ? (
                      <input 
                        type="number"
                        value={item.amount === 0 ? "" : item.amount}
                        onChange={(e) => updateItemField(item.id, "amount", parseFloat(e.target.value) || 0)}
                        onBlur={() => updateItemField(item.id, "isAmountEditable", false)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            item.isAmountEditable = false; // We can set state through updated or just trigger onBlur
                            updateItemField(item.id, "isAmountEditable", false);
                          }
                        }}
                        autoFocus
                        className="w-full h-9 border border-border rounded-md text-right font-extrabold text-slate-800 px-2 focus:outline-none focus:ring-1 focus:ring-brand-teal focus:border-brand-teal" 
                      />
                    ) : (
                      <div 
                        onClick={() => updateItemField(item.id, "isAmountEditable", true)}
                        className="flex-1 text-right font-extrabold text-slate-800 pt-2.5 cursor-pointer hover:text-brand-teal transition-colors select-none"
                      >
                        ₹ {netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeItem(item.id)}
                      className={cn(
                        "h-10 w-10 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-full shrink-0",
                        items.length === 1 && "opacity-30 cursor-not-allowed"
                      )}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Totals Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-3 border-t border-b border-slate-100 font-bold text-slate-800 text-sm">
              <div className="col-span-12 md:col-span-4 text-left pl-2">Total</div>
              <div className="hidden md:block md:col-span-1"></div>
              <div className="col-span-6 md:col-span-1 text-center">
                {items.reduce((acc, item) => acc + (parseFloat(item.qty) || 0), 0)}
              </div>
              <div className="col-span-6 md:col-span-2 text-center">
                ₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="col-span-6 md:col-span-2 text-center">
                ₹ {totalDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="col-span-6 md:col-span-2 text-right pr-12 font-extrabold text-slate-900">
                ₹ {taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

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
                    <span className="text-muted-foreground font-semibold">Total Before Tax</span>
                    <span className="text-slate-800 font-extrabold">₹ {taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2">
                    <span className="text-muted-foreground font-semibold">Tax Options</span>
                    <select 
                      value={taxType}
                      onChange={(e) => setTaxType(e.target.value)}
                      className="w-32 h-8 px-2 rounded-md border border-border bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-teal"
                    >
                      {(paymentMode === "Cash" || paymentMode === "Other Account") && (
                        <option value="No Tax">No Tax</option>
                      )}
                      {paymentMode !== "Cash" && paymentMode !== "Other Account" && (
                        <>
                          <option value="CGST+SGST">CGST + SGST</option>
                          <option value="IGST">IGST</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  {taxType === "CGST+SGST" && (
                    <>
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
                    </>
                  )}

                  {taxType === "IGST" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-semibold">IGST (%)</span>
                      <div>
                        {isIgstEditable ? (
                          <div className="w-24">
                            <Input 
                              value={igst}
                              onChange={(e) => setIgst(e.target.value)}
                              onBlur={() => setIsIgstEditable(false)}
                              autoFocus
                              className="bg-white h-9 text-right font-extrabold text-slate-700" 
                            />
                          </div>
                        ) : (
                          <span 
                            onClick={() => setIsIgstEditable(true)}
                            className="text-slate-800 font-extrabold cursor-pointer hover:text-brand-teal transition-colors select-none"
                          >
                            {igst}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Additional Discount */}
                  <div className="flex items-center justify-between text-sm border-t border-dashed border-border pt-3 mt-1">
                    <span className="text-muted-foreground font-semibold">Additional Discount (₹)</span>
                    <div>
                      {isDiscountEditable ? (
                        <div className="w-24">
                          <Input 
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            onBlur={() => setIsDiscountEditable(false)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setIsDiscountEditable(false);
                              }
                            }}
                            autoFocus
                            placeholder="0.00"
                            className="bg-white h-9 text-right font-extrabold text-slate-700" 
                          />
                        </div>
                      ) : (
                        <span 
                          onClick={() => setIsDiscountEditable(true)}
                          className="text-slate-800 font-extrabold cursor-pointer hover:text-brand-teal transition-colors select-none"
                        >
                          ₹ {(parseFloat(discount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total Tax Amount */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-semibold">Total Tax Amount</span>
                    <span className="text-slate-800 font-extrabold">₹ {taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
