# Styling Guide

---

## Conditional Classes with `cn()`

Use `cn()` from `@/lib/utils` for all conditional class logic — never template literals.
```typescript
import { cn } from '@/lib/utils';

// Conditional classes
<div className={cn(
  "rounded font-medium transition-colors",
  {bg-blue-500 text-white : isActive },
  {opacity-50 cursor-not-allowed text-white : isDisabled },
  className
)} />

// Variant map (preferred over long ternary chains)
<Button variant={"primary"} className={cn(
  "px-4 py-2 rounded",
  className
)} />
```

**Always spread `className` prop last** — lets consumers override without `!important`.

---

## Shadcn UI Components

Components live in `@/components/...' Always use our custom component that wraps above shadcn primitives before reaching for raw HTML elements.

### Button
```typescript
import { Button } from '@/components/Button';

<Button variant="default">Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

### Dialog
```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/Dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>Make changes here.</DialogDescription>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>
```

### Form Inputs
```typescript
import { Input } from '@/components/Input/Input.tsx';
import { Label } from '@/components/Label/Label.tsx';
import { Textarea } from '@/components/Textarea/Textarea.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/Select/Select.tsx';

<div className="space-y-4">
  <div>
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="Email" />
  </div>

  <div>
    <Label>Role</Label>
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select a role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="viewer">Viewer</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

---

## Responsive Design

Use `clamp()` with `vw` units for fluid scaling — no breakpoints needed for sizing.

### Font Sizes
```typescript
// In className, use arbitrary values with clamp
Fluid Heading
Fluid Body
```

### Widths & Heights
```typescript
Fluid Width
Fluid Height
```

### Pattern
```
clamp(MIN, PREFERRED, MAX)
      │        │        │
      │        └─ vw value (scales with viewport)
      └─ smallest it can be        └─ largest it can be
```

**Common values:**
| Use | Example |
|-----|---------|
| Page heading | `clamp(1.5rem, 3vw, 2.5rem)` |
| Body text | `clamp(0.875rem, 1.5vw, 1rem)` |
| Card width | `clamp(280px, 40vw, 480px)` |
| Modal width | `clamp(320px, 60vw, 720px)` |
| Section height | `clamp(200px, 30vw, 500px)` |

Use breakpoint prefixes (`md:`, `lg:`) only for **layout changes** (grid columns, flex direction) — not for sizing.

---

## Customizing Shadcn Components

Pass `className` to override defaults — `cn()` inside Shadcn components ensures your classes win:
```typescript
<Button className="w-full">Full Width</Button>
<Input className="border-2 border-blue-500" />
```

For deeper customization, edit the component file directly in `@/components/common/`.