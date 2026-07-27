"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  label?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, label, ...props }, ref) => {
    return (
      <div className="relative flex flex-col gap-1.5 w-full">
        {label && <span className="text-xs font-semibold text-muted-foreground pl-1">{label}</span>}
        <div className="relative flex items-center w-full">
          <select
            className={cn(
              "flex h-11 w-full rounded-2xl border border-input bg-card/45 px-4 py-2 pr-10 text-sm shadow-xs transition-all appearance-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
              className
            )}
            ref={ref}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 h-4 w-4 pointer-events-none text-muted-foreground/75" />
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
