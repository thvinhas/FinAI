"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, X } from "lucide-react";

export default function Toast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"success" | "error">("success");

  useEffect(() => {
    const msg = searchParams.get("success") || searchParams.get("error");
    if (msg) {
      setMessage(msg);
      setType(searchParams.get("success") ? "success" : "error");
      setVisible(true);

      const timeout = setTimeout(() => {
        setVisible(false);
        const p = new URLSearchParams(searchParams.toString());
        p.delete("success");
        p.delete("error");
        router.replace(`?${p.toString()}`, { scroll: false });
      }, 3500);

      return () => clearTimeout(timeout);
    }
  }, [searchParams]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-4 fade-in">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
          type === "success"
            ? "border-emerald-700 bg-emerald-950 text-emerald-200"
            : "border-red-700 bg-red-950 text-red-200"
        }`}
      >
        {type === "success" ? (
          <CheckCircle size={18} className="shrink-0 text-emerald-400" />
        ) : (
          <XCircle size={18} className="shrink-0 text-red-400" />
        )}
        <span className="text-sm">{message}</span>
        <button
          onClick={() => setVisible(false)}
          className="shrink-0 opacity-60 hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
