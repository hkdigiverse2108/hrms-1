"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon,
  Send,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/common/PageHeader";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface LineItem {
  id: number;
  description: string;
  subDescription: string;
  rate: string;
  amount: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, description: "Website Redesign & Development", subDescription: "Complete overhaul of corporate website including UI/UX design, frontend development, and CMS integration.", rate: "12000.00", amount: 12000.00 },
    { id: 2, description: "", subDescription: "", rate: "0.00", amount: 0.00 }
  ]);

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: "", subDescription: "", rate: "0.00", amount: 0.00 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const subtotal = items.reduce((acc, item) => acc + item.amount, 0);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="Create Invoice" 
        description="Draft a new invoice to send to your client."
      >
        <div className="flex items-center gap-3">
          <Button variant="outline" className="px-6 h-10 font-medium" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm h-10 px-6">
            <Send className="w-4 h-4 mr-2" />
            Create & Send
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
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Billed To (Client)</label>
              <Input placeholder="Client Name..." className="bg-white border-border h-11" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Invoice Number</label>
              <div className="flex gap-2">
                <Input defaultValue="INV-2026-001" className="bg-gray-50 flex-1 font-medium text-muted-foreground h-11" readOnly />
                <Button variant="outline" size="icon" className="shrink-0 h-11 w-11 bg-white shadow-sm border-border">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Date of Issue</label>
              <div className="relative">
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input defaultValue="Oct 25, 2026" className="bg-white pr-10 h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Due Date</label>
              <div className="relative">
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input placeholder="Select due date..." className="bg-white pr-10 h-11" />
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
              <div className="col-span-2">Rate</div>
              <div className="col-span-2 text-right pr-12">Amount</div>
            </div>

            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start relative">
                <div className="col-span-12 md:col-span-8 space-y-2">
                  <Input 
                    placeholder="Item name" 
                    defaultValue={item.description}
                    className="bg-white font-medium border-border" 
                  />
                  <Textarea 
                    placeholder="Add description (optional)" 
                    defaultValue={item.subDescription}
                    className="bg-white text-xs resize-none h-16 min-h-[60px] border-border" 
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <Input 
                    defaultValue={item.rate}
                    className="bg-white font-medium border-border text-center" 
                  />
                </div>
                <div className="col-span-6 md:col-span-2 flex items-center justify-between gap-4">
                  <div className="flex-1 text-right font-bold text-slate-800 pt-2.5">
                    ₹ {item.amount.toFixed(2)}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-10 w-10 text-muted-foreground hover:text-red-600 hover:bg-red-50",
                      items.length === 1 && "opacity-30 cursor-not-allowed"
                    )}
                    onClick={() => removeItem(item.id)}
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
              className="mt-2 text-brand-teal border-brand-teal/20 bg-brand-teal/5 hover:bg-brand-teal/10 font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Item
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-10 mt-6 border-t border-border">
              <div className="lg:col-span-7 space-y-3">
                <label className="text-sm font-semibold text-foreground">Notes / Terms</label>
                <Textarea 
                  placeholder="Payment is due within 14 days..." 
                  defaultValue="Payment is due within 14 days of the invoice date. A late fee of 1.5% per month will be applied to all overdue balances."
                  className="h-32 resize-none bg-white border-border text-sm leading-relaxed" 
                />
              </div>
              
              <div className="lg:col-span-5">
                <div className="bg-gray-50/50 rounded-xl p-6 border border-border space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Subtotal</span>
                    <span className="text-slate-800 font-bold">₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Discount (%)</span>
                    <div className="w-24">
                      <Input defaultValue="0" className="bg-white h-9 text-right font-bold" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Tax (%)</span>
                    <div className="w-24">
                      <Input defaultValue="0" className="bg-white h-9 text-right font-bold" />
                    </div>
                  </div>
                  <div className="pt-4 mt-2 border-t border-border flex items-center justify-between">
                    <span className="text-foreground font-bold">Total Due</span>
                    <span className="text-brand-teal font-extrabold text-xl">₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
