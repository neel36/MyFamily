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
// CONSTANTS & COLOR THEMES (Kinship & Growth Design System)
// ======================================
const NODE_W = 180;
const NODE_H = 150;
const H_GAP = 30;
const V_GAP = 75;
const SPOUSE_GAP = 20;

const COLOR_THEMES: Record<string, { from: string; border: string; badgeBg: string; badgeText: string }> = {
  blue:    { from: "#0f5238", border: "#2d6a4f", badgeBg: "#b1f0ce", badgeText: "#002114" },
  emerald: { from: "#00696c", border: "#007073", badgeBg: "#8ff3f6", badgeText: "#002021" },
  orange:  { from: "#693d00", border: "#8a5200", badgeBg: "#ffdcbc", badgeText: "#2c1700" },
  violet:  { from: "#4c1d95", border: "#6d28d9", badgeBg: "#ddd6fe", badgeText: "#2e1065" },
  rose:    { from: "#9f1239", border: "#be123c", badgeBg: "#fecdd3", badgeText: "#4c0519" },
};

function getThemeColors(key?: string) {
  return COLOR_THEMES[key ?? "blue"] ?? COLOR_THEMES.blue;
}

// ======================================
// CONNECTOR & NODE SVG COMPONENTS
// ======================================

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
// CONNECTOR & NODE SVG COMPONENTS (Kinship & Growth Style)
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
      <path d={d} fill="none" stroke="#2d6a4f" strokeWidth={4} strokeOpacity={0.4} strokeLinecap="round" />
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
          <circle cx={NODE_W / 2} cy={48} r={32} />
        </clipPath>
      </defs>

      {/* Node Main Card Body */}
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={16}
        ry={16}
        fill="var(--color-card)"
        stroke={isHighlighted ? "#0f5238" : "var(--color-border)"}
        strokeWidth={isHighlighted ? 3 : 1.5}
        style={{
          filter: hovered || isHighlighted
            ? "drop-shadow(0 12px 24px rgba(15,82,56,0.18))"
            : "drop-shadow(0 4px 12px rgba(0,0,0,0.06))",
          transition: "all 0.25s ease-out",
        }}
      />

      {/* Top Accent Line */}
      <path
        d={`M 0 16 A 16 16 0 0 1 16 0 L ${NODE_W - 16} 0 A 16 16 0 0 1 ${NODE_W} 16 L ${NODE_W} 22 L 0 22 Z`}
        fill={member.gender === "male" ? "#0f5238" : member.gender === "female" ? "#00696c" : "#8a5200"}
      />

      {/* Toggle collapse badge */}
      {hasChildren && (
        <g
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse?.(member);
          }}
          style={{ cursor: "pointer" }}
        >
          <circle cx={NODE_W - 16} cy={32} r={10} fill="var(--color-background)" stroke="#2d6a4f" strokeWidth={1.5} />
          <text x={NODE_W - 16} y={35.5} textAnchor="middle" fontSize={12} fontWeight={800} fill="#0f5238">
            {isCollapsed ? "+" : "−"}
          </text>
        </g>
      )}

      {/* Member Avatar */}
      {member.photo ? (
        <g>
          <circle cx={NODE_W / 2} cy={48} r={34} fill="none" stroke={member.gender === "male" ? "#95d4b3" : "#8ff3f6"} strokeWidth={2.5} />
          <image href={member.photo} x={NODE_W / 2 - 32} y={16} width={64} height={64} clipPath={`url(#${avatarId})`} preserveAspectRatio="xMidYMid slice" />
        </g>
      ) : (
        <g>
          <circle cx={NODE_W / 2} cy={48} r={32} fill={member.gender === "male" ? "#b1f0ce" : "#8ff3f6"} opacity={0.9} />
          <text x={NODE_W / 2} y={54} textAnchor="middle" fontSize={16} fontWeight={800} fill={member.gender === "male" ? "#002114" : "#002021"}>
            {initials}
          </text>
        </g>
      )}

      {/* Member Name */}
      <text x={NODE_W / 2} y={98} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--color-foreground)">
        {member.name.length > 18 ? `${member.name.slice(0, 17)}…` : member.name}
      </text>

      {/* Member Years / Status */}
      <text x={NODE_W / 2} y={116} textAnchor="middle" fontSize={10} fontWeight={500} fill="var(--color-muted-foreground)">
        {isSpouse ? `Spouse ${ageText ? `· ${ageText}` : ""}` : member.alive ? (ageText ? `Age ${ageText}` : "Alive") : "Deceased"}
      </text>

      {/* Badge Tag */}
      <rect x={NODE_W / 2 - 36} y={124} width={72} height={16} rx={8} fill={member.gender === "male" ? "#b1f0ce" : "#ffdcbc"} />
      <text x={NODE_W / 2} y={135} textAnchor="middle" fontSize={8.5} fontWeight={800} fill={member.gender === "male" ? "#002114" : "#2c1700"} style={{ letterSpacing: "0.04em" }}>
        {isSpouse ? "SPOUSE" : member.gender === "male" ? "MALE" : "FEMALE"}
      </text>
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
// MOBILE LADDER TREE VIEW (Top-Down Animated Ladder Structure)
// ======================================
function MobileTreeNodeCard({
  node,
  depth = 0,
  isLast = false,
  onMemberClick,
}: {
  node: TreeNode;
  depth?: number;
  isLast?: boolean;
  onMemberClick: (m: Member) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(true);
  const m = node.member;
  const spouse = node.spouse;
  const gender = getGenderMarker(m);
  const age = getAgeText(m);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative flex flex-col gap-3"
    >
      {/* Ladder Step Node Card */}
      <div className="relative flex items-start gap-3">
        {/* Left Vertical Ladder Rung Marker */}
        <div className="flex flex-col items-center shrink-0 self-stretch">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2 z-10 transition-transform active:scale-110",
              m.gender === "male"
                ? "bg-blue-500 text-white border-blue-300 shadow-blue-500/30"
                : m.gender === "female"
                ? "bg-pink-500 text-white border-pink-300 shadow-pink-500/30"
                : "bg-emerald-500 text-white border-emerald-300 shadow-emerald-500/30"
            )}
          >
            {gender.symbol}
          </div>
          {/* Vertical Ladder Spine Line down to children */}
          {node.children.length > 0 && isOpen && (
            <div className="w-1 flex-1 bg-gradient-to-b from-primary/60 via-primary/30 to-primary/10 rounded-full my-1" />
          )}
        </div>

        {/* Card Body */}
        <div
          className={cn(
            "flex-1 flex flex-col gap-2 p-4 rounded-3xl border shadow-sm transition-all bg-card/95 backdrop-blur-xl hover:shadow-md",
            m.gender === "male"
              ? "border-blue-500/30 hover:border-blue-500/60"
              : m.gender === "female"
              ? "border-pink-500/30 hover:border-pink-500/60"
              : "border-emerald-500/30 hover:border-emerald-500/60"
          )}
        >
          {/* Member Main Row */}
          <div className="flex items-center justify-between gap-3">
            <div
              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 active:opacity-80 transition-opacity"
              onClick={() => onMemberClick(m)}
            >
              <Avatar src={m.photo} alt={m.name} className="h-12 w-12 shrink-0 ring-2 ring-primary/20 shadow-xs" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-extrabold text-foreground truncate tracking-tight">{m.name}</h4>
                </div>
                <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                  {m.alive ? (age ? `Age ${age}` : "Alive") : "Deceased"}
                  {m.occupation && ` · ${m.occupation}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={m.alive ? "success" : "danger"} className="text-[10px] py-0.5 px-2.5 rounded-full font-bold">
                {m.alive ? "Alive" : "Deceased"}
              </Badge>

              {node.children.length > 0 && (
                <button
                  onClick={() => setIsOpen((v) => !v)}
                  className="p-2 rounded-2xl bg-muted/70 hover:bg-muted text-muted-foreground cursor-pointer transition-transform active:scale-95"
                  aria-label="Toggle Branch"
                >
                  <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-90")} />
                </button>
              )}
            </div>
          </div>

          {/* Spouse Spouse Link Rung */}
          {spouse && (
            <div
              className="flex items-center gap-2.5 pt-2.5 mt-1 border-t border-border/40 cursor-pointer active:opacity-80 transition-opacity"
              onClick={() => onMemberClick(spouse)}
            >
              <div className="w-6 h-6 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0">
                <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/40" />
              </div>
              <Avatar src={spouse.photo} alt={spouse.name} className="h-8 w-8 shrink-0 ring-1 ring-border/50" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-foreground truncate block">{spouse.name}</span>
                <span className="text-[10px] font-semibold text-muted-foreground">Spouse</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Children Ladder Branch Level */}
      <AnimatePresence>
        {node.children.length > 0 && isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="pl-4 sm:pl-7 flex flex-col gap-3 ml-3 border-l-2 border-dashed border-primary/30"
          >
            {node.children.map((child, idx) => (
              <MobileTreeNodeCard
                key={child.member.id}
                node={child}
                depth={depth + 1}
                isLast={idx === node.children.length - 1}
                onMemberClick={onMemberClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
  const [viewMode, setViewMode] = React.useState<"cards" | "canvas">("canvas"); // default canvas for visual family tree

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
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/40 px-3 py-2.5 flex flex-col gap-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-1.5 w-full">
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <button onClick={() => router.back()} className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </button>

            {/* Family Select */}
            {families && families.length > 0 && (
              <div className="relative min-w-0">
                <select
                  value={resolvedFamilyId}
                  onChange={(e) => {
                    setSelectedFamilyId(e.target.value);
                    setSelectedMember(undefined);
                  }}
                  className="appearance-none h-8.5 pl-2.5 pr-7 rounded-xl border border-border/50 bg-card text-xs sm:text-sm font-extrabold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer max-w-[130px] sm:max-w-[200px] truncate"
                >
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-muted/70 border border-border/40">
              <button
                onClick={() => setViewMode("cards")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                  viewMode === "cards" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Layers className="h-3 w-3" />
                Cards
              </button>
              <button
                onClick={() => setViewMode("canvas")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                  viewMode === "canvas" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3 w-3" />
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
              style={{ cursor: isPanning ? "grabbing" : "grab", userSelect: "none", touchAction: "none" }}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest?.('[data-node="true"]')) return;
                setIsPanning(true);
                setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
              }}
              onMouseMove={(e) => isPanning && setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })}
              onMouseUp={() => setIsPanning(false)}
              onMouseLeave={() => setIsPanning(false)}
              onTouchStart={(e) => {
                if (e.touches.length === 2) {
                  const [t1, t2] = Array.from(e.touches);
                  (window as any)._pinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                } else if (e.touches.length === 1) {
                  setIsPanning(true);
                  setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 2 && (window as any)._pinchDist) {
                  const [t1, t2] = Array.from(e.touches);
                  const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                  const ratio = dist / (window as any)._pinchDist;
                  (window as any)._pinchDist = dist;
                  setZoom((z) => Math.min(2.5, Math.max(0.3, z * ratio)));
                } else if (e.touches.length === 1 && isPanning) {
                  setPan({ x: e.touches[0].clientX - panStart.x, y: e.touches[0].clientY - panStart.y });
                }
              }}
              onTouchEnd={() => {
                setIsPanning(false);
                delete (window as any)._pinchDist;
              }}
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
