"use client";

import { forwardRef } from "react";

const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-all duration-150 placeholder:text-faint focus:border-accent focus:ring-[3px] focus:ring-accent-soft ${className}`}
    {...props}
  />
));
Input.displayName = "Input";

export default Input;
