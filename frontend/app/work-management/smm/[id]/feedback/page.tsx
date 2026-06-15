"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { Loader2, Copy, ExternalLink, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useConfirm } from "@/context/ConfirmContext";

export default function ClientFeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const { confirm } = useConfirm();
  const clientId = params.id as string;
  
  const [responses, setResponses] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
    if (clientId) {
      fetchData();
    }
  }, [clientId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [formsRes, respRes] = await Promise.all([
        fetch(`${API_URL}/forms/client/${clientId}`),
        fetch(`${API_URL}/forms/client/${clientId}/responses`)
      ]);
      if (formsRes.ok && respRes.ok) {
        setForms(await formsRes.json());
        setResponses(await respRes.json());
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load feedback data");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteForm = async (formId: string) => {
    const isConfirmed = await confirm({
      title: "Delete Feedback Form",
      description: "Are you sure you want to delete this form? All responses associated with it will also be deleted. This cannot be undone.",
      confirmText: "Delete",
      variant: "destructive"
    });

    if (!isConfirmed) return;
    
    try {
      const res = await fetch(`${API_URL}/forms/${formId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Form deleted successfully");
        fetchData(); // Refresh list
      } else {
        toast.error("Failed to delete form");
      }
    } catch (err) {
      console.error("Error deleting form:", err);
      toast.error("Failed to delete form");
    }
  };

  const getFormTitle = (formId: string) => {
    const form = forms.find(f => f.id === formId);
    return form ? form.title : "Unknown Form";
  };

  const getQuestionLabel = (formId: string, questionId: string) => {
    const form = forms.find(f => f.id === formId);
    if (!form) return questionId;
    const field = form.fields?.find((f: any) => f.id === questionId);
    return field ? field.label : questionId;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0 z-10 sticky top-0">
        <div className="px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-slate-800">Forms & Feedback</h1>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8">
        {isLoading ? (
          <div className="flex justify-center py-20 flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-brand-teal" />
            <p className="text-slate-500 font-medium">Loading feedback...</p>
          </div>
        ) : (
          <Tabs defaultValue="responses" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 mx-auto bg-slate-200/60 p-1 rounded-lg">
              <TabsTrigger value="forms" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md transition-all font-medium">Generated Forms</TabsTrigger>
              <TabsTrigger value="responses" className="data-[state=active]:bg-brand-teal data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md transition-all font-medium">Client Responses</TabsTrigger>
            </TabsList>

            <TabsContent value="forms">
              {forms.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-200 text-slate-500">
                  No feedback forms generated for this client yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {forms.map((form, i) => {
                    const publicLink = `${origin}/feedback/${form.id}`;
                    return (
                      <Card key={i} className="shadow-sm border-l-4 border-l-brand-teal">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold text-slate-800 text-lg">{form.title}</h3>
                              <p className="text-xs text-slate-500 mt-1">Created on: {new Date(form.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-slate-600 border-slate-200 hover:bg-slate-50"
                                onClick={() => router.push(`/feedback-builder/${clientId}?editId=${form.id}`)}
                              >
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-destructive border-destructive hover:bg-destructive/10"
                                onClick={() => deleteForm(form.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-brand-teal border-brand-teal hover:bg-teal-50"
                                onClick={() => window.open(publicLink, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" /> Open
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-4 bg-slate-50 p-2 rounded border border-slate-200">
                            <code className="text-xs text-slate-600 flex-1 truncate">{publicLink}</code>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-500 hover:text-brand-teal"
                              onClick={() => {
                                navigator.clipboard.writeText(publicLink);
                                toast.success("Link copied!");
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="responses">
              {responses.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-200 text-slate-500">
                  No feedback responses found for this client.
                </div>
              ) : (
                <div className="space-y-6">
                  {responses.map((resp, i) => (
                    <Card key={i} className="shadow-sm border-t-4 border-t-brand-teal">
                      <CardContent className="pt-6">
                        <div className="mb-4 flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg">{getFormTitle(resp.formId)}</h3>
                            <p className="text-xs text-slate-500 mt-1">Submitted on: {new Date(resp.submittedAt).toLocaleString()}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3 mt-4 pt-4 border-t border-slate-100">
                          {Object.entries(resp.answers || {}).map(([qId, answer]: [string, any]) => (
                            <div key={qId} className="flex flex-col gap-1 pb-3 mb-3 border-b border-slate-100 last:border-0 last:pb-0 last:mb-0">
                              <span className="text-sm font-semibold text-slate-700">
                                {getQuestionLabel(resp.formId, qId)}
                              </span>
                              <span className="text-sm text-slate-600 whitespace-pre-wrap">{String(answer)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
