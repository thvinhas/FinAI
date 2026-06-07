"use client";

import { forwardRef } from "react";

const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-zinc-500 hover:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${className}`}
    {...props}
  />
));
Input.displayName = "Input";

export default Input;
