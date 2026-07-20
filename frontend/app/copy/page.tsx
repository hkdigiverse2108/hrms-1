"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Copy } from "lucide-react";

function CopyContent() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const link = searchParams.get("link");
    if (link) {
      navigator.clipboard.writeText(link)
        .then(() => {
          setCopied(true);
          setTimeout(() => {
            window.close();
          }, 1500);
        })
        .catch((err) => {
          console.error("Failed to copy", err);
          setError(true);
        });
    } else {
      setError(true);
    }
  }, [searchParams]);

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-sm w-full">
      {copied ? (
        <>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Link Copied!</h1>
          <p className="text-sm text-slate-500 mb-6">
            The link has been copied to your clipboard.
          </p>
          <p className="text-xs text-slate-400">
            You can close this tab now.
          </p>
        </>
      ) : error ? (
        <>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Copy className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Error Copying Link</h1>
          <p className="text-sm text-slate-500 mb-6">
            Please manually copy the link.
          </p>
          <p className="font-mono text-xs p-2 bg-slate-100 rounded break-all">
            {searchParams.get("link") || "No link provided"}
          </p>
        </>
      ) : (
        <>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Copy className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Copying...</h1>
          <p className="text-sm text-slate-500">
            Please wait while we copy the link.
          </p>
        </>
      )}
    </div>
  );
}

export default function CopyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Suspense fallback={<div className="p-8">Loading...</div>}>
        <CopyContent />
      </Suspense>
    </div>
  );
}
