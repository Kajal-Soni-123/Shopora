'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, Image as ImageIcon, Link as LinkIcon, X, CheckCircle2, Plus } from 'lucide-react';

interface ImageUploaderProps {
  label?: string;
  value: string;
  onChange: (imageUrl: string) => void;
  images?: string[];
  onImagesChange?: (images: string[]) => void;
  error?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label = 'Product Image',
  value,
  onChange,
  images = [],
  onImagesChange,
  error,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [galleryUrlInput, setGalleryUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isGallery = false) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], isGallery);
    }
  };

  const processFile = (file: File, isGallery = false) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        const resultUrl = reader.result as string;
        if (isGallery && onImagesChange) {
          onImagesChange([...images, resultUrl]);
        } else {
          onChange(resultUrl);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddGalleryUrl = () => {
    if (galleryUrlInput.trim() && onImagesChange) {
      onImagesChange([...images, galleryUrlInput.trim()]);
      setGalleryUrlInput('');
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    if (onImagesChange) {
      onImagesChange(images.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Primary Image Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700">
            {label} <span className="text-rose-500 font-extrabold">*</span>
          </label>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                mode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Drag & Drop
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                mode === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Paste URL
            </button>
          </div>
        </div>

        {value ? (
          /* Main Cover Image Preview Card */
          <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 flex-shrink-0">
                <Image src={value} alt="Primary Preview" fill sizes="64px" className="object-cover" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Cover Image Loaded
                </span>
                <p className="text-[11px] text-slate-500 truncate max-w-xs">
                  {value.startsWith('data:') ? 'Local file uploaded' : value}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              title="Remove cover image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : mode === 'upload' ? (
          /* Drag and Drop Zone */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50/60 scale-[1.01]'
                : 'border-slate-200 hover:border-indigo-400 bg-slate-50/80 hover:bg-white'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileSelect(e, false)}
              accept="image/*"
              className="hidden"
            />
            <div className="p-2.5 bg-white border border-slate-200/80 rounded-2xl w-10 h-10 mx-auto flex items-center justify-center text-indigo-600 shadow-sm mb-2">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              Drag & drop primary product photo, or <span className="text-indigo-600 underline">browse</span>
            </p>
          </div>
        ) : (
          /* Image URL Input */
          <div className="relative">
            <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Multiple Additional Gallery Images Section */}
      {onImagesChange && (
        <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-indigo-600" /> Additional Gallery Images ({images.length})
            </span>
            <input
              type="file"
              ref={galleryFileInputRef}
              onChange={(e) => handleFileSelect(e, true)}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Add Gallery Image Inputs */}
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={galleryUrlInput}
              onChange={(e) => setGalleryUrlInput(e.target.value)}
              placeholder="Paste extra image URL..."
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <button
              type="button"
              onClick={handleAddGalleryUrl}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add URL
            </button>
            <button
              type="button"
              onClick={() => galleryFileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1"
            >
              <UploadCloud className="w-3.5 h-3.5 text-indigo-600" /> Upload File
            </button>
          </div>

          {/* Gallery Thumbnails List */}
          {images.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
              {images.map((img, idx) => (
                <div key={idx} className="relative group w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200">
                  <Image src={img} alt={`Gallery ${idx + 1}`} fill sizes="64px" className="object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveGalleryImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    title="Remove gallery image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[11px] font-semibold text-rose-500">{error}</p>}
    </div>
  );
};

