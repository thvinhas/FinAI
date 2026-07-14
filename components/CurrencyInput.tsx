"use client";

import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  defaultValue?: number;
  required?: boolean;
  placeholder?: string;
  large?: boolean;
};

export default function CurrencyInput({
  name,
  defaultValue = 0,
  required,
  placeholder,
  autoFocus,
  large,
}: Props & { autoFocus?: boolean }) {
  const [raw, setRaw] = useState(defaultValue);
  const [display, setDisplay] = useState(formatCurrency(defaultValue));
  const hiddenRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const cents = parseInt(digits || "0", 10);
    const value = cents / 100;
    setRaw(value);
    setDisplay(formatCurrency(value));
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.select();
  }

  useEffect(() => {
    if (hiddenRef.current) {
      hiddenRef.current.value = raw.toString();
    }
  }, [raw]);

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        required={required}
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        autoFocus={autoFocus}
        className={cn(
          "w-full rounded-lg border border-border bg-background outline-none transition-all duration-150 placeholder:text-faint focus:border-accent focus:ring-[3px] focus:ring-accent-soft",
          large
            ? "px-4 py-3.5 font-heading text-2xl font-bold tabular-nums"
            : "px-3.5 py-2.5 text-sm tabular-nums"
        )}
      />
      <input type="hidden" ref={hiddenRef} name={name} />
    </div>
  );
}
