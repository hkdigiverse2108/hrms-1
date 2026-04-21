'use client'

import { HRMSLayout } from '@/components/hrms/hrms-layout'
import { PageHeader } from '@/components/hrms/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Send, Download } from 'lucide-react'

interface InternshipOffer {
  id: string
  name: string
  college: string
  department: string
  duration: string
  stipend: number
  status: 'draft' | 'sent' | 'accepted' | 'declined'
}

const offers: InternshipOffer[] = [
  { id: '1', name: 'Ryan Thompson', college: 'MIT', department: 'Engineering', duration: '6 months', stipend: 2000, status: 'sent' },
  { id: '2', name: 'Jessica Brown', college: 'Stanford', department: 'Marketing', duration: '3 months', stipend: 1500, status: 'accepted' },
  { id: '3', name: 'Daniel Kim', college: 'Harvard', department: 'Finance', duration: '6 months', stipend: 2000, status: 'draft' },
]

export default function InternshipOffersPage() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-700 border-green-200'
      case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'declined': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    }
  }

  return (
    <HRMSLayout>
      <PageHeader title="Internship Offers" description="Manage internship offer letters.">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Offer
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Offer Letters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {offers.map((offer) => (
              <div key={offer.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{offer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {offer.college} • {offer.department} • {offer.duration}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">${offer.stipend}/mo</p>
                    <p className="text-sm text-muted-foreground">Stipend</p>
                  </div>
                  <Badge variant="outline" className={`capitalize ${getStatusColor(offer.status)}`}>
                    {offer.status}
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    {offer.status === 'draft' && (
                      <Button size="sm">
                        <Send className="mr-2 h-4 w-4" />
                        Send
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </HRMSLayout>
  )
}
