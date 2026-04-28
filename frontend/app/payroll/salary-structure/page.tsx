'use client'

import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Plus, DollarSign, Percent, Download } from 'lucide-react'
import { exportToCSV } from "@/lib/export";


const salaryComponents = [
  { name: 'Basic Salary', percentage: 50, type: 'earning', description: 'Base compensation' },
  { name: 'House Rent Allowance', percentage: 20, type: 'earning', description: 'Housing support' },
  { name: 'Transport Allowance', percentage: 10, type: 'earning', description: 'Commute expenses' },
  { name: 'Medical Allowance', percentage: 5, type: 'earning', description: 'Healthcare support' },
  { name: 'Special Allowance', percentage: 15, type: 'earning', description: 'Additional benefits' },
]

const deductions = [
  { name: 'Provident Fund', percentage: 12, type: 'deduction', description: 'Retirement savings' },
  { name: 'Professional Tax', amount: 200, type: 'deduction', description: 'State tax' },
  { name: 'Income Tax', percentage: 10, type: 'deduction', description: 'Federal tax (varies)' },
  { name: 'Health Insurance', amount: 150, type: 'deduction', description: 'Employee contribution' },
]

const salaryGrades = [
  { grade: 'Grade A', minSalary: 80000, maxSalary: 150000, employees: 12 },
  { grade: 'Grade B', minSalary: 60000, maxSalary: 80000, employees: 25 },
  { grade: 'Grade C', minSalary: 45000, maxSalary: 60000, employees: 30 },
  { grade: 'Grade D', minSalary: 30000, maxSalary: 45000, employees: 21 },
]

export default function SalaryStructurePage() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <>
      <PageHeader title="Salary Structure" description="Define salary components and pay grades.">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => exportToCSV([...salaryComponents, ...deductions, ...salaryGrades], 'salary-structure')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Component
          </Button>
        </div>
      </PageHeader>


      <div className="grid gap-6 lg:grid-cols-2">
        {/* Earnings Components */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Earnings Components
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salaryComponents.map((component) => (
                <div key={component.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{component.name}</p>
                      <p className="text-sm text-muted-foreground">{component.description}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {component.percentage}%
                    </Badge>
                  </div>
                  <Progress value={component.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Deductions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-red-600" />
              Deductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deductions.map((deduction) => (
                <div key={deduction.name} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{deduction.name}</p>
                    <p className="text-sm text-muted-foreground">{deduction.description}</p>
                  </div>
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    {deduction.percentage
                      ? `${deduction.percentage}%`
                      : formatCurrency(deduction.amount as number)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Grades */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Salary Grades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {salaryGrades.map((grade) => (
              <div
                key={grade.grade}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <h3 className="text-lg font-semibold">{grade.grade}</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Range: {formatCurrency(grade.minSalary)} - {formatCurrency(grade.maxSalary)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{grade.employees}</span> employees
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sample Calculation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sample Salary Calculation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <div className="space-y-2 border-b pb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Salary (Annual)</span>
                <span className="font-medium">$60,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Basic Salary (50%)</span>
                <span>$30,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">HRA (20%)</span>
                <span>$12,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Other Allowances</span>
                <span>$18,000</span>
              </div>
            </div>
            <div className="space-y-2 border-b py-4">
              <div className="flex justify-between text-red-600">
                <span>Provident Fund (12%)</span>
                <span>-$3,600</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Income Tax (Est.)</span>
                <span>-$6,000</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Other Deductions</span>
                <span>-$2,400</span>
              </div>
            </div>
            <div className="flex justify-between pt-4 text-lg font-semibold">
              <span>Net Annual Salary</span>
              <span className="text-green-600">$48,000</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Monthly take-home: $4,000
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
