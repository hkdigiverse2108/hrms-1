import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export function SearchBar({ className, containerClassName, ...props }: SearchBarProps) {
  return (
    <div className={cn("relative flex items-center md:w-80", containerClassName)}>
      <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search..."
        className={cn("pl-9 bg-white border-border shadow-sm focus-visible:ring-brand-teal", className)}
        {...props}
      />
    </div>
  );
}
