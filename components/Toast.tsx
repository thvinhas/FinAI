"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, X } from "lucide-react";

export default function Toast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const successMsg = searchParams.get("success");
  const errorMsg = searchParams.get("error");
  const message = successMsg || errorMsg;
  const type: "success" | "error" = successMsg ? "success" : "error";

  const dismiss = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("success");
    p.delete("error");
    router.replace(`?${p.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(dismiss, 2600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-100 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
      <div
        className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold shadow-card ${
          type === "success" ? "bg-accent text-background" : "bg-negative text-background"
        }`}
      >
        {type === "success" ? (
          <CheckCircle size={18} className="shrink-0" />
        ) : (
          <XCircle size={18} className="shrink-0" />
        )}
        <span>{message}</span>
        <button onClick={dismiss} className="shrink-0 opacity-70 hover:opacity-100">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
