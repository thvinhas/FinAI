"use client";

import { useState, useRef, useEffect } from "react";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type Props = {
  name: string;
  defaultValue?: number;
  required?: boolean;
  placeholder?: string;
};

export default function CurrencyInput({
  name,
  defaultValue = 0,
  required,
  placeholder,
}: Props) {
  const [raw, setRaw] = useState(defaultValue);
  const [display, setDisplay] = useState(formatBRL(defaultValue));
  const hiddenRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const cents = parseInt(digits || "0", 10);
    const value = cents / 100;
    setRaw(value);
    setDisplay(formatBRL(value));
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
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white outline-none focus:border-indigo-500"
      />
      <input type="hidden" ref={hiddenRef} name={name} />
    </div>
  );
}
