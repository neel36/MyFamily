"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

// ==========================
// GRADIENT HEADER
// ==========================
export interface GradientHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  showBackButton?: boolean;
}

export function GradientHeader({
  title,
  description,
  action,
  showBackButton = false,
  className,
  ...props
}: GradientHeaderProps) {
  const router = useRouter();

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white py-8 px-6 md:px-8 rounded-b-[2rem] md:rounded-b-[2.5rem] shadow-md mb-6 select-none",
        className
      )}
      {...props}
    >
      {/* Background soft glowing blur elements */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>
            {description && (
              <p className="text-xs md:text-sm text-blue-100 font-medium mt-1 max-w-xl">
                {description}
              </p>
            )}
          </div>
        </div>

        {action && <div className="flex items-center gap-2 self-start md:self-auto">{action}</div>}
      </div>
    </div>
  );
}

// ==========================
// PAGE HEADER
// ==========================
export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions, className, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5 mb-6",
        className
      )}
      {...props}
    >
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// ==========================
// SECTION HEADER
// ==========================
export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, action, className, ...props }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 mb-4", className)} {...props}>
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {action && <div>{action}</div>}
    </div>
  );
}
