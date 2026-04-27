'use client'

import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Award, Download, Eye, Plus } from 'lucide-react'

interface Certificate {
  id: string
  internName: string
  department: string
  duration: string
  completionDate: string
  certificateNo: string
  status: 'generated' | 'pending'
}

const certificates: Certificate[] = [
  { id: '1', internName: 'Ryan Thompson', department: 'Marketing', duration: '5 months', completionDate: '2024-01-31', certificateNo: 'CERT-2024-001', status: 'generated' },
  { id: '2', internName: 'Chris Martin', department: 'Finance', duration: '6 months', completionDate: '2024-07-31', certificateNo: '', status: 'pending' },
  { id: '3', internName: 'Sophie Clark', department: 'Engineering', duration: '5 months', completionDate: '2024-06-15', certificateNo: '', status: 'pending' },
]

export default function CertificatesPage() {
  return (
    <>
      <PageHeader title="Certificates" description="Generate and manage internship completion certificates.">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Generate Certificate
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Certificates</p>
                <p className="text-2xl font-bold">{certificates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-100 p-3">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Generated</p>
                <p className="text-2xl font-bold text-green-600">
                  {certificates.filter((c) => c.status === 'generated').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-yellow-100 p-3">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {certificates.filter((c) => c.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Certificate Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {certificates.map((cert) => (
              <div key={cert.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {cert.internName.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{cert.internName}</p>
                    <p className="text-sm text-muted-foreground">
                      {cert.department} • {cert.duration}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Completion Date</p>
                    <p className="font-medium">{cert.completionDate}</p>
                  </div>
                  {cert.certificateNo && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Certificate No.</p>
                      <p className="font-medium">{cert.certificateNo}</p>
                    </div>
                  )}
                  <Badge
                    variant="outline"
                    className={
                      cert.status === 'generated'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                    }
                  >
                    {cert.status === 'generated' ? 'Generated' : 'Pending'}
                  </Badge>
                  <div className="flex gap-2">
                    {cert.status === 'generated' ? (
                      <>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm">
                        <Award className="mr-2 h-4 w-4" />
                        Generate
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
