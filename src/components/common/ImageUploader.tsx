'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, Image as ImageIcon, Link as LinkIcon, X, CheckCircle2 } from 'lucide-react';

interface ImageUploaderProps {
  label?: string;
  value: string;
  onChange: (imageUrl: string) => void;
  error?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label = 'Product Image',
  value,
  onChange,
  error,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        onChange(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700">{label} *</label>
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
        /* Preview Card */
        <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 flex-shrink-0">
              <Image src={value} alt="Preview" fill sizes="64px" className="object-cover" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Image Loaded
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
            title="Remove image"
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
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-indigo-600 bg-indigo-50/60 scale-[1.01]'
              : 'border-slate-200 hover:border-indigo-400 bg-slate-50/80 hover:bg-white'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
          <div className="p-3 bg-white border border-slate-200/80 rounded-2xl w-12 h-12 mx-auto flex items-center justify-center text-indigo-600 shadow-sm mb-2">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-800">
            Drag & drop your product image here, or <span className="text-indigo-600 underline">browse</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            Supports PNG, JPG, WEBP or GIF (High Resolution)
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

      {error && <p className="text-[11px] font-semibold text-rose-500">{error}</p>}
    </div>
  );
};
