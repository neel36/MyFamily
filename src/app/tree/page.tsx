"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitFork,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  ArrowLeft,
  Users,
  FolderHeart,
  ChevronDown,
  ChevronRight,
  Info,
  Heart,
  LayoutGrid,
  Layers,
  Sparkles,
  UserCheck,
  UserX,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { useFamilies, useFamilyMembers } from "@/hooks/use-database";
import { BottomNavigation, ThemeSwitch } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Avatar, Badge, Skeleton } from "@/components/ui/feedback";
import { Member } from "@/types/schema";

// ======================================
// CONSTANTS & COLOR THEMES
// ======================================
const NODE_W = 140;
const NODE_H = 100;
const H_GAP = 40;
const V_GAP = 85;
const SPOUSE_GAP = 24;

const COLOR_THEMES: Record<string, { from: string; to: string; ring: string }> = {
  blue:    { from: "#3b82f6", to: "#4f46e5", ring: "#3b82f6" },
  emerald: { from: "#10b981", to: "#0d9488", ring: "#10b981" },
  orange:  { from: "#f97316", to: "#f43f5e", ring: "#f97316" },
  violet:  { from: "#8b5cf6", to: "#7c3aed", ring: "#8b5cf6" },
  rose:    { from: "#ec4899", to: "#f43f5e", ring: "#ec4899" },
  amber:   { from: "#f59e0b", to: "#f97316", ring: "#f59e0b" },
  teal:    { from: "#14b8a6", to: "#0891b2", ring: "#14b8a6" },
};

function getThemeColors(key?: string) {
  return COLOR_THEMES[key ?? "blue"] ?? COLOR_THEMES.blue;
}

// ======================================
// TREE LAYOUT ALGORITHM & HELPERS
// ======================================
interface TreeNode {
  member: Member;
  spouse?: Member;
  children: TreeNode[];
  x: number;
  y: number;
  spouseX?: number;
}

function buildTree(members: Member[]): TreeNode[] {
  if (!members || members.length === 0) return [];
  const byId = new Map<string, Member>(members.map((m) => [m.id, m]));

  const childIds = new Set<string>();
  members.forEach((m) => {
    if (m.fatherId) childIds.add(m.id);
    if (m.motherId) childIds.add(m.id);
  });

  const spouseIds = new Set<string>();
  members.forEach((m) => {
    if (m.spouseId) spouseIds.add(m.spouseId);
  });

  let roots = members.filter((m) => !childIds.has(m.id));

  // Deduplicate roots: if a root is also a spouse of another root, remove it
  const nonSpouseRoots = roots.filter(
    (r) => !spouseIds.has(r.id) || !roots.some((other) => other.id !== r.id && other.spouseId === r.id)
  );

  if (nonSpouseRoots.length > 0) {
    roots = nonSpouseRoots;
  } else if (roots.length === 0) {
    // Fallback: if all members have parents (or loop), take the first members
    roots = [members[0]];
  }

  function buildNode(member: Member, depth: number, visited: Set<string>): TreeNode {
    visited.add(member.id);

    const spouse = member.spouseId ? byId.get(member.spouseId) : undefined;
    if (spouse) visited.add(spouse.id);

    const relevantIds = new Set([member.id, spouse?.id].filter(Boolean) as string[]);

    // Find children whose fatherId or motherId matches member or spouse
    const children = members.filter((m) => {
      if (visited.has(m.id)) return false;
      if (m.fatherId && relevantIds.has(m.fatherId)) return true;
      if (m.motherId && relevantIds.has(m.motherId)) return true;
      return false;
    });

    const childNodes = children.map((c) => buildNode(c, depth + 1, visited));

    return {
      member,
      spouse,
      children: childNodes,
      x: 0,
      y: depth * (NODE_H + V_GAP),
    };
  }

  const visited = new Set<string>();
  const treeNodes: TreeNode[] = [];

  // Build tree for all roots
  roots.forEach((r) => {
    if (!visited.has(r.id)) {
      treeNodes.push(buildNode(r, 0, visited));
    }
  });

  // Fallback: Add any unvisited remaining members as root level nodes so NO member is left invisible
  members.forEach((m) => {
    if (!visited.has(m.id)) {
      treeNodes.push(buildNode(m, 0, visited));
    }
  });

  return treeNodes;
}

function assignXPositions(node: TreeNode, startX: number): number {
  const hasSpouse = Boolean(node.spouse);
  const coupleWidth = hasSpouse ? NODE_W * 2 + SPOUSE_GAP : NODE_W;

  if (node.children.length === 0) {
    node.x = startX;
    if (hasSpouse) node.spouseX = startX + NODE_W + SPOUSE_GAP;
    return startX + coupleWidth + H_GAP;
  }

  let childX = startX;
  for (const child of node.children) {
    childX = assignXPositions(child, childX);
  }

  const firstChild = node.children[0];
  const lastChild = node.children[node.children.length - 1];
  const childrenMidX = (firstChild.x + lastChild.x + NODE_W) / 2;

  if (hasSpouse) {
    node.x = childrenMidX - coupleWidth / 2;
    node.spouseX = node.x + NODE_W + SPOUSE_GAP;
  } else {
    node.x = childrenMidX - NODE_W / 2;
  }

  const minX = startX;
  if (node.x < minX) {
    const shift = minX - node.x;
    node.x += shift;
    if (node.spouseX !== undefined) node.spouseX += shift;
    function shiftChildren(n: TreeNode, dx: number) {
      n.x += dx;
      if (n.spouseX !== undefined) n.spouseX += dx;
      n.children.forEach((c) => shiftChildren(c, dx));
    }
    node.children.forEach((c) => shiftChildren(c, shift));
  }

  return Math.max(childX, node.x + coupleWidth + H_GAP);
}

function getAgeText(member: Member): string | undefined {
  if (!member.dateOfBirth) return undefined;
  const birth = new Date(member.dateOfBirth);
  if (Number.isNaN(birth.getTime())) return undefined;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());

  if (hasHadBirthday) age -= 1;
  return `${age} yrs`;
}

function getGenderMarker(member: Member) {
  if (member.gender === "male") {
    return { symbol: "♂", color: "#3b82f6", label: "Male" };
  }
  if (member.gender === "female") {
    return { symbol: "♀", color: "#ec4899", label: "Female" };
  }
  return { symbol: "⚧", color: "#10b981", label: "Other" };
}

function getVisibleTree(node: TreeNode, collapsedIds: Set<string>): TreeNode | null {
  const visibleChildren = node.children.flatMap((child) => {
    const visibleChild = getVisibleTree(child, collapsedIds);
    return visibleChild ? [visibleChild] : [];
  });

  if (collapsedIds.has(node.member.id)) {
    return { ...node, children: [] };
  }

  return { ...node, children: visibleChildren };
}

function collectVisibleNodes(roots: TreeNode[], collapsedIds: Set<string>): TreeNode[] {
  const all: TreeNode[] = [];
  function collect(node: TreeNode) {
    all.push(node);
    node.children.forEach(collect);
  }

  roots.forEach((root) => {
    const visibleRoot = getVisibleTree(root, collapsedIds);
    if (visibleRoot) collect(visibleRoot);
  });

  return all;
}

// ======================================
// CONNECTOR & NODE SVG COMPONENTS
// ======================================
function Connector({ parent, child, themeColor }: { parent: TreeNode; child: TreeNode; themeColor: string }) {
  const hasSpouse = Boolean(parent.spouse) && parent.spouseX !== undefined;
  const parentCenterX = hasSpouse
    ? (parent.x + NODE_W / 2 + parent.spouseX! + NODE_W / 2) / 2
    : parent.x + NODE_W / 2;
  const parentBottom = parent.y + NODE_H;
  const childTop = child.y;
  const childCenterX = child.x + NODE_W / 2;

  const midY = parentBottom + (childTop - parentBottom) / 2;
  const d = `M ${parentCenterX} ${parentBottom} C ${parentCenterX} ${midY} ${childCenterX} ${midY} ${childCenterX} ${childTop}`;

  return (
    <g>
      <path d={d} fill="none" stroke={themeColor} strokeWidth={3} strokeOpacity={0.25} strokeLinecap="round" />
      <path d={d} fill="none" stroke={themeColor} strokeWidth={2} strokeOpacity={0.8} strokeDasharray="6 4" strokeLinecap="round" />
    </g>
  );
}

function MemberNode({
  member,
  x,
  y,
  isHighlighted,
  isSpouse,
  themeColor,
  hasChildren,
  isCollapsed,
  onClick,
  onToggleCollapse,
}: {
  member: Member;
  x: number;
  y: number;
  isHighlighted: boolean;
  isSpouse?: boolean;
  themeColor: string;
  hasChildren?: boolean;
  isCollapsed?: boolean;
  onClick: (m: Member) => void;
  onToggleCollapse?: (m: Member) => void;
}) {
  const gender = getGenderMarker(member);
  const ageText = getAgeText(member);
  const [hovered, setHovered] = React.useState(false);

  const initials = member.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const avatarId = `avatar-clip-${member.id.replace(/[^a-zA-Z0-9]/g, "_")}`;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onClick(member)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer" }}
      data-node="true"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(member);
        }
      }}
    >
      <defs>
        <clipPath id={avatarId}>
          <circle cx={NODE_W / 2} cy={34} r={20} />
        </clipPath>
        <linearGradient id={`grad-${member.id.replace(/[^a-zA-Z0-9]/g, "_")}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gender.color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={themeColor} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <rect
        width={NODE_W}
        height={NODE_H}
        rx={18}
        ry={18}
        fill={isHighlighted ? themeColor : "var(--color-card)"}
        stroke={isHighlighted ? "#ffffff" : gender.color}
        strokeWidth={isHighlighted ? 3 : hovered ? 2.5 : 1.5}
        strokeOpacity={isHighlighted ? 1 : hovered ? 0.9 : 0.4}
        style={{
          filter: hovered || isHighlighted
            ? "drop-shadow(0 10px 24px rgba(0,0,0,0.18))"
            : "drop-shadow(0 4px 10px rgba(0,0,0,0.06))",
          transition: "all 0.25s ease-out",
        }}
      />

      {!isHighlighted && (
        <rect width={NODE_W} height={NODE_H} rx={18} ry={18} fill={`url(#grad-${member.id.replace(/[^a-zA-Z0-9]/g, "_")})`} pointerEvents="none" />
      )}

      {!member.alive && <rect width={NODE_W} height={NODE_H} rx={18} ry={18} fill="rgba(15,23,42,0.12)" />}

      <rect x={10} y={10} width={22} height={22} rx={11} fill={gender.color} opacity={isHighlighted ? 0.9 : 0.15} />
      <text x={21} y={25.5} textAnchor="middle" fontSize={11} fontWeight={800} fill={isHighlighted ? "#ffffff" : gender.color}>
        {gender.symbol}
      </text>

      {hasChildren && (
        <g
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse?.(member);
          }}
          style={{ cursor: "pointer" }}
        >
          <circle cx={NODE_W - 21} cy={21} r={11} fill={isHighlighted ? "#ffffff" : "var(--color-background)"} stroke={gender.color} strokeWidth={1.5} />
          <text x={NODE_W - 21} y={25} textAnchor="middle" fontSize={13} fontWeight={800} fill={isHighlighted ? themeColor : "var(--color-foreground)"}>
            {isCollapsed ? "+" : "−"}
          </text>
        </g>
      )}

      {member.photo ? (
        <g>
          <circle cx={NODE_W / 2} cy={34} r={21} fill="none" stroke={gender.color} strokeWidth={2} />
          <image href={member.photo} x={NODE_W / 2 - 20} y={14} width={40} height={40} clipPath={`url(#${avatarId})`} preserveAspectRatio="xMidYMid slice" />
        </g>
      ) : (
        <>
          <circle cx={NODE_W / 2} cy={34} r={20} fill={isHighlighted ? "rgba(255,255,255,0.25)" : gender.color} opacity={isHighlighted ? 1 : 0.2} />
          <text x={NODE_W / 2} y={39} textAnchor="middle" fontSize={13} fontWeight={800} fill={isHighlighted ? "#ffffff" : gender.color}>
            {initials}
          </text>
        </>
      )}

      <text x={NODE_W / 2} y={68} textAnchor="middle" fontSize={11} fontWeight={800} fill={isHighlighted ? "#ffffff" : "var(--color-foreground)"} style={{ letterSpacing: "-0.01em" }}>
        {member.name.length > 16 ? `${member.name.slice(0, 15)}…` : member.name}
      </text>

      <text x={NODE_W / 2} y={85} textAnchor="middle" fontSize={9} fontWeight={600} fill={isHighlighted ? "rgba(255,255,255,0.85)" : "var(--color-muted-foreground)"}>
        {isSpouse ? `Spouse ${ageText ? `· ${ageText}` : ""}` : member.alive ? (ageText ?? "Alive") : "Deceased"}
      </text>

      <circle cx={NODE_W - 12} cy={NODE_H - 12} r={4.5} fill={member.alive ? "#22c55e" : "#ef4444"} stroke="var(--color-card)" strokeWidth={1.5} />
    </g>
  );
}

function SpouseConnector({ x1, x2, y, themeColor }: { x1: number; x2: number; y: number; themeColor: string }) {
  const midX = (x1 + NODE_W + x2) / 2;
  const midY = y + NODE_H / 2;

  return (
    <g>
      <line x1={x1 + NODE_W} y1={midY} x2={x2} y2={midY} stroke={themeColor} strokeWidth={2.5} strokeDasharray="4 2" strokeOpacity={0.7} />
      <circle cx={midX} cy={midY} r={10} fill="var(--color-card)" stroke={themeColor} strokeWidth={1.5} />
      <text x={midX} y={midY + 3.5} textAnchor="middle" fontSize={11} fill="#ec4899">♥</text>
    </g>
  );
}

// ======================================
// MOBILE HIERARCHY CARDS VIEW
// ======================================
function MobileTreeNodeCard({
  node,
  depth = 0,
  onMemberClick,
}: {
  node: TreeNode;
  depth?: number;
  onMemberClick: (m: Member) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(true);
  const m = node.member;
  const spouse = node.spouse;
  const gender = getGenderMarker(m);
  const age = getAgeText(m);

  return (
    <div className="flex flex-col gap-2 relative">
      {/* Node Card */}
      <div
        className={cn(
          "flex flex-col gap-2 p-3.5 rounded-2xl border transition-all shadow-sm bg-card/90 backdrop-blur-md",
          m.gender === "male" ? "border-blue-500/30" : m.gender === "female" ? "border-pink-500/30" : "border-emerald-500/30"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => onMemberClick(m)}>
            <Avatar src={m.photo} alt={m.name} className="h-11 w-11 shrink-0 ring-2 ring-border/50" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-foreground truncate">{m.name}</h4>
                <span className="text-xs">{gender.symbol}</span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">
                {m.alive ? (age ? `${age}` : "Alive") : "Deceased"}
                {m.occupation && ` · ${m.occupation}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={m.alive ? "success" : "danger"} className="text-[10px] py-0 px-2">
              {m.alive ? "Alive" : "Deceased"}
            </Badge>

            {node.children.length > 0 && (
              <button
                onClick={() => setIsOpen((v) => !v)}
                className="p-1.5 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground cursor-pointer transition-transform"
              >
                <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-90")} />
              </button>
            )}
          </div>
        </div>

        {/* Spouse row if present */}
        {spouse && (
          <div
            className="flex items-center gap-2 pt-2 mt-1 border-t border-border/40 cursor-pointer"
            onClick={() => onMemberClick(spouse)}
          >
            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20 shrink-0" />
            <Avatar src={spouse.photo} alt={spouse.name} className="h-7 w-7 shrink-0" />
            <span className="text-xs font-semibold text-foreground truncate">{spouse.name}</span>
            <span className="text-[10px] text-muted-foreground ml-auto">Spouse</span>
          </div>
        )}
      </div>

      {/* Children list */}
      {node.children.length > 0 && isOpen && (
        <div className="pl-4 sm:pl-6 border-l-2 border-primary/20 flex flex-col gap-3.5 mt-1 ml-4">
          {node.children.map((child) => (
            <MobileTreeNodeCard key={child.member.id} node={child} depth={depth + 1} onMemberClick={onMemberClick} />
          ))}
        </div>
      )}
    </div>
  );
}

// ======================================
// MEMBER DETAIL DIALOG
// ======================================
function DetailPanel({
  member,
  allMembers,
  onClose,
}: {
  member: Member;
  allMembers: Member[];
  onClose: () => void;
}) {
  const byId = new Map(allMembers.map((m) => [m.id, m]));
  const father = member.fatherId ? byId.get(member.fatherId) : undefined;
  const mother = member.motherId ? byId.get(member.motherId) : undefined;
  const spouse = member.spouseId ? byId.get(member.spouseId) : undefined;
  const children = allMembers.filter((m) => m.fatherId === member.id || m.motherId === member.id);

  const genderColor = member.gender === "male" ? "text-blue-500" : member.gender === "female" ? "text-pink-500" : "text-emerald-500";
  const genderBg = member.gender === "male" ? "bg-blue-500/10" : member.gender === "female" ? "bg-pink-500/10" : "bg-emerald-500/10";

  return (
    <Dialog isOpen={true} onClose={onClose} title="Member Profile" className="max-w-md">
      <div className="flex flex-col gap-4">
        <div className={cn("flex flex-col items-center gap-3 rounded-2xl border border-border/30 p-5", genderBg)}>
          <Avatar src={member.photo} alt={member.name} size="xl" className={cn("ring-4 ring-offset-2 ring-offset-card", genderColor.replace("text-", "ring-"))} />
          <div className="text-center">
            <h2 className="font-extrabold text-foreground text-lg">{member.name}</h2>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge variant={member.alive ? "success" : "danger"}>{member.alive ? "Alive" : "Deceased"}</Badge>
              <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold capitalize", genderBg, genderColor)}>
                {member.gender}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-2 grid-cols-2">
          {member.dateOfBirth && (
            <div className="rounded-xl border border-border/40 bg-muted/35 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Born</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">{member.dateOfBirth}</p>
            </div>
          )}
          {!member.alive && member.dateOfDeath && (
            <div className="rounded-xl border border-border/40 bg-muted/35 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Died</p>
              <p className="text-xs font-semibold text-destructive mt-0.5">{member.dateOfDeath}</p>
            </div>
          )}
          {member.bloodGroup && (
            <div className="rounded-xl border border-border/40 bg-muted/35 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Blood Group</p>
              <p className="text-xs font-semibold text-rose-500 mt-0.5">{member.bloodGroup}</p>
            </div>
          )}
          {member.mobile && (
            <div className="rounded-xl border border-border/40 bg-muted/35 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Mobile</p>
              <p className="text-xs font-semibold text-primary mt-0.5">{member.mobile}</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/40 bg-muted/30 p-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Family Connections</h3>
          <div className="mt-2.5 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Father:</span>
              <span className="font-semibold">{father?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Mother:</span>
              <span className="font-semibold">{mother?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Spouse:</span>
              <span className="font-semibold">{spouse?.name ?? "—"}</span>
            </div>
            {children.length > 0 && (
              <div className="pt-1">
                <span className="text-muted-foreground block mb-1">Children ({children.length}):</span>
                <div className="flex flex-wrap gap-1">
                  {children.map((c) => (
                    <span key={c.id} className="px-2 py-0.5 rounded-lg bg-card border border-border/40 font-semibold">{c.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// ======================================
// MAIN TREE PAGE COMPONENT
// ======================================
function TreePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedFamilyId = searchParams.get("familyId") ?? "";

  const families = useFamilies();
  const [selectedFamilyId, setSelectedFamilyId] = React.useState(preselectedFamilyId);
  const [selectedMember, setSelectedMember] = React.useState<Member | undefined>(undefined);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"cards" | "canvas">("cards"); // default cards on mobile

  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });
  const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(new Set());
  const [viewportSize, setViewportSize] = React.useState({ width: 1200, height: 700 });
  const viewportRef = React.useRef<HTMLDivElement | null>(null);

  const resolvedFamilyId = React.useMemo(() => {
    if (selectedFamilyId) return selectedFamilyId;
    if (preselectedFamilyId) return preselectedFamilyId;
    return families?.[0]?.id ?? "";
  }, [families, preselectedFamilyId, selectedFamilyId]);

  const members = useFamilyMembers(resolvedFamilyId);
  const selectedFamily = families?.find((f) => f.id === resolvedFamilyId);
  const themeColors = getThemeColors(selectedFamily?.color);

  // Build Tree
  const treeRoots = React.useMemo(() => {
    if (!members || members.length === 0) return [];
    const roots = buildTree(members);
    let nextX = 40;
    roots.forEach((root) => {
      nextX = assignXPositions(root, nextX);
      nextX += H_GAP;
    });
    return roots;
  }, [members]);

  const visibleTreeRoots = React.useMemo(() => {
    if (treeRoots.length === 0) return [];
    return treeRoots.map((root) => getVisibleTree(root, collapsedNodes)).filter((root): root is TreeNode => Boolean(root));
  }, [treeRoots, collapsedNodes]);

  const allVisibleNodes = React.useMemo(() => collectVisibleNodes(visibleTreeRoots, collapsedNodes), [visibleTreeRoots, collapsedNodes]);

  // SVG bounds calculation
  const svgBounds = React.useMemo(() => {
    if (allVisibleNodes.length === 0) return { minX: 0, minY: 0, width: 800, height: 400 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    allVisibleNodes.forEach((n) => {
      const leftEdge = n.x;
      const rightEdge = n.spouseX !== undefined ? n.spouseX + NODE_W : n.x + NODE_W;
      minX = Math.min(minX, leftEdge);
      maxX = Math.max(maxX, rightEdge);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y + NODE_H);
    });

    const padding = 40;
    return {
      minX: minX - padding,
      minY: minY - padding,
      width: Math.max(100, maxX - minX + padding * 2),
      height: Math.max(100, maxY - minY + padding * 2),
    };
  }, [allVisibleNodes]);

  const handleFitToScreen = React.useCallback(() => {
    if (allVisibleNodes.length === 0) return;
    const padding = 64;
    const availWidth = Math.max(300, viewportSize.width - padding);
    const availHeight = Math.max(300, viewportSize.height - padding);

    const scaleX = availWidth / svgBounds.width;
    const scaleY = availHeight / svgBounds.height;
    const fitZoom = Math.max(0.4, Math.min(1.2, Math.min(scaleX, scaleY)));

    setZoom(fitZoom);
    setPan({
      x: (viewportSize.width - svgBounds.width * fitZoom) / 2 - svgBounds.minX * fitZoom,
      y: (viewportSize.height - svgBounds.height * fitZoom) / 2 - svgBounds.minY * fitZoom,
    });
  }, [allVisibleNodes.length, svgBounds, viewportSize]);

  React.useEffect(() => {
    if (viewMode === "canvas" && members && members.length > 0) {
      const timer = setTimeout(() => handleFitToScreen(), 50);
      return () => clearTimeout(timer);
    }
  }, [resolvedFamilyId, members?.length, viewMode, handleFitToScreen]);

  React.useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const updateSize = () => {
      setViewportSize({
        width: element.clientWidth || 1200,
        height: element.clientHeight || 700,
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Filter members for search in Cards view
  const filteredTreeRoots = React.useMemo(() => {
    if (!searchQuery.trim()) return treeRoots;
    const q = searchQuery.toLowerCase();
    function filterNode(node: TreeNode): TreeNode | null {
      const matches = node.member.name.toLowerCase().includes(q) || node.spouse?.name.toLowerCase().includes(q);
      const filteredChildren = node.children.map(filterNode).filter((c): c is TreeNode => Boolean(c));
      if (matches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    }
    return treeRoots.map(filterNode).filter((r): r is TreeNode => Boolean(r));
  }, [treeRoots, searchQuery]);

  const isLoading = families === undefined || (resolvedFamilyId && members === undefined);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="sticky top-0 z-30 bg-background border-b border-border/40 px-4 py-3 flex items-center justify-between">
          <Skeleton className="h-7 w-32 rounded-xl" />
          <Skeleton className="h-7 w-20 rounded-xl" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-32 w-64 rounded-3xl" />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 md:pb-6">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex flex-col gap-3 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => router.back()} className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>

            {/* Family Select */}
            {families && families.length > 0 && (
              <div className="relative">
                <select
                  value={resolvedFamilyId}
                  onChange={(e) => {
                    setSelectedFamilyId(e.target.value);
                    setSelectedMember(undefined);
                  }}
                  className="appearance-none h-9 pl-3 pr-8 rounded-xl border border-border/50 bg-card text-sm font-extrabold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer max-w-[180px] truncate"
                >
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/40">
              <button
                onClick={() => setViewMode("cards")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  viewMode === "cards" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                Cards
              </button>
              <button
                onClick={() => setViewMode("canvas")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  viewMode === "canvas" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Canvas
              </button>
            </div>
            <ThemeSwitch />
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search family member..."
            className="h-9 w-full rounded-xl border border-border/40 bg-muted/30 pl-9 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {/* Empty States */}
        {(!families || families.length === 0) && (
          <div className="flex flex-col items-center justify-center gap-4 text-center py-20">
            <FolderHeart className="h-16 w-16 text-muted-foreground/40" />
            <h3 className="text-lg font-bold text-foreground">No Families Yet</h3>
            <Button variant="primary" onClick={() => router.push("/families")}>Create Family</Button>
          </div>
        )}

        {families && families.length > 0 && selectedFamilyId && members && members.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 text-center py-20">
            <GitFork className="h-16 w-16 text-muted-foreground/40" />
            <h3 className="text-lg font-bold text-foreground">No Members in {selectedFamily?.name}</h3>
            <Button variant="primary" onClick={() => router.push(`/families/${selectedFamilyId}`)}>Add Members</Button>
          </div>
        )}

        {/* CARDS MODE (Default Mobile Responsive Hierarchy) */}
        {viewMode === "cards" && members && members.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Family Tree ({members.length} Members)
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {filteredTreeRoots.map((root) => (
                <MobileTreeNodeCard key={root.member.id} node={root} onMemberClick={setSelectedMember} />
              ))}
            </div>
          </div>
        )}

        {/* CANVAS MODE (Full SVG Diagram) */}
        {viewMode === "canvas" && members && members.length > 0 && (
          <div ref={viewportRef} className="h-[75vh] relative rounded-3xl border border-border/50 bg-card/60 overflow-hidden shadow-inner">
            <svg
              width="100%"
              height="100%"
              style={{ cursor: isPanning ? "grabbing" : "grab", userSelect: "none" }}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest?.('[data-node="true"]')) return;
                setIsPanning(true);
                setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
              }}
              onMouseMove={(e) => isPanning && setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })}
              onMouseUp={() => setIsPanning(false)}
              onMouseLeave={() => setIsPanning(false)}
              onWheel={(e) => {
                e.preventDefault();
                setZoom((z) => Math.min(2.5, Math.max(0.3, z + (e.deltaY > 0 ? -0.1 : 0.1))));
              }}
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {visibleTreeRoots.map((root) => (
                  <React.Fragment key={root.member.id}>
                    {root.children.map((c) => (
                      <Connector key={`conn-${root.member.id}-${c.member.id}`} parent={root} child={c} themeColor={themeColors.from} />
                    ))}
                  </React.Fragment>
                ))}

                {allVisibleNodes.map((node) =>
                  node.spouse && node.spouseX !== undefined ? (
                    <SpouseConnector key={`spouse-${node.member.id}`} x1={node.x} x2={node.spouseX} y={node.y} themeColor={themeColors.from} />
                  ) : null
                )}

                {allVisibleNodes.map((node) => (
                  <React.Fragment key={node.member.id}>
                    <MemberNode
                      member={node.member}
                      x={node.x}
                      y={node.y}
                      isHighlighted={selectedMember?.id === node.member.id}
                      themeColor={themeColors.from}
                      hasChildren={node.children.length > 0}
                      isCollapsed={collapsedNodes.has(node.member.id)}
                      onClick={setSelectedMember}
                      onToggleCollapse={(m) =>
                        setCollapsedNodes((prev) => {
                          const next = new Set(prev);
                          next.has(m.id) ? next.delete(m.id) : next.add(m.id);
                          return next;
                        })
                      }
                    />
                    {node.spouse && node.spouseX !== undefined && (
                      <MemberNode
                        member={node.spouse}
                        x={node.spouseX}
                        y={node.y}
                        isHighlighted={selectedMember?.id === node.spouse.id}
                        isSpouse
                        themeColor={themeColors.from}
                        hasChildren={false}
                        onClick={setSelectedMember}
                      />
                    )}
                  </React.Fragment>
                ))}
              </g>
            </svg>

            {/* Canvas Zoom Floating Controls */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
              <button onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))} className="p-2.5 rounded-2xl bg-card border border-border/50 shadow-md">
                <ZoomIn className="h-4 w-4 text-foreground" />
              </button>
              <button onClick={() => setZoom((z) => Math.max(z - 0.15, 0.3))} className="p-2.5 rounded-2xl bg-card border border-border/50 shadow-md">
                <ZoomOut className="h-4 w-4 text-foreground" />
              </button>
              <button onClick={handleFitToScreen} className="p-2.5 rounded-2xl bg-card border border-border/50 shadow-md">
                <Maximize2 className="h-4 w-4 text-foreground" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Member Details Dialog */}
      <AnimatePresence>
        {selectedMember && (
          <DetailPanel member={selectedMember} allMembers={members ?? []} onClose={() => setSelectedMember(undefined)} />
        )}
      </AnimatePresence>

      <BottomNavigation />
    </div>
  );
}

export default function TreePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center">Loading Family Tree...</div>}>
      <TreePageInner />
    </React.Suspense>
  );
}
