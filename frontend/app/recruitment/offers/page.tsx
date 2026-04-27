'use client'

import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, FileText, Send, Download, CheckCircle, Clock, XCircle } from 'lucide-react'

interface OfferLetter {
  id: string
  candidateName: string
  position: string
  department: string
  salary: number
  joiningDate: string
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
  createdDate: string
}

const offerLetters: OfferLetter[] = [
  {
    id: '1',
    candidateName: 'Emma Watson',
    position: 'HR Coordinator',
    department: 'HR',
    salary: 55000,
    joiningDate: '2024-02-01',
    status: 'sent',
    createdDate: '2024-01-15',
  },
  {
    id: '2',
    candidateName: 'Chris Martin',
    position: 'Financial Analyst Intern',
    department: 'Finance',
    salary: 35000,
    joiningDate: '2024-02-15',
    status: 'accepted',
    createdDate: '2024-01-10',
  },
  {
    id: '3',
    candidateName: 'Alex Turner',
    position: 'Senior React Developer',
    department: 'Engineering',
    salary: 85000,
    joiningDate: '2024-03-01',
    status: 'draft',
    createdDate: '2024-01-18',
  },
]

export default function OffersPage() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusIcon = (status: OfferLetter['status']) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'declined':
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'sent':
        return <Send className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: OfferLetter['status']) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'declined':
      case 'expired':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'sent':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    }
  }

  const draftOffers = offerLetters.filter((o) => o.status === 'draft')
  const sentOffers = offerLetters.filter((o) => o.status === 'sent')
  const acceptedOffers = offerLetters.filter((o) => o.status === 'accepted')

  return (
    <>
      <PageHeader title="Offer Letters" description="Generate and manage candidate offer letters.">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Offer
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Offers</p>
                <p className="text-2xl font-bold">{offerLetters.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold text-yellow-600">{draftOffers.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold text-blue-600">{sentOffers.length}</p>
              </div>
              <Send className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold text-green-600">{acceptedOffers.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Offer Letters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {offerLetters.map((offer) => (
              <div
                key={offer.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {offer.candidateName.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{offer.candidateName}</p>
                    <p className="text-sm text-muted-foreground">
                      {offer.position} • {offer.department}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(offer.salary)}</p>
                    <p className="text-sm text-muted-foreground">Annual Salary</p>
                  </div>

                  <div className="text-right">
                    <p className="font-medium">{offer.joiningDate}</p>
                    <p className="text-sm text-muted-foreground">Joining Date</p>
                  </div>

                  <Badge variant="outline" className={`${getStatusColor(offer.status)} capitalize`}>
                    <span className="mr-2">{getStatusIcon(offer.status)}</span>
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
    </>
  )
}
