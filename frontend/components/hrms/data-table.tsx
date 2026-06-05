"use client"

import React, { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"

export function DataTable({ columns, data, searchKey }: any) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredData = React.useMemo(() => {
    if (!searchKey || !searchTerm) return data
    if (!data) return []
    return data.filter((item: any) => {
      const val = item[searchKey]
      if (typeof val === 'string') {
        return val.toLowerCase().includes(searchTerm.toLowerCase())
      }
      return false
    })
  }, [data, searchKey, searchTerm])

  return (
    <div>
      {searchKey && (
        <div className="flex items-center py-4">
          <Input
            placeholder={`Search by ${searchKey}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}
      <div className="rounded-md border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              {columns?.map((col: any, i: number) => (
                <TableHead key={i} className="font-bold text-gray-700">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData?.length ? (
              filteredData.map((row: any, i: number) => (
                <TableRow key={i} className="hover:bg-gray-50/50 transition-colors">
                  {columns?.map((col: any, j: number) => (
                    <TableCell key={j}>
                      {col.render ? col.render(row) : row[col.accessorKey]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns?.length || 1} className="h-24 text-center text-gray-500">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
