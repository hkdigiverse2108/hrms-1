import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Check } from "lucide-react";
import Link from "next/link";

export default function AddEmployeePage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Add Employee"
        description="Enter the details to register a new team member."
      >
        <Link href="/employees">
          <Button variant="outline" className="shadow-sm border-border">
            Cancel
          </Button>
        </Link>
        <Button className="bg-brand-teal hover:bg-brand-teal-light text-white font-medium shadow-sm">
          <Check className="w-4 h-4 mr-2" />
          Save Employee
        </Button>
      </PageHeader>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden mb-12">
        {/* Photo Upload Section */}
        <div className="p-6 md:p-8 border-b border-border flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-1">Profile Photo</h3>
              <p className="text-xs text-muted-foreground">Recommended size: 256x256px. Formats: JPG, PNG.</p>
            </div>
          </div>
          <Button variant="outline">Upload Photo</Button>
        </div>

        <div className="p-6 md:p-8 space-y-10">
          
          {/* Basic Details */}
          <section>
            <h3 className="text-sm font-bold text-foreground mb-4">Basic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">First Name</label>
                <Input placeholder="e.g. John" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Middle Name</label>
                <Input placeholder="e.g. Robert" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Last Name</label>
                <Input placeholder="e.g. Doe" className="bg-white" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Email Address</label>
                <Input type="email" placeholder="john.doe@example.com" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Phone Number</label>
                <Input placeholder="+91 8554888888" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Date of Birth (DOB)</label>
                <Input type="date" className="bg-white text-muted-foreground" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Joining Date</label>
                <Input type="date" className="bg-white text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Salary</label>
                <Input placeholder="e.g. 50000" type="number" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Password</label>
                <Input type="password" placeholder="Enter password" className="bg-white" />
              </div>
            </div>
          </section>

          {/* Job Information */}
          <section>
            <h3 className="text-sm font-bold text-foreground mb-4">Job Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Position</label>
                <Input placeholder="e.g. Senior Developer" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Designation</label>
                <select className="w-full h-10 px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-teal text-muted-foreground">
                  <option>Select designation</option>
                  <option value="1">Backend Developer</option>
                  <option value="2">Frontend Developer</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Department</label>
                <select className="w-full h-10 px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-teal text-muted-foreground">
                  <option>Select department</option>
                  <option value="1">Engineering</option>
                  <option value="2">HR</option>
                </select>
              </div>
            </div>
          </section>

          {/* Personal Information */}
          <section>
            <h3 className="text-sm font-bold text-foreground mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2 lg:col-span-1">
                <label className="text-xs font-semibold text-foreground">Aadhar Card Number</label>
                <Input placeholder="e.g. 1234 5678 9012" className="bg-white" />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-semibold text-foreground">PAN Card Number</label>
                <Input placeholder="e.g. ABCDE1234F" className="bg-white" />
              </div>
            </div>
          </section>

          {/* Bank Details */}
          <section>
            <h3 className="text-sm font-bold text-foreground mb-4">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Bank Name</label>
                <Input placeholder="e.g. State Bank of India" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Account Holder Name</label>
                <Input placeholder="e.g. John Doe" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Account Number</label>
                <Input placeholder="e.g. 1234567890" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">IFSC Code</label>
                <Input placeholder="e.g. SBIN0001234" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">UPI ID</label>
                <Input placeholder="e.g. johndoe@upi" className="bg-white" />
              </div>
            </div>
          </section>

          {/* Parent Detail */}
          <section>
            <h3 className="text-sm font-bold text-foreground mb-4">Parent Detail</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Parent Name</label>
                <Input placeholder="e.g. Richard Doe" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Relation</label>
                <select className="w-full h-10 px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-teal text-muted-foreground">
                  <option>Select relation</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Parent Number</label>
                <Input placeholder="+91 9876543210" className="bg-white" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
