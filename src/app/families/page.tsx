"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Pencil,
  Copy,
  Trash2,
  ChevronRight,
  Users,
  FolderHeart,
  X,
  Check,
  SlidersHorizontal,
  Trees,
  Sparkles,
  Calendar,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import { useFamilies, useFamilyMemberCount } from "@/hooks/use-database";
import {
  createFamily,
  updateFamily,
  deleteFamily,
  duplicateFamily,
} from "@/database/crud";
import { BottomNavigation } from "@/components/layout/navigation";
import { ThemeSwitch } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmationDialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/feedback";
import { Family } from "@/types/schema";

// ======================================
// COLOR THEMES
// ======================================
interface ColorTheme {
  key: string;
  label: string;
  gradient: string;     // full Tailwind gradient class string
  ring: string;         // ring color for selected state
  bg: string;           // swatch background
}

const COLOR_THEMES: ColorTheme[] = [
  { key: "blue",    label: "Ocean",   gradient: "from-blue-500 to-indigo-600",    ring: "ring-blue-500",    bg: "bg-gradient-to-br from-blue-500 to-indigo-600" },
  { key: "emerald", label: "Forest",  gradient: "from-emerald-500 to-teal-600",   ring: "ring-emerald-500", bg: "bg-gradient-to-br from-emerald-500 to-teal-600" },
  { key: "orange",  label: "Sunset",  gradient: "from-orange-500 to-rose-500",    ring: "ring-orange-500",  bg: "bg-gradient-to-br from-orange-500 to-rose-500" },
  { key: "violet",  label: "Royal",   gradient: "from-violet-500 to-purple-600",  ring: "ring-violet-500",  bg: "bg-gradient-to-br from-violet-500 to-purple-600" },
  { key: "rose",    label: "Blossom", gradient: "from-pink-500 to-rose-500",      ring: "ring-pink-500",    bg: "bg-gradient-to-br from-pink-500 to-rose-500" },
  { key: "amber",   label: "Golden",  gradient: "from-amber-500 to-orange-500",   ring: "ring-amber-500",   bg: "bg-gradient-to-br from-amber-500 to-orange-500" },
  { key: "teal",    label: "Aqua",    gradient: "from-teal-500 to-cyan-600",      ring: "ring-teal-500",    bg: "bg-gradient-to-br from-teal-500 to-cyan-600" },
];

function getColorTheme(key?: string): ColorTheme {
  return COLOR_THEMES.find((t) => t.key === key) ?? COLOR_THEMES[0];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function genFamilyId(): string {
  return `family_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ======================================
// COLOR PICKER
// ======================================
interface ColorPickerProps {
  value: string;
  onChange: (key: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {COLOR_THEMES.map((theme) => (
        <button
          key={theme.key}
          type="button"
          onClick={() => onChange(theme.key)}
          className={cn(
            "h-9 w-9 rounded-full transition-all duration-150 cursor-pointer",
            theme.bg,
            value === theme.key
              ? `ring-2 ring-offset-2 ring-offset-background ${theme.ring} scale-110`
              : "hover:scale-105 opacity-80 hover:opacity-100"
          )}
          aria-label={`${theme.label} color theme`}
          title={theme.label}
        >
          {value === theme.key && (
            <Check className="h-4 w-4 text-white mx-auto drop-shadow" />
          )}
        </button>
      ))}
    </div>
  );
}

// ======================================
// FAMILY FORM DIALOG (Create + Edit)
// ======================================
interface FamilyFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editFamily?: Family;  // undefined = create mode
}

function FamilyFormDialog({ isOpen, onClose, editFamily }: FamilyFormDialogProps) {
  const isEdit = Boolean(editFamily);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState("blue");
  const [loading, setLoading] = React.useState(false);
  const [nameError, setNameError] = React.useState("");
  const nameRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Family name is required.");
      return;
    }
    if (trimmedName.length > 100) {
      setNameError("Name must be 100 characters or less.");
      return;
    }
    setNameError("");
    setLoading(true);

    try {
      if (isEdit && editFamily) {
        await updateFamily(editFamily.id, {
          name: trimmedName,
          description: description.trim() || undefined,
          color,
        });
        toast.success(`"${trimmedName}" updated!`);
      } else {
        await createFamily({
          id: genFamilyId(),
          name: trimmedName,
          description: description.trim() || undefined,
          color,
        });
        toast.success(`"${trimmedName}" family created!`);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (msg.toLowerCase().includes("already exists")) {
        setNameError(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Family" : "Create New Family"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
        {/* Family Name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fm-name"
            className="text-xs font-semibold text-muted-foreground pl-1"
          >
            Family Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="fm-name"
            ref={nameRef}
            placeholder="e.g. The Sharma Family"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError("");
            }}
            maxLength={100}
            aria-invalid={Boolean(nameError)}
          />
          {/* Character counter + error */}
          <div className="flex items-center justify-between px-1">
            {nameError ? (
              <p className="text-xs text-destructive">{nameError}</p>
            ) : (
              <span />
            )}
            <span
              className={cn(
                "text-[10px] tabular-nums ml-auto",
                name.length > 90 ? "text-destructive" : "text-muted-foreground/60"
              )}
            >
              {name.length}/100
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="fm-description"
            className="text-xs font-semibold text-muted-foreground pl-1"
          >
            Description{" "}
            <span className="text-muted-foreground/60 font-normal">(optional)</span>
          </label>
          <Textarea
            id="fm-description"
            placeholder="A short note about this family..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={3}
          />
          <span className="text-[10px] text-muted-foreground/60 text-right px-1">
            {description.length}/300
          </span>
        </div>

        {/* Color Theme */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground pl-1">
            Color Theme{" "}
            <span className="text-muted-foreground/60 font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40">
            {/* Preview */}
            <div
              className={cn(
                "flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-extrabold shadow-sm",
                getColorTheme(color).bg
              )}
            >
              {getInitials(name || "?")}
            </div>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <p className="text-[10px] text-muted-foreground/60 pl-1">
            Selected: <span className="font-semibold capitalize">{getColorTheme(color).label}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1 border-t border-border/40">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
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
                {isEdit ? "Saving..." : "Creating..."}
              </>
            ) : (
              <>
                {isEdit ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isEdit ? "Save Changes" : "Create Family"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ======================================
// FAMILY CARD
// ======================================
interface FamilyCardProps {
  family: Family;
  index: number;
  onEdit: (family: Family) => void;
  onDuplicate: (family: Family) => void;
  onDelete: (family: Family) => void;
  onOpen: (family: Family) => void;
}

function FamilyCard({
  family,
  index,
  onEdit,
  onDuplicate,
  onDelete,
  onOpen,
}: FamilyCardProps) {
  const theme = getColorTheme(family.color);
  const memberCount = useFamilyMemberCount(family.id);
  const initials = getInitials(family.name);

  const createdDate = new Date(family.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const updatedDate = new Date(family.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      layout
      className="group relative flex flex-col rounded-3xl bg-card border border-border/50 shadow-xs hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden"
    >
      {/* Color Banner */}
      <div
        className={cn(
          "relative h-24 bg-gradient-to-br flex items-center justify-center overflow-hidden select-none",
          theme.gradient
        )}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-white/10 blur-lg pointer-events-none" />
        <div className="absolute -bottom-3 -left-3 h-12 w-12 rounded-full bg-black/10 blur-md pointer-events-none" />

        {/* Initials */}
        <span className="relative text-3xl font-extrabold text-white drop-shadow-sm tracking-tight">
          {initials}
        </span>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Name + Color dot */}
        <div className="flex items-start gap-2 min-w-0">
          <div
            className={cn("mt-1 flex-shrink-0 h-2.5 w-2.5 rounded-full bg-gradient-to-br", theme.gradient)}
          />
          <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2 flex-1">
            {family.name}
          </h3>
        </div>

        {/* Description */}
        {family.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {family.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 flex-wrap mt-auto">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" />
            <span className="font-semibold text-foreground">{memberCount}</span>{" "}
            {memberCount === 1 ? "member" : "members"}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {updatedDate}
          </span>
        </div>

        {/* Created date badge */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <Calendar className="h-3 w-3" />
          Created {createdDate}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          {/* Open — primary action */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpen(family)}
            className="flex-1 justify-center gap-1.5 text-xs"
          >
            Open
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          {/* Edit */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => onEdit(family)}
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Edit family"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </motion.button>

          {/* Duplicate */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => onDuplicate(family)}
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Duplicate family"
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </motion.button>

          {/* Delete */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => onDelete(family)}
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-destructive/30 bg-card hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            aria-label="Delete family"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ======================================
// EMPTY STATE
// ======================================
function FamiliesEmptyState({ onCreateFamily }: { onCreateFamily: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex flex-col items-center justify-center text-center py-16 px-4"
    >
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
        No Families Yet
      </h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs leading-relaxed">
        Create your first family to start building your family tree. All data
        stays private and offline on this device.
      </p>

      <Button
        variant="primary"
        size="lg"
        onClick={onCreateFamily}
        className="gap-2"
      >
        <Plus className="h-5 w-5" />
        Create Your First Family
      </Button>
    </motion.div>
  );
}

// ======================================
// NO SEARCH RESULTS
// ======================================
function NoSearchResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-3 py-12 text-center"
    >
      <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted/60 text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-foreground">
        No results for &ldquo;{query}&rdquo;
      </p>
      <p className="text-xs text-muted-foreground">Try a different name or description.</p>
      <Button variant="outline" size="sm" onClick={onClear} className="mt-1 gap-1.5">
        <X className="h-3.5 w-3.5" />
        Clear Search
      </Button>
    </motion.div>
  );
}

// ======================================
// TOP APP BAR
// ======================================
function TopAppBar({
  totalFamilies,
  onCreateFamily,
}: {
  totalFamilies: number;
  onCreateFamily: () => void;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center gap-2.5 select-none">
        <div className="flex items-center justify-center h-9 w-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm text-white">
          <FolderHeart className="h-5 w-5" />
        </div>
        <div className="leading-none">
          <span className="text-base font-extrabold tracking-tight text-foreground">
            My Families
          </span>
          <span className="block text-[10px] text-muted-foreground font-medium">
            {totalFamilies === 0
              ? "No families yet"
              : `${totalFamilies} ${totalFamilies === 1 ? "family" : "families"}`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeSwitch />
        <Button
          variant="primary"
          size="sm"
          onClick={onCreateFamily}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Family</span>
        </Button>
      </div>
    </motion.header>
  );
}

// ======================================
// SORT OPTIONS
// ======================================
type SortKey = "updatedAt" | "createdAt" | "name" | "members";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "updatedAt", label: "Last Updated" },
  { key: "createdAt", label: "Date Created" },
  { key: "name",      label: "Name (A–Z)" },
];

// ======================================
// FAMILIES PAGE
// ======================================
export default function FamiliesPage() {
  const router = useRouter();
  const families = useFamilies();

  // UI state
  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("updatedAt");
  const [showSortMenu, setShowSortMenu] = React.useState(false);

  // Dialog state
  const [showForm, setShowForm] = React.useState(false);
  const [editingFamily, setEditingFamily] = React.useState<Family | undefined>(undefined);
  const [deletingFamily, setDeletingFamily] = React.useState<Family | undefined>(undefined);

  // Loading / derived state
  const isLoading = families === undefined;

  // Filtered + sorted list
  const processed = React.useMemo(() => {
    if (!families) return [];
    let list = [...families];

    // Filter
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description?.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "createdAt") return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt; // default: updatedAt
    });

    return list;
  }, [families, query, sortKey]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingFamily(undefined);
    setShowForm(true);
  };

  const handleOpenEdit = (family: Family) => {
    setEditingFamily(family);
    setShowForm(true);
  };

  const handleDuplicate = async (family: Family) => {
    try {
      await duplicateFamily(family.id);
      toast.success(`"${family.name}" duplicated!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to duplicate.";
      toast.error(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingFamily) return;
    try {
      await deleteFamily(deletingFamily.id);
      toast.success(`"${deletingFamily.name}" deleted.`);
      setDeletingFamily(undefined);
    } catch {
      toast.error("Failed to delete. Please try again.");
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Top App Bar */}
      <TopAppBar
        totalFamilies={families?.length ?? 0}
        onCreateFamily={handleOpenCreate}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-3xl mx-auto px-4 py-5 flex flex-col gap-5">

          {/* Loading skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-3xl overflow-hidden border border-border/40">
                  <Skeleton className="h-24 rounded-none" />
                  <div className="p-4 flex flex-col gap-3">
                    <Skeleton className="h-4 w-3/4 rounded-xl" />
                    <Skeleton className="h-3 w-1/2 rounded-xl" />
                    <Skeleton className="h-9 w-full rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Content after load */}
          {!isLoading && (
            <>
              {/* Search + Sort Bar */}
              {families.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="flex items-center gap-2"
                >
                  {/* Search box */}
                  <div className="relative flex-1 flex items-center">
                    <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search families…"
                      className="flex h-11 w-full rounded-full border border-input bg-card/60 pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
                    />
                    {query && (
                      <button
                        onClick={() => setQuery("")}
                        className="absolute right-3.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground cursor-pointer"
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sort button */}
                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setShowSortMenu((v) => !v)}
                      className="flex items-center gap-1.5 h-11 px-3.5 rounded-full border border-input bg-card/60 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all cursor-pointer"
                      aria-label="Sort options"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="hidden sm:inline text-xs font-semibold">
                        {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
                      </span>
                    </motion.button>

                    <AnimatePresence>
                      {showSortMenu && (
                        <>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSortMenu(false)}
                            className="fixed inset-0 z-20"
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-12 z-30 w-44 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl overflow-hidden"
                          >
                            {SORT_OPTIONS.map((opt) => (
                              <button
                                key={opt.key}
                                onClick={() => {
                                  setSortKey(opt.key);
                                  setShowSortMenu(false);
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer flex items-center justify-between gap-2",
                                  sortKey === opt.key
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "hover:bg-muted/60 text-foreground"
                                )}
                              >
                                {opt.label}
                                {sortKey === opt.key && <Check className="h-3.5 w-3.5" />}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* Results count */}
              {query && families.length > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-muted-foreground px-1"
                >
                  {processed.length === 0
                    ? "No results"
                    : `${processed.length} ${processed.length === 1 ? "result" : "results"} for "${query}"`}
                </motion.p>
              )}

              {/* Empty state — no families */}
              {families.length === 0 && (
                <FamiliesEmptyState onCreateFamily={handleOpenCreate} />
              )}

              {/* No search results */}
              {families.length > 0 && processed.length === 0 && query && (
                <NoSearchResults query={query} onClear={() => setQuery("")} />
              )}

              {/* Family Grid */}
              {processed.length > 0 && (
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <AnimatePresence mode="popLayout">
                    {processed.map((family, index) => (
                      <FamilyCard
                        key={family.id}
                        family={family}
                        index={index}
                        onOpen={(f) => router.push(`/families/${f.id}`)}
                        onEdit={handleOpenEdit}
                        onDuplicate={handleDuplicate}
                        onDelete={setDeletingFamily}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Summary footer */}
              {families.length > 0 && !query && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-center text-[11px] text-muted-foreground/60 pb-2"
                >
                  {families.length} {families.length === 1 ? "family" : "families"} stored privately on this device
                </motion.p>
              )}
            </>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* FAB — mobile shortcut */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        onClick={handleOpenCreate}
        className="fixed bottom-20 right-5 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg flex items-center justify-center cursor-pointer md:hidden"
        aria-label="Create new family"
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      {/* Create / Edit Dialog */}
      <FamilyFormDialog
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingFamily(undefined);
        }}
        editFamily={editingFamily}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(deletingFamily)}
        onClose={() => setDeletingFamily(undefined)}
        onConfirm={handleDeleteConfirm}
        title="Delete Family?"
        description={
          deletingFamily
            ? `Are you sure you want to delete "${deletingFamily.name}"? This will permanently remove the family and all its members. This action cannot be undone.`
            : ""
        }
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
