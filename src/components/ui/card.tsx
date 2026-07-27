"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  glass?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glass = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "rounded-3xl border p-6 transition-all duration-200",
          glass
            ? "bg-card/70 backdrop-blur-md border-border/50 shadow-xs hover:shadow-sm"
            : "bg-card border-border shadow-xs",
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export { Card };
