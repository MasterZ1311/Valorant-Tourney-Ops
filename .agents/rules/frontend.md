# Frontend Engineering Rules — VTO

### Architecture & Framework
- Framework: Next.js (App Router), React 18/19, TypeScript, Tailwind CSS, Lucide icons.
- UI Component System: shadcn/ui components with Radix primitives.
- Avoid large component trees in a single file; decompose into presentational widgets, cards, and state containers.
- Server vs Client Components: Default to Server Components (`RSC`) for data-heavy read displays (public display, read-only fixtures). Use Client Components (`"use client"`) only where interactive state, forms, or timers are required.

### Operational UX Requirements
- **Console / Desktop Admin**: Multi-pane layout, compact tables, quick status badges (`badge-variant` per status), instant search & filter inputs.
- **Mobile Volunteer**: Max viewport width 480px optimized, minimum touch target 48x48px, bold typography, instant action buttons (Call Teams, Mark Ready, Start, Pause, Submit Result).
- **Public TV/Display**: Read-only, large high-contrast fonts, clean dark background, no scrollbars needed if fitting in 1080p/4K, safe polling interval (5–10s).
- **Destructive Action Guards**:
  - Always mount a `<ConfirmDialog>` with explicit warnings before:
    - Finalizing tournament
    - Unlocking finalized tournament
    - Disqualifying a team
    - Forfeiting a match
    - Overriding a verified result
    - Deleting/re-seeding fixtures

### Error Handling & Feedback
- Show user-friendly toast notifications via `sonner` or `toast`.
- Form validation errors must appear directly under input fields with descriptive text.
- Network or server action errors must give concrete recovery advice.
