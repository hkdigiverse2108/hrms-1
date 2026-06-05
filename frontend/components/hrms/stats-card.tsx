import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export function StatsCard({ 
  title, 
  value, 
  trend, 
  trendLabel, 
  icon, 
  trendUp = true, 
  color = "brand", 
  hideTrend = false 
}: { 
  title: string, 
  value: string | number, 
  trend?: string, 
  trendLabel?: string, 
  icon?: React.ReactNode, 
  trendUp?: boolean, 
  color?: string, 
  hideTrend?: boolean 
}) {
  const colorMap: Record<string, string> = {
    brand: "bg-[#EAF7F6] text-brand-teal",
    blue: "bg-[#EFF6FF] text-blue-600",
    orange: "bg-[#FFF7ED] text-orange-600",
  };
 
  return (
    <div className="p-6 bg-white border border-border rounded-2xl shadow-sm flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-6">
        <span className="font-bold text-[13px] text-gray-500">{title}</span>
        {icon && (
          <div className={`p-2.5 rounded-xl ${colorMap[color] || colorMap.brand}`}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-black text-[#111827] mb-1">{value}</div>
        <div className="flex items-center text-xs">
          {!hideTrend && trend && (
            <span className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] mr-2 flex items-center ${trendUp ? 'bg-[#F0FDF4] text-green-600' : 'bg-red-50 text-red-600'}`}>
               {trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : null}
               {trend}
            </span>
          )}
          {trendLabel && <span className="text-gray-400 font-medium">{trendLabel}</span>}
        </div>
      </div>
    </div>
  );
}
