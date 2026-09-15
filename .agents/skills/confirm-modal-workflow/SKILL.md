---
name: confirm-modal-workflow
description: Standardized confirmation modal pattern for all deletion and destructive user actions in the Shopora web application. Use this skill whenever implementing delete, archive, or status-change confirmation dialogs.
---

# ConfirmModal Workflow Skill

This skill defines the mandatory UI pattern for all confirmation prompts (e.g. item deletion, account cancellation, status override) across the Shopora platform.

> [!IMPORTANT]
> **NEVER use native browser `window.confirm()` or `window.alert()` dialogs.** Always use the standardized `<ConfirmModal />` component located at `@/components/common/ConfirmModal`.

---

## 🛠️ Component API Reference

Import `<ConfirmModal />` from `@/components/common/ConfirmModal`:

```tsx
import { ConfirmModal } from '@/components/common/ConfirmModal';
```

### Component Props:

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | **Required** | Controls visibility of the confirmation modal. |
| `onClose` | `() => void` | **Required** | Callback fired when the user closes or cancels the modal. |
| `onConfirm` | `() => Promise<void> \| void` | **Required** | Callback fired when the user confirms the action. |
| `title` | `string` | `'Confirm Action'` | Title text displayed in the header. |
| `itemName` | `string` | `undefined` | Contextual name of the target entity (e.g. `Category Request: "Furniture"`). |
| `description` | `React.ReactNode` | `undefined` | Detailed explanation of consequences or warnings. |
| `confirmText` | `string` | `'Confirm'` | Text for the primary action button. |
| `cancelText` | `string` | `'Cancel'` | Text for the cancel button. |
| `variant` | `'danger' \| 'warning' \| 'info'` | `'danger'` | Color theme for icon, header, and confirmation button. |
| `isLoading` | `boolean` | `false` | Shows spinner on the confirm button and disables controls. |
| `error` | `string \| null` | `null` | Displays error alert banner inside the modal if deletion fails. |

---

## 💡 Implementation Example

### 1. State Setup in Component
```tsx
const [itemToDelete, setItemToDelete] = useState<ItemType | null>(null);
const [deleting, setDeleting] = useState(false);
const [deleteError, setDeleteError] = useState<string | null>(null);

const handleConfirmDelete = async () => {
  if (!itemToDelete) return;
  try {
    setDeleting(true);
    setDeleteError(null);
    await onDeleteItem(itemToDelete.id);
    setItemToDelete(null); // Close modal on success
  } catch (err: any) {
    setDeleteError(err.message || 'Failed to delete item.');
  } finally {
    setDeleting(false);
  }
};
```

### 2. Trigger Action in Table / Card
```tsx
<button
  onClick={() => {
    setDeleteError(null);
    setItemToDelete(item);
  }}
  className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 font-bold text-xs hover:bg-rose-100"
>
  Delete
</button>
```

### 3. Render Modal Instance
```tsx
<ConfirmModal
  isOpen={!!itemToDelete}
  onClose={() => setItemToDelete(null)}
  onConfirm={handleConfirmDelete}
  title="Delete Item"
  itemName={itemToDelete ? `Item: "${itemToDelete.name}"` : undefined}
  description="Are you sure you want to delete this item? This action cannot be undone."
  confirmText="Delete Item"
  cancelText="Cancel"
  variant="danger"
  isLoading={deleting}
  error={deleteError}
/>
```

---

## 🎨 Variant Design Guidelines

1. **`danger` (Default for Deletions)**:
   - Rose theme (`bg-rose-50`, `text-rose-600`, `AlertTriangle` icon).
   - Use for permanent data deletion, account deletion, or removing resources.

2. **`warning` (Status Overrides & Destructive Edits)**:
   - Amber theme (`bg-amber-50`, `text-amber-600`).
   - Use when changing order status to Cancelled or overriding inventory.

3. **`info` (Promotions & Status Upgrades)**:
   - Indigo theme (`bg-indigo-50`, `text-indigo-600`).
   - Use for approving category requests or publishing live items.
