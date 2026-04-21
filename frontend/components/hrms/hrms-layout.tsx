'use client'

import { HRMSSidebar } from './sidebar'
import { HRMSNavbar } from './navbar'

interface HRMSLayoutProps {
  children: React.ReactNode
}

export function HRMSLayout({ children }: HRMSLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <HRMSSidebar />
      <HRMSNavbar />
      <main className="ml-64 pt-16">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
