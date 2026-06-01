'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useMemo } from 'react'

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchKey?: keyof T
  searchPlaceholder?: string
  actions?: (item: T) => React.ReactNode
  pageSize?: number
  extraFilters?: React.ReactNode
  isLoading?: boolean
  onRowClick?: (item: T) => void
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchKey,
  searchPlaceholder = 'Search...',
  actions,
  pageSize = 10,
  extraFilters,
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredData = useMemo(() => {
    if (!searchKey || !search) return data
    return data.filter((item) => {
      const value = item[searchKey]
      if (typeof value === 'string') {
        return value.toLowerCase().includes(search.toLowerCase())
      }
      return true
    })
  }, [data, search, searchKey])

  const totalPages = Math.ceil(filteredData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize)

  return (
    <div className="space-y-4">
      {(searchKey || extraFilters) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 pt-2">
          {searchKey ? (
            <div className="relative w-full max-w-sm group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-teal transition-colors" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10 h-10 border-slate-200 focus-visible:ring-brand-teal rounded-xl bg-slate-50/50"
              />
            </div>
          ) : (
            <div className="flex-1" />
          )}
          {extraFilters && (
            <div className="flex items-center gap-3 flex-1 justify-end">
              {extraFilters}
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-slate-50/50 border-b border-slate-100">
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={String(column.key)} className="text-[12px] font-bold uppercase tracking-wider text-slate-500 py-4 px-6">
                  {column.header}
                </TableHead>
              ))}
              {actions && <TableHead className="w-24 text-[12px] font-bold uppercase tracking-wider text-slate-500 py-4 px-6 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, idx) => (
                <TableRow
                  key={item.id}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`group transition-colors hover:bg-brand-teal/[0.02] border-slate-100 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/30'} ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((column) => (
                    <TableCell key={String(column.key)} className="py-4 px-6">
                      {column.render
                        ? column.render(item)
                        : <span className="text-slate-600 font-semibold">{String(item[column.key as keyof T] ?? '')}</span>}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell
                      className="py-4 px-6 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions(item)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Showing <span className="text-slate-700">{startIndex + 1}</span> to <span className="text-slate-700">{Math.min(startIndex + pageSize, filteredData.length)}</span> of{' '}
            <span className="text-slate-700">{filteredData.length}</span>
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-xl h-9 w-9 p-0 border-slate-200 hover:bg-white hover:text-brand-teal disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-extrabold text-slate-600">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-xl h-9 w-9 p-0 border-slate-200 hover:bg-white hover:text-brand-teal disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
