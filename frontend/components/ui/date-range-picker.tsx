"use client";

import * as React from "react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfToday, isSameDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const presets = [
  { label: "Today", getValue: () => ({ from: startOfToday(), to: startOfToday() }) },
  { label: "Yesterday", getValue: () => ({ from: subDays(startOfToday(), 1), to: subDays(startOfToday(), 1) }) },
  { label: "Last 7 days", getValue: () => ({ from: subDays(startOfToday(), 6), to: startOfToday() }) },
  { label: "Last 14 days", getValue: () => ({ from: subDays(startOfToday(), 13), to: startOfToday() }) },
  { label: "Last 28 days", getValue: () => ({ from: subDays(startOfToday(), 27), to: startOfToday() }) },
  { label: "Last 30 days", getValue: () => ({ from: subDays(startOfToday(), 29), to: startOfToday() }) },
  { label: "This week", getValue: () => ({ from: startOfWeek(startOfToday(), { weekStartsOn: 1 }), to: endOfWeek(startOfToday(), { weekStartsOn: 1 }) }) },
  { label: "Last week", getValue: () => {
      const startOfLastWeek = startOfWeek(subDays(startOfToday(), 7), { weekStartsOn: 1 });
      return { from: startOfLastWeek, to: endOfWeek(startOfLastWeek, { weekStartsOn: 1 }) };
  }},
  { label: "This month", getValue: () => ({ from: startOfMonth(startOfToday()), to: endOfMonth(startOfToday()) }) },
  { label: "Last month", getValue: () => {
      const lastMonth = subMonths(startOfToday(), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
  }},
  { label: "Maximum", getValue: () => ({ from: new Date("2020-01-01"), to: startOfToday() }) }
];

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(value);
  const [activePreset, setActivePreset] = React.useState<string | undefined>();

  // Sync tempRange when value changes externally
  React.useEffect(() => {
    setTempRange(value);
    
    // determine if active preset matches
    if (value?.from && value?.to) {
      const match = presets.find(p => {
        const pVal = p.getValue();
        return isSameDay(pVal.from, value.from!) && isSameDay(pVal.to, value.to!);
      });
      setActivePreset(match?.label);
    } else {
      setActivePreset(undefined);
    }
  }, [value, isOpen]);

  const handleUpdate = () => {
    onChange(tempRange);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempRange(value);
    setIsOpen(false);
  };

  const handlePresetChange = (label: string) => {
    setActivePreset(label);
    const preset = presets.find((p) => p.label === label);
    if (preset) {
      setTempRange(preset.getValue());
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal h-9",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "dd/MM/yyyy")} -{" "}
                  {format(value.to, "dd/MM/yyyy")}
                </>
              ) : (
                format(value.from, "dd/MM/yyyy")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex divide-x max-h-[450px]">
            {/* Presets Sidebar */}
            <div className="w-[180px] p-4 flex flex-col overflow-y-auto">
              <h4 className="text-sm font-semibold mb-4 text-slate-800">Recently used</h4>
              <RadioGroup value={activePreset} onValueChange={handlePresetChange} className="space-y-3">
                {presets.map((preset) => (
                  <div key={preset.label} className="flex items-center space-x-2">
                    <RadioGroupItem value={preset.label} id={preset.label} />
                    <Label htmlFor={preset.label} className="font-normal text-slate-600 cursor-pointer text-sm">
                      {preset.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Calendar & Footer Area */}
            <div className="flex flex-col">
              <div className="p-4 flex-1">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={tempRange?.from}
                  selected={tempRange}
                  onSelect={(r) => {
                    setTempRange(r);
                    setActivePreset(undefined);
                  }}
                  numberOfMonths={2}
                />
              </div>

              {/* Footer */}
              <div className="p-4 border-t flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="flex-1 py-1 px-3 bg-muted/50 rounded-md text-center text-sm font-medium border border-border/50">
                    {tempRange?.from ? format(tempRange.from, "dd/MM/yyyy") : "Start date"}
                  </div>
                  <div className="text-muted-foreground">-</div>
                  <div className="flex-1 py-1 px-3 bg-muted/50 rounded-md text-center text-sm font-medium border border-border/50">
                    {tempRange?.to ? format(tempRange.to, "dd/MM/yyyy") : "End date"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700">
                    Update
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
