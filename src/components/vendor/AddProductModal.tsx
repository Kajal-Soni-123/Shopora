'use client';

import React, { useState, useEffect } from 'react';
import { Flyout } from '@/components/common/Flyout';
import { Button } from '@/components/common/Button';
import { Select, SelectOption } from '@/components/common/Select';
import { buildCategoryHierarchyOptions } from '@/lib/categoryUtils';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { ImageUploader } from '@/components/common/ImageUploader';
import { Package, DollarSign, Layers, Tag, Loader2, Sparkles, Sliders } from 'lucide-react';
export interface CategoryFieldSpec {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  required?: boolean;
  options?: string[];
}

interface CategoryWithFields {
  id: string;
  name: string;
  slug: string;
  fields?: CategoryFieldSpec[];
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
}) => {
  const [categories, setCategories] = useState<CategoryWithFields[]>([]);
  const [category, setCategory] = useState<string>('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState('');

  // Key-Value map for dynamic category fields
  const [attributes, setAttributes] = useState<Record<string, any>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Categories & Field Schemas from API
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setCategories(data.data);
          if (!category) {
            setCategory(data.data[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching categories for product modal:', err);
    }
  };

  const selectedCategoryObj = categories.find((c) => c.id === category);
  const currentFields: CategoryFieldSpec[] = selectedCategoryObj?.fields || [];

  const handleAttributeChange = (key: string, value: any) => {
    setAttributes((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !description || !price || !stock || !image) {
      setError('Please fill in all required standard product fields.');
      return;
    }

    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock, 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price.');
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setError('Please enter a valid inventory stock number.');
      return;
    }

    // Validate required custom fields
    for (const f of currentFields) {
      if (f.required && (!attributes[f.name] || String(attributes[f.name]).trim().length === 0)) {
        setError(`Custom field "${f.label}" is required for category ${selectedCategoryObj?.name}.`);
        return;
      }
    }

    try {
      setLoading(true);
      const res = await fetch('/api/vendor/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: priceNum,
          stock: stockNum,
          image,
          categoryId: category,
          attributes,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to publish product.');
      } else {
        setTitle('');
        setDescription('');
        setPrice('');
        setStock('');
        setImage('');
        setAttributes({});
        onProductCreated();
        onClose();
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'An error occurred while publishing product.');
    }
  };

  const categoryOptions: SelectOption[] = buildCategoryHierarchyOptions(categories, null);

  return (
    <Flyout
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Catalog Product"
      subtitle="Publish a new product with category specifications and inventory details"
      maxWidth="2xl"
      footer={
        <>
          <Button variant="outline" size="md" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="add-product-form"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Publishing...
              </span>
            ) : (
              'Publish Product'
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-semibold">
            {error}
          </div>
        )}

        <form id="add-product-form" onSubmit={handleSubmit} className="space-y-5">
          {/* CATEGORY SELECTOR */}
          <div className="space-y-1.5">
            <Select
              label="Select Target Product Category *"
              options={buildCategoryHierarchyOptions(categories)}
              value={category}
              onChange={(val) => {
                setCategory(val);
                setAttributes({});
              }}
            />
          </div>

          {/* Title */}
          <Input
            label="Product Title *"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Ergonomic Mesh High-Back Chair"
          />

          {/* Pricing & Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Retail Price ($) *"
              type="number"
              step="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="99.99"
              icon={<DollarSign className="w-4 h-4" />}
            />
            <Input
              label="Inventory Stock Quantity *"
              type="number"
              required
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="50"
              icon={<Layers className="w-4 h-4" />}
            />
          </div>

          {/* SUB-ORDER split alert */}
          {selectedCategoryObj && (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700">
                <Tag className="w-4 h-4 text-purple-600" />
                <span>Warehouse Sub-Order Partitioning</span>
              </div>
              <p className="text-[11px] text-purple-800 mt-1 font-medium">
                This item will be automatically categorized under{' '}
                <strong className="text-purple-900">{selectedCategoryObj.name}</strong> and split into your dedicated warehouse sub-orders upon customer checkout.
              </p>
            </div>
          )}

          {/* DYNAMIC CATEGORY CUSTOM FIELDS SECTION */}
          {currentFields.length > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" /> Category Specifications ({selectedCategoryObj?.name})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentFields.map((field) => {
                  const val = attributes[field.name] || '';

                  if (field.type === 'select' && field.options) {
                    const opts: SelectOption[] = field.options.map((o) => ({
                      value: o,
                      label: o,
                    }));
                    return (
                      <Select
                        key={field.name}
                        label={`${field.label}${field.required ? ' *' : ''}`}
                        options={opts}
                        value={val}
                        onChange={(v) => handleAttributeChange(field.name, v)}
                      />
                    );
                  }

                  if (field.type === 'textarea') {
                    return (
                      <div key={field.name} className="col-span-2">
                        <Textarea
                          label={`${field.label}${field.required ? ' *' : ''}`}
                          rows={2}
                          value={val}
                          onChange={(e) => handleAttributeChange(field.name, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      </div>
                    );
                  }

                  return (
                    <Input
                      key={field.name}
                      label={`${field.label}${field.required ? ' *' : ''}`}
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={val}
                      onChange={(e) => handleAttributeChange(field.name, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Drag & Drop Image Uploader */}
          <ImageUploader
            label="Product Image"
            value={image}
            onChange={(img) => setImage(img)}
          />

          {/* Description */}
          <Textarea
            label="Product Description *"
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe materials, technical features, and sizing..."
          />
        </form>
      </div>
    </Flyout>
  );
};
