"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Map, Layout, Sparkles, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { useUser } from "@/hooks/useUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const defaultDesks = [
  {
    id: 1, x: 5, y: 15, width: 35, height: 15,
    topSeats: [
      { id: 't1', x: 10, available: true, assignedEmployeeId: "" },
      { id: 't2', x: 30, available: true, assignedEmployeeId: "" },
      { id: 't3', x: 50, available: false, assignedEmployeeId: "" },
      { id: 't4', x: 70, available: true, assignedEmployeeId: "" },
      { id: 't5', x: 90, available: true, assignedEmployeeId: "" },
    ],
    bottomSeats: [
      { id: 'b1', x: 10, available: false, assignedEmployeeId: "" },
      { id: 'b2', x: 30, available: false, assignedEmployeeId: "" },
      { id: 'b3', x: 50, available: false, assignedEmployeeId: "" },
      { id: 'b4', x: 70, available: true, assignedEmployeeId: "" },
      { id: 'b5', x: 90, available: true, assignedEmployeeId: "" },
    ]
  },
  {
    id: 2, x: 5, y: 40, width: 35, height: 15,
    topSeats: [
      { id: 't1', x: 10, available: false, assignedEmployeeId: "" },
      { id: 't2', x: 30, available: true, assignedEmployeeId: "" },
      { id: 't3', x: 50, available: false, assignedEmployeeId: "" },
      { id: 't4', x: 70, available: false, assignedEmployeeId: "" },
      { id: 't5', x: 90, available: false, assignedEmployeeId: "" },
    ],
    bottomSeats: [
      { id: 'b1', x: 10, available: true, assignedEmployeeId: "" },
      { id: 'b2', x: 30, available: false, assignedEmployeeId: "" },
      { id: 'b3', x: 50, available: false, assignedEmployeeId: "" },
      { id: 'b4', x: 70, available: true, assignedEmployeeId: "" },
      { id: 'b5', x: 90, available: true, assignedEmployeeId: "" },
    ]
  },
  {
    id: 3, x: 5, y: 65, width: 35, height: 15,
    topSeats: [
      { id: 't1', x: 10, available: false, assignedEmployeeId: "" },
      { id: 't2', x: 30, available: false, assignedEmployeeId: "" },
      { id: 't3', x: 50, available: false, assignedEmployeeId: "" },
      { id: 't4', x: 70, available: false, assignedEmployeeId: "" },
      { id: 't5', x: 90, available: false, assignedEmployeeId: "" },
    ],
    bottomSeats: [
      { id: 'b1', x: 10, available: false, assignedEmployeeId: "" },
      { id: 'b2', x: 30, available: false, assignedEmployeeId: "" },
      { id: 'b3', x: 50, available: true, assignedEmployeeId: "" },
      { id: 'b4', x: 70, available: true, assignedEmployeeId: "" },
      { id: 'b5', x: 90, available: true, assignedEmployeeId: "" },
    ]
  },
  {
    id: 4, x: 50, y: 15, width: 35, height: 15,
    topSeats: [
      { id: 't1', x: 10, available: false, assignedEmployeeId: "" },
      { id: 't2', x: 30, available: false, assignedEmployeeId: "" },
      { id: 't3', x: 50, available: true, assignedEmployeeId: "" },
      { id: 't4', x: 70, available: false, assignedEmployeeId: "" },
      { id: 't5', x: 90, available: true, assignedEmployeeId: "" },
    ],
    bottomSeats: [
      { id: 'b1', x: 10, available: true, assignedEmployeeId: "" },
      { id: 'b2', x: 30, available: true, assignedEmployeeId: "" },
      { id: 'b3', x: 50, available: true, assignedEmployeeId: "" },
      { id: 'b4', x: 70, available: false, assignedEmployeeId: "" },
      { id: 'b5', x: 90, available: false, assignedEmployeeId: "" },
    ]
  },
  {
    id: 5, x: 50, y: 40, width: 35, height: 15,
    topSeats: [
      { id: 't1', x: 10, available: false, assignedEmployeeId: "" },
      { id: 't2', x: 30, available: true, assignedEmployeeId: "" },
      { id: 't3', x: 50, available: false, assignedEmployeeId: "" },
      { id: 't4', x: 70, available: false, assignedEmployeeId: "" },
      { id: 't5', x: 90, available: false, assignedEmployeeId: "" },
    ],
    bottomSeats: [
      { id: 'b1', x: 10, available: true, assignedEmployeeId: "" },
      { id: 'b2', x: 30, available: false, assignedEmployeeId: "" },
      { id: 'b3', x: 50, available: false, assignedEmployeeId: "" },
      { id: 'b4', x: 70, available: false, assignedEmployeeId: "" },
      { id: 'b5', x: 90, available: false, assignedEmployeeId: "" },
    ]
  }
];

const getSeatEmployee = (seat: any, employees: any[], deskId: number, allDesks: any[]) => {
  if (seat.available) return null;
  if (!employees || employees.length === 0) return null;

  // If there's an explicit custom allotment, use that employee
  if (seat.assignedEmployeeId) {
    return employees.find(emp => emp.id === seat.assignedEmployeeId) || null;
  }

  // Otherwise, fallback to a unique deterministic assignment
  // Gather all allocated seats (available === false) that do NOT have a custom assignedEmployeeId
  // and map them in a stable order to the remaining unused employees.
  
  // 1. Find all custom assigned employee IDs
  const customAssignedIds = new Set<string>();
  allDesks.forEach(d => {
    d.topSeats.forEach((s: any) => {
      if (s.assignedEmployeeId) customAssignedIds.add(s.assignedEmployeeId);
    });
    d.bottomSeats.forEach((s: any) => {
      if (s.assignedEmployeeId) customAssignedIds.add(s.assignedEmployeeId);
    });
  });

  // 2. Filter employees to only get the ones who are not custom assigned
  const availableEmployees = employees.filter(emp => !customAssignedIds.has(emp.id));
  if (availableEmployees.length === 0) return null;

  // 3. Find all fallback seats (available === false, no assignedEmployeeId)
  // in a stable sorted order: deskId ASC, top/bottom, seatId ASC
  const fallbackSeats: { deskId: number; seatId: string; isTop: boolean }[] = [];
  allDesks.forEach(d => {
    d.topSeats.forEach((s: any) => {
      if (!s.available && !s.assignedEmployeeId) {
        fallbackSeats.push({ deskId: d.id, seatId: s.id, isTop: true });
      }
    });
    d.bottomSeats.forEach((s: any) => {
      if (!s.available && !s.assignedEmployeeId) {
        fallbackSeats.push({ deskId: d.id, seatId: s.id, isTop: false });
      }
    });
  });

  // 4. Find the index of the current seat in the list of fallback seats
  const isTop = seat.id.startsWith('t');
  const seatIndex = fallbackSeats.findIndex(fs => fs.deskId === deskId && fs.seatId === seat.id && fs.isTop === isTop);
  
  if (seatIndex === -1 || seatIndex >= availableEmployees.length) {
    return null;
  }

  return availableEmployees[seatIndex];
};

const getEmployeeAssets = (employeeName: string, assets: any[]) => {
  if (!assets || !employeeName) return [];
  return assets.filter(asset => {
    if (!asset.assignedTo) return false;
    return asset.assignedTo.toLowerCase() === employeeName.toLowerCase();
  });
};

export default function SeatingArrangementPage() {
  const { data, isLoading } = useApi();
  const { user } = useUser();
  const [viewMode, setViewMode] = useState<"standard" | "custom">("standard");
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [desksState, setDesksState] = useState(defaultDesks);

  // Modal states for seat management
  const [selectedSeat, setSelectedSeat] = useState<{ deskId: number; seatId: string; isTop: boolean } | null>(null);
  const [modalStatus, setModalStatus] = useState<"available" | "allocated">("available");
  const [modalEmployeeId, setModalEmployeeId] = useState<string>("");

  const isAdminOrHR = user?.role?.toLowerCase() === "admin" || user?.role?.toLowerCase() === "hr";

  useEffect(() => {
    const saved = localStorage.getItem("workspace_custom_layout");
    if (saved) {
      setCustomImage(saved);
    }

    const savedSeating = localStorage.getItem("workspace_seating_arrangement");
    if (savedSeating) {
      try {
        setDesksState(JSON.parse(savedSeating));
      } catch (e) {
        console.error("Failed to parse seating layout", e);
      }
    }
  }, []);

  const handleSeatClick = (deskId: number, seatId: string, isTop: boolean) => {
    if (!isAdminOrHR) {
      toast.error("Access Denied: Only Admins or HR can edit the seating arrangement.");
      return;
    }

    const desk = desksState.find(d => d.id === deskId);
    const seatsKey = isTop ? 'topSeats' : 'bottomSeats';
    const seat = desk?.[seatsKey].find(s => s.id === seatId);

    setSelectedSeat({ deskId, seatId, isTop });
    setModalStatus(seat?.available ? "available" : "allocated");
    setModalEmployeeId(seat?.assignedEmployeeId || "");
  };

  const handleSaveAllotment = () => {
    if (!selectedSeat) return;

    const { deskId, seatId, isTop } = selectedSeat;
    let oldSeatInfo = "";

    // Step 1: Scan and clear any previous seat allotment for this employee to enforce unique chair allocation
    const updatedDesksWithShift = desksState.map(desk => {
      const updatedTopSeats = desk.topSeats.map(seat => {
        // Skip the seat currently being edited
        if (desk.id === deskId && seat.id === seatId && isTop) return seat;

        if (modalStatus === "allocated" && modalEmployeeId && seat.assignedEmployeeId === modalEmployeeId) {
          oldSeatInfo = `Desk ${desk.id} Seat ${seat.id.toUpperCase()}`;
          return { ...seat, available: true, assignedEmployeeId: "" };
        }
        return seat;
      });

      const updatedBottomSeats = desk.bottomSeats.map(seat => {
        // Skip the seat currently being edited
        if (desk.id === deskId && seat.id === seatId && !isTop) return seat;

        if (modalStatus === "allocated" && modalEmployeeId && seat.assignedEmployeeId === modalEmployeeId) {
          oldSeatInfo = `Desk ${desk.id} Seat ${seat.id.toUpperCase()}`;
          return { ...seat, available: true, assignedEmployeeId: "" };
        }
        return seat;
      });

      return { ...desk, topSeats: updatedTopSeats, bottomSeats: updatedBottomSeats };
    });

    // Step 2: Set the allotment for the target seat
    const finalDesks = updatedDesksWithShift.map(desk => {
      if (desk.id !== deskId) return desk;

      const seatsKey = isTop ? 'topSeats' : 'bottomSeats';
      const updatedSeats = desk[seatsKey].map(seat => {
        if (seat.id !== seatId) return seat;
        
        return {
          ...seat,
          available: modalStatus === "available",
          assignedEmployeeId: modalStatus === "allocated" ? modalEmployeeId : ""
        };
      });

      return { ...desk, [seatsKey]: updatedSeats };
    });

    setDesksState(finalDesks);
    localStorage.setItem("workspace_seating_arrangement", JSON.stringify(finalDesks));
    setSelectedSeat(null);

    if (modalStatus === "allocated" && modalEmployeeId) {
      const selectedEmp = data?.employees?.find((emp: any) => emp.id === modalEmployeeId);
      const empName = selectedEmp ? (selectedEmp.name || `${selectedEmp.firstName} ${selectedEmp.lastName}`) : "Employee";
      if (oldSeatInfo) {
        toast.success(`${empName} has been shifted to Desk ${deskId} Seat ${seatId.toUpperCase()} (unassigned from ${oldSeatInfo}).`);
      } else {
        toast.success(`${empName} allotted to Desk ${deskId} Seat ${seatId.toUpperCase()} successfully.`);
      }
    } else {
      toast.success("Seating allotment updated successfully.");
    }
  };

  const checkIsMySeat = (employee: any) => {
    if (!employee || !user) return false;
    
    const isIdMatch = employee.id === user.id || employee.employeeId === user.employeeId;
    const isEmailMatch = employee.email && user.email && employee.email.toLowerCase() === user.email.toLowerCase();
    
    const empFullName = (employee.name || `${employee.firstName} ${employee.lastName}`).toLowerCase();
    const userFullName = (user.name || `${user.firstName} ${user.lastName}`).toLowerCase();
    const isNameMatch = empFullName === userFullName;

    return isIdMatch || isEmailMatch || isNameMatch;
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      {/* View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg border border-border w-fit">
          <Button
            variant={viewMode === "standard" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("standard")}
            className={cn("gap-2", viewMode === "standard" && "bg-brand-teal hover:bg-brand-teal-light")}
          >
            <Map className="w-4 h-4" />
            Standard Map
          </Button>
          <Button
            variant={viewMode === "custom" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("custom")}
            className={cn("gap-2", viewMode === "custom" && "bg-brand-teal hover:bg-brand-teal-light")}
          >
            <Layout className="w-4 h-4" />
            Custom Layout
          </Button>
        </div>

        {isAdminOrHR && viewMode === "standard" && (
          <div className="text-xs font-bold text-emerald-700 bg-emerald-100/80 backdrop-blur-sm border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
            <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-pulse flex-shrink-0"></span>
            Admin Mode: Click any seat to change employee allotment
          </div>
        )}

        {viewMode === "custom" && customImage && (
          <div className="flex items-center gap-2 text-brand-teal font-medium text-sm bg-brand-light px-3 py-1.5 rounded-full animate-pulse">
            <Sparkles className="w-4 h-4" />
            Live from Blank Canvas
          </div>
        )}
      </div>

      <div className="flex-1 bg-[#e4dfcd] rounded-xl overflow-hidden shadow-sm relative min-h-[600px] border border-border">
        {viewMode === "standard" ? (
          <>
            {/* Legend */}
            <div className="absolute top-4 right-6 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm flex flex-col gap-2 z-10 text-sm font-medium">
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 bg-emerald-700 rounded-sm"></div>
                <span>Available Seats</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 bg-slate-900 rounded-sm"></div>
                <span>Allocated Seats</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 bg-gradient-to-r from-brand-teal to-emerald-400 rounded-sm border border-white shadow-sm ring-1 ring-brand-teal/30 animate-pulse"></div>
                <span className="text-brand-teal font-extrabold flex items-center gap-1">
                  My Seat
                  <span className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-ping"></span>
                </span>
              </div>
            </div>

            {/* Scrollable Canvas for Map */}
            <div className="w-full h-full overflow-auto">
              <div className="min-w-[1000px] h-[800px] relative p-10">
                {/* Desks loop */}
                {desksState.map(desk => (
                  <div 
                    key={desk.id}
                    className="absolute bg-gray-400 border-2 border-gray-500 rounded-sm shadow-md hover:z-40 transition-all duration-150"
                    style={{
                      left: `${desk.x}%`,
                      top: `${desk.y}%`,
                      width: `${desk.width}%`,
                      height: `${desk.height}%`
                    }}
                  >
                    {/* Monitors on desk */}
                    <div className="absolute top-[10%] left-[20%] w-6 h-4 bg-slate-800 rounded-sm"></div>
                    <div className="absolute bottom-[10%] right-[20%] w-6 h-4 bg-slate-800 rounded-sm"></div>

                    {/* Top Chairs */}
                    {desk.topSeats.map(seat => {
                      const employee = getSeatEmployee(seat, data?.employees || [], desk.id, desksState);
                      const empAssets = employee ? getEmployeeAssets(employee.name || `${employee.firstName} ${employee.lastName}`, data?.assets || []) : [];
                      const isMySeat = checkIsMySeat(employee);

                      // Smart positioning to avoid boundary clipping
                      const isLeftEdge = seat.id === 't1';
                      const isRightEdge = seat.id === 't5';
                      const isTopEdge = desk.id === 1 || desk.id === 4;

                      const xAlignClass = isLeftEdge 
                        ? "left-0 ml-[-16px]" 
                        : isRightEdge 
                          ? "right-0 mr-[-16px] left-auto translate-x-0" 
                          : "left-1/2 -translate-x-1/2";

                      const yAlignClass = isTopEdge 
                        ? "top-full mt-3" 
                        : "bottom-full mb-3";

                      const arrowXClass = isLeftEdge 
                        ? "left-[24px] -translate-x-0" 
                        : isRightEdge 
                          ? "right-[24px] left-auto -translate-x-0" 
                          : "left-1/2 -translate-x-1/2";

                      const arrowYClass = isTopEdge 
                        ? "bottom-full border-b-white/95" 
                        : "top-full border-t-white/95";

                      const originClass = isTopEdge 
                        ? "origin-top" 
                        : "origin-bottom";

                      return (
                        <div
                          key={seat.id}
                          onClick={() => handleSeatClick(desk.id, seat.id, true)}
                          className={cn(
                            "absolute w-[12%] h-[30%] -top-[35%] rounded-t-2xl shadow-sm transition-all hover:-translate-y-1 cursor-pointer group z-20 hover:z-50",
                            isMySeat 
                              ? 'bg-gradient-to-tr from-brand-teal via-cyan-500 to-emerald-400 border-2 border-white shadow-[0_0_15px_rgba(20,184,166,0.8)] ring-2 ring-brand-teal/50 animate-pulse'
                              : seat.available 
                                ? 'bg-emerald-700 hover:bg-emerald-600' 
                                : 'bg-slate-900 hover:bg-slate-800'
                          )}
                          style={{ left: `calc(${seat.x}% - 6%)` }}
                        >
                          {isMySeat && (
                            <span className="absolute -top-2 -right-2 bg-brand-teal text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90 border border-white shadow-md animate-bounce z-30">
                              You
                            </span>
                          )}

                          {/* Tooltip Content */}
                          <div className={cn(
                            "absolute w-64 bg-white/95 backdrop-blur-md border border-brand-teal/20 rounded-xl p-4 shadow-xl pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform scale-95 group-hover:scale-100 text-left",
                            xAlignClass,
                            yAlignClass,
                            originClass
                          )}>
                            {/* Tooltip Arrow */}
                            <div className={cn(
                              "absolute border-[6px] border-transparent drop-shadow-sm",
                              arrowXClass,
                              arrowYClass
                            )}></div>
                            
                            {seat.available ? (
                              <div className="text-center py-1">
                                <p className="font-bold text-brand-teal text-sm">Seat Available</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Desk {desk.id} • Seat {seat.id.toUpperCase()}</p>
                              </div>
                            ) : employee ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-9 h-9 border border-brand-teal/20 shadow-sm flex-shrink-0">
                                    <AvatarImage src={employee.profilePhoto || ""} />
                                    <AvatarFallback className="bg-brand-light text-brand-teal text-xs font-bold">
                                      {(employee.name || `${employee.firstName} ${employee.lastName}`).split(' ').map((n: string) => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-extrabold text-slate-900 text-sm truncate flex items-center gap-1.5">
                                      {employee.name || `${employee.firstName} ${employee.lastName}`}
                                      {isMySeat && (
                                        <span className="bg-brand-teal text-white text-[9px] font-extrabold px-1 rounded border border-brand-teal">YOU</span>
                                      )}
                                    </p>
                                    <p className="text-[10px] font-bold text-brand-teal/80 uppercase tracking-wider truncate">{employee.designation}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{employee.department}</p>
                                  </div>
                                </div>
                                
                                <div className="border-t border-brand-teal/10 pt-2.5">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Package className="w-3 h-3 text-brand-teal" />
                                    Assigned Assets ({empAssets.length})
                                  </p>
                                  {empAssets.length > 0 ? (
                                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                      {empAssets.map((asset: any) => (
                                        <div key={asset.id} className="flex items-center justify-between gap-2 p-1 rounded bg-[#EAF7F6]/40 hover:bg-[#EAF7F6]/60 transition-colors">
                                          <span className="text-[11px] font-semibold text-slate-800 truncate max-w-[120px]">{asset.name}</span>
                                          <span className="text-[9px] font-mono text-brand-teal font-bold bg-white px-1.5 py-0.5 rounded shadow-sm border border-brand-teal/10">{asset.assetId}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] italic text-muted-foreground py-0.5">No assets assigned</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-1">
                                <p className="font-bold text-slate-900 text-sm">Seat Allocated</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Desk {desk.id} • Seat {seat.id.toUpperCase()}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Bottom Chairs */}
                    {desk.bottomSeats.map(seat => {
                      const employee = getSeatEmployee(seat, data?.employees || [], desk.id, desksState);
                      const empAssets = employee ? getEmployeeAssets(employee.name || `${employee.firstName} ${employee.lastName}`, data?.assets || []) : [];
                      const isMySeat = checkIsMySeat(employee);

                      // Smart positioning to avoid boundary clipping
                      const isLeftEdge = seat.id === 'b1';
                      const isRightEdge = seat.id === 'b5';
                      const isBottomEdge = desk.id === 3 || desk.id === 5;

                      const xAlignClass = isLeftEdge 
                        ? "left-0 ml-[-16px]" 
                        : isRightEdge 
                          ? "right-0 mr-[-16px] left-auto translate-x-0" 
                          : "left-1/2 -translate-x-1/2";

                      const yAlignClass = isBottomEdge 
                        ? "bottom-full mb-3" 
                        : "top-full mt-3";

                      const arrowXClass = isLeftEdge 
                        ? "left-[24px] -translate-x-0" 
                        : isRightEdge 
                          ? "right-[24px] left-auto -translate-x-0" 
                          : "left-1/2 -translate-x-1/2";

                      const arrowYClass = isBottomEdge 
                        ? "top-full border-t-white/95" 
                        : "bottom-full border-b-white/95";

                      const originClass = isBottomEdge 
                        ? "origin-bottom" 
                        : "origin-top";

                      return (
                        <div
                          key={seat.id}
                          onClick={() => handleSeatClick(desk.id, seat.id, false)}
                          className={cn(
                            "absolute w-[12%] h-[30%] -bottom-[35%] rounded-b-2xl shadow-sm transition-all hover:translate-y-1 cursor-pointer group z-20 hover:z-50",
                            isMySeat 
                              ? 'bg-gradient-to-br from-brand-teal via-cyan-500 to-emerald-400 border-2 border-white shadow-[0_0_15px_rgba(20,184,166,0.8)] ring-2 ring-brand-teal/50 animate-pulse'
                              : seat.available 
                                ? 'bg-emerald-700 hover:bg-emerald-600' 
                                : 'bg-slate-900 hover:bg-slate-800'
                          )}
                          style={{ left: `calc(${seat.x}% - 6%)` }}
                        >
                          {isMySeat && (
                            <span className="absolute -top-2 -right-2 bg-brand-teal text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90 border border-white shadow-md animate-bounce z-30">
                              You
                            </span>
                          )}

                          {/* Tooltip Content */}
                          <div className={cn(
                            "absolute w-64 bg-white/95 backdrop-blur-md border border-brand-teal/20 rounded-xl p-4 shadow-xl pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform scale-95 group-hover:scale-100 text-left",
                            xAlignClass,
                            yAlignClass,
                            originClass
                          )}>
                            {/* Tooltip Arrow */}
                            <div className={cn(
                              "absolute border-[6px] border-transparent drop-shadow-sm",
                              arrowXClass,
                              arrowYClass
                            )}></div>
                            
                            {seat.available ? (
                              <div className="text-center py-1">
                                <p className="font-bold text-brand-teal text-sm">Seat Available</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Desk {desk.id} • Seat {seat.id.toUpperCase()}</p>
                              </div>
                            ) : employee ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-9 h-9 border border-brand-teal/20 shadow-sm flex-shrink-0">
                                    <AvatarImage src={employee.profilePhoto || ""} />
                                    <AvatarFallback className="bg-brand-light text-brand-teal text-xs font-bold">
                                      {(employee.name || `${employee.firstName} ${employee.lastName}`).split(' ').map((n: string) => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-extrabold text-slate-900 text-sm truncate flex items-center gap-1.5">
                                      {employee.name || `${employee.firstName} ${employee.lastName}`}
                                      {isMySeat && (
                                        <span className="bg-brand-teal text-white text-[9px] font-extrabold px-1 rounded border border-brand-teal">YOU</span>
                                      )}
                                    </p>
                                    <p className="text-[10px] font-bold text-brand-teal/80 uppercase tracking-wider truncate">{employee.designation}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{employee.department}</p>
                                  </div>
                                </div>
                                
                                <div className="border-t border-brand-teal/10 pt-2.5">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Package className="w-3 h-3 text-brand-teal" />
                                    Assigned Assets ({empAssets.length})
                                  </p>
                                  {empAssets.length > 0 ? (
                                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                      {empAssets.map((asset: any) => (
                                        <div key={asset.id} className="flex items-center justify-between gap-2 p-1 rounded bg-[#EAF7F6]/40 hover:bg-[#EAF7F6]/60 transition-colors">
                                          <span className="text-[11px] font-semibold text-slate-800 truncate max-w-[120px]">{asset.name}</span>
                                          <span className="text-[9px] font-mono text-brand-teal font-bold bg-white px-1.5 py-0.5 rounded shadow-sm border border-brand-teal/10">{asset.assetId}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] italic text-muted-foreground py-0.5">No assets assigned</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-1">
                                <p className="font-bold text-slate-900 text-sm">Seat Allocated</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Desk {desk.id} • Seat {seat.id.toUpperCase()}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Office Box */}
                <div className="absolute bottom-10 right-10 w-[35%] h-[30%] bg-gray-200 border-2 border-gray-300 rounded-sm flex items-center justify-center">
                  <span className="absolute top-4 right-4 text-gray-500 font-bold tracking-wider uppercase text-xs">Private Office</span>
                  <div className="relative w-[40%] h-[50%] bg-[#e0d6b8] border border-[#cfc4a3] rounded-full">
                    <div className="absolute top-0 -left-6 w-5 h-8 bg-slate-900 rounded-l-xl"></div>
                    <div className="absolute bottom-0 -left-6 w-5 h-8 bg-slate-900 rounded-l-xl"></div>
                    <div className="absolute top-1/2 -translate-y-1/2 -left-6 w-5 h-8 bg-slate-900 rounded-l-xl"></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-white overflow-auto p-8">
            {customImage ? (
              <div className="relative group max-w-full">
                <img 
                  src={customImage} 
                  alt="Custom Workspace Layout" 
                  className="shadow-2xl rounded-lg border border-border max-w-full h-auto"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none rounded-lg" />
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Layout className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">No Custom Layout Found</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">Create and publish your layout from the Blank Canvas to see it here.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manage Seat Modal */}
      {selectedSeat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-brand-teal/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-brand-teal to-brand-teal-light p-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg">Manage Seating Allotment</h3>
                <p className="text-xs text-white/80">Desk {selectedSeat.deskId} • Seat {selectedSeat.seatId.toUpperCase()}</p>
              </div>
              <button 
                onClick={() => setSelectedSeat(null)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Status Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Seat Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModalStatus("available")}
                    className={cn(
                      "py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2",
                      modalStatus === "available"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                    Available
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStatus("allocated")}
                    className={cn(
                      "py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2",
                      modalStatus === "allocated"
                        ? "bg-slate-900 border-slate-950 text-white shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <span className="w-2.5 h-2.5 bg-slate-400 rounded-full"></span>
                    Allocated
                  </button>
                </div>
              </div>

              {/* Employee Select */}
              {modalStatus === "allocated" && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign Employee</label>
                  <select
                    value={modalEmployeeId}
                    onChange={(e) => setModalEmployeeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-teal/50 transition-all text-slate-800"
                  >
                    <option value="">-- Choose Employee --</option>
                    {data?.employees?.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name || `${emp.firstName} ${emp.lastName}`} ({emp.designation || emp.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setSelectedSeat(null)}
                className="font-bold text-slate-600 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAllotment}
                className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold rounded-xl px-5"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
