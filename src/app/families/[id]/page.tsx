"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
  Check,
  Grid,
  List,
  ArrowLeft,
  Download,
  GitFork,
  Trees,
  MapPin,
  Clock,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import { useFamily, useFamilyMembers, useMembers } from "@/hooks/use-database";
import {
  updateFamily,
  createMember,
  updateMember,
  deleteMember,
} from "@/database/crud";
import { BottomNavigation } from "@/components/layout/navigation";
import { ThemeSwitch } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmationDialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton, Badge, Avatar } from "@/components/ui/feedback";
import { Member, Family } from "@/types/schema";

// ======================================
// HELPERS
// ======================================
function calculateAge(dobStr?: string, dodStr?: string): { age: number; formatted: string } | null {
  if (!dobStr) return null;
  try {
    const birthDate = new Date(dobStr);
    if (isNaN(birthDate.getTime())) return null;

    const endDate = dodStr ? new Date(dodStr) : new Date();
    if (isNaN(endDate.getTime())) return null;

    let age = endDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = endDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
      age--;
    }

    return {
      age,
      formatted: dodStr ? `${age} yrs (Deceased)` : `${age} yrs`,
    };
  } catch {
    return null;
  }
}

// Color schemes helper
interface ColorTheme {
  key: string;
  label: string;
  gradient: string;
  bg: string;
  ring: string;
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

const BLOOD_GROUPS = [
  { value: "", label: "Select Blood Group" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

// ======================================
// COLOR SWATCH PICKER
// ======================================
function ColorSwatchPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_THEMES.map((theme) => (
        <button
          key={theme.key}
          type="button"
          onClick={() => onChange(theme.key)}
          className={cn(
            "h-8 w-8 rounded-full transition-all duration-150 cursor-pointer",
            theme.bg,
            value === theme.key
              ? `ring-2 ring-offset-2 ring-offset-background ${theme.ring} scale-110`
              : "hover:scale-105 opacity-80 hover:opacity-100"
          )}
          aria-label={`${theme.label} theme`}
        >
          {value === theme.key && <Check className="h-4 w-4 text-white mx-auto drop-shadow" />}
        </button>
      ))}
    </div>
  );
}

// ======================================
// EDIT FAMILY DIALOG
// ======================================
interface EditFamilyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  family: Family;
}

function EditFamilyDialog({ isOpen, onClose, family }: EditFamilyDialogProps) {
  const [name, setName] = React.useState(family.name);
  const [description, setDescription] = React.useState(family.description ?? "");
  const [color, setColor] = React.useState(family.color ?? "blue");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setErrorMsg("");

    try {
      await updateFamily(family.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      toast.success("Family settings updated!");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update family.";
      if (msg.toLowerCase().includes("already exists")) {
        setErrorMsg(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Edit Family Dashboard">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground pl-1" htmlFor="fam-name">
            Family Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="fam-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errorMsg) setErrorMsg("");
            }}
            maxLength={100}
            required
          />
          {errorMsg && <p className="text-xs text-destructive pl-1">{errorMsg}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground pl-1" htmlFor="fam-desc">
            Description
          </label>
          <Textarea
            id="fam-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground pl-1">Dashboard Color Theme</label>
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 flex items-center gap-3">
            <ColorSwatchPicker value={color} onChange={setColor} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1 border-t border-border/40">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ======================================
// MEMBER VIEW DIALOG
// ======================================
interface MemberViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member?: Member;
  allMembers: Member[];
}

function MemberViewDialog({ isOpen, onClose, member, allMembers }: MemberViewDialogProps) {
  if (!member) return null;

  const ageData = calculateAge(member.dateOfBirth, member.dateOfDeath);
  const father = allMembers.find((m) => m.id === member.fatherId);
  const mother = allMembers.find((m) => m.id === member.motherId);
  const spouse = allMembers.find((m) => m.id === member.spouseId);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Member Profile" className="max-w-xl">
      <div className="flex flex-col gap-6 pt-2">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left border-b border-border/40 pb-4">
          <Avatar
            src={member.photo}
            alt={member.name}
            size="xl"
            className={cn(
              "ring-4 ring-offset-2 ring-offset-background",
              member.gender === "male" ? "ring-blue-500/30" : member.gender === "female" ? "ring-pink-500/30" : "ring-emerald-500/30"
            )}
          />
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-extrabold text-foreground">{member.name}</h2>
              <Badge variant={member.alive ? "success" : "danger"}>
                {member.alive ? "Alive" : "Deceased"}
              </Badge>
            </div>
            {ageData && (
              <p className="text-xs font-semibold text-muted-foreground mt-1">
                Age: <span className="text-foreground">{ageData.formatted}</span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-muted/30 border border-border/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal</h3>
            <div>Gender: <strong className="capitalize">{member.gender}</strong></div>
            {member.dateOfBirth && <div>Born: <strong>{member.dateOfBirth}</strong></div>}
            {!member.alive && member.dateOfDeath && <div className="text-destructive">Died: <strong>{member.dateOfDeath}</strong></div>}
            {member.bloodGroup && <div>Blood Group: <strong className="text-rose-500">{member.bloodGroup}</strong></div>}
          </div>

          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-muted/30 border border-border/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Career & Education</h3>
            {member.occupation && <div>Occupation: <strong>{member.occupation}</strong></div>}
            {member.education && <div>Education: <strong>{member.education}</strong></div>}
            {!member.occupation && !member.education && <span className="italic text-muted-foreground">Not added</span>}
          </div>

          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-muted/30 border border-border/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact</h3>
            {member.mobile && <div>Phone: <strong className="text-primary">{member.mobile}</strong></div>}
            {member.email && <div className="truncate">Email: <strong className="text-primary">{member.email}</strong></div>}
            {!member.mobile && !member.email && <span className="italic text-muted-foreground">Not added</span>}
          </div>

          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-muted/30 border border-border/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</h3>
            {(member.village || member.district || member.state || member.country) ? (
              <span className="leading-snug">
                {member.address && `${member.address}, `}
                {[member.village, member.district, member.state, member.country].filter(Boolean).join(", ")}
              </span>
            ) : (
              <span className="italic text-muted-foreground">Not added</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-muted/30 border border-border/30">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Relationships</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Father", relation: father },
              { label: "Mother", relation: mother },
              { label: "Spouse", relation: spouse },
            ].map((rel) => (
              <div key={rel.label} className="p-2 rounded-xl bg-card border border-border/40 text-center flex flex-col items-center">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">{rel.label}</span>
                <span className="text-xs font-bold text-foreground truncate max-w-full mt-1">
                  {rel.relation?.name ?? "Unknown"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {member.notes && (
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-sm">
            <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Notes</h3>
            <p className="italic text-amber-900 dark:text-amber-200 mt-1">&ldquo;{member.notes}&rdquo;</p>
          </div>
        )}

        <Button variant="secondary" onClick={onClose} className="w-full">
          Close Profile
        </Button>
      </div>
    </Dialog>
  );
}

// ======================================
// MEMBER FORM DIALOG
// ======================================
interface MemberFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editMember?: Member;
  familyId: string;
  allMembers: Member[];
}

function MemberFormDialog({ isOpen, onClose, editMember, familyId, allMembers }: MemberFormDialogProps) {
  const isEdit = Boolean(editMember);

  const [name, setName] = React.useState(editMember?.name ?? "");
  const [gender, setGender] = React.useState<"male" | "female" | "other">(editMember?.gender ?? "male");
  const [alive, setAlive] = React.useState(editMember?.alive ?? true);
  const [dateOfBirth, setDateOfBirth] = React.useState(editMember?.dateOfBirth ?? "");
  const [dateOfDeath, setDateOfDeath] = React.useState(editMember?.dateOfDeath ?? "");
  const [bloodGroup, setBloodGroup] = React.useState(editMember?.bloodGroup ?? "");
  const [occupation, setOccupation] = React.useState(editMember?.occupation ?? "");
  const [education, setEducation] = React.useState(editMember?.education ?? "");
  const [mobile, setMobile] = React.useState(editMember?.mobile ?? "");
  const [email, setEmail] = React.useState(editMember?.email ?? "");
  const [village, setVillage] = React.useState(editMember?.village ?? "");
  const [district, setDistrict] = React.useState(editMember?.district ?? "");
  const [state, setState] = React.useState(editMember?.state ?? "");
  const [country, setCountry] = React.useState(editMember?.country ?? "");
  const [address, setAddress] = React.useState(editMember?.address ?? "");
  const [notes, setNotes] = React.useState(editMember?.notes ?? "");
  const [photo, setPhoto] = React.useState<string | undefined>(editMember?.photo);

  const [fatherId, setFatherId] = React.useState(editMember?.fatherId ?? "");
  const [motherId, setMotherId] = React.useState(editMember?.motherId ?? "");
  const [spouseId, setSpouseId] = React.useState(editMember?.spouseId ?? "");

  const [loading, setLoading] = React.useState(false);
  const [nameError, setNameError] = React.useState("");
  const nameRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const potentialRelations = React.useMemo(() => {
    return allMembers.filter((m) => !editMember || m.id !== editMember.id);
  }, [allMembers, editMember]);

  const fathersList = [
    { value: "", label: "Select Father" },
    ...potentialRelations.filter((m) => m.gender === "male").map((m) => ({ value: m.id, label: m.name })),
  ];
  const mothersList = [
    { value: "", label: "Select Mother" },
    ...potentialRelations.filter((m) => m.gender === "female").map((m) => ({ value: m.id, label: m.name })),
  ];
  const spousesList = [
    { value: "", label: "Select Spouse" },
    ...potentialRelations.map((m) => ({ value: m.id, label: m.name })),
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("Image too large. Must be under 1.5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Full name is required.");
      return;
    }
    setLoading(true);

    const payload = {
      name: name.trim(),
      familyId,
      gender,
      alive,
      dateOfBirth: dateOfBirth || undefined,
      dateOfDeath: (!alive && dateOfDeath) ? dateOfDeath : undefined,
      bloodGroup: bloodGroup || undefined,
      occupation: occupation.trim() || undefined,
      education: education.trim() || undefined,
      mobile: mobile.trim() || undefined,
      email: email.trim() || undefined,
      village: village.trim() || undefined,
      district: district.trim() || undefined,
      state: state.trim() || undefined,
      country: country.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      photo,
      fatherId: fatherId || undefined,
      motherId: motherId || undefined,
      spouseId: spouseId || undefined,
    };

    try {
      if (isEdit && editMember) {
        await updateMember(editMember.id, payload);
        toast.success("Member saved successfully!");
      } else {
        const id = `member_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        await createMember({ id, ...payload });
        toast.success("Member added!");
      }
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to save.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Member" : "Add Member"} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground pl-1">Full Name *</label>
          <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} required />
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
        </div>

        <div className="flex flex-col sm:flex-row gap-5 p-4 rounded-2xl bg-muted/30 border border-border/30">
          <div className="flex flex-col items-center gap-2">
            <Avatar src={photo} alt={name || "Avatar"} size="xl" />
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              Upload Photo
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            <Select label="Gender" value={gender} onChange={(e) => setGender(e.target.value as Member["gender"])} options={GENDERS} />
            <Select label="Blood Group" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} options={BLOOD_GROUPS} />
            <div className="col-span-2">
              <span className="text-xs font-semibold text-muted-foreground">Status</span>
              <div className="flex gap-6 mt-1.5">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={alive} onChange={() => setAlive(true)} /> Alive</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={!alive} onChange={() => setAlive(false)} /> Deceased</label>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground pl-1">Date of Birth</span>
            <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>
          {!alive && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-destructive pl-1">Date of Death</span>
              <Input type="date" value={dateOfDeath} onChange={(e) => setDateOfDeath(e.target.value)} required={!alive} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground pl-1">Mobile</span>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="e.g. +91 98765 43210" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground pl-1">Email</span>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. name@example.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground pl-1">Occupation</span>
            <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. Teacher, Engineer" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground pl-1">Education</span>
            <Input value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. B.Tech, M.A." />
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 rounded-2xl bg-muted/30 border border-border/30">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</span>
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="Village" value={village} onChange={(e) => setVillage(e.target.value)} className="h-9 px-3 text-xs" />
            <Input placeholder="District" value={district} onChange={(e) => setDistrict(e.target.value)} className="h-9 px-3 text-xs" />
            <Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} className="h-9 px-3 text-xs" />
            <Input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} className="h-9 px-3 text-xs" />
          </div>
          <Input placeholder="Full Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="flex flex-col gap-4 p-4 rounded-2xl bg-muted/30 border border-border/30">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Connect Relationships</span>
          <div className="grid grid-cols-3 gap-2">
            <Select label="Father" value={fatherId} onChange={(e) => setFatherId(e.target.value)} options={fathersList} />
            <Select label="Mother" value={motherId} onChange={(e) => setMotherId(e.target.value)} options={mothersList} />
            <Select label="Spouse" value={spouseId} onChange={(e) => setSpouseId(e.target.value)} options={spousesList} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground pl-1">Notes</span>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1 border-t border-border/40">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>Save</Button>
        </div>
      </form>
    </Dialog>
  );
}

// ======================================
// MEMBER CARD (Grid & List Layout)
// ======================================
interface MemberCardProps {
  member: Member;
  allMembers: Member[];
  isListView: boolean;
  onView: (m: Member) => void;
  onEdit: (m: Member) => void;
  onDelete: (m: Member) => void;
  index: number;
}

function MemberCard({ member, allMembers, isListView, onView, onEdit, onDelete, index }: MemberCardProps) {
  const ageData = calculateAge(member.dateOfBirth, member.dateOfDeath);

  // Derive relationship labels for this member dynamically
  const isFather = allMembers.some((m) => m.fatherId === member.id);
  const isMother = allMembers.some((m) => m.motherId === member.id);
  const hasSpouse = Boolean(member.spouseId);
  const isChild = Boolean(member.fatherId || member.motherId);

  const roles: string[] = [];
  if (hasSpouse) roles.push(member.gender === "male" ? "Husband" : member.gender === "female" ? "Wife" : "Spouse");
  if (isFather) roles.push("Father");
  if (isMother) roles.push("Mother");
  if (isChild) roles.push(member.gender === "male" ? "Son" : member.gender === "female" ? "Daughter" : "Child");

  const genderRing = member.gender === "male"
    ? "ring-blue-500/20"
    : member.gender === "female"
    ? "ring-pink-500/20"
    : "ring-emerald-500/20";

  if (isListView) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, delay: index * 0.03 }}
        className="w-full bg-card border border-border/50 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:shadow-sm transition-all"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={member.photo} alt={member.name} size="md" className={cn("ring-2 ring-offset-2 ring-offset-background", genderRing)} />
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-foreground text-sm truncate">{member.name}</span>
              <Badge variant={member.alive ? "success" : "danger"} className="text-[8px] px-1 py-0.5">
                {member.alive ? "Alive" : "Deceased"}
              </Badge>
            </div>
            <div className="flex gap-2 flex-wrap items-center mt-1">
              {ageData && <span className="text-[10px] text-muted-foreground font-semibold">Age: {ageData.formatted}</span>}
              {member.village && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{member.village}</span>}
            </div>
          </div>
        </div>

        {/* Roles */}
        {roles.length > 0 && (
          <div className="flex gap-1 flex-wrap sm:justify-center">
            {roles.slice(0, 2).map((role) => (
              <span key={role} className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground tracking-wide select-none">
                {role}
              </span>
            ))}
          </div>
        )}

        {/* List actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="ghost" size="sm" onClick={() => onView(member)} className="h-8 px-2 text-xs rounded-lg gap-1">
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(member)} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(member)} className="h-8 w-8 p-0 rounded-lg text-destructive/80 hover:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </motion.div>
    );
  }

  // Grid Layout Card
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      layout
      className="bg-card border border-border/50 rounded-3xl p-4 flex flex-col gap-4 shadow-xs hover:shadow-md hover:border-border transition-all"
    >
      <div className="flex gap-3.5 items-start">
        <Avatar src={member.photo} alt={member.name} size="lg" className={cn("ring-2 ring-offset-2 ring-offset-background", genderRing)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-extrabold text-foreground text-sm truncate max-w-[120px]">{member.name}</h4>
            <Badge variant={member.alive ? "success" : "danger"} className="text-[9px] px-1 py-0">{member.alive ? "Alive" : "Deceased"}</Badge>
          </div>

          <div className="flex flex-wrap gap-1 mt-1">
            {roles.slice(0, 2).map((role) => (
              <span key={role} className="text-[8px] font-extrabold uppercase px-1 rounded-md bg-muted text-muted-foreground tracking-wide">
                {role}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-0.5 mt-3 text-[10px] text-muted-foreground">
            {ageData && <span>Age: <strong className="text-foreground">{ageData.formatted}</strong></span>}
            {member.village && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /> {member.village}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/40 mt-auto">
        <Button variant="primary" size="sm" onClick={() => onView(member)} className="flex-1 justify-center gap-1 text-xs h-9 rounded-xl">
          <Eye className="h-3.5 w-3.5" /> View
        </Button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onEdit(member)}
          className="flex items-center justify-center h-9 w-9 rounded-xl border border-border/60 bg-card hover:bg-muted text-muted-foreground cursor-pointer transition-colors"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onDelete(member)}
          className="flex items-center justify-center h-9 w-9 rounded-xl border border-destructive/20 bg-card hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ======================================
// MAIN COMPONENT
// ======================================
export default function FamilyDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  // Reactive DB queries
  const family = useFamily(id);
  const allMembers = useMembers(); // for global relation queries
  const familyMembers = useFamilyMembers(id);

  // Filter States
  const [query, setQuery] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sortKey] = React.useState<"name" | "age" | "createdAt">("name");
  const [isListView, setIsListView] = React.useState(false);

  // Dialog States
  const [showEditFamily, setShowEditFamily] = React.useState(false);
  const [showMemberForm, setShowMemberForm] = React.useState(false);
  const [showMemberView, setShowMemberView] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<Member | undefined>(undefined);
  const [viewingMember, setViewingMember] = React.useState<Member | undefined>(undefined);
  const [deletingMember, setDeletingMember] = React.useState<Member | undefined>(undefined);

  // Focus ref for search
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const isLoading = family === undefined || familyMembers === undefined;

  // Stats calculation
  const stats = React.useMemo(() => {
    if (!familyMembers) return { total: 0, male: 0, female: 0, children: 0, alive: 0, deceased: 0 };
    let male = 0;
    let female = 0;
    let children = 0;
    let alive = 0;
    let deceased = 0;

    familyMembers.forEach((m) => {
      if (m.gender === "male") male++;
      else if (m.gender === "female") female++;

      if (m.alive) alive++;
      else deceased++;

      const ageData = calculateAge(m.dateOfBirth, m.dateOfDeath);
      if (ageData && ageData.age < 18) {
        children++;
      }
    });

    return { total: familyMembers.length, male, female, children, alive, deceased };
  }, [familyMembers]);

  // Processed members list
  const processedMembers = React.useMemo(() => {
    if (!familyMembers) return [];
    let list = [...familyMembers];

    // Search
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.village?.toLowerCase().includes(q) ||
          m.occupation?.toLowerCase().includes(q)
      );
    }

    // Gender Filter
    if (genderFilter !== "all") {
      list = list.filter((m) => m.gender === genderFilter);
    }

    // Status Filter
    if (statusFilter !== "all") {
      const wantAlive = statusFilter === "alive";
      list = list.filter((m) => m.alive === wantAlive);
    }

    // Sort
    list.sort((a, b) => {
      if (sortKey === "createdAt") return b.createdAt - a.createdAt;
      if (sortKey === "age") {
        const ageA = calculateAge(a.dateOfBirth, a.dateOfDeath)?.age ?? -1;
        const ageB = calculateAge(b.dateOfBirth, b.dateOfDeath)?.age ?? -1;
        return ageB - ageA;
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [familyMembers, query, genderFilter, statusFilter, sortKey]);

  // Actions
  const handleOpenAddMember = () => {
    setEditingMember(undefined);
    setShowMemberForm(true);
  };

  const handleOpenEditMember = (m: Member) => {
    setEditingMember(m);
    setShowMemberForm(true);
  };

  const handleOpenViewMember = (m: Member) => {
    setViewingMember(m);
    setShowMemberView(true);
  };

  const handleDeleteMemberConfirm = async () => {
    if (!deletingMember) return;
    try {
      await deleteMember(deletingMember.id);
      toast.success(`"${deletingMember.name}" deleted.`);
      setDeletingMember(undefined);
    } catch {
      toast.error("Failed to delete member.");
    }
  };

  const handleExportFamily = () => {
    if (!family || !familyMembers) return;
    try {
      const exportData = {
        exportedAt: Date.now(),
        family,
        members: familyMembers,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${family.name.toLowerCase().replace(/\s+/g, "-")}-export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Family dashboard exported!");
    } catch {
      toast.error("Failed to export family.");
    }
  };

  const handleFocusSearch = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-dvh bg-background">
        <header className="sticky top-0 z-30 bg-background border-b border-border/40 px-4 py-3 flex items-center justify-between">
          <Skeleton className="h-7 w-32 rounded-xl" />
          <Skeleton className="h-7 w-20 rounded-xl" />
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
          <Skeleton className="h-12 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh text-center px-4">
        <Trees className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-bold text-foreground">Family Not Found</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-5">The family dashboard could not be loaded.</p>
        <Button variant="primary" onClick={() => router.push("/families")}>Go Back</Button>
      </div>
    );
  }

  const theme = getColorTheme(family.color);

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Header Bar */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex items-center justify-between gap-3 shadow-xs"
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push("/families")}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            aria-label="Go back to families list"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="leading-none min-w-0">
            <span className="text-base font-extrabold tracking-tight text-foreground truncate block">
              {family.name}
            </span>
            <span className="block text-[10px] text-muted-foreground font-semibold mt-0.5 truncate">
              {family.description ?? "Family Dashboard"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeSwitch />
          <Button variant="outline" size="sm" onClick={() => setShowEditFamily(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        </div>
      </motion.header>

      {/* Main Body */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-4xl mx-auto px-4 py-5 flex flex-col gap-6">

          {/* Banner Dashboard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "relative rounded-3xl bg-gradient-to-br text-white p-6 shadow-md overflow-hidden select-none",
              theme.gradient
            )}
          >
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-black/10 blur-md pointer-events-none" />

            <div className="relative flex flex-col gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/25 rounded-md px-2 py-0.5 select-none">
                  Family Dashboard
                </span>
                <h1 className="text-2xl font-extrabold tracking-tight leading-tight mt-2">{family.name}</h1>
                {family.description && <p className="text-xs text-white/80 leading-relaxed mt-1">{family.description}</p>}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="flex items-center gap-1 text-[11px] font-bold bg-white/15 rounded-full px-2.5 py-1">
                  <Clock className="h-3.5 w-3.5" />
                  Updated {new Date(family.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Statistics Grid */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Statistics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {[
                { label: "Total Members", value: stats.total, color: "text-blue-500 bg-blue-500/10" },
                { label: "Male Members", value: stats.male, color: "text-indigo-500 bg-indigo-500/10" },
                { label: "Female Members", value: stats.female, color: "text-pink-500 bg-pink-500/10" },
                { label: "Children (<18)", value: stats.children, color: "text-amber-500 bg-amber-500/10" },
                { label: "Alive Members", value: stats.alive, color: "text-emerald-500 bg-emerald-500/10" },
                { label: "Deceased", value: stats.deceased, color: "text-rose-500 bg-rose-500/10" },
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-2xl bg-card border border-border/50 flex flex-col justify-between shadow-xs">
                  <span className="text-[10px] font-semibold text-muted-foreground leading-none">{stat.label}</span>
                  <div className="flex items-baseline justify-between mt-2.5">
                    <span className="text-xl font-extrabold text-foreground leading-none">{stat.value}</span>
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md", stat.color)}>Stats</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions Panel */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button variant="secondary" onClick={handleOpenAddMember} className="justify-center gap-2 py-3.5 h-auto text-xs">
                <Plus className="h-4 w-4" /> Add Member
              </Button>
              <Button variant="secondary" onClick={() => router.push(`/tree?familyId=${family.id}`)} className="justify-center gap-2 py-3.5 h-auto text-xs">
                <GitFork className="h-4 w-4" /> Open Tree
              </Button>
              <Button variant="secondary" onClick={handleFocusSearch} className="justify-center gap-2 py-3.5 h-auto text-xs">
                <Search className="h-4 w-4" /> Search Member
              </Button>
              <Button variant="outline" onClick={handleExportFamily} className="justify-center gap-2 py-3.5 h-auto text-xs">
                <Download className="h-4 w-4" /> Export JSON
              </Button>
            </div>
          </motion.div>

          {/* Member List Section */}
          <div className="flex flex-col gap-4">
            {/* List Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/40 pt-5">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <h3 className="text-sm font-bold text-foreground">Family Members</h3>
                <Badge variant="primary">{processedMembers.length} listed</Badge>
              </div>

              {familyMembers.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-border/50 rounded-xl bg-card overflow-hidden">
                    <button
                      onClick={() => setIsListView(false)}
                      className={cn("p-2 transition-colors cursor-pointer", !isListView ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                      title="Grid View"
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsListView(true)}
                      className={cn("p-2 transition-colors cursor-pointer", isListView ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                      title="List View"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Empty State */}
            {familyMembers.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center py-16 px-4 border border-dashed border-border rounded-3xl bg-card/40"
              >
                <Trees className="h-16 w-16 text-muted-foreground/60 mb-4" />
                <h4 className="text-lg font-bold text-foreground">No Family Members Yet</h4>
                <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-xs">
                  Create profiles for your family members and map their relations. All data is kept private offline.
                </p>
                <Button variant="primary" size="md" onClick={handleOpenAddMember} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add First Member
                </Button>
              </motion.div>
            )}

            {familyMembers.length > 0 && (
              <>
                {/* Search / Filters Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card border border-border/50 rounded-3xl p-4 shadow-xs">
                  <div className="relative flex items-center sm:col-span-2">
                    <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search member details…"
                      className="flex h-11 w-full rounded-2xl border border-input bg-muted/20 pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
                    />
                    {query && (
                      <button onClick={() => setQuery("")} className="absolute right-3.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground cursor-pointer">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <Select label="Gender" value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} options={[
                    { value: "all", label: "All Genders" },
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                  ]} className="bg-muted/20" />

                  <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[
                    { value: "all", label: "All Status" },
                    { value: "alive", label: "Alive" },
                    { value: "deceased", label: "Deceased" },
                  ]} className="bg-muted/20" />
                </div>

                {/* Clear search warning */}
                {processedMembers.length === 0 && query && (
                  <div className="text-center py-12 flex flex-col items-center gap-3">
                    <p className="text-sm font-semibold text-foreground">No matches for &ldquo;{query}&rdquo;</p>
                    <Button variant="outline" size="sm" onClick={() => setQuery("")}>Reset Search</Button>
                  </div>
                )}

                {/* Cards List Grid */}
                {processedMembers.length > 0 && (
                  <motion.div
                    layout
                    className={cn(
                      "grid gap-4",
                      isListView
                        ? "grid-cols-1"
                        : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                    )}
                  >
                    <AnimatePresence mode="popLayout">
                      {processedMembers.map((m, idx) => (
                        <MemberCard
                          key={m.id}
                          member={m}
                          allMembers={allMembers ?? []}
                          isListView={isListView}
                          onView={handleOpenViewMember}
                          onEdit={handleOpenEditMember}
                          onDelete={setDeletingMember}
                          index={idx}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Navigation */}
      <BottomNavigation />

      {/* Dialogs */}
      <EditFamilyDialog key={showEditFamily ? `edit-family-${family.id}` : "edit-family-closed"} isOpen={showEditFamily} onClose={() => setShowEditFamily(false)} family={family} />
      <MemberFormDialog key={showMemberForm ? `member-form-${editingMember?.id ?? "new"}` : "member-form-closed"} isOpen={showMemberForm} onClose={() => setShowMemberForm(false)} editMember={editingMember} familyId={family.id} allMembers={familyMembers} />
      <MemberViewDialog isOpen={showMemberView} onClose={() => setShowMemberView(false)} member={viewingMember} allMembers={allMembers ?? []} />

      <ConfirmationDialog
        isOpen={Boolean(deletingMember)}
        onClose={() => setDeletingMember(undefined)}
        onConfirm={handleDeleteMemberConfirm}
        title="Delete Member?"
        description={
          deletingMember
            ? `Are you sure you want to delete "${deletingMember.name}" from the family database? This will clean up their relationship links in other profiles. This action cannot be undone.`
            : ""
        }
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
