'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DollarSign, Plus, MoreHorizontal, Eye, Trash2, Loader2, Gift, Minus, Award } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { employees } from '@/lib/data'
import type { Payroll } from '@/lib/types'

const bonusCategories = ['Performance', 'Referral', 'Festival', 'Incentive', 'Project Completion', 'Anniversary']
const deductionCategories = ['Advance', 'Late Penalty', 'Loan Repayment', 'Insurance', 'Other']

export default function BonusesPage() {
  const { data, isLoading } = useApi()
  const [payroll, setPayroll] = useState<Payroll[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [type, setType] = useState<'bonus' | 'deduction'>('bonus')
  const [formData, setFormData] = useState({
    employee: '',
    category: '',
    amount: '',
    reason: '',
  })

  useEffect(() => {
    if (data?.payrollRecords) setPayroll(data.payrollRecords)
  }, [data?.payrollRecords])

  const bonuses = payroll.filter((b) => b.type === 'bonus')
  const deductions = payroll.filter((b) => b.type === 'deduction')

  const totalBonuses = bonuses.reduce((sum, b) => sum + b.amount, 0)
  const totalDeductions = deductions.reduce((sum, b) => sum + b.amount, 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const handleOpenModal = (itemType: 'bonus' | 'deduction') => {
    setType(itemType)
    setFormData({ employee: '', category: '', amount: '', reason: '' })
    setModalOpen(true)
  }

  return (
    <>
      <PageHeader title="Bonuses & Deductions" description="Manage employee incentives and penalties.">
        <Button variant="outline" onClick={() => handleOpenModal('deduction')}>
          <Minus className="mr-2 h-4 w-4" />
          Add Deduction
        </Button>
        <Button onClick={() => handleOpenModal('bonus')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Bonus
        </Button>
      </PageHeader>

      {isLoading && payroll.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-green-100 p-3">
                    <Gift className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bonuses</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalBonuses)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-red-100 p-3">
                    <Minus className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Deductions</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDeductions)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-blue-100 p-3">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Impact</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalBonuses - totalDeductions)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="bonuses" className="mt-6">
            <TabsList>
              <TabsTrigger value="bonuses">
                <Award className="mr-2 h-4 w-4" />
                Bonuses ({bonuses.length})
              </TabsTrigger>
              <TabsTrigger value="deductions">
                <Minus className="mr-2 h-4 w-4" />
                Deductions ({deductions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bonuses">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Bonuses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bonuses.map((bonus) => (
                      <div
                        key={bonus.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-medium">{bonus.employeeName}</p>
                          <p className="text-sm text-muted-foreground">{bonus.reason}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{bonus.category}</Badge>
                          <span className="text-sm text-muted-foreground">{bonus.date}</span>
                          <span className="font-semibold text-green-600">
                            +{formatCurrency(bonus.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deductions">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Deductions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {deductions.map((deduction) => (
                      <div
                        key={deduction.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-medium">{deduction.employeeName}</p>
                          <p className="text-sm text-muted-foreground">{deduction.reason}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            {deduction.category}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{deduction.date}</span>
                          <span className="font-semibold text-red-600">
                            -{formatCurrency(deduction.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {type === 'bonus' ? 'Bonus' : 'Deduction'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={formData.employee}
                onValueChange={(value) => setFormData({ ...formData, employee: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.name}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(type === 'bonus' ? bonusCategories : deductionCategories).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Enter reason"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setModalOpen(false)}>
                Add {type === 'bonus' ? 'Bonus' : 'Deduction'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
