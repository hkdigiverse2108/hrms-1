"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Check, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { API_URL } from "@/lib/config";

export default function AddEmployeePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Master Data State
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [relations, setRelations] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    joinDate: new Date().toISOString().split('T')[0],
    salary: 0,
    password: "",
    position: "",
    designation: "",
    department: "",
    status: "active",
    aadharCard: "",
    panCard: "",
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
    parentName: "",
    parentNumber: "",
    relation: ""
  });

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [depts, desigs, rels] = await Promise.all([
          fetch(`${API_URL}/departments`).then(res => res.json()),
          fetch(`${API_URL}/designations`).then(res => res.json()),
          fetch(`${API_URL}/relations`).then(res => res.json()),
        ]);
        setDepartments(depts);
        setDesignations(desigs);
        setRelations(rels);
      } catch (err) {
        console.error("Failed to fetch master data", err);
      }
    };
    fetchMasterData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to save employee");
      }

      router.push("/employees");
    } catch (err: any) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <PageHeader
        title="Add Employee"
        description="Enter the details to register a new team member."
      >
        <Link href="/employees">
          <Button variant="outline" className="shadow-sm border-border" disabled={isLoading}>
            Cancel
          </Button>
        </Link>
        <Button 
          className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          Save Employee
        </Button>
      </PageHeader>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Photo Upload Section */}
        <div className="p-6 md:p-8 border-b border-border flex flex-col md:flex-row items-center justify-between gap-6 bg-gray-50/30">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-1">Profile Photo</h3>
              <p className="text-xs text-muted-foreground">Recommended size: 256x256px. Formats: JPG, PNG.</p>
            </div>
          </div>
          <Button variant="outline" disabled={isLoading}>Upload Photo</Button>
        </div>

        <div className="p-6 md:p-8 space-y-10">
          
          {/* Basic Details */}
          <section>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span>
              Basic Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">First Name</label>
                <Input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="e.g. John" className="bg-white" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Middle Name</label>
                <Input name="middleName" value={formData.middleName} onChange={handleChange} placeholder="e.g. Robert" className="bg-white" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Last Name</label>
                <Input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="e.g. Doe" className="bg-white" disabled={isLoading} />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Email Address</label>
                <Input name="email" value={formData.email} onChange={handleChange} type="email" placeholder="john.doe@example.com" className="bg-white" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Phone Number</label>
                <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 8554888888" className="bg-white" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Date of Birth (DOB)</label>
                <Input name="dob" value={formData.dob} onChange={handleChange} type="date" className="bg-white" disabled={isLoading} />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Joining Date</label>
                <Input name="joinDate" value={formData.joinDate} onChange={handleChange} type="date" className="bg-white" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Salary</label>
                <Input name="salary" value={formData.salary || ""} onChange={handleChange} placeholder="e.g. 50000" type="number" className="bg-white" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Password</label>
                <Input name="password" value={formData.password} onChange={handleChange} type="password" placeholder="Enter password" className="bg-white" disabled={isLoading} />
              </div>
            </div>
          </section>

          {/* Job Information */}
          <section>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span>
              Job Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Position</label>
                <Input name="position" value={formData.position} onChange={handleChange} placeholder="e.g. Senior Developer" className="bg-white" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Designation</label>
                <select 
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full h-10 px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-teal"
                >
                  <option value="">Select designation</option>
                  {designations.map(d => (
                    <option key={d.id} value={d.title}>{d.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Department</label>
                <select 
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full h-10 px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-teal"
                >
                  <option value="">Select department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Personal Information */}
          <section>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span>
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2 lg:col-span-1">
                <label className="text-xs font-semibold text-foreground">Aadhar Card Number</label>
                <Input name="aadharCard" value={formData.aadharCard} onChange={handleChange} placeholder="e.g. 1234 5678 9012" className="bg-white" disabled={isLoading} />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-semibold text-foreground">PAN Card Number</label>
                <Input name="panCard" value={formData.panCard} onChange={handleChange} placeholder="e.g. ABCDE1234F" className="bg-white" disabled={isLoading} />
              </div>
            </div>
          </section>

          {/* Bank Details */}
          <section>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span>
              Bank Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Bank Name</label>
                <Input name="bankName" value={formData.bankName} onChange={handleChange} placeholder="e.g. State Bank of India" className="bg-white" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Account Holder Name</label>
                <Input name="accountHolderName" value={formData.accountHolderName} onChange={handleChange} placeholder="e.g. John Doe" className="bg-white" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Account Number</label>
                <Input name="accountNumber" value={formData.accountNumber} onChange={handleChange} placeholder="e.g. 1234567890" className="bg-white" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">IFSC Code</label>
                <Input name="ifscCode" value={formData.ifscCode} onChange={handleChange} placeholder="e.g. SBIN0001234" className="bg-white" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">UPI ID</label>
                <Input name="upiId" value={formData.upiId} onChange={handleChange} placeholder="e.g. johndoe@upi" className="bg-white" disabled={isLoading} />
              </div>
            </div>
          </section>

          {/* Parent Detail */}
          <section>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span>
              Parent Detail
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Parent Name</label>
                <Input name="parentName" value={formData.parentName} onChange={handleChange} placeholder="e.g. Richard Doe" className="bg-white" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Relation</label>
                <select 
                  name="relation"
                  value={formData.relation}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full h-10 px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-teal"
                >
                  <option value="">Select relation</option>
                  {relations.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Parent Number</label>
                <Input name="parentNumber" value={formData.parentNumber} onChange={handleChange} placeholder="+91 9876543210" className="bg-white" disabled={isLoading} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
