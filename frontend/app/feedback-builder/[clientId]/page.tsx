"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, ArrowLeft, Copy, CheckCircle2, GripVertical, Type, AlignLeft, Star, ListTodo } from "lucide-react";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";

export default function FeedbackBuilderPage() {
  const { clientId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const [title, setTitle] = useState("Client Feedback Form");
  const [isSaving, setIsSaving] = useState(false);

  // Wrapper component for useSearchParams since it needs Suspense
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FeedbackBuilderContent 
        clientId={clientId} 
        router={router}
        user={user}
      />
    </Suspense>
  );
}

function FeedbackBuilderContent({ clientId, router, user }: any) {
  const searchParams = useSearchParams();
  const editFormId = searchParams.get("editId");

  const [title, setTitle] = useState("Client Feedback Form");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editFormId) {
      fetch(`${API_URL}/forms/${editFormId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.title) {
            setTitle(data.title);
            setDescription(data.description || "");
            setFields(data.fields || []);
          }
        })
        .catch(err => console.error("Error fetching form to edit:", err));
    }
  }, [editFormId]);
  
  const addField = (type: string = "text") => {
    setFields([
      ...fields, 
      { 
        id: Math.random().toString(36).substr(2, 9), 
        type: type, 
        label: "New Question", 
        required: false,
        options: (type === 'radio' || type === 'select' || type === 'checkbox') ? ["Option 1", "Option 2"] : []
      }
    ]);
  };

  const updateField = (id: string, key: string, value: any) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Form title is required");
      return;
    }
    if (fields.length === 0) {
      toast.error("Add at least one field to the form");
      return;
    }

    setIsSaving(true);
    try {
      const url = editFormId ? `${API_URL}/forms/${editFormId}` : `${API_URL}/forms?createdBy=${user?.userId || "System"}`;
      const method = editFormId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId,
          title,
          description,
          fields
        })
      });

      if (res.ok) {
        toast.success(editFormId ? "Form updated successfully!" : "Form created successfully!");
        router.push(`/work-management/smm/${clientId}/feedback`);
      } else {
        toast.error(editFormId ? "Failed to update form" : "Failed to create form");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0 z-10">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} title="Back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-slate-800">Feedback Form Builder</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button 
              className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold px-6"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save & Publish"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Add Fields */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col overflow-y-auto shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-0">
          
          {/* Add Elements Section */}
          <div className="p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Add Elements</h3>
            
            <div className="grid grid-cols-2 gap-2 mb-6">
              <Button variant="outline" className="justify-start border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-none px-3" onClick={() => addField('text')}>
                <Type className="w-4 h-4 mr-2 text-slate-400 shrink-0" /> <span className="truncate">Short Text</span>
              </Button>
              <Button variant="outline" className="justify-start border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-none px-3" onClick={() => addField('textarea')}>
                <AlignLeft className="w-4 h-4 mr-2 text-slate-400 shrink-0" /> <span className="truncate">Long Text</span>
              </Button>
              <Button variant="outline" className="justify-start border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-none px-3" onClick={() => addField('rating')}>
                <Star className="w-4 h-4 mr-2 text-slate-400 shrink-0" /> <span className="truncate">Rating</span>
              </Button>
            </div>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Multiple Choice</h3>
            <div className="grid grid-cols-2 gap-2 mb-6">
              <Button variant="outline" className="justify-start border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-none px-3" onClick={() => addField('radio')}>
                <ListTodo className="w-4 h-4 mr-2 text-slate-400 shrink-0" /> <span className="truncate">Choices</span>
              </Button>
              <Button variant="outline" className="justify-start border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-none px-3" onClick={() => addField('select')}>
                <ListTodo className="w-4 h-4 mr-2 text-slate-400 shrink-0" /> <span className="truncate">Dropdown</span>
              </Button>
            </div>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Specific Data</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-none px-3" onClick={() => addField('number')}>
                <Type className="w-4 h-4 mr-2 text-slate-400 shrink-0" /> <span className="truncate">Number</span>
              </Button>
              <Button variant="outline" className="justify-start border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-none px-3" onClick={() => addField('email')}>
                <Type className="w-4 h-4 mr-2 text-slate-400 shrink-0" /> <span className="truncate">Email</span>
              </Button>
              <Button variant="outline" className="justify-start border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-none px-3" onClick={() => addField('phone')}>
                <Type className="w-4 h-4 mr-2 text-slate-400 shrink-0" /> <span className="truncate">Phone</span>
              </Button>
              <Button variant="outline" className="justify-start border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-none px-3" onClick={() => addField('date')}>
                <Type className="w-4 h-4 mr-2 text-slate-400 shrink-0" /> <span className="truncate">Date</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto space-y-6 pb-32">
        {/* Form Meta */}
        <Card className="border-t-4 border-t-brand-teal shadow-md">
          <CardContent className="pt-6 space-y-4">
            <div>
              <Input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-3xl font-bold h-auto py-2 border-transparent hover:border-slate-200 focus-visible:ring-brand-teal px-0 px-2"
                placeholder="Form Title"
              />
            </div>
            <div>
              <Textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-transparent hover:border-slate-200 focus-visible:ring-brand-teal px-0 px-2 min-h-[60px]"
                placeholder="Form Description (Optional)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Fields */}
        <div className="space-y-6">
          {fields.map((field, index) => (
            <Card key={field.id} className="relative group shadow-sm border border-slate-200 hover:shadow-md border-l-4 border-l-transparent hover:border-l-brand-teal transition-all">
              <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center py-4 cursor-move opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-slate-500">
                <GripVertical className="w-5 h-5" />
              </div>
              <CardContent className="pt-4 pb-2 pl-8 pr-4">
                <div className="space-y-2">
                  {/* Top Row: Title & Type */}
                  <div className="flex items-start gap-4">
                    <Input 
                      value={field.label}
                      onChange={(e) => updateField(field.id, 'label', e.target.value)}
                      className="flex-1 font-semibold text-base border-transparent hover:border-slate-200 focus-visible:bg-slate-50 bg-transparent px-2 h-9"
                      placeholder="Question Label"
                    />
                    
                    <div className="w-[180px] shrink-0">
                      <Select value={field.type} onValueChange={(v) => updateField(field.id, 'type', v)}>
                        <SelectTrigger className="h-9 bg-white border-slate-200 shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Short Text</SelectItem>
                          <SelectItem value="textarea">Long Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="rating">Star Rating</SelectItem>
                          <SelectItem value="radio">Multiple Choice</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Preview Area */}
                  <div className="px-2 pt-1 pb-1">
                     {field.type === 'text' && <Input disabled placeholder="Short answer text" className="border-b border-t-0 border-x-0 border-slate-300 bg-transparent rounded-none px-0 shadow-none pointer-events-none h-8" />}
                     {field.type === 'textarea' && <Textarea disabled placeholder="Long answer text" className="border-b border-t-0 border-x-0 border-slate-300 bg-transparent rounded-none px-0 shadow-none pointer-events-none resize-none h-8 min-h-[32px]" />}
                     {['email', 'phone', 'number', 'date'].includes(field.type) && <Input disabled placeholder={`${field.type.charAt(0).toUpperCase() + field.type.slice(1)} input`} className="border-b border-t-0 border-x-0 border-slate-300 bg-transparent rounded-none px-0 shadow-none pointer-events-none w-1/2 h-8" />}
                     
                     {field.type === 'rating' && (
                       <div className="flex gap-2 text-slate-300">
                         {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-6 h-6" />)}
                       </div>
                     )}

                     {(field.type === 'radio' || field.type === 'checkbox') && (
                       <div className="space-y-3">
                         {(field.options || ['Option 1']).map((opt: string, i: number) => (
                           <div key={i} className="flex items-center gap-3">
                             <div className={`w-4 h-4 border-2 border-slate-300 ${field.type === 'radio' ? 'rounded-full' : 'rounded'}`} />
                             <span className="text-slate-500 text-sm">{opt || `Option ${i+1}`}</span>
                           </div>
                         ))}
                       </div>
                     )}

                     {field.type === 'select' && (
                       <div className="flex items-center justify-between border border-slate-200 rounded-md p-3 w-1/2 bg-slate-50 text-slate-400">
                         <span className="text-sm">1. {field.options?.[0] || 'Option 1'}</span>
                         <ListTodo className="w-4 h-4" />
                       </div>
                     )}
                  </div>

                  {/* Options Input (if applicable) */}
                  {(field.type === 'radio' || field.type === 'select' || field.type === 'checkbox') && (
                    <div className="space-y-1 px-2 pt-2 border-t border-slate-100">
                      <Label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Edit Options (Comma separated)</Label>
                      <Input 
                        value={(field.options || []).join(', ')}
                        onChange={(e) => updateField(field.id, 'options', e.target.value.split(',').map((s: string) => s.trim()))}
                        placeholder="Yes, No, Maybe"
                        className="text-sm bg-slate-50 h-8 border-slate-200 shadow-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                      />
                    </div>
                  )}

                  {/* Bottom Row: Actions */}
                  <div className="flex items-center justify-end gap-4 pt-2 mt-1 border-t border-slate-100 px-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" title="Duplicate Field" onClick={() => {
                      const newField = { ...field, id: Math.random().toString(36).substr(2, 9) };
                      const newFields = [...fields];
                      newFields.splice(index + 1, 0, newField);
                      setFields(newFields);
                    }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeField(field.id)} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete Question">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    
                    <div className="w-px h-6 bg-slate-200" />
                    
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
                      Required
                      <input 
                        type="checkbox" 
                        checked={field.required}
                        onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-brand-teal focus:ring-brand-teal"
                      />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
