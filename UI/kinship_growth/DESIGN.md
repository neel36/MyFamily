---
name: Kinship & Growth
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#404943'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#707973'
  outline-variant: '#bfc9c1'
  surface-tint: '#2c694e'
  primary: '#0f5238'
  on-primary: '#ffffff'
  primary-container: '#2d6a4f'
  on-primary-container: '#a8e7c5'
  inverse-primary: '#95d4b3'
  secondary: '#00696c'
  on-secondary: '#ffffff'
  secondary-container: '#8ff3f6'
  on-secondary-container: '#007073'
  tertiary: '#693d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#8a5200'
  on-tertiary-container: '#ffd1a5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b1f0ce'
  primary-fixed-dim: '#95d4b3'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#0e5138'
  secondary-fixed: '#8ff3f6'
  secondary-fixed-dim: '#72d6da'
  on-secondary-fixed: '#002021'
  on-secondary-fixed-variant: '#004f52'
  tertiary-fixed: '#ffdcbc'
  tertiary-fixed-dim: '#ffb86b'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#683d00'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1200px
  gutter: 16px
---

## Brand & Style
The design system is centered on the themes of **Growth, Connection, and Heritage**. It aims to evoke a sense of warmth and reliability, making the complex task of genealogy feel accessible and joyful. 

The aesthetic is a blend of **Modern Minimalism** and **Soft Tactility**. It prioritizes heavy whitespace to keep the family tree nodes legible, while using vibrant organic colors to represent different branches of lineage. The interface should feel like a well-organized digital scrapbook—clean and professional, yet deeply personal and inviting.

**Target Audience:** Multi-generational users, from tech-savvy teenagers documenting oral histories to seniors exploring their ancestry.
**Emotional Response:** Nurturing, clear, nostalgic, and optimistic.

## Colors
The palette is inspired by nature and stability. 
- **Primary (Sapling Green):** Represents growth and the core "living" elements of the tree. Used for main actions and active states.
- **Secondary (Heritage Blue):** Evokes stability and depth. Used for secondary navigation and to denote historical data or patriarchal/matriarchal anchors.
- **Tertiary (Warm Amber):** Used sparingly as an accent for "memories," notifications, or highlighting specific connections.
- **Neutral (Parchment & Slate):** Backgrounds use a very soft off-white to reduce eye strain, while text uses a deep slate rather than pure black to maintain a friendly tone.

**Functional Colors:**
- Success: #52B788 (Leaf Green)
- Info: #118AB2 (Sky Blue)
- Warning: #FFD166 (Sunlight)

## Typography
This design system utilizes **Plus Jakarta Sans** for its friendly, rounded terminals and exceptional legibility at all sizes. It strikes a balance between a modern geometric sans and a warm, approachable typeface.

- **Headlines:** Use Bold weights to create a clear hierarchy. Mobile headlines are slightly scaled down to ensure long family names do not wrap awkwardly.
- **Body Text:** Regular weight with generous line height (1.5x) to ensure life stories and bios are easy to read.
- **Labels:** Use uppercase for metadata (e.g., "BORN," "DIED") to distinguish from interactive content.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a mobile-first philosophy. 

- **Mobile:** Uses a single-column layout with 16px side margins. Family tree views utilize a pinch-to-zoom canvas.
- **Desktop:** Transitions to a 12-column grid. Sidebars for "Person Details" should occupy 4 columns (fixed at 320px-400px) while the main tree occupies the remaining 8.
- **Rhythm:** An 8px base unit ensures consistent vertical rhythm. Use `xl` spacing (40px) to separate major sections like "Immediate Family" from "Extended Relatives."

## Elevation & Depth
Hierarchy is established through **Tonal Layers** and **Ambient Shadows**. 

- **Surface Level (0):** The main canvas, using the neutral background color.
- **Card Level (1):** Individual family member nodes. These use white backgrounds with a very soft, diffused shadow (10% opacity, 8px blur, 4px Y-offset) to appear slightly lifted.
- **Overlay Level (2):** Modals, bottom sheets, and tooltips. These use a slightly more pronounced shadow and a 10px backdrop blur on the surface behind them to focus user attention.

Avoid harsh black shadows; use a tinted shadow (e.g., a dark desaturated green) to keep the "Growth" theme intact.

## Shapes
The shape language is consistently **Rounded**, reinforcing the friendly and safe nature of the application.

- **Nodes/Cards:** Use 16px (rounded-lg) to create a soft, approachable frame for profile photos.
- **Buttons:** Fully pill-shaped (rounded-xl) to invite interaction.
- **Input Fields:** 8px (standard roundedness) to maintain a sense of structure without feeling sharp.
- **Avatars:** Always circular to distinguish people from other UI elements like notes or media attachments.

## Components

- **Tree Nodes (Cards):** Small, rounded cards containing a circular avatar, name (Title-md), and years (Body-sm). Use a thin 1px border colored by "branch" (e.g., green for maternal, blue for paternal).
- **Primary Buttons:** Pill-shaped, using the Primary Green. Use "plus" icons for "Add Relative" actions to reinforce the growth metaphor.
- **Chips:** Used for "Tags" (e.g., "Military Service," "Immigrant"). These should have a light background tint of the primary/secondary colors and no border.
- **Lists:** Clean, separated by subtle dividers. Each list item should have a trailing chevron if it leads to a deeper profile view.
- **Input Fields:** Use floating labels to save space on mobile. The focus state should use a 2px Primary Green border.
- **Connection Lines:** Use smooth, curved paths (Bézier curves) rather than right-angled lines to connect family nodes, giving the tree a more organic, "growing" appearance.
- **Bottom Sheets (Mobile):** The primary way to view person details without losing context of the tree. Must have a visible "grabber" handle at the top.