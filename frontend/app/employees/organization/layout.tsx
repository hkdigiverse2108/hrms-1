'use client'

import { usePathname, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/common/PageHeader'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, UserCircle2, Loader2, Network } from 'lucide-react'
import { useEffect } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { checkPermission, isAdmin, loading: permissionsLoading } = usePermissions()

  useEffect(() => {
    if (!permissionsLoading) {
      if (!isAdmin && !checkPermission('org-structure', 'canView')) {
        router.push('/')
      }
    }
  }, [permissionsLoading, isAdmin, router, checkPermission])

  const currentTab = pathname.includes('designations') ? 'designations' : pathname.includes('sub-departments') ? 'sub-departments' : 'departments'

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-teal" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Organization Structure" 
        description="Manage your company's departments and job designations in one place."
      />

      <Tabs value={currentTab} onValueChange={(v) => router.push(`/employees/organization/${v}`)} className="w-full">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl mb-6 shadow-sm">
          <TabsTrigger 
            value="departments" 
            className="rounded-lg data-[state=active]:bg-brand-teal data-[state=active]:text-white transition-all px-8 py-2.5 font-bold text-xs uppercase tracking-wider"
          >
            <Building2 className="w-4 h-4 mr-2" />
            Departments
          </TabsTrigger>
          <TabsTrigger 
            value="sub-departments" 
            className="rounded-lg data-[state=active]:bg-brand-teal data-[state=active]:text-white transition-all px-8 py-2.5 font-bold text-xs uppercase tracking-wider"
          >
            <Network className="w-4 h-4 mr-2" />
            Sub Departments
          </TabsTrigger>
          <TabsTrigger 
            value="designations" 
            className="rounded-lg data-[state=active]:bg-brand-teal data-[state=active]:text-white transition-all px-8 py-2.5 font-bold text-xs uppercase tracking-wider"
          >
            <UserCircle2 className="w-4 h-4 mr-2" />
            Designations
          </TabsTrigger>
        </TabsList>
        {children}
      </Tabs>
    </div>
  )
}
