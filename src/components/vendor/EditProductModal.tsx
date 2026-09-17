'use client';

import React, { useState, useEffect } from 'react';
import { Flyout } from '@/components/common/Flyout';
import { Button } from '@/components/common/Button';
import { Select, SelectOption } from '@/components/common/Select';
import { buildCategoryHierarchyOptions } from '@/lib/categoryUtils';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { ImageUploader } from '@/components/common/ImageUploader';
import { ColorPalettePicker } from '@/components/common/ColorPalettePicker';
import { DollarSign, Layers, Tag, Loader2, Sliders } from 'lucide-react';
import { VendorProduct } from '@/components/vendor/VendorProductsSection';

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

interface EditProductModalProps {
  isOpen: boolean;
  product: VendorProduct | null;
  onClose: () => void;
  onProductUpdated: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  product,
  onClose,
  onProductUpdated,
}) => {
  const [categories, setCategories] = useState<CategoryWithFields[]>([]);
  const [category, setCategory] = useState<string>('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // Key-Value map for dynamic category fields
  const [attributes, setAttributes] = useState<Record<string, any>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch Categories from API on mount/open
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Pre-fill state whenever target product changes
  useEffect(() => {
    if (product && isOpen) {
      setTitle(product.title || '');
      setDescription(product.description || '');
      setPrice(product.price ? String(product.price) : '');
      setStock(product.stock !== undefined ? String(product.stock) : '');
      setImage(product.image || '');
      setGalleryImages(product.images || []);
      setCategory(product.categoryId || product.category?.id || '');
      setAttributes(product.attributes || {});
      setError(null);
      setFieldErrors({});
    }
  }, [product, isOpen]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching categories for edit product modal:', err);
    }
  };

  const selectedCategoryObj = categories.find((c) => c.id === category);
  const currentFields: CategoryFieldSpec[] = selectedCategoryObj?.fields || [];

  const handleAttributeChange = (key: string, value: any) => {
    setAttributes((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (fieldErrors['attr_' + key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next['attr_' + key];
        return next;
      });
    }
  };

  const toggleMultiSelectOption = (key: string, optionValue: string) => {
    setAttributes((prev) => {
      const current = prev[key];
      let currentArr: string[] = [];
      if (Array.isArray(current)) {
        currentArr = [...current];
      } else if (typeof current === 'string' && current.trim().length > 0) {
        currentArr = current.split(',').map((s) => s.trim()).filter(Boolean);
      }

      if (currentArr.includes(optionValue)) {
        currentArr = currentArr.filter((val) => val !== optionValue);
      } else {
        currentArr.push(optionValue);
      }

      return {
        ...prev,
        [key]: currentArr,
      };
    });
    if (fieldErrors['attr_' + key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next['attr_' + key];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setError(null);
    setFieldErrors({});

    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Product title is required.';
    if (!description.trim()) newErrors.main_description = 'Product description is required.';

    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock, 10);

    if (!price || isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = 'Please enter a valid positive price.';
    }
    if (!stock || isNaN(stockNum) || stockNum < 0) {
      newErrors.stock = 'Please enter a valid non-negative stock quantity.';
    }
    if (!image) {
      newErrors.image = 'Product cover image is required.';
    }

    // Validate required custom category fields
    for (const f of currentFields) {
      const val = attributes[f.name];
      const hasValue = Array.isArray(val)
        ? val.length > 0
        : val !== undefined && val !== null && String(val).trim().length > 0;
      if (f.required && !hasValue) {
        newErrors['attr_' + f.name] = `${f.label} is required.`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setError('Please complete all required fields highlighted below.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/vendor/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: priceNum,
          stock: stockNum,
          image,
          images: galleryImages,
          categoryId: category,
          attributes,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to update product.');
      } else {
        onProductUpdated();
        onClose();
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'An error occurred while updating product.');
    }
  };

  return (
    <Flyout
      isOpen={isOpen && !!product}
      onClose={onClose}
      title={`Edit Product: "${product?.title || ''}"`}
      subtitle="Update product pricing, inventory stock, images, and category specifications"
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
            form="edit-product-form"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
              </span>
            ) : (
              'Save Product Changes'
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

        <form id="edit-product-form" noValidate onSubmit={handleSubmit} className="space-y-5">
          {/* CATEGORY SELECTOR */}
          <div className="space-y-1.5">
            <Select
              label="Product Category *"
              options={buildCategoryHierarchyOptions(categories)}
              value={category}
              onChange={(val) => {
                setCategory(val);
                setAttributes({});
                setFieldErrors({});
              }}
            />
          </div>

          {/* Title */}
          <Input
            label="Product Title *"
            value={title}
            error={fieldErrors.title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (fieldErrors.title) {
                setFieldErrors((prev) => ({ ...prev, title: '' }));
              }
            }}
            placeholder="e.g. Ergonomic Mesh High-Back Chair"
          />

          {/* Pricing & Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Retail Price ($) *"
              type="number"
              step="0.01"
              value={price}
              error={fieldErrors.price}
              onChange={(e) => {
                setPrice(e.target.value);
                if (fieldErrors.price) {
                  setFieldErrors((prev) => ({ ...prev, price: '' }));
                }
              }}
              placeholder="99.99"
              icon={<DollarSign className="w-4 h-4" />}
            />
            <Input
              label="Inventory Stock Quantity *"
              type="number"
              value={stock}
              error={fieldErrors.stock}
              onChange={(e) => {
                setStock(e.target.value);
                if (fieldErrors.stock) {
                  setFieldErrors((prev) => ({ ...prev, stock: '' }));
                }
              }}
              placeholder="50"
              icon={<Layers className="w-4 h-4" />}
            />
          </div>

          {/* DYNAMIC CATEGORY CUSTOM FIELDS SECTION */}
          {currentFields.length > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
              <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" /> Category Specifications ({selectedCategoryObj?.name})
              </h3>

              <div className="space-y-4">
                {currentFields.map((field) => {
                  const val = attributes[field.name];
                  const fieldErr = fieldErrors['attr_' + field.name];

                  const isColorField =
                    field.name.toLowerCase().includes('color') || field.label.toLowerCase().includes('color');

                  const currentSelectedArr = Array.isArray(val)
                    ? val
                    : typeof val === 'string' && val
                    ? val.split(',').map((s) => s.trim()).filter(Boolean)
                    : [];

                  if (isColorField) {
                    return (
                      <ColorPalettePicker
                        key={field.name}
                        label={field.label}
                        required={field.required}
                        selectedColors={currentSelectedArr}
                        onChange={(newColors) => handleAttributeChange(field.name, newColors)}
                        error={fieldErr}
                      />
                    );
                  }

                  if (field.type === 'select' && field.options && field.options.length > 0) {
                    const allOptions = Array.from(new Set([...field.options, ...currentSelectedArr]));

                    return (
                      <div key={field.name} className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200/80">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {field.label} {field.required && <span className="text-rose-500 font-extrabold">*</span>}
                          </label>
                          <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            Multi-Select ({currentSelectedArr.length} selected)
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {allOptions.map((opt) => {
                            const isSelected = currentSelectedArr.includes(opt);
                            return (
                              <button
                                type="button"
                                key={opt}
                                onClick={() => toggleMultiSelectOption(field.name, opt)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30 scale-105'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {isSelected ? `✓ ${opt}` : opt}
                              </button>
                            );
                          })}
                        </div>
                        {fieldErr && <p className="text-[11px] font-semibold text-rose-500 mt-1">{fieldErr}</p>}
                      </div>
                    );
                  }

                  if (field.type === 'textarea') {
                    return (
                      <div key={field.name}>
                        <Textarea
                          label={`${field.label}${field.required ? ' *' : ''}`}
                          rows={2}
                          value={val || ''}
                          error={fieldErr}
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
                      value={val || ''}
                      error={fieldErr}
                      onChange={(e) => handleAttributeChange(field.name, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Drag & Drop Image Uploader + Gallery */}
          <ImageUploader
            label="Product Cover Image"
            value={image}
            error={fieldErrors.image}
            onChange={(img) => {
              setImage(img);
              if (fieldErrors.image) {
                setFieldErrors((prev) => ({ ...prev, image: '' }));
              }
            }}
            images={galleryImages}
            onImagesChange={(imgs) => setGalleryImages(imgs)}
          />

          {/* Description */}
          <Textarea
            label="Product Description *"
            rows={3}
            value={description}
            error={fieldErrors.main_description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (fieldErrors.main_description) {
                setFieldErrors((prev) => ({ ...prev, main_description: '' }));
              }
            }}
            placeholder="Describe materials, technical features, and sizing..."
          />
        </form>
      </div>
    </Flyout>
  );
};
