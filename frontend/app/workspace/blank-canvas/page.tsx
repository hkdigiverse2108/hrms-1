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
  MousePointer2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function BlankCanvasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#10b981"); // brand-teal
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas display size
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
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      contextRef.current = context;
      
      // Fill background with white
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      contextRef.current.lineWidth = lineWidth;
    }
  }, [color, lineWidth, tool]);

  const startDrawing = ({ nativeEvent }: React.MouseEvent) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    contextRef.current?.closePath();
    setIsDrawing(false);
  };

  const draw = ({ nativeEvent }: React.MouseEvent) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current?.lineTo(offsetX, offsetY);
    contextRef.current?.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (canvas && context) {
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement("a");
      link.download = "workspace-sketch.png";
      link.href = canvas.toDataURL();
      link.click();
    }
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
              onClick={() => setTool("pencil")}
              className={cn("h-9 w-9", tool === "pencil" && "bg-brand-light text-brand-teal")}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setTool("eraser")}
              className={cn("h-9 w-9", tool === "eraser" && "bg-brand-light text-brand-teal")}
            >
              <Eraser className="w-4 h-4" />
            </Button>
            <div className="w-[1px] h-6 bg-border mx-1" />
            <Button variant="ghost" size="icon" onClick={clearCanvas} className="h-9 w-9 text-muted-foreground hover:text-red-500">
              <Trash2 className="w-4 h-4" />
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

          <Button 
            onClick={downloadCanvas}
            className="bg-brand-teal hover:bg-brand-teal-light text-white font-semibold"
          >
            <Download className="w-4 h-4 mr-2" />
            Save Image
          </Button>
        </div>

        {/* Canvas Area */}
        <div className="relative bg-slate-100 p-8 flex justify-center min-h-[600px]">
          <canvas
            onMouseDown={startDrawing}
            onMouseUp={finishDrawing}
            onMouseMove={draw}
            onMouseLeave={finishDrawing}
            ref={canvasRef}
            className="bg-white shadow-xl rounded-lg cursor-crosshair border border-border/50 transition-shadow hover:shadow-2xl"
          />
          
          <div className="absolute bottom-12 right-12 flex flex-col gap-2 opacity-50 hover:opacity-100 transition-opacity">
             <div className="bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-border text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm">
                Live Drawing Workspace
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
          <h4 className="font-bold text-slate-800 mb-1">Diagramming</h4>
          <p className="text-sm text-slate-500 leading-relaxed">Use the eraser and different brush sizes to create clean structure diagrams for your projects.</p>
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
