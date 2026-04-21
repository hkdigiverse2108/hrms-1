"use client";

import React from "react";
import { Modal, Form, Input, Select, DatePicker, TimePicker, Button } from "antd";
import dayjs from "dayjs";

const { TextArea } = Input;

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: any) => void;
}

export function AddEventModal({ isOpen, onClose, onSubmit }: AddEventModalProps) {
  const [form] = Form.useForm();

  const handleFinish = (values: any) => {
    onSubmit(values);
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={<span className="text-lg font-bold text-slate-800">Add New Event</span>}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      centered
      width={500}
      className="custom-modal"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        className="mt-6"
        initialValues={{
          eventType: 'Meeting',
          date: dayjs('2022-02-16'),
          startTime: dayjs('2022-02-16 10:00'),
          endTime: dayjs('2022-02-16 11:00'),
        }}
      >
        <Form.Item 
          label={<span className="font-semibold text-slate-700">Event Title</span>} 
          name="title"
          rules={[{ required: true, message: 'Please enter event title' }]}
        >
          <Input placeholder="e.g. Marketing Planning" className="h-11 rounded-lg" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item 
            label={<span className="font-semibold text-slate-700">Event Type</span>} 
            name="eventType"
          >
            <Select className="h-11 custom-select">
              <Select.Option value="Meeting">Meeting</Select.Option>
              <Select.Option value="Workshop">Workshop</Select.Option>
              <Select.Option value="Holiday">Holiday</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item 
            label={<span className="font-semibold text-slate-700">Date</span>} 
            name="date"
          >
            <DatePicker className="w-full h-11 rounded-lg" format="MMM DD, YYYY" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item 
            label={<span className="font-semibold text-slate-700">Start Time</span>} 
            name="startTime"
          >
            <TimePicker className="w-full h-11 rounded-lg" format="hh:mm A" use12Hours />
          </Form.Item>

          <Form.Item 
            label={<span className="font-semibold text-slate-700">End Time</span>} 
            name="endTime"
          >
            <TimePicker className="w-full h-11 rounded-lg" format="hh:mm A" use12Hours />
          </Form.Item>
        </div>

        <Form.Item 
          label={<span className="font-semibold text-slate-700">Description (Optional)</span>} 
          name="description"
        >
          <TextArea 
            rows={4} 
            placeholder="Describe your event..." 
            className="rounded-lg"
          />
        </Form.Item>

        <div className="flex justify-end gap-3 mt-8">
          <Button 
            onClick={onClose} 
            className="px-6 h-11 rounded-lg font-semibold text-slate-600 border-slate-200"
          >
            Cancel
          </Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            className="px-8 h-11 rounded-lg font-semibold bg-brand-teal hover:bg-brand-teal-light border-none"
          >
            Create Event
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
