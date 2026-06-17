import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API_URL } from "@/lib/config";
import { Loader2, Copy, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FeedbackViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function FeedbackViewerDialog({ open, onOpenChange, clientId }: FeedbackViewerDialogProps) {
  const [responses, setResponses] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && clientId) {
      fetchData();
    }
  }, [open, clientId]);

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
    } finally {
      setIsLoading(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-screen h-screen m-0 p-6 md:p-10 rounded-none overflow-y-auto flex flex-col bg-slate-50">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl font-bold text-slate-800">Client Feedback Responses</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
          </div>
        ) : (
          <Tabs defaultValue="responses" className="w-full mt-4 flex-1 flex flex-col">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 shrink-0">
              <TabsTrigger value="forms">Generated Forms</TabsTrigger>
              <TabsTrigger value="responses">Client Responses</TabsTrigger>
            </TabsList>

            <TabsContent value="forms">
              {forms.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No feedback forms generated for this client yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {forms.map((form, i) => {
                    const publicLink = `${window.location.origin}/feedback/${form.id}`;
                    return (
                      <Card key={i} className="shadow-sm border-l-4 border-l-brand-teal">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold text-slate-800 text-lg">{form.title}</h3>
                              <p className="text-xs text-slate-500 mt-1">Created on: {form.createdAt || "Unknown"}</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-brand-teal border-brand-teal hover:bg-teal-50"
                              onClick={() => window.open(publicLink, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" /> Open
                            </Button>
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
                <div className="text-center py-8 text-slate-500">
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
                            <p className="text-xs text-slate-500 mt-1">Submitted on: {resp.submittedAt}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          {Object.entries(resp.answers || {}).map(([qId, answer]: [string, any]) => (
                            <div key={qId} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <p className="text-sm font-semibold text-slate-700 mb-1">
                                {getQuestionLabel(resp.formId, qId)}
                              </p>
                              <p className="text-slate-600 whitespace-pre-wrap">{String(answer)}</p>
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
      </DialogContent>
    </Dialog>
  );
}
