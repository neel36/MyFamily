"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost" | "fab";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseClasses =
      "inline-flex items-center justify-center font-medium rounded-2xl transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer";

    const variantClasses = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/40",
      danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs",
      outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground bg-transparent",
      fab: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg fixed bottom-20 right-6 md:bottom-6 md:right-8 z-40 rounded-full",
    };

    const sizeClasses = {
      sm: "h-9 px-3 text-xs gap-1.5 rounded-xl",
      md: "h-11 px-5 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5 rounded-3xl",
      icon: variant === "fab" ? "h-14 w-14 rounded-full text-xl" : "h-10 w-10 text-sm",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export { Button };
