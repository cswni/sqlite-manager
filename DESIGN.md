# Design System

## Visual Theme

Dense craft tool for SQLite — bright desk, cool ink, monospace data. System/light default. Restrained strategy: neutrals carry the UI; teal/moss accent only for selection and primary run.

Mood: TablePlus precision on a cool gray workbench — not a marketing site.

## Color

OKLCH tokens. Pure white background; brand lives in primary/accent, not the surface.

```css
:root {
  --bg: oklch(1 0 0);
  --surface: oklch(0.97 0.005 145);
  --surface-2: oklch(0.94 0.008 145);
  --border: oklch(0.88 0.01 145);
  --ink: oklch(0.22 0.02 145);
  --muted: oklch(0.5 0.015 145);
  --primary: oklch(0.48 0.11 155);
  --primary-fg: oklch(1 0 0);
  --accent: oklch(0.52 0.12 195);
  --accent-fg: oklch(1 0 0);
  --danger: oklch(0.5 0.16 25);
  --success: oklch(0.5 0.12 145);
  --warning: oklch(0.65 0.12 85);
  --selection: oklch(0.92 0.04 155);
  --focus: oklch(0.55 0.12 195);
}
```

## Typography

- UI: IBM Plex Sans, 12–13px chrome, 1.15 scale
- Data/SQL: IBM Plex Mono, 12–13px
- Fixed rem scale (no fluid headings in product chrome)

## Layout

Activity bar (40px) + schema tree (240px, resizable) + center tabs + bottom results (resizable). Dense row height ~24–28px. No decorative cards.

## Components

Shared button, input, tree, tab, grid, toolbar vocabulary. States: default, hover, focus-visible, active, disabled, loading, error. Empty states teach the next action.

## Motion

150–200ms state transitions only. No page-load choreography. Respect reduced motion.
