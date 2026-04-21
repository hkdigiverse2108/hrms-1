"use client";

import React from "react";
import { Modal, Button } from "antd";
import { LogoutOutlined, InfoCircleOutlined, ArrowRightOutlined, LockOutlined } from "@ant-design/icons";

interface PunchOutRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToPunchOut: () => void;
}

export function PunchOutRequiredModal({ isOpen, onClose, onGoToPunchOut }: PunchOutRequiredModalProps) {
  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      centered
      width={480}
      className="custom-modal"
      closeIcon={null}
    >
      <div className="flex flex-col items-center text-center p-4">
        {/* Top Icon */}
        <div className="w-16 h-16 bg-amber-50 flex items-center justify-center rounded-full mb-6 border-4 border-white shadow-sm">
          <LogoutOutlined style={{ fontSize: '32px', color: '#F59E0B' }} />
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-2">Punch out required first</h2>
        <p className="text-sm text-slate-500 mb-6 max-w-sm">
          Before sending a forgot punch-out request, you need to complete today's punch out entry. After that, you can continue with the recovery request.
        </p>

        {/* Why this appears box */}
        <div className="bg-brand-light/40 border border-brand-teal/20 rounded-xl p-4 mb-6 text-left flex gap-3">
          <InfoCircleOutlined className="text-brand-teal mt-0.5" />
          <p className="text-xs text-brand-dark leading-relaxed">
            <span className="font-bold">Why this appears:</span> Your attendance record is still active. The system only allows forgot punch-out recovery after a punch out has already been recorded.
          </p>
        </div>

        {/* Required actions */}
        <div className="w-full text-left mb-8">
           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Required actions</h4>
           <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-teal text-white flex items-center justify-center text-xs font-bold">1</div>
                  <span className="text-sm font-semibold text-slate-700">Punch out for today</span>
                </div>
                <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-600 px-2 py-0.5 rounded">Pending</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 opacity-60 rounded-lg border border-dashed border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">2</div>
                  <span className="text-sm font-semibold text-slate-700">Open forgot punch-out request</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <LockOutlined className="text-[10px]" />
                  <span className="text-[10px] font-bold uppercase">Locked</span>
                </div>
              </div>
           </div>
        </div>

        <div className="flex gap-4 w-full">
          <Button 
              onClick={onClose} 
              className="flex-1 h-12 rounded-lg font-semibold text-slate-600 border-slate-200"
          >
            Cancel
          </Button>
          <Button 
              type="primary" 
              onClick={onGoToPunchOut}
              className="flex-1 h-12 rounded-lg font-semibold bg-brand-teal hover:bg-brand-teal-light border-none flex items-center justify-center gap-2"
          >
            Go to punch out <ArrowRightOutlined />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
