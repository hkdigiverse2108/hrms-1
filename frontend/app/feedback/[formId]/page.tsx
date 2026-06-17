"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, CheckCircle2 } from "lucide-react";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

export default function PublicFeedbackPage() {
  const { formId } = useParams();
  const [form, setForm] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await fetch(`${API_URL}/forms/${formId}`);
        if (res.ok) {
          const data = await res.json();
          setForm(data);
        } else {
          toast.error("Form not found");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load form");
      } finally {
        setLoading(false);
      }
    };
    if (formId) fetchForm();
  }, [formId]);

  const handleAnswerChange = (fieldId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    // Basic validation
    for (const field of form.fields) {
      if (field.required && !answers[field.id]) {
        toast.error(`"${field.label}" is required.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/forms/${formId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId,
          clientId: form.clientId,
          answers
        })
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        toast.error("Failed to submit your response.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-brand-teal">Loading form...</div>;
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-slate-800">Form Not Found</h2>
            <p className="text-slate-500 mt-2">The form you are looking for does not exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-teal/5 flex items-center justify-center p-4 text-center">
        <Card className="w-full max-w-md border-t-4 border-t-brand-teal shadow-xl">
          <CardContent className="pt-10 pb-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-brand-teal text-white rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Thank You!</h2>
            <p className="text-slate-500 mt-2">Your response has been submitted successfully. We appreciate your feedback!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-t-4 border-t-brand-teal shadow-md">
          <CardHeader className="pb-8">
            <CardTitle className="text-3xl font-bold text-slate-800">{form.title}</CardTitle>
            {form.description && (
              <CardDescription className="text-base text-slate-500 mt-2 whitespace-pre-wrap">
                {form.description}
              </CardDescription>
            )}
          </CardHeader>
        </Card>

        {form.fields.map((field: any, index: number) => (
          <Card key={field.id} className="shadow-sm">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold text-slate-800 flex items-center">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>

                {['text', 'number', 'email', 'date', 'phone'].includes(field.type) && (
                  <Input 
                    type={field.type === 'phone' ? 'tel' : field.type}
                    placeholder="Your answer"
                    value={answers[field.id] || ''}
                    onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                    className="focus-visible:ring-brand-teal"
                  />
                )}

                {field.type === 'textarea' && (
                  <Textarea 
                    placeholder="Your answer"
                    value={answers[field.id] || ''}
                    onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                    className="focus-visible:ring-brand-teal min-h-[100px]"
                  />
                )}

                {field.type === 'radio' && (
                  <RadioGroup 
                    value={answers[field.id]} 
                    onValueChange={(val) => handleAnswerChange(field.id, val)}
                    className="space-y-3 pt-2"
                  >
                    {field.options?.map((opt: string, i: number) => (
                      <div key={i} className="flex items-center space-x-3">
                        <RadioGroupItem value={opt} id={`${field.id}-${i}`} className="text-brand-teal border-slate-300 focus:ring-brand-teal" />
                        <Label htmlFor={`${field.id}-${i}`} className="text-sm font-normal text-slate-700 cursor-pointer">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {field.type === 'select' && (
                  <Select
                    value={answers[field.id] || ''}
                    onValueChange={(val) => handleAnswerChange(field.id, val)}
                  >
                    <SelectTrigger className="w-full mt-2 focus-visible:ring-brand-teal">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((opt: string, i: number) => (
                        <SelectItem key={i} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.type === 'checkbox' && (
                  <div className="space-y-3 pt-2">
                    {field.options?.map((opt: string, i: number) => {
                      const isChecked = (answers[field.id] || []).includes(opt);
                      return (
                        <div key={i} className="flex items-center space-x-3">
                          <input 
                            type="checkbox"
                            id={`${field.id}-${i}`}
                            checked={isChecked}
                            onChange={(e) => {
                              const currentAnswers = answers[field.id] || [];
                              if (e.target.checked) {
                                handleAnswerChange(field.id, [...currentAnswers, opt]);
                              } else {
                                handleAnswerChange(field.id, currentAnswers.filter((a: string) => a !== opt));
                              }
                            }}
                            className="w-4 h-4 text-brand-teal border-slate-300 rounded focus:ring-brand-teal"
                          />
                          <Label htmlFor={`${field.id}-${i}`} className="text-sm font-normal text-slate-700 cursor-pointer">
                            {opt}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {field.type === 'rating' && (
                  <div className="flex gap-2 pt-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => handleAnswerChange(field.id, star)}
                        className={`transition-colors p-1 rounded-md hover:bg-slate-100 ${
                          (answers[field.id] || 0) >= star ? "text-amber-400" : "text-slate-200"
                        }`}
                      >
                        <Star className="w-8 h-8 fill-current" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="pt-4 flex justify-end">
          <Button 
            className="bg-brand-teal hover:bg-brand-teal-light text-white font-bold px-8 h-12 text-lg w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
