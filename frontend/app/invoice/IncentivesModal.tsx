import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

interface Employee {
  id: string;
  name: string;
}

interface InvoiceIncentive {
  employeeId: string;
  employeeName: string;
  amount: number;
}

interface IncentivesModalProps {
  invoice: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedInvoice: any) => void;
}

export function IncentivesModal({ invoice, isOpen, onClose, onSaved }: IncentivesModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [incentives, setIncentives] = useState<InvoiceIncentive[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [salesTargets, setSalesTargets] = useState<any[]>([]);
  const [incentiveSlabs, setIncentiveSlabs] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetchTargetsAndSlabs();
      if (invoice) {
        setTotalAmount(invoice.totalIncentiveAmount?.toString() || "");
        setIncentives(invoice.incentives || []);
      }
    } else {
      setTotalAmount("");
      setIncentives([]);
    }
  }, [isOpen, invoice]);

  const fetchTargetsAndSlabs = async () => {
    try {
      const [targetsRes, slabsRes] = await Promise.all([
        fetch(`${API_URL}/sales-targets`),
        fetch(`${API_URL}/incentive-slabs`)
      ]);
      if (targetsRes.ok) setSalesTargets(await targetsRes.json());
      if (slabsRes.ok) setIncentiveSlabs(await slabsRes.json());
    } catch (err) {
      console.error("Failed to fetch targets/slabs", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const handleSave = async () => {
    if (!invoice) return;
    
    const parsedTotalAmount = parseFloat(totalAmount) || 0;
    const invoiceTotal = parseFloat(invoice.total) || 0;

    if (parsedTotalAmount > invoiceTotal) {
      toast.error(`Total incentive amount cannot exceed the invoice total (₹${invoiceTotal})`);
      return;
    }

    const totalIndividualAmounts = incentives.reduce((sum, i) => sum + (parseFloat(i.amount as any) || 0), 0);
    if (totalIndividualAmounts > parsedTotalAmount) {
      toast.error(`Sum of individual amounts (₹${totalIndividualAmounts}) cannot exceed the total incentive amount (₹${parsedTotalAmount})`);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        totalIncentiveAmount: parseFloat(totalAmount) || 0,
        incentives: incentives.map(i => ({
          ...i,
          amount: parseFloat(i.amount as any) || 0
        }))
      };

      const res = await fetch(`${API_URL}/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedInvoice = await res.json();
        toast.success("Incentives updated successfully");
        onSaved(updatedInvoice);
        onClose();
      } else {
        toast.error("Failed to update incentives");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error saving incentives");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEmployee = (emp: Employee) => {
    setIncentives(prev => {
      const exists = prev.find(i => i.employeeId === emp.id);
      if (exists) {
        return prev.filter(i => i.employeeId !== emp.id);
      }
      const fullName = emp.name || `${(emp as any).firstName || ''} ${(emp as any).lastName || ''}`.trim() || 'Unknown Employee';
      return [...prev, { employeeId: emp.id, employeeName: fullName, amount: 0 }];
    });
  };

  const updateAmount = (employeeId: string, amount: string) => {
    setIncentives(prev => prev.map(i => 
      i.employeeId === employeeId ? { ...i, amount: amount as any } : i
    ));
  };

  const calculateProjected = (employeeId: string, employeeName: string, amount: string | number) => {
    const numAmount = parseFloat(amount as string) || 0;
    if (numAmount <= 0) return 0;

    const empSlabs = incentiveSlabs
      .filter(s => s.employees && s.employees.some((name: string) => name.replace(/\s+/g, ' ').toLowerCase() === employeeName.replace(/\s+/g, ' ').toLowerCase()))
      .sort((a, b) => a.minAmount - b.minAmount);
      
    if (empSlabs.length === 0) return 0;

    let isRecurring = false;
    let priorCumulative = 0;

    const invoiceDate = new Date(invoice?.paymentDate || invoice?.issueDate || invoice?.timestamp || new Date());
    
    const target = salesTargets.find(t => {
      if (t.employeeId !== employeeId) return false;
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      end.setHours(23,59,59,999);
      return invoiceDate >= start && invoiceDate <= end;
    });

    if (target && target.breakdown) {
      const idx = target.breakdown.findIndex((b: any) => b.invoiceId === invoice?.id);
      let priorInvoices = [];
      if (idx !== -1) {
        isRecurring = target.breakdown[idx].isRecurring || false;
        priorInvoices = target.breakdown.slice(0, idx);
      } else {
        const cName = (invoice?.clientName || "").trim().toLowerCase();
        isRecurring = target.breakdown.some((b: any) => (b.clientName || "").trim().toLowerCase() === cName);
        priorInvoices = target.breakdown;
      }
      priorCumulative = priorInvoices.reduce((sum: number, b: any) => sum + (b.incentiveBase || 0), 0);
    }

    const activeSlabs = empSlabs.filter(s => !!s.isRecurring === isRecurring);

    let earned = 0;
    let remaining = numAmount;
    let currentCumulative = priorCumulative;
    
    for (const slab of activeSlabs) {
      if (remaining <= 0) break;
      
      const slabMin = slab.minAmount || 0;
      const slabMax = slab.maxAmount || Infinity;
      
      if (currentCumulative >= slabMax) continue;
      
      const availableInSlab = slabMax - Math.max(currentCumulative, slabMin);
      const amountInSlab = Math.min(remaining, availableInSlab);
      
      if (amountInSlab > 0) {
        earned += (amountInSlab * (slab.percentage || 0)) / 100;
        remaining -= amountInSlab;
        currentCumulative += amountInSlab;
      }
    }
    
    return earned;
  };

  const selectedEmployeeIds = incentives.map(i => i.employeeId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Incentives - {invoice?.invoiceNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Total Incentive Amount</Label>
            <Input 
              type="number" 
              placeholder="e.g. 5000" 
              value={totalAmount}
              onChange={e => setTotalAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Employees</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedEmployeeIds.length > 0 
                      ? `${selectedEmployeeIds.length} employee(s) selected` 
                      : "Select employees..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="p-2 border-b">
                  <Input 
                    placeholder="Search employees..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                  {employees.filter(emp => {
                    const fullName = emp.name || `${(emp as any).firstName || ''} ${(emp as any).lastName || ''}`.trim() || 'Unknown Employee';
                    const normalizedFullName = fullName.replace(/\s+/g, ' ').toLowerCase();
                    const normalizedSearch = searchQuery.replace(/\s+/g, ' ').toLowerCase();
                    return normalizedFullName.includes(normalizedSearch);
                  }).map(emp => {
                    const isSelected = selectedEmployeeIds.includes(emp.id);
                    return (
                      <div
                        key={emp.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-md cursor-pointer transition-colors"
                        onClick={() => toggleEmployee(emp)}
                      >
                        <Checkbox checked={isSelected} />
                        <span className={cn("text-sm", isSelected && "font-medium")}>
                          {emp.name || `${(emp as any).firstName || ''} ${(emp as any).lastName || ''}`.trim() || 'Unknown Employee'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {incentives.length > 0 && (
            <div className="space-y-3 pt-2">
              <Label>Individual Amounts</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {incentives.map(inc => {
                  const projected = calculateProjected(inc.employeeId, inc.employeeName, inc.amount);
                  return (
                    <div key={inc.employeeId} className="flex flex-col gap-1 bg-muted/50 p-2 rounded-md">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium truncate flex-1">{inc.employeeName}</span>
                        <Input 
                          type="number" 
                          placeholder="Amount" 
                          className="w-32 h-8"
                          value={inc.amount === 0 && typeof inc.amount === 'number' ? "" : inc.amount}
                          onChange={e => updateAmount(inc.employeeId, e.target.value)}
                        />
                      </div>
                      {projected > 0 && (
                        <div className="text-right text-xs font-semibold text-brand-teal">
                          Earned Incentive: ₹{projected.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading} className="bg-brand-teal hover:bg-brand-teal/90">
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Incentives
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
