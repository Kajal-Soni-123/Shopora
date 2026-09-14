'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select, SelectOption } from '@/components/common/Select';
import { Checkbox } from '@/components/common/Checkbox';
import { ListPlus, Sparkles, Plus, Trash2, Loader2 } from 'lucide-react';

export interface CategoryFieldSpec {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  children?: {
    id: string;
    name: string;
    slug: string;
  }[];
  fields?: CategoryFieldSpec[];
  _count?: { products: number };
}

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCategory: AdminCategory | null;
  categories: AdminCategory[];
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingCategory,
  categories,
}) => {
  const [catName, setCatName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [customFields, setCustomFields] = useState<CategoryFieldSpec[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // New Field Temp State
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'select' | 'textarea'>('text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        setCatName(editingCategory.name);
        setSelectedParentId(editingCategory.parentId || '');
        setCustomFields(editingCategory.fields || []);
      } else {
        setCatName('');
        setSelectedParentId('');
        setCustomFields([]);
      }
      setModalError(null);
      setFieldLabel('');
      setFieldType('text');
      setFieldOptions('');
      setFieldRequired(false);
    }
  }, [isOpen, editingCategory]);

  const fieldTypeOptions: SelectOption[] = [
    { value: 'text', label: 'Single-line Text Input' },
    { value: 'number', label: 'Number Input' },
    { value: 'select', label: 'Dropdown Select Options' },
    { value: 'textarea', label: 'Multi-line Text Area' },
  ];

  const handleAddFieldSpec = () => {
    if (!fieldLabel.trim()) return;
    const nameKey = fieldLabel
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');

    const optionsArray =
      fieldType === 'select'
        ? fieldOptions
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    setCustomFields((prev) => [
      ...prev,
      {
        name: nameKey,
        label: fieldLabel.trim(),
        type: fieldType,
        options: optionsArray,
        required: fieldRequired,
      },
    ]);

    setFieldLabel('');
    setFieldOptions('');
    setFieldType('text');
    setFieldRequired(false);
  };

  const handleRemoveFieldSpec = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!catName.trim()) {
      setModalError('Category name is required.');
      return;
    }

    try {
      setModalLoading(true);
      const isEdit = !!editingCategory;
      const url = isEdit
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName.trim(),
          fields: customFields,
          parentId: selectedParentId || null,
        }),
      });

      const data = await res.json();
      setModalLoading(false);

      if (!res.ok || !data.success) {
        setModalError(data.error || 'Failed to save category.');
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setModalLoading(false);
      setModalError(err.message || 'An error occurred.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-md shadow-indigo-600/25">
            <ListPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {editingCategory ? 'Edit Category & Dynamic Fields' : 'Create Category & Dynamic Fields'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {editingCategory
                ? 'Modify category details and customize form inputs'
                : 'Define custom form inputs required for products in this category'}
            </p>
          </div>
        </div>

        {modalError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-semibold">
            {modalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Category Name *"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Footwear, Smart Audio, Technical Apparel"
            />

            <Select
              label="Parent Category (Optional)"
              options={[
                { value: '', label: '-- Top-Level Category (No Parent) --' },
                ...categories
                  .filter((c) => !editingCategory || c.id !== editingCategory.id)
                  .map((c) => ({
                    value: c.id,
                    label: c.name + (c.parent ? ` (Sub of ${c.parent.name})` : ''),
                  })),
              ]}
              value={selectedParentId}
              onChange={(val: any) => setSelectedParentId(val)}
            />
          </div>

          {/* Dynamic Field Builder Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Add Custom Product Attribute Field
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Field Label *"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                placeholder="e.g. Shoe Size (US), Battery Life"
              />

              <Select
                label="Input Field Type"
                options={fieldTypeOptions}
                value={fieldType}
                onChange={(val: any) => setFieldType(val)}
              />
            </div>

            {fieldType === 'select' && (
              <Input
                label="Dropdown Options (Comma separated) *"
                value={fieldOptions}
                onChange={(e) => setFieldOptions(e.target.value)}
                placeholder="e.g. US 7, US 8, US 9, US 10"
              />
            )}

            <div className="flex items-center justify-between pt-1">
              <Checkbox
                id="required_toggle"
                checked={fieldRequired}
                onChange={(e) => setFieldRequired(e.target.checked)}
                label="Mark this attribute field as Mandatory / Required for Vendors"
              />

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddFieldSpec}
                leftIcon={<Plus className="w-4 h-4" />}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
              >
                Add Field
              </Button>
            </div>
          </div>

          {/* Configured Fields Preview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700">
              Configured Custom Fields ({customFields.length}):
            </h4>

            {customFields.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No custom dynamic fields defined yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {customFields.map((field, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-slate-900">{field.label}</span>
                      <span className="text-[11px] text-indigo-600 font-mono ml-2">({field.type})</span>
                      {field.options && field.options.length > 0 && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Options: {field.options.join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFieldSpec(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Action */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button variant="ghost" size="md" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={modalLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
            >
              {modalLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingCategory ? (
                'Update Category & Fields'
              ) : (
                'Save Category & Fields'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
