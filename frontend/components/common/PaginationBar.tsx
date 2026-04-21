import { Button } from "@/components/ui/button";

interface PaginationBarProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
}

export function PaginationBar({ totalItems, itemsPerPage, currentPage }: PaginationBarProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground w-full">
      <div className="w-full text-center sm:text-left mb-2 sm:mb-0">
        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} employees
      </div>
      <div className="w-full sm:w-auto overflow-hidden">
        <div className="flex flex-nowrap overflow-x-auto gap-1 md:gap-1.5 justify-start sm:justify-center py-1 px-4 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <Button variant="outline" className="h-8 px-2 sm:px-3 shadow-none text-xs sm:text-sm shrink-0">Prev</Button>
          <Button variant="outline" className="h-8 w-8 p-0 bg-brand-teal text-white border-brand-teal hover:bg-brand-teal hover:text-white shrink-0">1</Button>
          <Button variant="outline" className="h-8 w-8 p-0 shrink-0">2</Button>
          <Button variant="outline" className="h-8 w-8 p-0 shrink-0">3</Button>
          <Button variant="ghost" className="h-8 w-6 sm:w-8 p-0 pointer-events-none shrink-0">...</Button>
          <Button variant="outline" className="h-8 w-8 p-0 shrink-0">35</Button>
          <Button variant="outline" className="h-8 px-2 sm:px-3 shadow-none text-xs sm:text-sm shrink-0">Next</Button>
        </div>
      </div>
    </div>
  );
}
