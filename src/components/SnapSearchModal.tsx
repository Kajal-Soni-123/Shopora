"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  Upload,
  X,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  Tag,
  ShoppingBag,
  Star,
  Zap,
  Image as ImageIcon,
  AlertCircle,
  Maximize2,
} from "lucide-react";

interface ProductResult {
  id: string;
  title: string;
  price: number;
  rating: number;
  image: string;
  matchConfidence?: number;
  matchedFeatures?: string[];
  category?: { name: string };
}

interface VisualSearchResultData {
  detectedCategory: string;
  detectedTags: string[];
  suggestedTitle: string;
  colors: string[];
  materials: string[];
  confidence: number;
  analysisMethod: string;
  products: ProductResult[];
  totalFound: number;
}

interface SnapSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_PRESETS = [
  {
    id: "sample-watch",
    label: "Rose Gold Watch",
    category: "Watches",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "sample-sneakers",
    label: "Athletic Sneakers",
    category: "Shoes",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "sample-apparel",
    label: "Designer Top",
    category: "Apparel",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "sample-furniture",
    label: "Living Room Chair",
    category: "Furniture",
    image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&auto=format&fit=crop&q=80",
  },
];

export function SnapSearchModal({ isOpen, onClose }: SnapSearchModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "camera" | "presets">("upload");

  useEffect(() => {
    setMounted(true);
  }, []);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepText, setScanStepText] = useState("Initializing Vision AI...");
  const [result, setResult] = useState<VisualSearchResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle body scroll lock & esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle camera activation
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen && activeTab === "camera") {
      setCameraError(null);
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: "environment" } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
            setIsCameraActive(true);
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          setCameraError("Camera access denied or unequipped. Please use file upload or sample presets.");
          setIsCameraActive(false);
        });
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, activeTab]);

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleCaptureCameraPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setSelectedImage(dataUrl);
      stopCameraStream();
      triggerVisualSearch(dataUrl);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (JPEG, PNG, WEBP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      triggerVisualSearch(base64);
    };
    reader.readAsDataURL(file);
  };

  const handlePresetSelect = (preset: typeof SAMPLE_PRESETS[0]) => {
    setSelectedImage(preset.image);
    triggerVisualSearch(preset.image, preset.category);
  };

  const triggerVisualSearch = async (imageData: string, hintCategory?: string) => {
    setIsScanning(true);
    setErrorMessage(null);
    setResult(null);

    // Animated scanning progress simulation
    setScanStepText("Analyzing visual contours & textures...");
    const t1 = setTimeout(() => setScanStepText("Identifying colors, materials & patterns..."), 600);
    const t2 = setTimeout(() => setScanStepText("Matching against Shopora catalog..."), 1200);

    try {
      const response = await fetch("/api/search/visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, hintCategory }),
      });

      const resData = await response.json();

      clearTimeout(t1);
      clearTimeout(t2);

      if (resData.success) {
        setResult(resData.data);
      } else {
        setErrorMessage(resData.error || "Failed to process visual search.");
      }
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      setErrorMessage("Network error occurred while performing visual search.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setResult(null);
    setErrorMessage(null);
    setIsScanning(false);
    if (activeTab === "camera") {
      setActiveTab("upload");
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-4 sm:p-6 backdrop-blur-md transition-opacity animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Snap-to-Product Search
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  AI Visual
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Search Shopora catalog using any product photo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close modal"
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Close Search Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Mode Tabs (shown when no image is selected yet) */}
          {!selectedImage && (
            <>
              <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 max-w-md mx-auto border border-slate-200/50 dark:border-slate-700/50">
                <button
                  onClick={() => setActiveTab("upload")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "upload"
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Photo
                </button>
                <button
                  onClick={() => setActiveTab("camera")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "camera"
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Live Camera
                </button>
                <button
                  onClick={() => setActiveTab("presets")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "presets"
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Sample Presets
                </button>
              </div>

              {/* Tab 1: File Upload */}
              {activeTab === "upload" && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex flex-col items-center justify-center p-10 border-2 border-dashed border-amber-500/30 rounded-2xl hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 transition-all cursor-pointer text-center"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                    }}
                  />
                  <div className="w-16 h-16 mb-4 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Drop your product photo here, or <span className="text-amber-600 dark:text-amber-400 underline">browse</span>
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Supports PNG, JPG, JPEG, WEBP (Max 10MB)
                  </p>
                </div>
              )}

              {/* Tab 2: Camera Stream */}
              {activeTab === "camera" && (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-full max-w-md aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    {!isCameraActive && !cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-900/90">
                        <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                        <p className="text-xs">Initializing camera stream...</p>
                      </div>
                    )}
                    {cameraError && (
                      <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-900 text-rose-400 space-y-2">
                        <AlertCircle className="w-8 h-8" />
                        <p className="text-xs">{cameraError}</p>
                      </div>
                    )}
                  </div>
                  {isCameraActive && (
                    <button
                      onClick={handleCaptureCameraPhoto}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-amber-700 transition-all active:scale-95"
                    >
                      <Camera className="w-5 h-5" />
                      Snap & Analyze Photo
                    </button>
                  )}
                </div>
              )}

              {/* Tab 3: Presets */}
              {activeTab === "presets" && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">
                    Click any sample item to test zero-friction Visual Search instant matching:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {SAMPLE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset)}
                        className="group relative flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-amber-500 hover:shadow-md transition-all text-left"
                      >
                        <div className="relative aspect-square w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={preset.image}
                            alt={preset.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <span className="text-[10px] font-bold text-white flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" /> Snap Test
                            </span>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {preset.label}
                          </p>
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            {preset.category}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Active Image Selected / Scanning / Results View */}
          {selectedImage && (
            <div className="space-y-6">
              
              {/* Selected Photo Header Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedImage} alt="Scanned item" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Selected Input Photo
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isScanning ? scanStepText : result ? `Processed via ${result.analysisMethod}` : "Ready for analysis"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Choose Different Image
                </button>
              </div>

              {/* Loading Scanner Animation */}
              {isScanning && (
                <div className="relative flex flex-col items-center justify-center p-12 rounded-2xl bg-slate-950 text-white overflow-hidden shadow-inner space-y-4">
                  <div className="relative w-48 h-48 rounded-xl overflow-hidden border-2 border-amber-500/50 shadow-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedImage} alt="Scanning" className="w-full h-full object-cover filter brightness-90" />
                    
                    {/* Animated Scanning Beam */}
                    <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b] animate-[bounce_2s_infinite]" />
                    <div className="absolute inset-0 bg-amber-500/10 pointer-events-none" />
                  </div>

                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold animate-pulse">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    {scanStepText}
                  </div>
                </div>
              )}

              {/* Error state */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Results Display */}
              {result && !isScanning && (
                <div className="space-y-6">

                  {/* AI Analysis Summary Banner */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-100 dark:to-slate-800/60 border border-amber-500/20 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Detected Item:</span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {result.suggestedTitle}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-sm">
                          {result.detectedCategory}
                        </span>
                      </div>
                      
                      {/* Detected tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <Tag className="w-3 h-3 text-amber-500" />
                        {result.detectedTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Zap className="w-4 h-4" />
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wider">Catalog Match Confidence</p>
                        <p className="text-sm font-extrabold">{result.confidence}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Products Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-amber-500" />
                        Matching Products Found ({result.products.length})
                      </h4>
                    </div>

                    {result.products.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                        No products matched the visual attributes in your photo.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {result.products.map((prod) => (
                          <div
                            key={prod.id}
                            className="group relative flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-amber-500 hover:shadow-lg transition-all"
                          >
                            {/* Confidence badge overlay */}
                            <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-amber-400 backdrop-blur-md border border-amber-500/30">
                              {prod.matchConfidence || 92}% Match
                            </div>

                            {/* Product Image */}
                            <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={prod.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"}
                                alt={prod.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>

                            {/* Product Info */}
                            <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                              <div>
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                  {prod.category?.name || result.detectedCategory}
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                  {prod.title}
                                </h5>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                                <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                                  ${prod.price?.toFixed(2)}
                                </span>
                                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  <span>{prod.rating || 4.7}</span>
                                </div>
                              </div>

                              <Link
                                href={`/products/${prod.id}`}
                                onClick={onClose}
                                className="mt-2 w-full py-1.5 px-3 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-amber-600 dark:hover:bg-amber-500 text-white text-[11px] font-bold text-center transition-colors block"
                              >
                                View Product
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">Esc</kbd> or click outside to dismiss
          </span>
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Close Search
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
