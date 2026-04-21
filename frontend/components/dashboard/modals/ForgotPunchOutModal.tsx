"use client";

import React from "react";
import { Modal, Form, DatePicker, Select, Input, Button } from "antd";
import { ClockCircleOutlined, CalendarOutlined, LoginOutlined, FormOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

interface ForgotPunchOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
}

export function ForgotPunchOutModal({ isOpen, onClose, onSubmit }: ForgotPunchOutModalProps) {
  const [form] = Form.useForm();

  const handleFinish = (values: any) => {
    onSubmit(values);
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      centered
      width={480}
      className="custom-modal"
      closeIcon={null} // We'll add a close button if needed, but Antd default is fine. Actually image shows an 'X'
    >
      <div className="flex flex-col items-center text-center p-4">
        {/* Top Icon */}
        <div className="w-16 h-16 bg-brand-light flex items-center justify-center rounded-full mb-6 border-4 border-white shadow-sm">
          <ClockCircleOutlined style={{ fontSize: '32px', color: '#09A08A' }} />
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-2">Forgot Punch-Out Request</h2>
        <p className="text-sm text-slate-500 mb-8 max-w-sm">
          Submit a request to recover your missing punch-out time. This will be sent to your manager for approval.
        </p>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          className="w-full text-left"
          initialValues={{
            date: dayjs('2026-04-24'),
            recordedPunchIn: '09:00 AM'
          }}
        >
          <Form.Item label={<span className="font-semibold text-slate-700">Date</span>} name="date">
             <DatePicker 
                className="w-full h-12 rounded-lg bg-slate-50" 
                suffixIcon={<CalendarOutlined className="text-slate-400" />}
                format="MMMM DD, YYYY"
             />
          </Form.Item>

          <Form.Item label={<span className="font-semibold text-slate-700">Recorded Punch-In</span>} name="recordedPunchIn">
             <Input 
                disabled 
                className="h-12 rounded-lg bg-slate-50 border-slate-200" 
                prefix={<LoginOutlined className="text-slate-400 mr-2" />}
             />
          </Form.Item>

          <Form.Item 
            label={<span className="font-semibold text-slate-700">Recover Punch-Out Time <span className="text-red-500">*</span></span>} 
            name="recoverTime"
            rules={[{ required: true, message: 'Please select a time' }]}
          >
             <Select 
                placeholder="Select time..." 
                className="w-full custom-select"
                suffixIcon={<ClockCircleOutlined className="text-slate-400" />}
             >
                <Select.Option value="05:00 PM">05:00 PM</Select.Option>
                <Select.Option value="06:00 PM">06:00 PM</Select.Option>
                <Select.Option value="07:00 PM">07:00 PM</Select.Option>
             </Select>
          </Form.Item>

          <Form.Item 
            label={<span className="font-semibold text-slate-700">Reason <span className="text-red-500">*</span></span>} 
            name="reason"
            rules={[{ required: true, message: 'Please select a reason' }]}
          >
             <Select 
                placeholder="Forgot to punch out" 
                className="w-full custom-select"
             >
                <Select.Option value="forgot">Forgot to punch out</Select.Option>
                <Select.Option value="technical">Technical issue</Select.Option>
                <Select.Option value="other">Other</Select.Option>
             </Select>
          </Form.Item>

          <div className="flex gap-4 mt-8">
            <Button 
                onClick={onClose} 
                className="flex-1 h-12 rounded-lg font-semibold text-slate-600 border-slate-200"
            >
              Cancel
            </Button>
            <Button 
                type="primary" 
                htmlType="submit" 
                className="flex-1 h-12 rounded-lg font-semibold bg-brand-teal hover:bg-brand-teal-light border-none"
            >
              Submit Request
            </Button>
          </div>
        </Form>
      </div>
    </Modal>
  );
}
