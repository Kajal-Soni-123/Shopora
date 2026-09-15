'use client';

import React, { useState, useEffect } from 'react';
import { Flyout } from '@/components/common/Flyout';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Select } from '@/components/common/Select';
import { Checkbox } from '@/components/common/Checkbox';
import { buildCategoryHierarchyOptions } from '@/lib/categoryUtils';
import { Button } from '@/components/common/Button';
import { FolderPlus, Send, Mail, CheckCircle2, AlertCircle, Loader2, Plus, Trash2, ListFilter } from 'lucide-react';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
}

export interface RequestedCategoryField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string;
  required: boolean;
}

interface RequestCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSubmitted: () => void;
}

export function RequestCategoryModal({
  isOpen,
  onClose,
  onRequestSubmitted,
}: RequestCategoryModalProps) {
  const [categoryName, setCategoryName] = useState('');
  const [suggestedParentId, setSuggestedParentId] = useState('');
  const [reason, setReason] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [requestedFields, setRequestedFields] = useState<RequestedCategoryField[]>([]);

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategoryName('');
      setSuggestedParentId('');
      setReason('');
      setRequestedFields([]);
      setErrorMessage(null);
      setSuccessMessage(null);
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await fetch('/api/categories');
      if (res.ok) {
        const json = await res.json();
        const cats = json.data || json.categories || (Array.isArray(json) ? json : []);
        setCategories(cats);
      }
    } catch (err) {
      console.error('Error fetching categories for request modal:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleAddField = () => {
    setRequestedFields([
      ...requestedFields,
      {
        name: '',
        label: '',
        type: 'text',
        options: '',
        required: false,
      },
    ]);
  };

  const handleRemoveField = (index: number) => {
    setRequestedFields(requestedFields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof RequestedCategoryField, value: any) => {
    const updated = [...requestedFields];
    updated[index] = { ...updated[index], [key]: value };

    // Auto-generate name slug from label if empty or previously auto-generated
    if (key === 'label' && typeof value === 'string') {
      const slugified = value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '_');
      updated[index].name = slugified;
    }

    setRequestedFields(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setErrorMessage('Please enter the requested category name.');
      return;
    }

    // Process fields for payload
    const sanitizedFields = requestedFields
      .filter((f) => f.label.trim())
      .map((f) => ({
        name: f.name || f.label.toLowerCase().trim().replace(/\s+/g, '_'),
        label: f.label.trim(),
        type: f.type,
        options: f.type === 'select' && f.options ? f.options.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
        required: f.required,
      }));

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await fetch('/api/vendor/category-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName.trim(),
          suggestedParentId: suggestedParentId || null,
          reason: reason.trim() || null,
          fields: sanitizedFields,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit category request.');
      }

      setSuccessMessage('Category request submitted with custom fields! Super Admin has been notified.');
      setTimeout(() => {
        onRequestSubmitted();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while submitting your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Flyout
      isOpen={isOpen}
      onClose={onClose}
      title="Request New Product Category"
      subtitle="Suggest category hierarchy & dynamic product attributes"
      maxWidth="2xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="request-category-form"
            variant="primary"
            disabled={isSubmitting || !categoryName.trim() || !reason.trim()}
            leftIcon={
              isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )
            }
          >
            {isSubmitting ? 'Sending Request...' : 'Submit Category Request'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Header Alert Banner */}
        <div className="p-4 bg-indigo-50/80 border border-indigo-200/90 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 shadow-sm shadow-indigo-600/20">
            <Mail className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <h4 className="font-extrabold text-indigo-900">Direct Admin Notification & Specification Builder</h4>
            <p className="text-indigo-700/90 font-medium leading-relaxed">
              Submit a request for a new category and define the custom product specification fields (e.g., Size, Material, Warranty) required for items in this category.
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Success Notification */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        <form id="request-category-form" onSubmit={handleSubmit} className="space-y-5">
          {/* Category Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Requested Category Name *"
              placeholder="e.g. Ergonomic Office Chairs"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              disabled={isSubmitting}
              required
            />

            <Select
              label="Suggested Parent Category (Optional)"
              options={buildCategoryHierarchyOptions(categories)}
              value={suggestedParentId}
              onChange={(val: string) => setSuggestedParentId(val)}
              disabled={isSubmitting || loadingCategories}
            />
          </div>

          {/* Business Justification Textarea */}
          <Textarea
            label="Justification & Planned Products *"
            placeholder="Explain why you need this category and describe the items you plan to list..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            rows={3}
            required
          />

          {/* Dynamic Form Field Specifications Builder Section */}
          <div className="space-y-3 pt-3 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <ListFilter className="w-4 h-4 text-indigo-600" /> Suggested Category Form Fields
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Add dynamic specification fields vendors will fill when listing products under this category.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddField}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Field
              </button>
            </div>

            {requestedFields.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-medium">
                No custom fields added yet. Click <strong>+ Add Field</strong> above to suggest attributes like <em>Size, Material, Warranty, RAM</em>, etc.
              </div>
            ) : (
              <div className="space-y-4">
                {requestedFields.map((field, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative group"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                      <Input
                        label="Field Label *"
                        placeholder="e.g. Warranty Period"
                        value={field.label}
                        onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                        disabled={isSubmitting}
                      />

                      <Select
                        label="Input Type"
                        options={[
                          { value: 'text', label: 'Text (e.g. Material)' },
                          { value: 'number', label: 'Number (e.g. Weight kg)' },
                          { value: 'select', label: 'Dropdown Select (Multiple options)' },
                          { value: 'boolean', label: 'Yes / No Toggle' },
                        ]}
                        value={field.type}
                        onChange={(val) => handleFieldChange(idx, 'type', val as any)}
                        disabled={isSubmitting}
                      />

                      <div className="flex items-center justify-between gap-2 pt-6 sm:pt-6">
                        <Checkbox
                          label="Required Field"
                          checked={field.required}
                          onChange={(e) => handleFieldChange(idx, 'required', e.target.checked)}
                          disabled={isSubmitting}
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveField(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                          title="Remove Field"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {field.type === 'select' && (
                      <Input
                        label="Options (Comma Separated) *"
                        placeholder="e.g. 1 Year, 2 Years, 3 Years"
                        value={field.options || ''}
                        onChange={(e) => handleFieldChange(idx, 'options', e.target.value)}
                        disabled={isSubmitting}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>
    </Flyout>
  );
}
