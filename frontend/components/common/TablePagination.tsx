import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

export interface TablePaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (count: number) => void;
  itemName?: string;
}

export function TablePagination({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange,
  itemName = "items",
}: TablePaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="p-4 border-t border-border flex flex-col lg:flex-row items-center justify-between gap-4 bg-white rounded-b-xl w-full shrink-0">
      <div className="text-sm text-muted-foreground w-full lg:w-auto text-center lg:text-left shrink-0">
        Showing {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} {itemName}
      </div>
      
      <div className="flex flex-row items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full lg:w-auto">
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {getPageNumbers().map((page, idx) => (
            page === '...' ? (
              <span key={`dots-${idx}`} className="px-2 text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></span>
            ) : (
              <Button
                key={`page-${page}`}
                variant={currentPage === page ? "default" : "outline"}
                size="icon"
                className={`h-8 w-8 ${currentPage === page ? 'bg-brand-teal text-white hover:bg-brand-teal-light' : 'text-muted-foreground'}`}
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </Button>
            )
          ))}

          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {onItemsPerPageChange && (
          <Select value={itemsPerPage.toString()} onValueChange={v => onItemsPerPageChange(parseInt(v))}>
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue placeholder="Items per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="20">20 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
