'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DepartmentsPageRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/employees/organization/departments')
  }, [router])

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
}
