"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, Settings, Sun, Moon, Laptop, GitFork, FolderHeart, ShieldCheck, DatabaseZap } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";

// ==========================
// BOTTOM NAVIGATION
// ==========================
export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const items: NavItem[] = [
    { label: "Home", href: "/", icon: Home },
    { label: "Families", href: "/families", icon: FolderHeart },
    { label: "Tree", href: "/tree", icon: GitFork },
    { label: "Members", href: "/members", icon: Users },
    { label: "Backup", href: "/backup", icon: DatabaseZap },
    { label: "Admin", href: "/admin", icon: ShieldCheck },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border/50 px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-around md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)] overflow-x-auto no-scrollbar">
      {items.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[52px] text-muted-foreground transition-all active:scale-95 cursor-pointer shrink-0"
          >
            {isActive && (
              <motion.span
                layoutId="activeNavTab"
                className="absolute inset-0 bg-primary/12 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Icon
              className={cn(
                "h-5 w-5 transition-all duration-200",
                isActive ? "text-primary scale-110 stroke-[2.5]" : "text-muted-foreground/80 hover:text-foreground"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-bold tracking-tight transition-colors whitespace-nowrap",
                isActive ? "text-primary font-extrabold" : "text-muted-foreground/80"
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ==========================
// THEME SWITCH
// ==========================
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="p-2.5 rounded-xl border border-border/40 bg-card/75 backdrop-blur-xs text-foreground hover:bg-accent/70 hover:text-accent-foreground transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
      aria-label={`Toggle theme: current theme is ${theme}`}
    >
      {theme === "light" && <Sun className="h-5 w-5 text-amber-500" />}
      {theme === "dark" && <Moon className="h-5 w-5 text-indigo-500" />}
      {theme === "system" && <Laptop className="h-5 w-5 text-emerald-500" />}
      <span className="text-xs font-semibold capitalize hidden sm:inline">{theme}</span>
    </motion.button>
  );
}
