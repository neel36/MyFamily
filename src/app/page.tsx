"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Upload,
  Search,
  Settings,
  Heart,
  Sparkles,
  Trees,
  ChevronRight,
  Calendar,
  X,
  Lightbulb,
  FolderHeart,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import { useFamilies } from "@/hooks/use-database";
import { createFamily } from "@/database/crud";
import { BottomNavigation } from "@/components/layout/navigation";
import { ThemeSwitch } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/feedback";
import { Family } from "@/types/schema";
import { AdManager } from "@/components/ads/ad-manager";

// ======================================
// TOP APP BAR
// ======================================
function TopAppBar({
  onSearchClick,
}: {
  onSearchClick: () => void;
}) {
  const router = useRouter();

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
    >
      {/* Logo + Name */}
      <div className="flex items-center gap-2.5 select-none">
        <div className="flex items-center justify-center h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm text-white">
          <Trees className="h-5 w-5" />
        </div>
        <div className="leading-none">
          <span className="text-base font-extrabold tracking-tight text-foreground">My Family</span>
          <span className="block text-[10px] text-muted-foreground font-medium">Family Tree Builder</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSearchClick}
          className="p-2 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </motion.button>
        <ThemeSwitch />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/settings")}
          className="p-2 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </motion.button>
      </div>
    </motion.header>
  );
}

// ======================================
// WELCOME CARD
// ======================================
function WelcomeCard({ familyCount }: { familyCount: number }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-500 to-violet-600 text-white p-6 shadow-lg select-none"
    >
      {/* Decorative blobs */}
      <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />
      <div className="absolute top-4 right-12 h-4 w-4 rounded-full bg-white/20 pointer-events-none" />
      <div className="absolute bottom-8 right-6 h-2 w-2 rounded-full bg-white/30 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">{greeting} 👋</p>
            <h1 className="text-2xl font-extrabold tracking-tight leading-tight">
              Welcome to<br />My Family
            </h1>
            <p className="text-blue-200 text-sm mt-2 max-w-xs leading-relaxed">
              {familyCount === 0
                ? "Start building your family tree. Your data stays private on this device."
                : `You have ${familyCount} ${familyCount === 1 ? "family" : "families"} saved on this device.`}
            </p>
          </div>
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-xs shrink-0">
            <Heart className="h-7 w-7 text-white" fill="currentColor" />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 backdrop-blur-xs">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
            <span className="text-xs font-semibold text-white">100% Offline & Private</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ======================================
// QUICK STATISTICS
// ======================================
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  delay?: number;
}

function StatCard({ icon, label, value, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card/70 border border-border/50 backdrop-blur-sm shadow-xs text-center"
    >
      <div className={cn("flex items-center justify-center h-10 w-10 rounded-xl", color)}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-extrabold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}

function QuickStatistics({ families }: { families: Family[] }) {
  // Count members per family - simple aggregation
  const [memberCount, setMemberCount] = React.useState(0);

  React.useEffect(() => {
    async function countAllMembers() {
      if (families.length === 0) {
        setMemberCount(0);
        return;
      }
      const { db } = await import("@/database");
      let count = 0;
      for (const family of families) {
        count += await db.members.where("familyId").equals(family.id).count();
      }
      setMemberCount(count);
    }
    countAllMembers();
  }, [families]);

  const latestUpdate =
    families.length > 0
      ? new Date(Math.max(...families.map((f) => f.updatedAt))).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
        Quick Overview
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<FolderHeart className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          label="Families"
          value={families.length}
          color="bg-blue-500/10"
          delay={0.15}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          label="Members"
          value={memberCount}
          color="bg-emerald-500/10"
          delay={0.2}
        />
        <StatCard
          icon={<Calendar className="h-5 w-5 text-orange-500 dark:text-orange-400" />}
          label="Updated"
          value={latestUpdate}
          color="bg-orange-500/10"
          delay={0.25}
        />
      </div>
    </motion.div>
  );
}

// ======================================
// FAMILY CARD (Recent Families)
// ======================================
interface FamilyCardItemProps {
  family: Family;
  index: number;
  onClick: () => void;
}

function FamilyCardItem({ family, index, onClick }: FamilyCardItemProps) {
  const [count, setCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    async function fetchCount() {
      const { db } = await import("@/database");
      const c = await db.members.where("familyId").equals(family.id).count();
      setCount(c);
    }
    fetchCount();
  }, [family.id]);

  const initials = family.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-rose-500",
    "from-violet-500 to-purple-600",
    "from-pink-500 to-rose-500",
  ];
  const gradient = colors[index % colors.length];

  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 + 0.2 }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="w-full text-left flex items-center gap-4 p-4 rounded-2xl bg-card/70 border border-border/50 backdrop-blur-sm shadow-xs hover:shadow-sm hover:border-primary/30 transition-all duration-200 cursor-pointer group"
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br text-white text-sm font-extrabold shadow-sm",
          gradient
        )}
      >
        {initials}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-foreground text-sm truncate">{family.name}</p>
        </div>
        {family.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{family.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" />
            {count === null ? "..." : `${count} member${count !== 1 ? "s" : ""}`}
          </span>
          <span className="text-[11px] text-muted-foreground/60">
            {new Date(family.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0" />
    </motion.button>
  );
}

// ======================================
// RECENT FAMILIES SECTION
// ======================================
interface RecentFamiliesProps {
  families: Family[];
  onCreateFamily: () => void;
  onImportBackup: () => void;
}

function RecentFamilies({ families, onCreateFamily, onImportBackup }: RecentFamiliesProps) {
  const router = useRouter();
  const recent = [...families]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Recent Families
        </h2>
        {families.length > 5 && (
          <button
            onClick={() => router.push("/families")}
            className="text-xs text-primary font-semibold hover:underline transition-opacity cursor-pointer"
          >
            View All
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {recent.map((family, i) => (
          <FamilyCardItem
            key={family.id}
            family={family}
            index={i}
            onClick={() => router.push(`/families/${family.id}`)}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Button
          variant="secondary"
          className="w-full justify-center gap-2 text-sm"
          onClick={onCreateFamily}
        >
          <Plus className="h-4 w-4" />
          New Family
        </Button>
        <Button
          variant="outline"
          className="w-full justify-center gap-2 text-sm"
          onClick={onImportBackup}
        >
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </div>
    </motion.div>
  );
}

// ======================================
// TIPS CARD
// ======================================
const tips = [
  "Tap a family card to explore its members and relationships.",
  "Add photos to member profiles to bring your tree to life.",
  "Use the Tree view to visualize family connections.",
  "Export your family data as a backup anytime from Settings.",
  "Your data is stored only on this device — fully private.",
  "Add birth dates to see age calculations automatically.",
];

function TipsCard() {
  const [tipIndex] = React.useState(() => Math.floor(Math.random() * tips.length));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/60 dark:border-amber-800/40"
    >
      <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-400">
        <Lightbulb className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
          Tip
        </p>
        <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
          {tips[tipIndex]}
        </p>
      </div>
    </motion.div>
  );
}

// ======================================
// EMPTY STATE SECTION
// ======================================
function HomeEmptyState({
  onCreateFamily,
  onImportBackup,
}: {
  onCreateFamily: () => void;
  onImportBackup: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex flex-col items-center justify-center text-center py-8 px-4"
    >
      {/* Illustration */}
      <div className="relative mb-6">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/15 border-2 border-dashed border-blue-300/60 dark:border-blue-700/50"
        >
          <Trees className="h-12 w-12 text-blue-500/70" />
        </motion.div>
        <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-emerald-400/20 flex items-center justify-center">
          <Sparkles className="h-3 w-3 text-emerald-500" />
        </div>
      </div>

      <h2 className="text-xl font-extrabold text-foreground mb-2 tracking-tight">
        Start Your Family Tree
      </h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs leading-relaxed">
        Create your first family to begin adding members, connecting relationships,
        and building your family history — all stored privately on this device.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          variant="primary"
          size="lg"
          onClick={onCreateFamily}
          className="w-full justify-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Create Your First Family
        </Button>
        <Button
          variant="outline"
          size="md"
          onClick={onImportBackup}
          className="w-full justify-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Import from Backup
        </Button>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-3 gap-3 mt-8 w-full max-w-xs text-center">
        {[
          { icon: "🔒", label: "100% Private" },
          { icon: "📱", label: "Works Offline" },
          { icon: "🌳", label: "Visual Tree" },
        ].map((feature) => (
          <div
            key={feature.label}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card/60 border border-border/40"
          >
            <span className="text-xl">{feature.icon}</span>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {feature.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ======================================
// SEARCH OVERLAY
// ======================================
function SearchOverlay({
  isOpen,
  onClose,
  families,
}: {
  isOpen: boolean;
  onClose: () => void;
  families: Family[];
}) {
  const [query, setQuery] = React.useState("");
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const filtered = families.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()) ||
    f.description?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          />
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative m-4 mt-6 bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl overflow-hidden z-10"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search families..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto p-2">
              {query.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Type to search families...
                </p>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No families found for &quot;{query}&quot;
                </p>
              ) : (
                filtered.map((family) => (
                  <button
                    key={family.id}
                    onClick={() => {
                      router.push(`/families/${family.id}`);
                      onClose();
                    }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FolderHeart className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {family.name}
                      </p>
                      {family.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {family.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ======================================
// CREATE FAMILY DIALOG
// ======================================
function CreateFamilyDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const id = `family_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await createFamily({ id, name: name.trim(), description: description.trim() || undefined });
      toast.success(`"${name.trim()}" family created!`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create family. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Create New Family">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground pl-1" htmlFor="family-name">
            Family Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="family-name"
            ref={nameRef}
            placeholder="e.g. The Sharma Family"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground pl-1" htmlFor="family-description">
            Description <span className="text-muted-foreground/60 font-normal">(optional)</span>
          </label>
          <Textarea
            id="family-description"
            placeholder="A short note about this family..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={3}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!name.trim() || loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Family
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ======================================
// IMPORT BACKUP DIALOG (placeholder UI)
// ======================================
function ImportBackupDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Import Backup">
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary">
          <Upload className="h-7 w-7" />
        </div>
        <div>
          <h3 className="font-bold text-foreground mb-1">Import Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            The backup import feature is under development. You will be able to
            restore your family data from a JSON export file.
          </p>
        </div>
        <Badge variant="warning">Coming Soon</Badge>
        <Button variant="secondary" onClick={onClose} className="w-full mt-2">
          Close
        </Button>
      </div>
    </Dialog>
  );
}

// ======================================
// FLOATING ACTION BUTTON
// ======================================
function FAB({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className="fixed bottom-20 right-5 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg flex items-center justify-center cursor-pointer md:bottom-8 md:right-8"
      aria-label="Create new family"
    >
      <Plus className="h-6 w-6" />
    </motion.button>
  );
}

// ======================================
// HOME PAGE (Main)
// ======================================
export default function HomePage() {
  const families = useFamilies();
  const [showSearch, setShowSearch] = React.useState(false);
  const [showCreateFamily, setShowCreateFamily] = React.useState(false);
  const [showImport, setShowImport] = React.useState(false);

  const isLoading = families === undefined;
  const hasNoFamilies = !isLoading && families.length === 0;

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Top App Bar */}
      <TopAppBar onSearchClick={() => setShowSearch(true)} />

      {/* Scrollable Body */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto px-4 py-5 flex flex-col gap-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col gap-4">
        <AdManager placement="top" />
              <Skeleton className="h-40 w-full rounded-3xl" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          )}

          {/* Main Content */}
          {!isLoading && (
            <>
              {/* Welcome Card */}
              <WelcomeCard familyCount={families.length} />

              {/* Empty State OR Content */}
              {hasNoFamilies ? (
                <HomeEmptyState
                  onCreateFamily={() => setShowCreateFamily(true)}
                  onImportBackup={() => setShowImport(true)}
                />
              ) : (
                <>
                  {/* Quick Statistics */}
                  <QuickStatistics families={families} />

                  {/* Recent Families */}
                  <RecentFamilies
                    families={families}
                    onCreateFamily={() => setShowCreateFamily(true)}
                    onImportBackup={() => setShowImport(true)}
                  />
                </>
              )}

              {/* Tips Card (always shown) */}
              <TipsCard />
            </>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* FAB */}
      <FAB onClick={() => setShowCreateFamily(true)} />

      {/* Dialogs & Overlays */}
      <SearchOverlay
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        families={families ?? []}
      />
      <CreateFamilyDialog
        isOpen={showCreateFamily}
        onClose={() => setShowCreateFamily(false)}
      />
      <ImportBackupDialog
        isOpen={showImport}
        onClose={() => setShowImport(false)}
      />
    </div>
  );
}
