'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { SalesAnalytics } from '../components/SalesAnalytics'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function SalesAnalyticsPage() {
  const router = useRouter()

  return (
    <div className="-mt-6 -mx-4 sm:-mx-6 lg:-mx-8 min-h-screen bg-slate-50/50 flex flex-col">
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-8 py-5 flex items-center shadow-sm">
        <button 
          onClick={() => router.back()}
          className="mr-4 p-2 rounded-full text-brand-teal hover:bg-brand-teal/10 hover:text-brand-teal transition-all shrink-0"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="border-l border-slate-200 pl-4">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Sales Analytics Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">Comprehensive monthly performance and revenue insights</p>
        </div>
      </div>
      
      <div className="flex-1 p-8 max-w-[1600px] w-full mx-auto">
        <SalesAnalytics />
      </div>
    </div>
  )
}
