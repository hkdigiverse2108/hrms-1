"use client";

import React, { useRef, useState, useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { 
  Pencil, 
  Eraser, 
  Trash2, 
  Download, 
  Undo, 
  Type, 
  Minus,
  Square,
  Circle,
  MousePointer2,
  Monitor,
  Armchair,
  RectangleHorizontal,
  RectangleVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function BlankCanvasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#10b981"); // brand-teal
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<"pencil" | "eraser" | "table" | "chair" | "pc" | "select">("pencil");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [elements, setElements] = useState<any[]>([]);
  const [history, setHistory] = useState<any[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth * 2;
      canvas.height = 600 * 2;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `600px`;
    }

    const context = canvas.getContext("2d");
    if (context) {
      context.scale(2, 2);
      context.lineCap = "round";
      context.lineJoin = "round";
      contextRef.current = context;
    }

    // Load saved elements
    const saved = localStorage.getItem("workspace_canvas_elements");
    if (saved) {
      try {
        setElements(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved elements", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Auto-save elements
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("workspace_canvas_elements", JSON.stringify(elements));
    }
  }, [elements, isLoaded]);

  // Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all elements
    elements.forEach((el) => {
      ctx.save();
      if (el.type === "pencil" || el.type === "eraser") {
        ctx.beginPath();
        ctx.strokeStyle = el.type === "eraser" ? "#ffffff" : el.color;
        ctx.lineWidth = el.lineWidth;
        el.points.forEach((p: any, i: number) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      } else {
        drawObjectOnCanvas(ctx, el.x, el.y, el.type, el.color, el.id === selectedId, el.width, el.height);
      }
      ctx.restore();
    });
  }, [elements, selectedId]);

  const drawObjectOnCanvas = (ctx: CanvasRenderingContext2D, x: number, y: number, type: string, elColor: string, isSelected: boolean, width: number, height: number) => {
    ctx.save();
    
    // Selection Highlight
    if (isSelected) {
      ctx.shadowColor = "#3b82f6";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      
      // Draw Bounding Box
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x - width/2 - 4, y - height/2 - 4, width + 8, height + 8);
      ctx.setLineDash([]);
      
      // Draw Resize Handles (Bottom Right)
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(x + width/2 - 2, y + height/2 - 2, 8, 8);
    }

    if (type === "table") {
      ctx.beginPath();
      ctx.roundRect(x - width/2, y - height/2, width, height, 4);
      ctx.fillStyle = "#94a3b8";
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#3b82f6" : "#475569";
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();
    } else if (type === "chair") {
      ctx.beginPath();
      ctx.roundRect(x - width/2, y - height/2, width, height, width/3);
      ctx.fillStyle = elColor;
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#3b82f6" : "rgba(0,0,0,0.1)";
      ctx.stroke();
    } else if (type === "pc") {
      ctx.beginPath();
      ctx.roundRect(x - width/2, y - height/2, width, height, 4);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + width/2 * 0.5, y + height/2 * 0.5, width * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
    }
    ctx.restore();
  };

  const startDrawing = ({ nativeEvent }: React.MouseEvent) => {
    const { offsetX, offsetY } = nativeEvent;
    
    // 1. Hit Test for Objects
    const found = [...elements].reverse().find(el => {
      if (el.type === "table" || el.type === "chair" || el.type === "pc") {
        return offsetX >= el.x - el.width/2 && offsetX <= el.x + el.width/2 && offsetY >= el.y - el.height/2 && offsetY <= el.y + el.height/2;
      } else if (el.type === "pencil" || el.type === "eraser") {
        return el.points.some((p: any) => Math.hypot(p.x - offsetX, p.y - offsetY) < 10);
      }
      return false;
    });

    // 2. Handle Selection Logic for the Select Tool
    if (tool === "select") {
      // Check for resize handle hit first
      if (selectedId) {
        const el = elements.find(e => e.id === selectedId);
        if (el && el.type !== "pencil" && el.type !== "eraser") {
          const handleX = el.x + el.width/2;
          const handleY = el.y + el.height/2;
          if (Math.hypot(offsetX - handleX, offsetY - handleY) < 15) {
            setHistory(prev => [...prev, elements]);
            setIsResizing(true);
            return;
          }
        }
      }

      if (found) {
        setHasDragged(false);
        if (found.id !== selectedId) {
          setHistory(prev => [...prev, elements]);
          setSelectedId(found.id);
        }
        setIsDragging(true);
        setDragOffset({ x: offsetX - (found.x || 0), y: offsetY - (found.y || 0) });
      } else {
        setSelectedId(null);
      }
      return;
    }

    // 3. For other tools, clicking an empty part should deselect
    if (!found) {
      setSelectedId(null);
    }

    if (tool === "table" || tool === "chair" || tool === "pc") {
      const defaultSizes = {
        table: { w: 240, h: 70 },
        chair: { w: 36, h: 44 },
        pc: { w: 24, h: 16 }
      };
      const size = defaultSizes[tool as keyof typeof defaultSizes];
      const newElement = {
        id: Date.now().toString(),
        type: tool,
        x: offsetX,
        y: offsetY,
        width: size.w,
        height: size.h,
        color: color,
        lineWidth: lineWidth
      };
      setHistory(prev => [...prev, elements]);
      setElements([...elements, newElement]);
      setSelectedId(newElement.id);
      return;
    }

    const newElement = {
      id: Date.now().toString(),
      type: tool,
      points: [{ x: offsetX, y: offsetY }],
      color: color,
      lineWidth: lineWidth
    };
    setHistory(prev => [...prev, elements]);
    setElements([...elements, newElement]);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }: React.MouseEvent) => {
    const { offsetX, offsetY } = nativeEvent;
    setMousePos({ x: offsetX, y: offsetY });
    
    if (isResizing && selectedId) {
      setElements(prev => prev.map(el => {
        if (el.id === selectedId) {
          return { 
            ...el, 
            width: Math.max(20, (offsetX - el.x) * 2), 
            height: Math.max(10, (offsetY - el.y) * 2) 
          };
        }
        return el;
      }));
      return;
    }

    if (isDragging && selectedId && tool === "select") {
      setHasDragged(true);
      setElements(prev => prev.map(el => {
        if (el.id === selectedId) {
          return { ...el, x: offsetX - dragOffset.x, y: offsetY - dragOffset.y };
        }
        return el;
      }));
      return;
    }

    if (!isDrawing) return;

    setElements(prev => {
      const last = prev[prev.length - 1];
      const others = prev.slice(0, -1);
      return [...others, { ...last, points: [...last.points, { x: offsetX, y: offsetY }] }];
    });
  };

  const finishDrawing = () => {
    if (tool === "select" && isDragging && !hasDragged && selectedId) {
      // Toggle selection off if we just clicked (didn't drag)
      setSelectedId(null);
    }
    setIsDrawing(false);
    setIsDragging(false);
    setIsResizing(false);
    setHasDragged(false);
  };

  const undo = () => {
    if (history.length > 0) {
      const prevState = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setElements(prevState);
      setSelectedId(null);
    }
  };

  const clearCanvas = () => {
    setHistory(prev => [...prev, elements]);
    setElements([]);
    setSelectedId(null);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setHistory(prev => [...prev, elements]);
      setElements(elements.filter(el => el.id !== selectedId));
      setSelectedId(null);
    } else {
      clearCanvas();
    }
  };

  const saveWorkspace = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      
      // Save for both local persistence and other tabs
      localStorage.setItem("workspace_canvas_elements", JSON.stringify(elements));
      localStorage.setItem("workspace_custom_layout", dataUrl);
      
      alert("Workspace saved and published successfully!");
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      const link = document.createElement("a");
      link.download = "workspace-layout.png";
      link.href = dataUrl;
      link.click();
    }
  };

  const publishToWorkspace = () => {
    saveWorkspace();
  };

  const colors = [
    "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#000000"
  ];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Blank Canvas" 
        description="A free-form space for quick sketches, diagrams, and creative brainstorming."
      />

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1 bg-white border border-border rounded-lg shadow-sm">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setTool("select"); setSelectedId(null); }}
              className={cn("h-9 w-9", tool === "select" && "bg-brand-light text-brand-teal")}
              title="Select & Move"
            >
              <MousePointer2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setTool("pencil"); setSelectedId(null); }}
              className={cn("h-9 w-9", tool === "pencil" && "bg-brand-light text-brand-teal")}
              title="Pencil"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setTool("eraser"); setSelectedId(null); }}
              className={cn("h-9 w-9", tool === "eraser" && "bg-brand-light text-brand-teal")}
              title="Eraser"
            >
              <Eraser className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={undo}
              disabled={history.length === 0}
              className={cn("h-9 w-9", history.length === 0 ? "opacity-30" : "text-brand-teal hover:bg-brand-light")}
              title="Undo (Revert Change)"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <div className="w-[1px] h-6 bg-border mx-1" />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={deleteSelected} 
              className={cn("h-9 w-9", selectedId ? "text-red-500 hover:bg-red-50" : "text-muted-foreground")}
              title={selectedId ? "Remove Selected" : "Clear All"}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white border border-border rounded-lg shadow-sm">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setTool("table"); setSelectedId(null); }}
              className={cn("h-9 w-9", tool === "table" && "bg-brand-light text-brand-teal")}
              title="Add Table"
            >
              <RectangleHorizontal className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setTool("chair"); setSelectedId(null); }}
              className={cn("h-9 w-9", tool === "chair" && "bg-brand-light text-brand-teal")}
              title="Add Chair"
            >
              <RectangleVertical className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setTool("pc"); setSelectedId(null); }}
              className={cn("h-9 w-9", tool === "pc" && "bg-brand-light text-brand-teal")}
              title="Add PC"
            >
              <div className="w-4 h-3 bg-slate-900 rounded-sm relative">
                <div className="absolute top-1 right-1 w-0.5 h-0.5 bg-white rounded-full opacity-80" />
              </div>
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {/* Color Palette */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-border rounded-lg shadow-sm">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setTool("pencil"); }}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 border-transparent transition-all hover:scale-110",
                    color === c && tool === "pencil" && "border-slate-300 scale-110 shadow-sm"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Line Width */}
            <div className="flex items-center gap-3 px-3 py-1.5 bg-white border border-border rounded-lg shadow-sm">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Size</span>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={lineWidth} 
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                className="w-24 accent-brand-teal"
              />
              <span className="text-xs font-mono font-bold w-4">{lineWidth}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="icon"
              onClick={downloadCanvas}
              className="border-slate-200 text-slate-500 hover:text-brand-teal hover:border-brand-teal"
              title="Download as Image (PNG)"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button 
              onClick={saveWorkspace}
              className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold px-6 shadow-md shadow-brand-teal/20"
            >
              Save Workspace
            </Button>
          </div>
        </div>

        {/* Canvas Area */}
        <div 
          className="relative bg-slate-100 p-8 flex justify-center min-h-[600px]"
          onMouseDown={() => setSelectedId(null)}
        >
          <canvas
            onMouseDown={(e) => { e.stopPropagation(); startDrawing(e); }}
            onMouseUp={finishDrawing}
            onMouseMove={draw}
            onMouseLeave={finishDrawing}
            ref={canvasRef}
            className={cn(
              "bg-white shadow-xl rounded-lg border border-border/50 transition-shadow hover:shadow-2xl",
              tool === "select" ? "cursor-default" : "cursor-crosshair"
            )}
          />
          
          {/* Ghost Preview */}
          {["table", "chair", "pc"].includes(tool) && (
            <div 
              className="absolute pointer-events-none opacity-40 flex items-center justify-center border-2 border-dashed rounded-lg bg-white/50 backdrop-blur-[2px]"
              style={{ 
                left: mousePos.x + 32, // offset for parent padding (p-8 = 32px)
                top: mousePos.y + 32,
                width: tool === "table" ? "120px" : tool === "chair" ? "40px" : "40px",
                height: tool === "table" ? "70px" : tool === "chair" ? "50px" : "35px",
                transform: 'translate(-50%, -50%)',
                borderColor: color,
                color: color
              }}
            >
              {tool === "table" && <RectangleHorizontal className="w-6 h-6" />}
              {tool === "chair" && <RectangleVertical className="w-6 h-6" />}
              {tool === "pc" && (
                <div className="w-6 h-4 bg-slate-900 rounded-sm relative">
                  <div className="absolute top-1 right-1 w-0.5 h-0.5 bg-white rounded-full opacity-80" />
                </div>
              )}
            </div>
          )}
          
          <div className="absolute bottom-12 right-12 flex flex-col gap-2 opacity-50 hover:opacity-100 transition-opacity">
             <div className="bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-border text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm">
                {tool === "select" ? "Selection Mode" : "Drawing Mode"}
             </div>
          </div>
        </div>
      </div>
      
      {/* Instructions Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
            <Pencil className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-800 mb-1">Sketch Ideas</h4>
          <p className="text-sm text-slate-500 leading-relaxed">Quickly visualize workflows or design mockups directly in your HRMS workspace.</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
             <Square className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-800 mb-1">Workspace Planning</h4>
          <p className="text-sm text-slate-500 leading-relaxed">Add tables, chairs, and PCs to plan your office layout or seating arrangements quickly.</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
            <Download className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-800 mb-1">Export Work</h4>
          <p className="text-sm text-slate-500 leading-relaxed">Export your canvas as a high-quality PNG image to share with your team or attach to tasks.</p>
        </div>
      </div>
    </div>
  );
}
