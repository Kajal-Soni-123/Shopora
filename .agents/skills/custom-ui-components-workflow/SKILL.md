---
name: custom-ui-components-workflow
description: Standardized custom UI component pattern (Select, Input, Checkbox, Radio, Textarea, Button, Modal) for the Shopora web application. Use this skill whenever building form fields, dropdowns, inputs, or modals to maintain application theme visual consistency.
---

# Custom UI Components Workflow Skill

This skill defines the mandatory UI component patterns for form fields, inputs, dropdowns, buttons, and modals across the Shopora platform.

> [!IMPORTANT]
> **STRICT MANDATE: NEVER USE DEFAULT / RAW HTML FORM ELEMENTS.**
> - **DO NOT use native HTML `<select>`, `<input>`, `<textarea>`, `<input type="checkbox">`, `<input type="radio">`, or native `<button>`** elements in any user-facing components, pages, or modals across the application.
> - **ALWAYS use the custom themed components** located at `@/components/common/` (`<Select />`, `<Input />`, `<Textarea />`, `<Checkbox />`, `<Radio />`, `<Button />`).
> - Every form input must follow the Shopora Nordic Light design system using the components in `@/components/common/`.
>
> **STRICT MANDATE: MANDATORY SKELETON LOADING STATES DURING API FETCH.**
> - **ALWAYS render animated Skeleton loading components** (`<ProductCardSkeleton />`, `<OrderCardSkeleton />`, `<Skeleton />`) whenever API requests are pending.
> - **NEVER show "No items found", "No products found", or empty fallbacks** while data is still loading/pending. Empty state UI must ONLY render after the API request has completely resolved and returned 0 records.

---

## 🎨 Component Directory Reference

All custom form components are located at `@/components/common/`:

```
src/components/common/
├── Select.tsx        # Custom popover dropdown component with icons & path formatting
├── Input.tsx         # Custom styled text/number/email input with icon & error support
├── Textarea.tsx      # Custom styled multiline text input
├── Checkbox.tsx      # Custom checkbox with animated indigo check mark
├── Radio.tsx         # Custom radio button with indigo focus indicator
├── Button.tsx        # Custom button component (primary, secondary, danger, outline)
├── Modal.tsx         # Custom backdrop modal wrapper with smooth transition animations
└── ConfirmModal.tsx  # Standardized confirmation prompt dialog
```

---

## 🛠️ 1. `<Select />` Component

Custom styled dropdown with popover overlay menu, keyboard navigation, outside-click listener, icon support, and hierarchy path formatting (`Parent > Child`).

### Usage:
```tsx
import { Select } from '@/components/common/Select';

<Select
  label="Input Type"
  options={[
    { value: 'text', label: 'Text (e.g. Material)' },
    { value: 'number', label: 'Number (e.g. Weight kg)' },
    { value: 'select', label: 'Dropdown Select (Multiple options)' },
    { value: 'boolean', label: 'Yes / No Toggle' },
  ]}
  value={fieldType}
  onChange={(val: string) => setFieldType(val)}
  placeholder="Select field type..."
  error={fieldError}
  disabled={isSubmitting}
/>
```

---

## 🛠️ 2. `<Input />` Component

Custom styled single-line text/number input with optional leading icon, helper text, and error validation states.

### Usage:
```tsx
import { Input } from '@/components/common/Input';
import { Mail } from 'lucide-react';

<Input
  label="Email Address *"
  placeholder="vendor@shopora.com"
  icon={<Mail className="w-4 h-4" />}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={emailError}
  helperText="We will send order notifications to this email."
  disabled={isSubmitting}
  required
/>
```

---

## 🛠️ 3. `<Textarea />` Component

Custom styled multiline text area with rounded border, focus ring, and helper text support.

### Usage:
```tsx
import { Textarea } from '@/components/common/Textarea';

<Textarea
  label="Justification & Description *"
  placeholder="Describe the category requirements..."
  value={reason}
  onChange={(e) => setReason(e.target.value)}
  rows={3}
  disabled={isSubmitting}
  required
/>
```

---

## 🛠️ 4. `<Checkbox />` Component

Custom interactive checkbox with indigo accent color, smooth transition animations, and optional description text.

### Usage:
```tsx
import { Checkbox } from '@/components/common/Checkbox';

<Checkbox
  label="Required Specification Field"
  description="Vendors must specify this attribute when listing products."
  checked={isRequired}
  onChange={(e) => setIsRequired(e.target.checked)}
  disabled={isSubmitting}
/>
```

---

## 🛠️ 5. `<Radio />` Component

Custom radio option element with indigo border and white selection indicator.

### Usage:
```tsx
import { Radio } from '@/components/common/Radio';

<Radio
  label="Standard Delivery"
  description="Delivered in 3-5 business days"
  checked={shippingMethod === 'standard'}
  onChange={() => setShippingMethod('standard')}
/>
```

---

## 🛠️ 6. `<Flyout />` Component (Slide-Over Panel for Forms)

Slide-over full-height side panel component (`@/components/common/Flyout`) for all multi-field and complex form workflows.

> [!IMPORTANT]
> **MODAL VS. FLYOUT RULE**:
> - **DO NOT use center `<Modal />` for multi-field forms.** As form fields grow, center modals clip content and break UI layout on small/medium viewports.
> - **Use `<Flyout />` side panel for ALL form creation/editing dialogs** (category requests, product forms, offer builders, admin forms).
> - **Center `<Modal />` is ONLY permitted for**:
>   1. Confirmation dialogs (`<ConfirmModal />` / `<DeleteCategoryModal />`)
>   2. Product Quick View modal (`<ProductQuickViewModal />`)

### Usage:
```tsx
import { Flyout } from '@/components/common/Flyout';

<Flyout
  isOpen={isOpen}
  onClose={onClose}
  title="Request New Product Category"
  subtitle="Define category name and custom attributes"
  maxWidth="2xl"
>
  <form onSubmit={handleSubmit} className="space-y-6">
    {/* Form Inputs */}
  </form>
</Flyout>
```

---

## 🎯 Best Practices Checklist

1. **Import Path**: Always import form components from `@/components/common/<Component>`.
2. **Flyout for Forms**: Always use `<Flyout />` for form panels (category forms, product forms, offer forms, request forms). NEVER use `<Modal />` for complex forms.
3. **Modal Exception**: Center `<Modal />` is strictly reserved for `<ConfirmModal />` and `<ProductQuickViewModal />`.
4. **No Raw Selects**: Replace any `<select>` with `<Select options={...} value={...} onChange={...} />`.
5. **No Raw Inputs**: Replace `<input type="text">` or `<input type="number">` with `<Input />`.
6. **No Raw Checkboxes**: Replace `<input type="checkbox">` with `<Checkbox />`.
7. **No Native Alert/Confirm**: Always use `<ConfirmModal />` for delete/destructive prompt actions.
8. **Form Validation & Red Asterisks**:
   - Always set `noValidate` on `<form noValidate ...>` to prevent default HTML browser popups ("Please fill in this field").
   - Display mandatory field indicator asterisks (`*`) in **red** (`text-rose-500 font-extrabold`).
   - Display validation errors in **xs red text** directly below or beside the target field (`<p className="text-[11px] font-semibold text-rose-500 mt-1">{error}</p>`).

