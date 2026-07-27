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
  Info,
  Heart,
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
// TREE LAYOUT CONSTANTS
// ======================================
const NODE_W = 120;
const NODE_H = 80;
const H_GAP = 50;
const V_GAP = 90;
const SPOUSE_GAP = 28;

// ======================================
// COLOR THEMES
// ======================================
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
// TREE LAYOUT ALGORITHM
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
  const byId = new Map<string, Member>(members.map((m) => [m.id, m]));

  // Determine root members (no fatherId and no motherId)
  const childIds = new Set<string>();
  members.forEach((m) => {
    if (m.fatherId) childIds.add(m.id);
    if (m.motherId) childIds.add(m.id);
  });

  // Also track spouses — spouses of roots are not roots
  const spouseIds = new Set<string>();
  members.forEach((m) => {
    if (m.spouseId) spouseIds.add(m.spouseId);
  });

  let roots = members.filter((m) => !childIds.has(m.id));

  // Deduplicate: if a root is also a spouse of another root, remove it
  roots = roots.filter((r) => !spouseIds.has(r.id) || !roots.some((other) => other.id !== r.id && other.spouseId === r.id));

  function buildNode(member: Member, depth: number, visited: Set<string>): TreeNode {
    if (visited.has(member.id)) {
      return { member, children: [], x: 0, y: depth * (NODE_H + V_GAP) };
    }
    visited.add(member.id);

    const spouse = member.spouseId ? byId.get(member.spouseId) : undefined;

    // Find children: members whose fatherId or motherId = this member or spouse
    const relevantIds = new Set([member.id, spouse?.id].filter(Boolean) as string[]);
    const children = members.filter((m) => {
      if (visited.has(m.id)) return false;
      if (m.fatherId && relevantIds.has(m.fatherId)) return true;
      if (m.motherId && relevantIds.has(m.motherId)) return true;
      return false;
    });

    // Mark spouse children as visited too
    if (spouse) visited.add(spouse.id);

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
  return roots.map((r) => buildNode(r, 0, visited));
}

function assignXPositions(
  node: TreeNode,
  startX: number
): number {
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

  // Center parent over children
  const firstChild = node.children[0];
  const lastChild = node.children[node.children.length - 1];
  const childrenMidX = (firstChild.x + lastChild.x + NODE_W) / 2;

  if (hasSpouse) {
    node.x = childrenMidX - (coupleWidth / 2);
    node.spouseX = node.x + NODE_W + SPOUSE_GAP;
  } else {
    node.x = childrenMidX - NODE_W / 2;
  }

  // If node is pushed left of startX, shift all children
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
  return `${age} year${age === 1 ? "" : "s"} old`;
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
// CONNECTOR LINES
// ======================================
interface ConnectorProps {
  parent: TreeNode;
  child: TreeNode;
  themeColor: string;
}

function Connector({ parent, child, themeColor }: ConnectorProps) {
  // Start from center-bottom of the couple unit
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
    <path
      d={d}
      fill="none"
      stroke={themeColor}
      strokeWidth={2}
      strokeOpacity={0.4}
      strokeDasharray="6 3"
      strokeLinecap="round"
    />
  );
}

// ======================================
// MEMBER NODE
// ======================================
interface MemberNodeProps {
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
}: MemberNodeProps) {
  const gender = getGenderMarker(member);
  const ageText = getAgeText(member);
  const [hovered, setHovered] = React.useState(false);

  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick(member);
        }
      }}
    >
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={16}
        ry={16}
        fill={isHighlighted ? themeColor : hovered ? "var(--color-accent)" : "var(--color-card)"}
        stroke={isHighlighted ? themeColor : gender.color}
        strokeWidth={isHighlighted ? 2.5 : 1.5}
        strokeOpacity={isHighlighted ? 1 : 0.35}
        style={{ filter: hovered || isHighlighted ? "drop-shadow(0 4px 12px rgba(0,0,0,0.18))" : undefined, transition: "all 0.2s" }}
      />

      {!member.alive && (
        <rect width={NODE_W} height={NODE_H} rx={16} ry={16} fill="rgba(0,0,0,0.16)" />
      )}

      <rect x={8} y={8} width={24} height={24} rx={12} fill={gender.color} opacity={0.16} />
      <text x={20} y={24} textAnchor="middle" fontSize={12} fontWeight={700} fill={gender.color}>{gender.symbol}</text>

      {hasChildren && (
        <g
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapse?.(member);
          }}
          style={{ cursor: "pointer" }}
        >
          <rect x={NODE_W - 30} y={8} width={22} height={22} rx={11} fill="rgba(255,255,255,0.85)" stroke="rgba(15,23,42,0.12)" />
          <text x={NODE_W - 19} y={22} textAnchor="middle" fontSize={13} fontWeight={700} fill={isHighlighted ? themeColor : "var(--color-foreground)"}>
            {isCollapsed ? "+" : "−"}
          </text>
        </g>
      )}

      {member.photo ? (
        <image
          href={member.photo}
          x={NODE_W / 2 - 18}
          y={10}
          width={36}
          height={36}
          style={{ borderRadius: "50%", clipPath: "circle(18px at 18px 18px)" }}
          clipPath={`circle(18px at ${NODE_W / 2} 28)`}
        />
      ) : (
        <>
          <circle cx={NODE_W / 2} cy={28} r={18} fill={isHighlighted ? "rgba(255,255,255,0.2)" : gender.color} opacity={isHighlighted ? 1 : 0.18} />
          <text x={NODE_W / 2} y={33} textAnchor="middle" fontSize={13} fontWeight={700} fill={isHighlighted ? "#ffffff" : gender.color}>
            {initials}
          </text>
        </>
      )}

      <text x={NODE_W / 2} y={60} textAnchor="middle" fontSize={10} fontWeight={700} fill={isHighlighted ? "#ffffff" : "var(--color-foreground)"} style={{ letterSpacing: "0.01em" }}>
        {member.name.length > 18 ? `${member.name.slice(0, 17)}…` : member.name}
      </text>

      {ageText && (
        <text x={NODE_W / 2} y={78} textAnchor="middle" fontSize={8.5} fill={isHighlighted ? "rgba(255,255,255,0.88)" : "var(--color-muted-foreground)"}>
          {ageText}
        </text>
      )}

      <rect x={14} y={84} width={NODE_W - 28} height={16} rx={8} fill={member.alive ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)"} />
      <text x={NODE_W / 2} y={95} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={member.alive ? "#16a34a" : "#dc2626"}>
        {member.alive ? "Alive" : "Deceased"}
      </text>

      <circle cx={NODE_W - 10} cy={10} r={4} fill={member.alive ? "#22c55e" : "#ef4444"} stroke="var(--color-card)" strokeWidth={1.5} />

      {isSpouse && (
        <text x={NODE_W / 2} y={72} textAnchor="middle" fontSize={8} fill={isHighlighted ? "rgba(255,255,255,0.7)" : "var(--color-muted-foreground)"}>
          spouse
        </text>
      )}
    </g>
  );
}

// ======================================
// SPOUSE CONNECTOR (horizontal heart line)
// ======================================
function SpouseConnector({ x1, x2, y, themeColor }: { x1: number; x2: number; y: number; themeColor: string }) {
  const midX = (x1 + NODE_W + x2) / 2;
  const midY = y + NODE_H / 2;

  return (
    <g>
      <line
        x1={x1 + NODE_W}
        y1={midY}
        x2={x2}
        y2={midY}
        stroke={themeColor}
        strokeWidth={2}
        strokeOpacity={0.5}
      />
      <text x={midX} y={midY + 4} textAnchor="middle" fontSize={10} fill={themeColor} opacity={0.8}>♥</text>
    </g>
  );
}

// ======================================
// DETAIL PANEL
// ======================================
interface DetailPanelProps {
  member: Member;
  allMembers: Member[];
  onClose: () => void;
  isBranchCollapsed: boolean;
  onToggleBranch: () => void;
}

function DetailPanel({ member, allMembers, onClose, isBranchCollapsed, onToggleBranch }: DetailPanelProps) {
  const byId = new Map(allMembers.map((m) => [m.id, m]));
  const father = member.fatherId ? byId.get(member.fatherId) : undefined;
  const mother = member.motherId ? byId.get(member.motherId) : undefined;
  const spouse = member.spouseId ? byId.get(member.spouseId) : undefined;
  const children = allMembers.filter((m) => m.fatherId === member.id || m.motherId === member.id);

  const genderColor = member.gender === "male" ? "text-blue-500" : member.gender === "female" ? "text-pink-500" : "text-emerald-500";
  const genderBg = member.gender === "male" ? "bg-blue-500/10" : member.gender === "female" ? "bg-pink-500/10" : "bg-emerald-500/10";

  return (
    <Dialog isOpen={true} onClose={onClose} title="Member profile" className="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className={cn("flex flex-col items-center gap-3 rounded-2xl border border-border/30 p-5", genderBg)}>
          <Avatar src={member.photo} alt={member.name} size="xl" className={cn("ring-4 ring-offset-2 ring-offset-card", genderColor.replace("text-", "ring-"))} />
          <div className="text-center">
            <h2 className="font-extrabold text-foreground">{member.name}</h2>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge variant={member.alive ? "success" : "danger"}>{member.alive ? "Alive" : "Deceased"}</Badge>
              <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold capitalize", genderBg, genderColor)}>
                {member.gender}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={onToggleBranch}>
            {isBranchCollapsed ? "Expand branch" : "Collapse branch"}
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {member.dateOfBirth && (
            <div className="rounded-xl border border-border/40 bg-muted/35 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Born</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{member.dateOfBirth}</p>
            </div>
          )}
          {!member.alive && member.dateOfDeath && (
            <div className="rounded-xl border border-border/40 bg-muted/35 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Died</p>
              <p className="mt-1 text-sm font-semibold text-destructive">{member.dateOfDeath}</p>
            </div>
          )}
          {member.bloodGroup && (
            <div className="rounded-xl border border-border/40 bg-muted/35 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Blood Group</p>
              <p className="mt-1 text-sm font-semibold text-rose-500">{member.bloodGroup}</p>
            </div>
          )}
          {member.occupation && (
            <div className="rounded-xl border border-border/40 bg-muted/35 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Occupation</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{member.occupation}</p>
            </div>
          )}
          {member.education && (
            <div className="rounded-xl border border-border/40 bg-muted/35 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Education</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{member.education}</p>
            </div>
          )}
          {member.mobile && (
            <div className="rounded-xl border border-border/40 bg-muted/35 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mobile</p>
              <p className="mt-1 text-sm font-semibold text-primary">{member.mobile}</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/40 bg-muted/30 p-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Relationships</h3>
          <div className="mt-3 flex flex-col gap-2">
            {[
              { label: "Father", person: father },
              { label: "Mother", person: mother },
              { label: "Spouse", person: spouse },
            ].map(({ label, person }) => (
              <div key={label} className="flex items-center justify-between rounded-xl border border-border/30 bg-card/70 px-3 py-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className="text-sm font-semibold text-foreground">{person?.name ?? <span className="italic text-muted-foreground/60">Unknown</span>}</span>
              </div>
            ))}
            {children.length > 0 && (
              <div className="rounded-xl border border-border/30 bg-card/70 px-3 py-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Children ({children.length})</span>
                <div className="mt-2 flex flex-col gap-1">
                  {children.map((child) => (
                    <span key={child.id} className="text-sm font-semibold text-foreground">{child.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {member.notes && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Notes</p>
            <p className="mt-1 text-sm italic text-amber-900 dark:text-amber-100">&ldquo;{member.notes}&rdquo;</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ======================================
// LEGEND
// ======================================
function Legend() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="absolute bottom-20 md:bottom-4 left-4 z-20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <Info className="h-3.5 w-3.5" />
        Legend
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-2 p-3 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-lg text-xs flex flex-col gap-2 min-w-[180px]"
          >
            {[
              { color: "#3b82f6", label: "Male member" },
              { color: "#ec4899", label: "Female member" },
              { color: "#10b981", label: "Other gender" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
            <div className="border-t border-border/30 pt-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Alive</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Deceased</span>
            </div>
            <div className="border-t border-border/30 pt-2 flex items-center gap-2">
              <span className="text-base">♥</span>
              <span className="text-muted-foreground">Spouse link</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="24" height="12">
                <line x1="0" y1="6" x2="24" y2="6" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 2" />
              </svg>
              <span className="text-muted-foreground">Parent-child link</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ======================================
// MAIN TREE PAGE
// ======================================
function TreePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedFamilyId = searchParams.get("familyId") ?? "";

  const families = useFamilies();

  const [selectedFamilyId, setSelectedFamilyId] = React.useState(preselectedFamilyId);
  const [selectedMember, setSelectedMember] = React.useState<Member | undefined>(undefined);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });
  const [collapsedNodes, setCollapsedNodes] = React.useState<Set<string>>(new Set());
  const [viewportSize, setViewportSize] = React.useState({ width: 1200, height: 700 });
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const lastTouch = React.useRef<{ x: number; y: number } | null>(null);
  const pinchDistance = React.useRef<number | null>(null);

  const resolvedFamilyId = React.useMemo(() => {
    if (selectedFamilyId) return selectedFamilyId;
    if (preselectedFamilyId) return preselectedFamilyId;
    return families?.[0]?.id;
  }, [families, preselectedFamilyId, selectedFamilyId]);

  const members = useFamilyMembers(resolvedFamilyId ?? "");
  const selectedFamily = families?.find((f) => f.id === resolvedFamilyId);

  const themeColors = getThemeColors(selectedFamily?.color);

  // Build and layout tree
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
    return treeRoots
      .map((root) => getVisibleTree(root, collapsedNodes))
      .filter((root): root is TreeNode => Boolean(root));
  }, [treeRoots, collapsedNodes]);

  const allVisibleNodes = React.useMemo(() => collectVisibleNodes(visibleTreeRoots, collapsedNodes), [visibleTreeRoots, collapsedNodes]);

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

  // Calculate SVG viewport
  const svgBounds = React.useMemo(() => {
    if (allVisibleNodes.length === 0) return { width: 800, height: 400 };
    let maxX = 0;
    let maxY = 0;
    allVisibleNodes.forEach((n) => {
      const rightEdge = (n.spouseX !== undefined ? n.spouseX + NODE_W : n.x + NODE_W);
      maxX = Math.max(maxX, rightEdge);
      maxY = Math.max(maxY, n.y + NODE_H);
    });
    return { width: maxX + 80, height: maxY + 80 };
  }, [allVisibleNodes]);

  // Search highlight
  const highlightedIds = React.useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    return new Set(
      (members ?? []).filter((m) => m.name.toLowerCase().includes(q)).map((m) => m.id)
    );
  }, [members, searchQuery]);

  const isLoading = families === undefined || (resolvedFamilyId && members === undefined);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest?.('[data-node="true"]')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [first, second] = Array.from(e.touches);
      pinchDistance.current = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
      return;
    }

    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistance.current) {
      e.preventDefault();
      const [first, second] = Array.from(e.touches);
      const nextDistance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
      const ratio = nextDistance / pinchDistance.current;
      pinchDistance.current = nextDistance;
      setZoom((value) => Math.min(2.5, Math.max(0.3, value * ratio)));
      return;
    }

    if (e.touches.length === 1 && lastTouch.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = () => {
    pinchDistance.current = null;
    lastTouch.current = null;
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setZoom((value) => Math.min(2.5, Math.max(0.3, value + delta)));
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.3));
  const handleReset = () => { setZoom(1); setPan({ x: 40, y: 40 }); };
  const handleCenterTree = () => {
    if (svgBounds.width === 0 || svgBounds.height === 0) return;
    const nextPan = {
      x: (viewportSize.width - svgBounds.width * zoom) / 2,
      y: (viewportSize.height - svgBounds.height * zoom) / 2,
    };
    setPan(nextPan);
  };

  const handleFitToScreen = () => {
    if (svgBounds.width === 0 || svgBounds.height === 0) return;
    const padding = 96;
    const scaleX = (viewportSize.width - padding) / svgBounds.width;
    const scaleY = (viewportSize.height - padding) / svgBounds.height;
    const nextZoom = Math.max(0.4, Math.min(1.5, Math.min(scaleX, scaleY)));
    setZoom(nextZoom);
    setPan({
      x: (viewportSize.width - svgBounds.width * nextZoom) / 2,
      y: (viewportSize.height - svgBounds.height * nextZoom) / 2,
    });
  };

  const toggleBranchCollapse = (memberId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  // Render all connector lines first, then all nodes
  const renderConnectors = (node: TreeNode): React.ReactNode[] => {
    const lines: React.ReactNode[] = [];
    node.children.forEach((child) => {
      lines.push(
        <Connector key={`conn-${node.member.id}-${child.member.id}`} parent={node} child={child} themeColor={themeColors.to} />
      );
      lines.push(...renderConnectors(child));
    });
    return lines;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="sticky top-0 z-30 bg-background border-b border-border/40 px-4 py-3 flex items-center justify-between">
          <Skeleton className="h-7 w-32 rounded-xl" />
          <Skeleton className="h-7 w-20 rounded-xl" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-4 w-48 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/40 px-4 py-2.5 flex items-center gap-3 shadow-xs"
      >
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Family Selector */}
          {families && families.length > 0 && (
            <div className="relative">
              <select
                value={selectedFamilyId}
                onChange={(e) => {
                  setSelectedFamilyId(e.target.value);
                  setSelectedMember(undefined);
                }}
                className="appearance-none h-9 pl-3 pr-8 rounded-xl border border-border/50 bg-card text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer max-w-[180px] truncate"
              >
                {families.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          )}

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Highlight member…"
              className="h-9 w-full rounded-xl border border-border/40 bg-muted/30 pl-9 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeSwitch />
        </div>
      </motion.header>

      {/* ── Main Canvas ── */}
      <div ref={viewportRef} className="flex-1 relative overflow-hidden">
        {/* Empty state: no families */}
        {(!families || families.length === 0) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-8">
            <FolderHeart className="h-16 w-16 text-muted-foreground/40" />
            <h3 className="text-lg font-bold text-foreground">No Families Yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Create a family first, then add members to see their tree here.</p>
            <Button variant="primary" onClick={() => router.push("/families")}>Create a Family</Button>
          </div>
        )}

        {/* Empty state: family selected but no members */}
        {families && families.length > 0 && selectedFamilyId && members && members.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-8">
            <GitFork className="h-16 w-16 text-muted-foreground/40" />
            <h3 className="text-lg font-bold text-foreground">No Members Yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Add members to <strong>{selectedFamily?.name}</strong> to see the family tree visualized here.
            </p>
            <Button variant="primary" onClick={() => router.push(`/families/${selectedFamilyId}`)}>
              Go to Family Dashboard
            </Button>
          </div>
        )}

        {/* Tree SVG Canvas */}
        {members && members.length > 0 && (
          <svg
            width="100%"
            height="100%"
            style={{ cursor: isPanning ? "grabbing" : "grab", userSelect: "none" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Render connectors */}
              {visibleTreeRoots.map((root) => renderConnectors(root))}

              {/* Spouse connectors */}
              {allVisibleNodes.map((node) =>
                node.spouse && node.spouseX !== undefined ? (
                  <SpouseConnector
                    key={`spouse-${node.member.id}`}
                    x1={node.x}
                    x2={node.spouseX}
                    y={node.y}
                    themeColor={themeColors.from}
                  />
                ) : null
              )}

              {/* Render member nodes */}
              {allVisibleNodes.map((node) => (
                <React.Fragment key={node.member.id}>
                  <MemberNode
                    member={node.member}
                    x={node.x}
                    y={node.y}
                    isHighlighted={highlightedIds.has(node.member.id) || selectedMember?.id === node.member.id}
                    themeColor={themeColors.from}
                    hasChildren={node.children.length > 0}
                    isCollapsed={collapsedNodes.has(node.member.id)}
                    onClick={(m) => setSelectedMember((prev) => prev?.id === m.id ? undefined : m)}
                    onToggleCollapse={(m) => toggleBranchCollapse(m.id)}
                  />
                  {node.spouse && node.spouseX !== undefined && (
                    <MemberNode
                      member={node.spouse}
                      x={node.spouseX}
                      y={node.y}
                      isHighlighted={highlightedIds.has(node.spouse.id) || selectedMember?.id === node.spouse.id}
                      isSpouse
                      themeColor={themeColors.from}
                      hasChildren={false}
                      onClick={(m) => setSelectedMember((prev) => prev?.id === m.id ? undefined : m)}
                    />
                  )}
                </React.Fragment>
              ))}
            </g>
          </svg>
        )}

        {/* ── Detail Side Panel ── */}
        <AnimatePresence>
          {selectedMember && (
            <DetailPanel
              member={selectedMember}
              allMembers={members ?? []}
              onClose={() => setSelectedMember(undefined)}
              isBranchCollapsed={collapsedNodes.has(selectedMember.id)}
              onToggleBranch={() => toggleBranchCollapse(selectedMember.id)}
            />
          )}
        </AnimatePresence>

        {/* ── Zoom Controls ── */}
        {members && members.length > 0 && (
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="p-2.5 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2.5 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={handleCenterTree}
              className="p-2.5 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
              title="Center Tree"
            >
              <Move className="h-4 w-4" />
            </button>
            <button
              onClick={handleFitToScreen}
              className="p-2.5 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
              title="Fit to Screen"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-2.5 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
              title="Reset View"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Legend ── */}
        {members && members.length > 0 && <Legend />}

        {/* ── Stats bar ── */}
        {members && members.length > 0 && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow text-xs font-semibold text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {members.length} member{members.length !== 1 ? "s" : ""}
            {members.filter((m) => m.spouseId).length > 0 && (
              <>
                <span className="text-border/80">·</span>
                <Heart className="h-3.5 w-3.5 text-rose-400" />
                {Math.floor(members.filter((m) => m.spouseId).length / 2)} couple{members.filter((m) => m.spouseId).length > 2 ? "s" : ""}
              </>
            )}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}

export default function TreePage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col h-screen bg-background">
          <div className="sticky top-0 z-30 bg-background border-b border-border/40 px-4 py-3 flex items-center justify-between">
            <Skeleton className="h-7 w-32 rounded-xl" />
            <Skeleton className="h-7 w-20 rounded-xl" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <Skeleton className="h-32 w-64 rounded-3xl" />
          </div>
        </div>
      }
    >
      <TreePageInner />
    </React.Suspense>
  );
}
