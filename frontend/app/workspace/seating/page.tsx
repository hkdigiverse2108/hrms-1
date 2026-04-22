"use client";

import React from "react";

const desks = [
  {
    id: 1, x: 5, y: 15, width: 35, height: 15,
    topSeats: [
      { id: 't1', x: 10, available: true },
      { id: 't2', x: 30, available: true },
      { id: 't3', x: 50, available: false },
      { id: 't4', x: 70, available: true },
      { id: 't5', x: 90, available: true },
    ],
    bottomSeats: [
      { id: 'b1', x: 10, available: false },
      { id: 'b2', x: 30, available: false },
      { id: 'b3', x: 50, available: false },
      { id: 'b4', x: 70, available: true },
      { id: 'b5', x: 90, available: true },
    ]
  },
  {
    id: 2, x: 5, y: 40, width: 35, height: 15,
    topSeats: [
      { id: 't1', x: 10, available: false },
      { id: 't2', x: 30, available: true },
      { id: 't3', x: 50, available: false },
      { id: 't4', x: 70, available: false },
      { id: 't5', x: 90, available: false },
    ],
    bottomSeats: [
      { id: 'b1', x: 10, available: true },
      { id: 'b2', x: 30, available: false },
      { id: 'b3', x: 50, available: false },
      { id: 'b4', x: 70, available: true },
      { id: 'b5', x: 90, available: true },
    ]
  },
  {
    id: 3, x: 5, y: 65, width: 35, height: 15,
    topSeats: [
      { id: 't1', x: 10, available: false },
      { id: 't2', x: 30, available: false },
      { id: 't3', x: 50, available: false },
      { id: 't4', x: 70, available: false },
      { id: 't5', x: 90, available: false },
    ],
    bottomSeats: [
      { id: 'b1', x: 10, available: false },
      { id: 'b2', x: 30, available: false },
      { id: 'b3', x: 50, available: true },
      { id: 'b4', x: 70, available: true },
      { id: 'b5', x: 90, available: true },
    ]
  },
  {
    id: 4, x: 50, y: 15, width: 35, height: 15,
    topSeats: [
      { id: 't1', x: 10, available: false },
      { id: 't2', x: 30, available: false },
      { id: 't3', x: 50, available: true },
      { id: 't4', x: 70, available: false },
      { id: 't5', x: 90, available: true },
    ],
    bottomSeats: [
      { id: 'b1', x: 10, available: true },
      { id: 'b2', x: 30, available: true },
      { id: 'b3', x: 50, available: true },
      { id: 'b4', x: 70, available: false },
      { id: 'b5', x: 90, available: false },
    ]
  },
  {
    id: 5, x: 50, y: 40, width: 35, height: 15,
    topSeats: [
      { id: 't1', x: 10, available: false },
      { id: 't2', x: 30, available: true },
      { id: 't3', x: 50, available: false },
      { id: 't4', x: 70, available: false },
      { id: 't5', x: 90, available: false },
    ],
    bottomSeats: [
      { id: 'b1', x: 10, available: true },
      { id: 'b2', x: 30, available: false },
      { id: 'b3', x: 50, available: false },
      { id: 'b4', x: 70, available: false },
      { id: 'b5', x: 90, available: false },
    ]
  }
];

export default function SeatingArrangementPage() {
  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex-1 bg-[#e4dfcd] rounded-xl overflow-hidden shadow-sm relative min-h-[600px]">
        
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
        </div>

        {/* Scrollable Canvas for Map */}
        <div className="w-full h-full overflow-auto">
          <div className="min-w-[1000px] h-[800px] relative p-10">
            
            {/* Desks loop */}
            {desks.map(desk => (
              <div 
                key={desk.id}
                className="absolute bg-gray-400 border-2 border-gray-500 rounded-sm shadow-md"
                style={{
                  left: `${desk.x}%`,
                  top: `${desk.y}%`,
                  width: `${desk.width}%`,
                  height: `${desk.height}%`
                }}
              >
                {/* Monitors on desk (Decorative) */}
                <div className="absolute top-[10%] left-[20%] w-6 h-4 bg-slate-800 rounded-sm"></div>
                <div className="absolute top-[10%] left-[21%] w-1 h-1 bg-white rounded-full"></div>
                
                <div className="absolute bottom-[10%] right-[20%] w-6 h-4 bg-slate-800 rounded-sm"></div>
                <div className="absolute bottom-[10%] right-[21%] w-1 h-1 bg-white rounded-full"></div>

                {/* Top Chairs */}
                {desk.topSeats.map(seat => (
                  <div
                    key={seat.id}
                    className={`absolute w-[12%] h-[30%] -top-[35%] rounded-t-2xl shadow-sm transition-transform hover:-translate-y-1 cursor-pointer ${seat.available ? 'bg-emerald-700' : 'bg-slate-900'}`}
                    style={{ left: `calc(${seat.x}% - 6%)` }}
                    title={seat.available ? "Seat Available" : "Seat Allocated"}
                  ></div>
                ))}

                {/* Bottom Chairs */}
                {desk.bottomSeats.map(seat => (
                  <div
                    key={seat.id}
                    className={`absolute w-[12%] h-[30%] -bottom-[35%] rounded-b-2xl shadow-sm transition-transform hover:translate-y-1 cursor-pointer ${seat.available ? 'bg-emerald-700' : 'bg-slate-900'}`}
                    style={{ left: `calc(${seat.x}% - 6%)` }}
                    title={seat.available ? "Seat Available" : "Seat Allocated"}
                  ></div>
                ))}
              </div>
            ))}

            {/* Office Box on Bottom Right */}
            <div className="absolute bottom-10 right-10 w-[35%] h-[30%] bg-gray-200 border-2 border-gray-300 rounded-sm flex items-center justify-center">
              <span className="absolute top-4 right-4 text-gray-500 font-bold tracking-wider">Office</span>
              
              {/* Conference Table */}
              <div className="relative w-[40%] h-[50%] bg-[#e0d6b8] border border-[#cfc4a3] rounded-full">
                {/* Chairs around table */}
                <div className="absolute top-0 -left-6 w-5 h-8 bg-slate-900 rounded-l-xl"></div>
                <div className="absolute bottom-0 -left-6 w-5 h-8 bg-slate-900 rounded-l-xl"></div>
                <div className="absolute top-1/2 -translate-y-1/2 -left-6 w-5 h-8 bg-slate-900 rounded-l-xl"></div>
                
                <div className="absolute top-0 -right-6 w-5 h-8 bg-slate-900 rounded-r-xl"></div>
                <div className="absolute bottom-0 -right-6 w-5 h-8 bg-slate-900 rounded-r-xl"></div>
                <div className="absolute top-1/2 -translate-y-1/2 -right-6 w-5 h-8 bg-slate-900 rounded-r-xl"></div>
              </div>
            </div>

            {/* Path/Door indicator */}
            <div className="absolute bottom-10 right-[45%] w-[10%] h-4 bg-gray-600"></div>

          </div>
        </div>
      </div>
    </div>
  );
}
