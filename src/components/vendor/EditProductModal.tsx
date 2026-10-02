'use client';

import React, { useState, useEffect } from 'react';
import { Flyout } from '@/components/common/Flyout';
import { Button } from '@/components/common/Button';
import { Select, SelectOption } from '@/components/common/Select';
import { buildCategoryHierarchyOptions } from '@/lib/categoryUtils';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { ImageUploader } from '@/components/common/ImageUploader';
import { GlbModelUploader } from '@/components/tryon/GlbModelUploader';
import {
  DEFAULT_FITTING,
  parseFitting,
  supportsWristTryOn,
  TRY_ON_MODEL_REQUIRED_MESSAGE,
  type ModelFitting,
} from '@/lib/try-on/tryOnModel';
import { ColorPalettePicker } from '@/components/common/ColorPalettePicker';
import { DollarSign, Layers, Tag, Loader2, Sliders, Image as ImageIcon, Sparkles } from 'lucide-react';
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
  const [frontImage, setFrontImage] = useState('');
  const [backImage, setBackImage] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isTryOnAvailable, setIsTryOnAvailable] = useState<boolean>(false);
  const [model3dUrl, setModel3dUrl] = useState<string>('');
  const [model3dFitting, setModel3dFitting] = useState<ModelFitting>(DEFAULT_FITTING);
  const [tryOnCategory, setTryOnCategory] = useState<string>('');
  const [tryOnImage, setTryOnImage] = useState<string>('');

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

      const fImg = product.attributes?.frontImage || product.image || '';
      const bImg = product.attributes?.backImage || (product.images && product.images[0]) || '';
      const remainingGallery = (product.images || []).filter(
        (img: string) => img !== bImg && img !== fImg
      );

      setFrontImage(fImg);
      setBackImage(bImg);
      setGalleryImages(remainingGallery);
      setCategory(product.categoryId || product.category?.id || '');
      // Products saved before the 3D model requirement may be enabled without a model; show them as off.
      setIsTryOnAvailable(Boolean(product.isTryOnAvailable && product.model3dUrl));
      setModel3dUrl(product.model3dUrl || '');
      setModel3dFitting(parseFitting(product.model3dFitting));
      setTryOnCategory(product.tryOnCategory || '');
      setTryOnImage(product.tryOnImage || '');
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
    if (!frontImage.trim()) {
      newErrors.frontImage = 'Product front image is required.';
    }
    if (!backImage.trim()) {
      newErrors.backImage = 'Product back image is required.';
    }
    if (isTryOnAvailable && !model3dUrl) {
      newErrors.model3dUrl = TRY_ON_MODEL_REQUIRED_MESSAGE;
    }
    // Otherwise try-on would be saved as enabled but never shown to customers.
    if (isTryOnAvailable && !supportsWristTryOn({ tryOnCategory, title, category: selectedCategoryObj })) {
      newErrors.tryOnCategory =
        'Try On Yourself currently works for watches and bracelets. Set the Try-On Category to Watches or Bracelets.';
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
      const combinedImages = Array.from(
        new Set([backImage, ...galleryImages].filter((url) => typeof url === 'string' && url.trim().length > 0))
      );

      const res = await fetch(`/api/vendor/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: priceNum,
          stock: stockNum,
          frontImage,
          backImage,
          image: frontImage,
          images: combinedImages,
          categoryId: category,
          isTryOnAvailable,
          model3dUrl: model3dUrl || null,
          model3dFitting: model3dUrl ? model3dFitting : null,
          tryOnCategory: tryOnCategory || null,
          tryOnImage: tryOnImage ? tryOnImage.trim() : frontImage,
          attributes: {
            ...attributes,
            frontImage,
            backImage,
          },
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

          {/* Product Front & Back Images (Both Compulsory/Required) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-indigo-600" /> Mandatory Product Views (Front & Back)
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Please upload clear photos for both the front side and back side of the product.
            </p>

            <div className="flex flex-col gap-4">
              <ImageUploader
                label="Product Front Image"
                required={true}
                value={frontImage}
                error={fieldErrors.frontImage}
                onChange={(img) => {
                  setFrontImage(img);
                  if (fieldErrors.frontImage) {
                    setFieldErrors((prev) => ({ ...prev, frontImage: '' }));
                  }
                }}
              />
              <ImageUploader
                label="Product Back Image"
                required={true}
                value={backImage}
                error={fieldErrors.backImage}
                onChange={(img) => {
                  setBackImage(img);
                  if (fieldErrors.backImage) {
                    setFieldErrors((prev) => ({ ...prev, backImage: '' }));
                  }
                }}
              />
            </div>
          </div>

          {/* VIRTUAL TRY-ON CONFIGURATION BLOCK */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/30 border border-indigo-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Try On Yourself (3D)
                </h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTryOnAvailable}
                  onChange={(e) => {
                    setIsTryOnAvailable(e.target.checked);
                    if (!e.target.checked && fieldErrors.model3dUrl) {
                      setFieldErrors((prev) => ({ ...prev, model3dUrl: '' }));
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-2 text-xs font-bold text-slate-700">
                  {isTryOnAvailable ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            <p className="text-[11px] text-slate-600 font-medium">
              Customers upload a photo of their wrist and see this product on it, rendered from your 3D model. They
              only see your normal product photos; the 3D model is used in the background.
            </p>

            <GlbModelUploader
              label="Product 3D Model (.glb)"
              required={isTryOnAvailable}
              value={model3dUrl}
              fitting={model3dFitting}
              onFittingChange={setModel3dFitting}
              error={fieldErrors.model3dUrl}
              onChange={(url) => {
                setModel3dUrl(url);
                if (fieldErrors.model3dUrl) {
                  setFieldErrors((prev) => ({ ...prev, model3dUrl: '' }));
                }
              }}
            />
            <p className="text-[11px] text-slate-500">
              Get a .glb from your manufacturer&apos;s CAD files, a phone 3D scan (Polycam, KIRI Engine) or a 3D artist.
              {model3dUrl && !isTryOnAvailable && (
                <span className="font-semibold text-indigo-700"> Switch Try On Yourself on to show it to customers.</span>
              )}
            </p>

            {isTryOnAvailable && (
              <div className="space-y-4 pt-1">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Try-On Category Override"
                    options={[
                      { label: 'Auto Detect (Recommended)', value: '' },
                      { label: 'Tops / Shirts / T-Shirts', value: 'TOP' },
                      { label: 'Bottoms / Jeans / Skirts / Pants', value: 'BOTTOM' },
                      { label: 'Dresses / One-Piece / Sarees', value: 'DRESS' },
                      { label: 'Outerwear / Jackets / Coats', value: 'OUTERWEAR' },
                      { label: 'Full Outfits / Suits', value: 'FULL_OUTFIT' },
                      { label: 'Necklaces / Pendants', value: 'NECKLACE' },
                      { label: 'Earrings', value: 'EARRINGS' },
                      { label: 'Rings', value: 'RING' },
                      { label: 'Bracelets / Bangles', value: 'BRACELET' },
                      { label: 'Watches', value: 'WATCH' },
                      { label: 'Glasses / Sunglasses', value: 'EYEWEAR' },
                      { label: 'Hats / Caps', value: 'HAT' },
                      { label: 'Bags', value: 'BAG' },
                      { label: 'Footwear', value: 'FOOTWEAR' },
                    ]}
                    value={tryOnCategory}
                    error={fieldErrors.tryOnCategory}
                    onChange={(val) => {
                      setTryOnCategory(val);
                      if (fieldErrors.tryOnCategory) {
                        setFieldErrors((prev) => ({ ...prev, tryOnCategory: '' }));
                      }
                    }}
                  />
                  <div className="text-[11px] text-slate-600 flex items-center p-2.5 rounded-xl bg-white/80 border border-slate-200/60 font-medium">
                    The category decides where the model is placed on the customer: wrist, finger, ears, neck or face.
                  </div>
                </div>

                <ImageUploader
                  label="Dedicated Clean Try-On Product Photo (Optional)"
                  required={false}
                  value={tryOnImage}
                  onChange={(img) => setTryOnImage(img)}
                />
                <p className="text-[11px] text-slate-500">
                  If left empty, the front product image will automatically be used as the AI Virtual Try-On garment reference.
                </p>
              </div>
            )}
          </div>

          {/* Optional Additional Gallery Images */}
          <ImageUploader
            label="Additional Gallery Photos (Optional)"
            required={false}
            value=""
            onChange={() => {}}
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
