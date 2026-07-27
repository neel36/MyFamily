"use client";

import * as React from "react";
import { AlertCircle, FolderOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

// ==========================
// SPINNER
// ==========================
export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

export function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 stroke-[2.5]",
    md: "h-8 w-8 stroke-[2]",
    lg: "h-12 w-12 stroke-[1.5]",
  };
  return (
    <div className={cn("flex items-center justify-center", className)} {...props}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
    </div>
  );
}

// ==========================
// SKELETON
// ==========================
export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-muted/60", className)}
      {...props}
    />
  );
}

// ==========================
// BADGE
// ==========================
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "warning";
}

export function Badge({ className, variant = "primary", ...props }: BadgeProps) {
  const variantClasses = {
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary text-secondary-foreground border-border/40",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    danger: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold select-none",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

// ==========================
// AVATAR
// ==========================
export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt: string;
  fallbackInitials?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Avatar({
  className,
  src,
  alt,
  fallbackInitials,
  size = "md",
  ...props
}: AvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-lg font-bold",
    xl: "h-24 w-24 text-2xl font-bold",
  };

  const initials = fallbackInitials
    ? fallbackInitials
    : alt
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full border border-border bg-muted items-center justify-center font-semibold select-none shadow-xs text-muted-foreground",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src && !hasError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

// ==========================
// EMPTY STATE
// ==========================
export interface EmptyStateProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border/60 rounded-3xl bg-card/25 backdrop-blur-xs min-h-[300px]",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 text-primary mb-4">
        <FolderOpen className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </motion.div>
  );
}

// ==========================
// ERROR STATE
// ==========================
export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description: string;
  retryAction?: React.ReactNode;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  retryAction,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border border-destructive/25 rounded-3xl bg-destructive/5 backdrop-blur-xs min-h-[250px]",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-center h-14 w-14 rounded-full bg-destructive/10 text-destructive mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-destructive mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-5">{description}</p>
      {retryAction && <div>{retryAction}</div>}
    </div>
  );
}
