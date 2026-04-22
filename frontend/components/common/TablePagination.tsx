import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

export interface TablePaginationProps {
  totalItems?: number;
  itemsPerPage?: number;
  currentPage?: number;
  itemName?: string;
}

export function TablePagination({
  totalItems,
  itemsPerPage = 10,
  currentPage = 1,
  itemName = "employees",
}: TablePaginationProps = {}) {
  return (
    <div className="p-4 border-t border-border flex flex-col lg:flex-row items-center justify-between gap-4 bg-white rounded-b-xl w-full">
      {totalItems !== undefined ? (
        <div className="text-sm text-muted-foreground w-full lg:w-auto text-center lg:text-left shrink-0">
          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} {itemName}
        </div>
      ) : (
        <div className="hidden lg:block flex-1" />
      )}
      <div className="flex flex-row items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full lg:w-auto">
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 border-blue-500 text-blue-500 hover:text-blue-600 hover:border-blue-600 bg-blue-50/50">
            1
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hidden sm:inline-flex">
            2
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hidden sm:inline-flex">
            3
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hidden sm:inline-flex">
            4
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hidden sm:inline-flex">
            5
          </Button>
          <MoreHorizontal className="w-4 h-4 text-muted-foreground mx-1 hidden sm:block" />
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hidden sm:inline-flex">
            42
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Select defaultValue="10">
          <SelectTrigger className="w-[110px] h-8 sm:h-9">
            <SelectValue placeholder="Items per page" />
          </SelectTrigger>
        <SelectContent>
          <SelectItem value="10">10 / page</SelectItem>
          <SelectItem value="20">20 / page</SelectItem>
          <SelectItem value="50">50 / page</SelectItem>
        </SelectContent>
      </Select>
      </div>
    </div>
  );
}
