# 08 — Component Design

Implementation status (2026-09-18, grilling converged): gallery v2 audit confirmed StatusGlyph and shell components aligned; gaps ticketed as S8 — in-app **ConfirmDialog** replacing all `window.confirm` call sites (15), button-style **Period/Date Picker** replacing input-based YearMonthPicker (9), and primitive form alignment (badge 4px-radius mono (4), alert action slots (32), button `text` variant (6), progress surface track + accent fill (5)). PageHeader crumb + bottom border (34) and accordion primitive (31) land with S7 (#122).

## Visual system
Recorded 2026-09-18 (#119, #115) as a spec-value -> app-token mapping; the app's HSL semantic tokens are authoritative and roles are equivalent even where names differ.

| Spec value | App token | Note |
| --- | --- | --- |
| Background `#090b0e` | `--background` (216 33% 5%) | Same dark-slate hue |
| Surface `#0b0e12` | `--card` | Role equivalent |
| Secondary surface `#10141a` | `--secondary` / `--muted` | Role equivalent |
| Tertiary surface `#151a21` | `--elevated` | Role equivalent |
| Border `#20262e` | `--border` | Same role |
| Strong border `#303844` | (no token) | Use `--border` + opacity if needed |
| Text `#f2f4f7` | `--foreground` (213 15% 91%) | Near-equivalent |
| Muted `#8b95a3` | `--muted-foreground` | Near-equivalent |
| Dim `#5f6977` | (no token) | Use `--muted-foreground` at reduced opacity |
| Primary accent `#5CC8C0` | `--primary` (neutral, near-white) | Deliberate deviation; teal primary is deferred to a separate design-system session |
| Positive `#5fd19a` | `--positive` | Same role |
| Warning `#e6b45f` | `--warning` | Same role |
| Negative `#e46d78` | `--negative` | Same role |
| Sans: Inter/system UI | `@fontsource-variable/inter` | Equivalent |
| Mono: JetBrains Mono/system monospace | `@fontsource-variable/jetbrains-mono` | Equivalent |

## Component inventory
1. Financial Number — full values, semantic change, mono numerics
2. Metric Group — grid + whitespace + dividers; no decorative card grid
3. Data Table — subtle dividers, 54px rows, numeric right alignment, clickable rows
4. Status/Badge — icon + text; semantic symbols
5. Section/Module/Card — sections have no border by default; modules/cards only for distinct boundaries
6. Button — primary accent, secondary border, tertiary text, radius 4
7. Input/Form Field — transparent/bordered, financial values mono/right-aligned
8. Select/Dropdown
9. Date/Period Picker
10. Modal/Dialog
11. Toast/Notification
12. Tooltip
13. Empty State
14. Loading/Skeleton — long jobs use terminal CLI-style progress
15. Confirmation/Destructive Action
16. Drawer/Detail Panel
17. Tabs
18. Filter Bar/Toolbar
19. Pagination
20. Search
21. Command Palette
22. Workflow Pipeline
23. Chart/Data Visualization
24. Bottom Sheet
25. Activity List/Activity Row
26. Avatar/User Menu
27. Household Switcher
28. Toggle/Switch
29. Checkbox
30. Radio
31. Accordion/Collapsible Section
32. Alert/Inline Message
33. Divider
34. Page Header
35. Page Toolbar/Action Group
36A. System Header
36B. Main Navigation — owned by Pixel Pet
37. Mobile Bottom Navigation/More Sheet — superseded by Pixel Pet main navigator (retired 2026-09-18, #119)
38. Icon System
39. Pixel Pet Navigator
40. Household Context/User Context
41. System Status
42. Household Switcher Detail
43. User Avatar/User Menu Detail
44. Search/Command Access (implemented 2026-09-18, #119: Quick Access palette via cmdk; header Search trigger; global Ctrl/Cmd+K)

## Key component rules
Financial Number: avoid unnecessary `.00`; use full values except narrow/chart contexts.
Data Table: all List→Detail rows clickable; no persistent row View/Edit buttons.
Status: color is semantic, not category decoration.
Workflow: exception-first; distinguish workflow progress from individual step progress.
Pixel Pet: fixed bottom-right; opens navigator; current page uses accent state (implemented #119). Pet reaction is data-driven from the latest financial period status at the Layout level: CLOSED -> happy, NEEDS_REVIEW -> alert, IN_PROGRESS -> nod, otherwise idle.

The component gallery HTML is the visual reference for these components.
