"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Users,
  X,
  Check,
  Filter,
  User,
  MapPin,
  Briefcase,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  Droplet,
  Upload,
  HeartCrack,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import { useMembers, useFamilies } from "@/hooks/use-database";
import { createMember, updateMember, deleteMember } from "@/database/crud";
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

type MemberSortKey = "name" | "age" | "createdAt";

// ======================================
// MEMBER VIEW DIALOG
// ======================================
interface MemberViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member?: Member;
  allMembers: Member[];
  families: Family[];
}

function MemberViewDialog({ isOpen, onClose, member, allMembers, families }: MemberViewDialogProps) {
  if (!member) return null;

  const ageData = calculateAge(member.dateOfBirth, member.dateOfDeath);
  const family = families.find((f) => f.id === member.familyId);

  // Relationships
  const father = allMembers.find((m) => m.id === member.fatherId);
  const mother = allMembers.find((m) => m.id === member.motherId);
  const spouse = allMembers.find((m) => m.id === member.spouseId);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Member Profile" className="max-w-xl">
      <div className="flex flex-col gap-6 pt-2">
        {/* Header Profile Info */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left border-b border-border/40 pb-4">
          <Avatar
            src={member.photo}
            alt={member.name}
            size="xl"
            className={cn(
              "ring-4 ring-offset-2 ring-offset-background",
              member.gender === "male"
                ? "ring-blue-500/30"
                : member.gender === "female"
                ? "ring-pink-500/30"
                : "ring-emerald-500/30"
            )}
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-extrabold text-foreground">{member.name}</h2>
              <Badge variant={member.alive ? "success" : "danger"}>
                {member.alive ? "Alive" : "Deceased"}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mt-1">
              {family ? `${family.name}` : "No family"}
            </p>

            {ageData && (
              <p className="text-xs font-semibold text-muted-foreground mt-1">
                Age: <span className="text-foreground">{ageData.formatted}</span>
              </p>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {/* Basic & Health */}
          <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-muted/30 border border-border/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Personal & Health
            </h3>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground/80 shrink-0" />
              <span>Gender: <strong className="capitalize">{member.gender}</strong></span>
            </div>

            {member.dateOfBirth && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground/80 shrink-0" />
                <span>Born: <strong>{member.dateOfBirth}</strong></span>
              </div>
            )}

            {!member.alive && member.dateOfDeath && (
              <div className="flex items-center gap-2">
                <HeartCrack className="h-4 w-4 text-destructive shrink-0" />
                <span>Died: <strong className="text-destructive">{member.dateOfDeath}</strong></span>
              </div>
            )}

            {member.bloodGroup && (
              <div className="flex items-center gap-2">
                <Droplet className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Blood Group: <strong className="text-rose-600 dark:text-rose-400">{member.bloodGroup}</strong></span>
              </div>
            )}
          </div>

          {/* Education & Career */}
          <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-muted/30 border border-border/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Education & Career
            </h3>

            {member.occupation && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground/80 shrink-0" />
                <span>Occupation: <strong>{member.occupation}</strong></span>
              </div>
            )}

            {member.education && (
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground/80 shrink-0" />
                <span>Education: <strong>{member.education}</strong></span>
              </div>
            )}

            {!member.occupation && !member.education && (
              <p className="text-xs text-muted-foreground italic py-2">
                No education or occupation info added.
              </p>
            )}
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-muted/30 border border-border/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Contact Info
            </h3>

            {member.mobile && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground/80 shrink-0" />
                <span>Mobile: <a href={`tel:${member.mobile}`} className="font-semibold text-primary hover:underline">{member.mobile}</a></span>
              </div>
            )}

            {member.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground/80 shrink-0" />
                <span className="truncate">Email: <a href={`mailto:${member.email}`} className="font-semibold text-primary hover:underline">{member.email}</a></span>
              </div>
            )}

            {!member.mobile && !member.email && (
              <p className="text-xs text-muted-foreground italic py-2">
                No contact information added.
              </p>
            )}
          </div>

          {/* Address */}
          <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-muted/30 border border-border/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Location / Address
            </h3>

            {(member.village || member.district || member.state || member.country) ? (
              <div className="flex gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground/80 mt-0.5 shrink-0" />
                <div className="flex flex-col gap-1 leading-snug">
                  {member.address && <p className="font-medium text-foreground">{member.address}</p>}
                  <p className="text-xs text-muted-foreground">
                    {[member.village, member.district, member.state, member.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">
                No address or location details added.
              </p>
            )}
          </div>
        </div>

        {/* Relationships */}
        <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-muted/30 border border-border/30">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Relationships
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Father", relation: father },
              { label: "Mother", relation: mother },
              { label: "Spouse", relation: spouse },
            ].map((rel) => (
              <div
                key={rel.label}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-card border border-border/40"
              >
                <Avatar
                  src={rel.relation?.photo}
                  alt={rel.relation?.name ?? "?"}
                  size="sm"
                />
                <div className="min-w-0 leading-none">
                  <span className="text-[10px] text-muted-foreground font-bold block uppercase tracking-wide">
                    {rel.label}
                  </span>
                  <span className="text-xs font-bold text-foreground truncate mt-0.5 block max-w-[100px]">
                    {rel.relation?.name ?? "Unknown"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {member.notes && (
          <div className="flex flex-col gap-2 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Notes
            </h3>
            <p className="text-amber-900 dark:text-amber-200 leading-relaxed italic">
              &ldquo;{member.notes}&rdquo;
            </p>
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
// MEMBER FORM DIALOG (Add / Edit)
// ======================================
interface MemberFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editMember?: Member;
  allMembers: Member[];
  families: Family[];
}

function MemberFormDialog({ isOpen, onClose, editMember, allMembers, families }: MemberFormDialogProps) {
  const isEdit = Boolean(editMember);

  // Form Fields
  const [familyId, setFamilyId] = React.useState("");
  const [name, setName] = React.useState("");
  const [gender, setGender] = React.useState<"male" | "female" | "other">("male");
  const [alive, setAlive] = React.useState(true);
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [dateOfDeath, setDateOfDeath] = React.useState("");
  const [bloodGroup, setBloodGroup] = React.useState("");
  const [occupation, setOccupation] = React.useState("");
  const [education, setEducation] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [village, setVillage] = React.useState("");
  const [district, setDistrict] = React.useState("");
  const [state, setState] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [photo, setPhoto] = React.useState<string | undefined>(undefined);

  // Relations
  const [fatherId, setFatherId] = React.useState("");
  const [motherId, setMotherId] = React.useState("");
  const [spouseId, setSpouseId] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [nameError, setNameError] = React.useState("");
  const nameRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameRef.current?.focus(), 150);
    }
  }, [isOpen]);

  React.useCallback(() => {
    if (editMember) {
      setFamilyId(editMember.familyId);
      setName(editMember.name);
      setGender(editMember.gender);
      setAlive(editMember.alive);
      setDateOfBirth(editMember.dateOfBirth ?? "");
      setDateOfDeath(editMember.dateOfDeath ?? "");
      setBloodGroup(editMember.bloodGroup ?? "");
      setOccupation(editMember.occupation ?? "");
      setEducation(editMember.education ?? "");
      setMobile(editMember.mobile ?? "");
      setEmail(editMember.email ?? "");
      setVillage(editMember.village ?? "");
      setDistrict(editMember.district ?? "");
      setState(editMember.state ?? "");
      setCountry(editMember.country ?? "");
      setAddress(editMember.address ?? "");
      setNotes(editMember.notes ?? "");
      setPhoto(editMember.photo);
      setFatherId(editMember.fatherId ?? "");
      setMotherId(editMember.motherId ?? "");
      setSpouseId(editMember.spouseId ?? "");
    } else {
      setFamilyId(families[0]?.id ?? "");
      setName("");
      setGender("male");
      setAlive(true);
      setDateOfBirth("");
      setDateOfDeath("");
      setBloodGroup("");
      setOccupation("");
      setEducation("");
      setMobile("");
      setEmail("");
      setVillage("");
      setDistrict("");
      setState("");
      setCountry("");
      setAddress("");
      setNotes("");
      setPhoto(undefined);
      setFatherId("");
      setMotherId("");
      setSpouseId("");
    }
    setNameError("");
  }, [editMember, families]);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Filter possible relations to only members in the selected family (excl. self)
  const potentialRelations = React.useMemo(() => {
    return allMembers.filter(
      (m) => m.familyId === familyId && (!editMember || m.id !== editMember.id)
    );
  }, [allMembers, familyId, editMember]);

  const fathersList = [
    { value: "", label: "Select Father" },
    ...potentialRelations
      .filter((m) => m.gender === "male")
      .map((m) => ({ value: m.id, label: m.name })),
  ];

  const mothersList = [
    { value: "", label: "Select Mother" },
    ...potentialRelations
      .filter((m) => m.gender === "female")
      .map((m) => ({ value: m.id, label: m.name })),
  ];

  const spousesList = [
    { value: "", label: "Select Spouse" },
    ...potentialRelations.map((m) => ({ value: m.id, label: m.name })),
  ];

  const familyOptions = families.map((f) => ({ value: f.id, label: f.name }));

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (limit to 1.5MB for IndexedDB efficiency)
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("Image size too large. Please select an image under 1.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Full name is required.");
      return;
    }
    if (!familyId) {
      toast.error("Please select a family.");
      return;
    }
    setLoading(true);

    const memberPayload = {
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
        await updateMember(editMember.id, memberPayload);
        toast.success(`"${name.trim()}" updated successfully!`);
      } else {
        const id = `member_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        await createMember({ id, ...memberPayload });
        toast.success(`"${name.trim()}" added to family!`);
      }
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to save member.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Member Details" : "Add New Member"}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 pt-1">
        {/* Step 1: Select Family */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Family"
            value={familyId}
            onChange={(e) => setFamilyId(e.target.value)}
            options={familyOptions}
            disabled={isEdit || families.length === 0}
            required
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground pl-1">
              Full Name <span className="text-destructive">*</span>
            </span>
            <Input
              ref={nameRef}
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              required
            />
            {nameError && <p className="text-xs text-destructive pl-1">{nameError}</p>}
          </div>
        </div>

        {/* Step 2: Avatar Upload & Basic Health */}
        <div className="flex flex-col sm:flex-row gap-5 p-4 rounded-2xl bg-muted/30 border border-border/30">
          {/* Photo upload swatcher */}
          <div className="flex flex-col items-center justify-center gap-3 shrink-0">
            <Avatar src={photo} alt={name || "Member Avatar"} size="xl" />
            <label className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none">
              <Upload className="h-3.5 w-3.5" />
              Upload Photo
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto(undefined)}
                className="text-[10px] text-destructive hover:underline cursor-pointer font-semibold"
              >
                Remove Photo
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <Select
              label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as Member["gender"])}
              options={GENDERS}
            />
            <Select
              label="Blood Group"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              options={BLOOD_GROUPS}
            />
            <div className="flex flex-col gap-1.5 justify-center pl-1">
              <span className="text-xs font-semibold text-muted-foreground">Status</span>
              <div className="flex items-center gap-6 h-11">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="radio"
                    checked={alive}
                    onChange={() => setAlive(true)}
                    className="h-4 w-4 text-primary focus:ring-primary border-border"
                  />
                  Alive
                </label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="radio"
                    checked={!alive}
                    onChange={() => setAlive(false)}
                    className="h-4 w-4 text-primary focus:ring-primary border-border"
                  />
                  Deceased
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground pl-1">Date of Birth</span>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
          {!alive && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground pl-1 text-destructive">
                Date of Death
              </span>
              <Input
                type="date"
                value={dateOfDeath}
                onChange={(e) => setDateOfDeath(e.target.value)}
                required={!alive}
              />
            </div>
          )}
        </div>

        {/* Step 4: Contact & Professional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground pl-1">Mobile</span>
            <Input
              type="tel"
              placeholder="e.g. +91 9876543210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground pl-1">Email</span>
            <Input
              type="email"
              placeholder="e.g. rahul@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground pl-1">Occupation</span>
            <Input
              placeholder="e.g. Software Engineer"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground pl-1">Education</span>
            <Input
              placeholder="e.g. B.Tech in CSE"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
            />
          </div>
        </div>

        {/* Step 5: Location / Address */}
        <div className="flex flex-col gap-4 p-4 rounded-2xl bg-muted/30 border border-border/30">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Location Details
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground">Village</span>
              <Input
                placeholder="Village"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="h-9 px-3 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground">District</span>
              <Input
                placeholder="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="h-9 px-3 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground">State</span>
              <Input
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="h-9 px-3 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground">Country</span>
              <Input
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-9 px-3 text-xs"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground">Full Address</span>
            <Input
              placeholder="House details, Street, Landmark"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        {/* Step 6: Relationship fields */}
        <div className="flex flex-col gap-4 p-4 rounded-2xl bg-muted/30 border border-border/30">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Connect Relationships (Within same family)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Father"
              value={fatherId}
              onChange={(e) => setFatherId(e.target.value)}
              options={fathersList}
              disabled={!familyId}
            />
            <Select
              label="Mother"
              value={motherId}
              onChange={(e) => setMotherId(e.target.value)}
              options={mothersList}
              disabled={!familyId}
            />
            <Select
              label="Spouse"
              value={spouseId}
              onChange={(e) => setSpouseId(e.target.value)}
              options={spousesList}
              disabled={!familyId}
            />
          </div>
        </div>

        {/* Step 7: Notes */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground pl-1">Notes</span>
          <Textarea
            placeholder="Special notes about this family member..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-1 border-t border-border/40">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!name.trim() || !familyId || loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {isEdit ? "Save Details" : "Add Member"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ======================================
// MEMBER CARD
// ======================================
interface MemberCardProps {
  member: Member;
  family?: Family;
  index: number;
  onView: (member: Member) => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}

function MemberCard({ member, family, index, onView, onEdit, onDelete }: MemberCardProps) {
  const ageData = calculateAge(member.dateOfBirth, member.dateOfDeath);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      layout
      className="flex flex-col rounded-3xl bg-card border border-border/50 shadow-xs hover:shadow-md hover:border-border transition-all duration-200 p-4 gap-4"
    >
      <div className="flex gap-3.5 items-start">
        {/* Avatar */}
        <Avatar
          src={member.photo}
          alt={member.name}
          size="lg"
          className={cn(
            "ring-2 ring-offset-2 ring-offset-background",
            member.gender === "male"
              ? "ring-blue-500/20"
              : member.gender === "female"
              ? "ring-pink-500/20"
              : "ring-emerald-500/20"
          )}
        />

        {/* Member Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-extrabold text-foreground text-sm truncate max-w-[130px] leading-tight">
              {member.name}
            </h4>
            <Badge variant={member.alive ? "success" : "danger"} className="px-1.5 py-0 text-[9px]">
              {member.alive ? "Alive" : "Deceased"}
            </Badge>
          </div>

          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 truncate">
            {family ? family.name : "No family"}
          </p>

          <div className="flex flex-col gap-0.5 mt-2">
            {ageData && (
              <span className="text-[10px] text-muted-foreground">
                Age: <strong className="text-foreground">{ageData.formatted}</strong>
              </span>
            )}
            {member.village && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {member.village}
              </span>
            )}
            {member.occupation && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                <Briefcase className="h-3 w-3 shrink-0" />
                {member.occupation}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/40 mt-auto">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onView(member)}
          className="flex-1 justify-center gap-1.5 text-xs h-9 rounded-xl"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </Button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onEdit(member)}
          className="flex items-center justify-center h-9 w-9 rounded-xl border border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          aria-label="Edit member"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onDelete(member)}
          className="flex items-center justify-center h-9 w-9 rounded-xl border border-destructive/20 bg-card hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
          aria-label="Delete member"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ======================================
// EMPTY STATE
// ======================================
function MembersEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center text-center py-16 px-4"
    >
      <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 text-primary mb-5">
        <Users className="h-9 w-9" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">No Members Added</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Get started by adding members to your family database. All relationships,
        photos, and details are kept fully private.
      </p>
      <Button variant="primary" size="md" onClick={onAdd} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add Your First Member
      </Button>
    </motion.div>
  );
}

// ======================================
// MAIN PAGE
// ======================================
export default function MembersPage() {
  const router = useRouter();
  const allMembers = useMembers();
  const families = useFamilies();

  // Search & Filter state
  const [query, setQuery] = React.useState("");
  const [selectedFamilyId, setSelectedFamilyId] = React.useState("all");
  const [selectedGender, setSelectedGender] = React.useState("all");
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [sortKey, setSortKey] = React.useState<MemberSortKey>("name");

  // Dialog states
  const [showForm, setShowForm] = React.useState(false);
  const [showView, setShowView] = React.useState(false);
  const [viewingMember, setViewingMember] = React.useState<Member | undefined>(undefined);
  const [editingMember, setEditingMember] = React.useState<Member | undefined>(undefined);
  const [deletingMember, setDeletingMember] = React.useState<Member | undefined>(undefined);

  const isLoading = allMembers === undefined || families === undefined;

  // Processed Members (Filter + Sort)
  const processed = React.useMemo(() => {
    if (!allMembers) return [];
    let list = [...allMembers];

    // 1. Text Search (Name, Village, Occupation)
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.village?.toLowerCase().includes(q) ||
          m.occupation?.toLowerCase().includes(q)
      );
    }

    // 2. Family Filter
    if (selectedFamilyId !== "all") {
      list = list.filter((m) => m.familyId === selectedFamilyId);
    }

    // 3. Gender Filter
    if (selectedGender !== "all") {
      list = list.filter((m) => m.gender === selectedGender);
    }

    // 4. Status (Alive / Deceased) Filter
    if (selectedStatus !== "all") {
      const wantAlive = selectedStatus === "alive";
      list = list.filter((m) => m.alive === wantAlive);
    }

    // 5. Sorting
    list.sort((a, b) => {
      if (sortKey === "createdAt") {
        return b.createdAt - a.createdAt;
      }
      if (sortKey === "age") {
        const ageA = calculateAge(a.dateOfBirth, a.dateOfDeath)?.age ?? -1;
        const ageB = calculateAge(b.dateOfBirth, b.dateOfDeath)?.age ?? -1;
        return ageB - ageA; // older first
      }
      // default: Name alphabetical
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [allMembers, query, selectedFamilyId, selectedGender, selectedStatus, sortKey]);

  // Handlers
  const handleOpenAdd = () => {
    if (families.length === 0) {
      toast.error("You need to create a Family first before adding members!");
      router.push("/families");
      return;
    }
    setEditingMember(undefined);
    setShowForm(true);
  };

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const handleOpenView = (member: Member) => {
    setViewingMember(member);
    setShowView(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMember) return;
    try {
      await deleteMember(deletingMember.id);
      toast.success(`"${deletingMember.name}" deleted successfully.`);
      setDeletingMember(undefined);
    } catch {
      toast.error("Failed to delete member. Try again.");
    }
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedFamilyId("all");
    setSelectedGender("all");
    setSelectedStatus("all");
    setSortKey("name");
  };

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Top App Bar */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-center gap-2.5 select-none">
          <div className="flex items-center justify-center h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm text-white">
            <Users className="h-5 w-5" />
          </div>
          <div className="leading-none">
            <span className="text-base font-extrabold tracking-tight text-foreground">
              Members
            </span>
            <span className="block text-[10px] text-muted-foreground font-medium">
              {allMembers?.length ?? 0} total saved
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <Button variant="primary" size="sm" onClick={handleOpenAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Member</span>
          </Button>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-4xl mx-auto px-4 py-5 flex flex-col gap-5">

          {/* Skeletons */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-3xl p-4 border border-border/40 flex flex-col gap-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 flex flex-col gap-2">
                      <Skeleton className="h-4 w-3/4 rounded-xl" />
                      <Skeleton className="h-3 w-1/2 rounded-xl" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && (
            <>
              {/* Filter Bar */}
              {allMembers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3 p-4 rounded-3xl bg-card border border-border/50 shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Search & Filter
                    </span>
                  </div>

                  {/* Text search & Family selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="relative flex items-center col-span-1 sm:col-span-2">
                      <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name, village, or occupation…"
                        className="flex h-11 w-full rounded-2xl border border-input bg-muted/20 pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
                      />
                      {query && (
                        <button
                          onClick={() => setQuery("")}
                          className="absolute right-3.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <Select
                      value={selectedFamilyId}
                      onChange={(e) => setSelectedFamilyId(e.target.value)}
                      options={[
                        { value: "all", label: "All Families" },
                        ...families.map((f) => ({ value: f.id, label: f.name })),
                      ]}
                      className="bg-muted/20"
                    />
                  </div>

                  {/* Gender, Status, Sort filters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Select
                      label="Gender"
                      value={selectedGender}
                      onChange={(e) => setSelectedGender(e.target.value)}
                      options={[
                        { value: "all", label: "All Genders" },
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                        { value: "other", label: "Other" },
                      ]}
                      className="h-10 text-xs bg-muted/20"
                    />
                    <Select
                      label="Status"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "alive", label: "Alive" },
                        { value: "deceased", label: "Deceased" },
                      ]}
                      className="h-10 text-xs bg-muted/20"
                    />
                    <Select
                      label="Sort By"
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as MemberSortKey)}
                      options={[
                        { value: "name", label: "Name (A-Z)" },
                        { value: "age", label: "Age (Oldest first)" },
                        { value: "createdAt", label: "Date Added" },
                      ]}
                      className="h-10 text-xs bg-muted/20"
                    />

                    {/* Clear Button */}
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="w-full text-xs h-10 gap-1.5 justify-center border-dashed"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reset
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Empty state — no members */}
              {allMembers.length === 0 && (
                <MembersEmptyState onAdd={handleOpenAdd} />
              )}

              {/* No search matches */}
              {allMembers.length > 0 && processed.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-16 text-center"
                >
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted text-muted-foreground">
                    <Search className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-foreground">No matches found</h3>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Try adjusting your filters, search term, or selection.
                  </p>
                  <Button variant="outline" size="sm" onClick={clearFilters} className="mt-1">
                    Clear Filters
                  </Button>
                </motion.div>
              )}

              {/* Members Grid */}
              {processed.length > 0 && (
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                >
                  <AnimatePresence mode="popLayout">
                    {processed.map((member, idx) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        family={families.find((f) => f.id === member.familyId)}
                        index={idx}
                        onView={handleOpenView}
                        onEdit={handleOpenEdit}
                        onDelete={setDeletingMember}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Total footer */}
              {allMembers.length > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-[10px] text-muted-foreground/60 mt-4"
                >
                  Showing {processed.length} of {allMembers.length} members
                </motion.p>
              )}
            </>
          )}
        </div>
      </main>

      {/* Navigation */}
      <BottomNavigation />

      {/* Form Dialog */}
      <MemberFormDialog
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingMember(undefined);
        }}
        editMember={editingMember}
        allMembers={allMembers ?? []}
        families={families ?? []}
      />

      {/* View Dialog */}
      <MemberViewDialog
        isOpen={showView}
        onClose={() => {
          setShowView(false);
          setViewingMember(undefined);
        }}
        member={viewingMember}
        allMembers={allMembers ?? []}
        families={families ?? []}
      />

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(deletingMember)}
        onClose={() => setDeletingMember(undefined)}
        onConfirm={handleDeleteConfirm}
        title="Delete Member?"
        description={
          deletingMember
            ? `Are you sure you want to delete "${deletingMember.name}"? This will clean up their spouse, father, and mother relationships from all other members. This cannot be undone.`
            : ""
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
