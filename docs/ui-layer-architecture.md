# UI Layer Architecture Guide

This project follows a strict separation of concerns using Domain-Driven Design (DDD) and Clean Architecture principles. The UI layer focuses solely on **presentation** and **interaction orchestration**. If you find business logic here, you've failed.

## 1. Directory Structure

The `src/ui` directory is organized by **Feature/Page** to reflect user workflows, not just data models.

```text
ui
├─ app/                # Global initialization (Router, Providers, Layout)
├─ features/           # Core UI logic organized by user workflow
│   └─ [feature-name]/
│       ├─ pages/      # Route entry points
│       ├─ components/ # Feature-specific UI components
│       ├─ hooks/      # Interaction orchestration (Application Services)
│       ├─ viewmodels/ # UI-specific data representations
│       └─ mappers/    # Domain -> ViewModel transformation
├─ components/         # Shared Design System components (Stateless, Pure)
├─ hooks/              # Shared UI utility hooks (useDebounce, etc.)
├─ state/              # UI Global State (Zustand/Context - Session/UI only)
├─ utils/              # Presentation helpers (Formatting, etc.)
└─ styles/             # Global themes and CSS
```

---

## 2. Frontend Layer Dependency Rules

Dependencies must flow **inwards**. The UI layer is the outermost shell.

1.  **UI -> Application (Hooks)**: UI components only talk to Hooks. Never call a Use Case or Repository directly from a component.
2.  **UI -> Domain (Types)**: UI can use Domain types for reference, but should prefer ViewModels for display.
3.  **UI -X-> Infrastructure**: The UI layer must never know about Firestore, API clients, or external storage details. 
4.  **Feature Isolation**: Features should be self-contained. Shared components belong in `src/ui/components`, not cross-referenced between features.

---

## 3. ViewModel Design Specification

ViewModels (VM) are the **Projected State** of the domain for a specific UI view. 

### Why?
- **Stability**: Domain models change. UI shouldn't break because a database field was renamed.
- **Performance**: Formatting dates and numbers in the render loop is stupid. Do it once in a mapper.
- **Context-Specific**: A "User" in a list view needs different data than a "User" in a profile edit form.

### Rules:
- **Flat & Lean**: Avoid deeply nested objects if the UI doesn't need them.
- **UI-Ready**: Boolean flags (e.g., `isDeletable`) and formatted strings (e.g., `createdAtText`) belong here.
- **Immutable**: VMs are data containers. No methods.

---

## 4. Hook Design Specification (Application Controllers)

In React, Hooks in the `features/hooks` folder act as **Application Controllers**. They bridge the gap between React's lifecycle and the pure logic of Use Cases.

### Responsibilities:
- **Orchestration**: Coordinate between multiple Use Cases if necessary.
- **State Management**: Managing `loading`, `error`, and local submission states.
- **Context Integration**: Injecting `AuthContext`, `QueryClient`, or local UI stores.

### Rules:
- **No Business Logic**: If you're calculating interest rates in a hook, you're doing it wrong. Move it to a Domain Service.
- **Return Intent**: Don't just return data; return actions (e.g., `onSave`, `onCancel`).
- **Atomic Operations**: Each hook should focus on a specific interaction flow.

---

## 5. Typical Data Flow

```text
Repository (Infra)
 ↓
Domain Entity (Domain)
 ↓
Use Case (Application)
 ↓
Feature Hook (Application Controller)
 ↓
Mapper (UI Conversion)
 ↓
ViewModel (UI State)
 ↓
React Component (Presentation)
```

## 6. Linus's Final Word on UI
Don't over-engineer with 50 levels of abstraction just because some blog post told you so. If a component is simple, keep it simple. But if you start leaking business logic into a "Button Click" handler, I will find you.
