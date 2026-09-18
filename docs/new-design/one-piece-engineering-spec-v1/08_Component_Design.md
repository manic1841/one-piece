# 08 — Component Design

## Visual system
- Background `#090b0e`
- Surface `#0b0e12`
- Secondary surface `#10141a`
- Tertiary surface `#151a21`
- Border `#20262e`
- Strong border `#303844`
- Text `#f2f4f7`
- Muted `#8b95a3`
- Dim `#5f6977`
- Primary accent `#5CC8C0`
- Positive `#5fd19a`
- Warning `#e6b45f`
- Negative `#e46d78`
- Sans: Inter/system UI
- Mono: JetBrains Mono/system monospace

## Component inventory
1. Financial Number — full values, semantic change, mono numerics
2. Metric Group — grid + whitespace + dividers; no decorative card grid
3. Data Table — subtle dividers, 48px rows, numeric right alignment, clickable rows
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
37. Mobile Bottom Navigation/More Sheet — superseded by Pixel Pet main navigator
38. Icon System
39. Pixel Pet Navigator
40. Household Context/User Context
41. System Status
42. Household Switcher Detail
43. User Avatar/User Menu Detail
44. Search/Command Access

## Key component rules
Financial Number: avoid unnecessary `.00`; use full values except narrow/chart contexts.
Data Table: all List→Detail rows clickable; no persistent row View/Edit buttons.
Status: color is semantic, not category decoration.
Workflow: exception-first; distinguish workflow progress from individual step progress.
Pixel Pet: fixed bottom-right; opens navigator; current page uses accent state.

The component gallery HTML is the visual reference for these components.
