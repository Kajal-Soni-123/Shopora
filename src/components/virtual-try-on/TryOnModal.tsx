'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Sparkles,
  Upload,
  X,
  Loader2,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  ShoppingBag,
  Maximize2,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Camera,
  ArrowRight,
  Info,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { render3DWristWrap, WristFitOptions } from '@/lib/try-on/synthesis/wristWrapEngine';
import { getCategoryAIPrompt } from '@/lib/try-on/synthesis/categoryPrompts';

export interface TryOnProductInfo {
  id: string;
  title: string;
  price: number;
  image: string;
  tryOnImage?: string | null;
  tryOnCategory?: string | null;
  isTryOnAvailable?: boolean;
  categoryName?: string;
}

interface TryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: TryOnProductInfo;
  onAddToCart?: (productId: string) => void;
}

// Sample model reference photos for instant preview
const SAMPLE_MODELS = [
  {
    id: 'sample-female-1',
    name: 'Female Model (Studio)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
    gender: 'female',
  },
  {
    id: 'sample-male-1',
    name: 'Male Model (Casual)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
    gender: 'male',
  },
  {
    id: 'sample-female-2',
    name: 'Female Model (Urban)',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
    gender: 'female',
  },
  {
    id: 'sample-male-2',
    name: 'Male Model (Streetwear)',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
    gender: 'male',
  },
];

type ActiveTab = 'upload' | 'samples';
type JobStatus = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';

const PROCESSING_STEPS = [
  { label: 'Uploading & Validating Photo', duration: 1500 },
  { label: 'Detecting Anatomical Landmarks & Pose', duration: 2500 },
  { label: 'Synthesizing Photorealistic Garment Draping', duration: 4000 },
  { label: 'Finalizing High-Resolution Image Output', duration: 2000 },
];

/** Resizes a data URL so its longest side is at most maxSide pixels (JPEG output). */
function downscaleImage(dataUrl: string, maxSide: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      if (scale === 1) return resolve(dataUrl);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Photorealistic HTML5 Canvas synthesis engine for Virtual Try-On
 * Superimposes product items (Watches, Jewellery, Eyewear, Apparel) onto user photo canvas
 */
export async function compositeWatchOntoUserPhoto(
  userPhotoUrl: string,
  productImageUrl: string,
  categoryName: string,
  customOffset?: { xPct: number; yPct: number; scale: number; rotation: number }
): Promise<string> {
  return new Promise((resolve) => {
    if (!userPhotoUrl || !productImageUrl) {
      return resolve(userPhotoUrl || productImageUrl || '');
    }

    const userImg = new window.Image();
    const prodImg = new window.Image();
    userImg.crossOrigin = 'anonymous';
    prodImg.crossOrigin = 'anonymous';

    let userLoaded = false;
    let prodLoaded = false;

    const tryRender = () => {
      if (!userLoaded || !prodLoaded) return;

      try {
        const canvas = document.createElement('canvas');
        canvas.width = userImg.naturalWidth || userImg.width || 800;
        canvas.height = userImg.naturalHeight || userImg.height || 1000;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(userPhotoUrl);

        // 1. Draw base user photo
        ctx.drawImage(userImg, 0, 0, canvas.width, canvas.height);

        // 2. Determine target placement based on category
        const cat = (categoryName || '').toLowerCase();
        
        let targetX = customOffset?.xPct ?? 0.65; // 65% across (wrist placement)
        let targetY = customOffset?.yPct ?? 0.58; // 58% down (wrist height)
        let targetScale = customOffset?.scale ?? 0.28; // 28% of canvas width
        let targetRotation = customOffset?.rotation ?? -20; // -20deg tilt for natural wrist alignment

        if (cat.includes('eyewear') || cat.includes('sunglasses') || cat.includes('glasses')) {
          targetX = customOffset?.xPct ?? 0.50;
          targetY = customOffset?.yPct ?? 0.35;
          targetScale = customOffset?.scale ?? 0.38;
          targetRotation = customOffset?.rotation ?? 0;
        } else if (cat.includes('top') || cat.includes('apparel') || cat.includes('shirt') || cat.includes('dress') || cat.includes('clothes') || cat.includes('outerwear')) {
          targetX = customOffset?.xPct ?? 0.50;
          targetY = customOffset?.yPct ?? 0.55;
          targetScale = customOffset?.scale ?? 0.58;
          targetRotation = customOffset?.rotation ?? 0;
        }

        const prodWidth = canvas.width * targetScale;
        const prodHeight = (prodImg.naturalHeight / prodImg.naturalWidth) * prodWidth;

        const posX = canvas.width * targetX;
        const posY = canvas.height * targetY;

        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate((targetRotation * Math.PI) / 180);

        // Realistic drop shadow for photorealistic fit
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 6;

        ctx.drawImage(prodImg, -prodWidth / 2, -prodHeight / 2, prodWidth, prodHeight);
        ctx.restore();

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (e) {
        console.error('Canvas compositing error:', e);
        resolve(userPhotoUrl);
      }
    };

    userImg.onload = () => {
      userLoaded = true;
      tryRender();
    };
    userImg.onerror = () => resolve(userPhotoUrl);

    prodImg.onload = () => {
      prodLoaded = true;
      tryRender();
    };
    prodImg.onerror = () => resolve(userPhotoUrl);

    userImg.src = userPhotoUrl;
    prodImg.src = productImageUrl;
  });
}

export const TryOnModal: React.FC<TryOnModalProps> = ({
  isOpen,
  onClose,
  product,
  onAddToCart,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload');
  const [selectedSampleUrl, setSelectedSampleUrl] = useState<string>(SAMPLE_MODELS[0].url);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  
  // Job & Processing State
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [progressStep, setProgressStep] = useState<number>(0);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // UX toggles, 3D Wrist Fit Adjuster & Webcam state
  const [viewMode, setViewMode] = useState<'side-by-side' | 'toggle'>('side-by-side');
  const [showResultToggle, setShowResultToggle] = useState<boolean>(true);
  const [showFitAdjuster, setShowFitAdjuster] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const [fitOptions, setFitOptions] = useState<WristFitOptions>({
    xPct: 0.36,
    yPct: 0.48,
    scale: 0.28,
    rotation: -15,
    curveWrap: 1.0,
    shadowBlur: 16,
    removeBg: true,
  });

  const handleUpdateFit = async (updates: Partial<WristFitOptions>) => {
    const updated = { ...fitOptions, ...updates };
    setFitOptions(updated);

    const activePhoto = userPhotoUrl || photoPreview || selectedSampleUrl;
    const prodImg = product.tryOnImage || product.image;
    const categoryName = product.tryOnCategory || product.categoryName || 'Watch';

    const newResult = await render3DWristWrap(activePhoto, prodImg, categoryName, updated);
    setResultImage(newResult);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Polling ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopPolling();
      stopCamera();
    };
  }, []);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const startCamera = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' },
      });
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setErrorMessage('Could not access camera. Please check camera permissions or upload a photo.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setUserPhotoUrl(dataUrl);
      setPhotoPreview(dataUrl);
      stopCamera();
    }
  };

  if (!isOpen) return null;

  const activePhotoUrl = activeTab === 'upload' ? photoPreview : selectedSampleUrl;

  // Handle local file selection & conversion to base64 data URL
  const handleFileChange = (file: File) => {
    setErrorMessage(null);
    
    // Client-side file size validation (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image file size must be less than 10MB.');
      return;
    }

    // Supported formats check
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Unsupported format. Please upload JPEG, PNG, or WebP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = await downscaleImage(reader.result as string, 1536);
      setUserPhotoUrl(dataUrl);
      setPhotoPreview(dataUrl);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Step progress animation simulation during polling
  const startStepAnimation = () => {
    setProgressStep(0);
    const interval = setInterval(() => {
      setProgressStep((prev) => {
        if (prev < PROCESSING_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 3000);
    return interval;
  };

  const showServerResult = (url?: string | null) => {
    if (!url) {
      setStatus('failed');
      setErrorMessage('The AI did not return a try-on image. Please try again.');
      return;
    }
    setStatus('completed');
    setResultImage(url);
  };

  // Trigger Try-On API Call
  const handleStartTryOn = async () => {
    if (!activePhotoUrl) {
      setErrorMessage('Please select or upload a photo of yourself first.');
      return;
    }

    setErrorMessage(null);
    setStatus('uploading');
    setProgressStep(0);
    setResultImage(null);

    const animInterval = startStepAnimation();

    try {
      const res = await fetch('/api/try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          userImage: activePhotoUrl,
          personImage: activePhotoUrl,
          category: product.tryOnCategory || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        clearInterval(animInterval);
        if (data.details?.tryOnId) setJobId(data.details.tryOnId);
        setStatus('failed');
        setErrorMessage(data.error || 'Failed to initialize Virtual Try-On job.');
        return;
      }

      const newJobId = data.data?.tryOnId || data.data?.id;
      if (!newJobId) {
        clearInterval(animInterval);
        setStatus('failed');
        setErrorMessage('Invalid job response from server.');
        return;
      }

      setJobId(newJobId);

      // Synchronous providers (Gemini) return the finished image right away
      if (data.data?.status === 'COMPLETED') {
        clearInterval(animInterval);
        showServerResult(data.data?.resultImageUrl);
        return;
      }

      setStatus('processing');

      // Start Polling
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/try-on/${newJobId}`);
          const statusData = await statusRes.json();

          if (statusRes.ok && statusData.success) {
            const job = statusData.data;
            if (job.status === 'COMPLETED') {
              stopPolling();
              clearInterval(animInterval);
              showServerResult(job.resultImageUrl);
            } else if (job.status === 'FAILED') {
              stopPolling();
              clearInterval(animInterval);
              setStatus('failed');
              setErrorMessage(job.errorMessage || 'AI model failed to generate try-on result.');
            }
          }
        } catch (pollErr) {
          console.error('Error polling try-on status:', pollErr);
        }
      }, 2500);
    } catch (err: any) {
      clearInterval(animInterval);
      setStatus('failed');
      setErrorMessage(err.message || 'An unexpected error occurred.');
    }
  };

  // Retry failed job
  const handleRetry = async () => {
    if (!jobId) {
      handleStartTryOn();
      return;
    }

    setErrorMessage(null);
    setStatus('processing');
    setProgressStep(0);
    const animInterval = startStepAnimation();

    try {
      const res = await fetch(`/api/try-on/${jobId}/retry`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        clearInterval(animInterval);
        setStatus('failed');
        setErrorMessage(data.error || 'Failed to retry Virtual Try-On job.');
        return;
      }

      if (data.data?.status === 'COMPLETED') {
        clearInterval(animInterval);
        showServerResult(data.data?.resultImageUrl);
        return;
      }

      // Resume polling
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/try-on/${jobId}`);
          const statusData = await statusRes.json();

          if (statusRes.ok && statusData.success) {
            const job = statusData.data;
            if (job.status === 'COMPLETED') {
              stopPolling();
              clearInterval(animInterval);
              showServerResult(job.resultImageUrl);
            } else if (job.status === 'FAILED') {
              stopPolling();
              clearInterval(animInterval);
              setStatus('failed');
              setErrorMessage(job.errorMessage || 'AI model retry failed.');
            }
          }
        } catch (pollErr) {
          console.error('Error polling retry status:', pollErr);
        }
      }, 2500);
    } catch (err: any) {
      clearInterval(animInterval);
      setStatus('failed');
      setErrorMessage(err.message || 'Retry request failed.');
    }
  };

  // Download high-res output
  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = `shopora-try-on-${product.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Reset to photo selection screen
  const handleReset = () => {
    stopPolling();
    setStatus('idle');
    setResultImage(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">AI Virtual Try-On Studio</h2>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm">
                  Photorealistic
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium truncate max-w-md">
                Trying on: <strong className="text-white">{product.title}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Virtual Try-On Error</p>
                <p className="mt-0.5 text-rose-600 font-normal">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* 1. SELECTION & UPLOAD SCREEN (Idle State) */}
          {(status === 'idle' || status === 'failed') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT COLUMN: Input Selection Tabs */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Tab Switcher */}
                <div className="flex p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'upload'
                        ? 'bg-white text-indigo-950 shadow-md shadow-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    Upload Your Photo
                  </button>
                  <button
                    onClick={() => setActiveTab('samples')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'samples'
                        ? 'bg-white text-indigo-950 shadow-md shadow-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    Sample Models
                  </button>
                </div>

                {/* TAB 1: FILE UPLOAD / DRAG & DROP / WEBCAM CAMERA */}
                {activeTab === 'upload' && (
                  <div className="space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* LIVE CAMERA MODE VIEW */}
                    {isCameraActive ? (
                      <div className="relative border-2 border-indigo-600 rounded-3xl overflow-hidden bg-slate-950 p-2 flex flex-col items-center justify-center space-y-3 shadow-xl">
                        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform -scale-x-100"
                          />
                          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>Live Camera Stream</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-3 w-full p-2">
                          <button
                            type="button"
                            onClick={captureCameraPhoto}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Snap Photo Now</span>
                          </button>

                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* FILE DROPZONE & CAMERA BUTTON */
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`group relative border-2 border-dashed rounded-3xl p-6 text-center transition-all ${
                          dragActive
                            ? 'border-indigo-600 bg-indigo-50/80 scale-[1.01]'
                            : photoPreview
                            ? 'border-indigo-300 bg-indigo-50/30 hover:bg-indigo-50/50'
                            : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-400'
                        }`}
                      >
                        {photoPreview ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="relative w-32 h-40 rounded-2xl overflow-hidden shadow-lg border-2 border-white ring-2 ring-indigo-500/30">
                              <Image src={photoPreview} alt="User photo preview" fill className="object-cover" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold text-indigo-900">Photo Loaded Successfully</p>
                              <div className="flex items-center gap-3 justify-center mt-1">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="text-[11px] text-indigo-600 underline font-semibold"
                                >
                                  Upload Different File
                                </button>
                                <span className="text-slate-300">•</span>
                                <button
                                  type="button"
                                  onClick={startCamera}
                                  className="text-[11px] text-indigo-600 underline font-semibold flex items-center gap-1"
                                >
                                  <Camera className="w-3 h-3" />
                                  Retake with Camera
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                              <Camera className="w-7 h-7" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                Upload a photo or take one directly with your camera
                              </p>
                              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                                Supports JPG, PNG, WebP (Max size 10MB)
                              </p>
                            </div>
                            
                            {/* DUAL ACTION BUTTONS: BROWSE FILES & TAKE PHOTO */}
                            <div className="flex items-center gap-2.5 mt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fileInputRef.current?.click();
                                }}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Browse Files</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startCamera();
                                }}
                                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Camera className="w-3.5 h-3.5 text-indigo-300" />
                                <span>Take Photo with Camera</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PHOTO TIPS CARD */}
                    <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div className="text-[11px] text-indigo-900 font-medium space-y-0.5">
                        <p className="font-bold">For Best Photorealistic AI Results:</p>
                        <p>• Clear lighting with good front contrast.</p>
                        <p>• Upright body pose with unobscured torso.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: SAMPLE MODEL PICKER */}
                {activeTab === 'samples' && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-700">
                      Select a reference model to test try-on immediately:
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {SAMPLE_MODELS.map((model) => {
                        const isSelected = selectedSampleUrl === model.url;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => setSelectedSampleUrl(model.url)}
                            className={`group relative rounded-2xl overflow-hidden border-2 transition-all aspect-[3/4] text-left ${
                              isSelected
                                ? 'border-indigo-600 ring-4 ring-indigo-500/20 scale-105 shadow-lg'
                                : 'border-slate-200 opacity-80 hover:opacity-100 hover:border-slate-300'
                            }`}
                          >
                            <Image src={model.url} alt={model.name} fill className="object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2">
                              <span className="text-[10px] font-bold text-white truncate">
                                {model.name}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Product & Try-On Preview */}
              <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-3xl bg-gradient-to-b from-slate-50 to-indigo-50/40 border border-slate-200/80 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" /> Target Garment Preview
                  </h3>

                  <div className="flex gap-4 items-center p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="relative w-20 h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                      <Image
                        src={product.tryOnImage || product.image}
                        alt={product.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-slate-900 line-clamp-2">{product.title}</p>
                      <p className="text-xs font-bold text-indigo-600 mt-1">${product.price.toFixed(2)}</p>
                      {product.tryOnCategory && (
                        <span className="inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {product.tryOnCategory}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTON */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleStartTryOn}
                    disabled={!activePhotoUrl}
                    className="w-full relative group overflow-hidden py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 active:scale-[0.99] text-white font-black text-sm shadow-xl shadow-purple-600/25 border border-purple-400/30 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    {/* Ambient Glow backdrop */}
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative flex items-center justify-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                        <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                      </div>
                      <span className="tracking-wide text-sm font-extrabold">Try On Yourself</span>
                      <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider text-purple-100 border border-white/20 shadow-xs">
                        AI Generated
                      </span>
                      <ArrowRight className="w-4 h-4 text-purple-200 group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </button>
                  <p className="text-[10px] text-center text-slate-500 font-medium">
                    Powered by secure server-side AI generation. Your photos are private and not stored permanently.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. PROCESSING / POLLING STATE */}
          {(status === 'uploading' || status === 'queued' || status === 'processing') && (
            <div className="py-12 px-6 text-center space-y-6 max-w-lg mx-auto">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-ping opacity-75"></div>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Generating Your AI Virtual Try-On
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Synthesizing realistic fit and lighting... Please stay on this screen.
                </p>
              </div>

              {/* PROGRESS STEPS LIST */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 text-left">
                {PROCESSING_STEPS.map((step, idx) => {
                  const isCurrent = idx === progressStep;
                  const isDone = idx < progressStep;

                  return (
                    <div key={idx} className="flex items-center gap-3 text-xs">
                      {isDone ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 animate-spin">
                          <Loader2 className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                          {idx + 1}
                        </div>
                      )}
                      <span
                        className={`font-semibold ${
                          isDone
                            ? 'text-slate-400 line-through'
                            : isCurrent
                            ? 'text-indigo-900 font-extrabold'
                            : 'text-slate-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleReset}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 underline transition-colors"
              >
                Cancel Generation
              </button>
            </div>
          )}

          {/* 3. COMPLETED RESULT VIEW */}
          {status === 'completed' && resultImage && (
            <div className="space-y-6">
              
              {/* COMPARISON CONTROLS */}
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 px-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Try-On Result Ready!</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'side-by-side' ? 'toggle' : 'side-by-side')}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{viewMode === 'side-by-side' ? 'Switch to Toggle View' : 'Switch to Side-by-Side'}</span>
                  </button>
                </div>
              </div>

              {/* 3D FIT FINE-TUNER PANEL */}
              {showFitAdjuster && (
                <div className="bg-indigo-950 text-white p-4 rounded-2xl border border-indigo-800/80 shadow-xl space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-indigo-800/60 pb-2">
                    <span className="text-xs font-extrabold flex items-center gap-1.5 text-indigo-300">
                      <Sparkles className="w-4 h-4 text-amber-400" /> 3D Wrist-Wrap Live Fine-Tuner
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-300/70">
                      Lenskart-Style 3D Fit
                    </span>
                  </div>

                  {/* CATEGORY AI VISION PROMPT DISCLOSURE BOX */}
                  <div className="bg-indigo-900/60 border border-indigo-700/60 rounded-xl p-3 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-amber-300 font-extrabold">
                      <span>🤖 AI Category Synthesis Prompt ({getCategoryAIPrompt(product.tryOnCategory || product.categoryName || 'Watch').category})</span>
                    </div>
                    <p className="text-indigo-200/90 font-mono text-[10px] leading-relaxed bg-black/30 p-2 rounded-lg border border-indigo-800/50">
                      "{getCategoryAIPrompt(product.tryOnCategory || product.categoryName || 'Watch').fullVisionPrompt}"
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-semibold">
                    {/* Horizontal Position */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-indigo-200">
                        <span>Wrist X-Position:</span>
                        <span className="font-mono text-amber-400">{Math.round((fitOptions.xPct ?? 0.65) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.01"
                        value={fitOptions.xPct ?? 0.65}
                        onChange={(e) => handleUpdateFit({ xPct: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-indigo-900 rounded-lg"
                      />
                    </div>

                    {/* Vertical Position */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-indigo-200">
                        <span>Wrist Y-Height:</span>
                        <span className="font-mono text-amber-400">{Math.round((fitOptions.yPct ?? 0.58) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.01"
                        value={fitOptions.yPct ?? 0.58}
                        onChange={(e) => handleUpdateFit({ yPct: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-indigo-900 rounded-lg"
                      />
                    </div>

                    {/* Scale */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-indigo-200">
                        <span>Watch Size:</span>
                        <span className="font-mono text-amber-400">{Math.round((fitOptions.scale ?? 0.28) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="0.60"
                        step="0.01"
                        value={fitOptions.scale ?? 0.28}
                        onChange={(e) => handleUpdateFit({ scale: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-indigo-900 rounded-lg"
                      />
                    </div>

                    {/* Tilt Rotation */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-indigo-200">
                        <span>Tilt Angle:</span>
                        <span className="font-mono text-amber-400">{fitOptions.rotation ?? -20}°</span>
                      </div>
                      <input
                        type="range"
                        min="-90"
                        max="90"
                        step="1"
                        value={fitOptions.rotation ?? -20}
                        onChange={(e) => handleUpdateFit({ rotation: parseInt(e.target.value) })}
                        className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-indigo-900 rounded-lg"
                      />
                    </div>

                    {/* 3D Curve Wrap */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-indigo-200">
                        <span>3D Wrist Curvature:</span>
                        <span className="font-mono text-amber-400">{fitOptions.curveWrap ?? 1.0}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="2.5"
                        step="0.1"
                        value={fitOptions.curveWrap ?? 1.0}
                        onChange={(e) => handleUpdateFit({ curveWrap: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-indigo-900 rounded-lg"
                      />
                    </div>

                    {/* Smart Background Removal Toggle */}
                    <div className="flex items-center gap-2 pt-4">
                      <input
                        type="checkbox"
                        id="removeBgToggle"
                        checked={fitOptions.removeBg !== false}
                        onChange={(e) => handleUpdateFit({ removeBg: e.target.checked })}
                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                      />
                      <label htmlFor="removeBgToggle" className="text-indigo-200 cursor-pointer font-bold select-none">
                        Isolate Watch (Remove Pillow Stand)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* SIDE-BY-SIDE OR TOGGLE IMAGE VIEW */}
              {viewMode === 'side-by-side' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* ORIGINAL PHOTO */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Original Reference Photo
                    </span>
                    <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shadow-md">
                      <Image src={activePhotoUrl} alt="Original person" fill className="object-cover" />
                    </div>
                  </div>

                  {/* GENERATED TRY-ON RESULT */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> AI Virtual Try-On
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Photorealistic Output
                      </span>
                    </div>
                    <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-slate-900 border-2 border-indigo-500/50 shadow-xl ring-4 ring-indigo-500/20">
                      <img src={resultImage} alt="Virtual try-on result" className="w-full h-full object-cover" />
                    </div>
                  </div>

                </div>
              ) : (
                /* TOGGLE SINGLE IMAGE VIEW */
                <div className="max-w-md mx-auto space-y-3 text-center">
                  <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-slate-900 border-2 border-indigo-500/50 shadow-2xl">
                    <img
                      src={showResultToggle ? resultImage : activePhotoUrl}
                      alt="Try-On comparison"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md">
                      {showResultToggle ? '✨ AI Try-On Result' : '📷 Original Photo'}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowResultToggle(!showResultToggle)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold border border-slate-300 transition-all shadow-sm"
                  >
                    Hold to Compare (Currently showing: {showResultToggle ? 'Try-On Result' : 'Original'})
                  </button>
                </div>
              )}

              {/* ACTION FOOTER */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                  Try Another Photo
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleDownload}
                    className="flex-1 sm:flex-none border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    Download Result
                  </Button>

                  {onAddToCart && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        onAddToCart(product.id);
                        onClose();
                      }}
                      className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Add Product To Cart
                    </Button>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
