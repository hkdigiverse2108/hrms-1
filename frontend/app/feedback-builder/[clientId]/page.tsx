"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [publishedFormId, setPublishedFormId] = useState<string | null>(null);
  
  const addField = (type: string = "text") => {
    setFields([
      ...fields, 
      { 
        id: Math.random().toString(36).substr(2, 9), 
        type: type, 
        label: "New Question", 
        required: false,
        options: type === 'radio' ? ["Option 1", "Option 2"] : []
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
      const res = await fetch(`${API_URL}/forms?createdBy=${user?.userId || "System"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId,
          title,
          description,
          fields
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPublishedFormId(data.id);
        toast.success("Form created successfully!");
      } else {
        toast.error("Failed to create form");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  if (publishedFormId) {
    const publicLink = `${window.location.origin}/feedback/${publishedFormId}`;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-xl border-brand-teal/20">
          <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-teal-100 text-brand-teal rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Form Published!</h2>
            <p className="text-slate-500 max-w-sm">
              Your feedback form has been successfully created and is ready to be shared with your client.
            </p>
            
            <div className="w-full bg-slate-100 p-4 rounded-xl flex items-center gap-3 border border-slate-200">
              <div className="flex-1 truncate text-left text-sm text-slate-600 font-medium">
                {publicLink}
              </div>
              <Button 
                variant="outline" 
                size="icon"
                className="shrink-0 text-brand-teal border-brand-teal hover:bg-teal-50"
                onClick={() => {
                  navigator.clipboard.writeText(publicLink);
                  toast.success("Link copied to clipboard!");
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-4 w-full pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => router.push(`/work-management/smm`)}
              >
                Back to SMM
              </Button>
              <Button 
                className="flex-1 bg-brand-teal hover:bg-brand-teal-light text-white"
                onClick={() => window.open(publicLink, '_blank')}
              >
                View Public Form
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/work-management/smm`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-slate-800">Feedback Form Builder</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push(`/work-management/smm`)}>Cancel</Button>
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

      <div className="max-w-3xl mx-auto mt-8 px-4 space-y-6">
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
        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="relative group shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center py-4 cursor-move text-slate-300 hover:text-slate-500 border-r border-slate-100 bg-slate-50 rounded-l-xl">
                <GripVertical className="w-5 h-5" />
                <span className="mt-2 text-[10px] font-bold">{index + 1}</span>
              </div>
              <CardContent className="pt-6 pb-6 pl-12 pr-6">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-4">
                    <Input 
                      value={field.label}
                      onChange={(e) => updateField(field.id, 'label', e.target.value)}
                      className="font-semibold text-lg"
                      placeholder="Question Label"
                    />
                    
                    {field.type === 'radio' && (
                      <div className="space-y-2 pl-2">
                        <Label className="text-xs text-slate-500 uppercase font-bold">Options (Comma separated)</Label>
                        <Input 
                          value={(field.options || []).join(', ')}
                          onChange={(e) => updateField(field.id, 'options', e.target.value.split(',').map((s: string) => s.trim()))}
                          placeholder="Yes, No, Maybe"
                          className="text-sm bg-slate-50"
                        />
                      </div>
                    )}
                  </div>

                  <div className="w-[180px] shrink-0 space-y-4 border-l border-slate-100 pl-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-slate-500">Field Type</Label>
                      <Select value={field.type} onValueChange={(v) => updateField(field.id, 'type', v)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Short Text</SelectItem>
                          <SelectItem value="textarea">Long Text</SelectItem>
                          <SelectItem value="rating">Star Rating</SelectItem>
                          <SelectItem value="radio">Multiple Choice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600">
                        <input 
                          type="checkbox" 
                          checked={field.required}
                          onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                          className="rounded border-slate-300 text-brand-teal focus:ring-brand-teal"
                        />
                        Required
                      </label>
                      
                      <Button variant="ghost" size="icon" onClick={() => removeField(field.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Buttons */}
        <div className="pt-4 pb-8 flex flex-wrap justify-center gap-3">
          <Button 
            variant="outline" 
            className="border-dashed border-2 border-slate-300 text-slate-500 hover:border-brand-teal hover:text-brand-teal hover:bg-teal-50"
            onClick={() => addField('text')}
          >
            <Type className="w-4 h-4 mr-2" /> Short Text
          </Button>
          <Button 
            variant="outline" 
            className="border-dashed border-2 border-slate-300 text-slate-500 hover:border-brand-teal hover:text-brand-teal hover:bg-teal-50"
            onClick={() => addField('textarea')}
          >
            <AlignLeft className="w-4 h-4 mr-2" /> Long Text
          </Button>
          <Button 
            variant="outline" 
            className="border-dashed border-2 border-slate-300 text-slate-500 hover:border-brand-teal hover:text-brand-teal hover:bg-teal-50"
            onClick={() => addField('rating')}
          >
            <Star className="w-4 h-4 mr-2" /> Rating
          </Button>
          <Button 
            variant="outline" 
            className="border-dashed border-2 border-slate-300 text-slate-500 hover:border-brand-teal hover:text-brand-teal hover:bg-teal-50"
            onClick={() => addField('radio')}
          >
            <ListTodo className="w-4 h-4 mr-2" /> Choices
          </Button>
        </div>
      </div>
    </div>
  );
}
