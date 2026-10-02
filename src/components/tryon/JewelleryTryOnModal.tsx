'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  Upload,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Trash2,
  BrainCircuit,
  ScanEye,
  Wand2,
  Layers,
  Glasses,
  Shirt,
  Watch,
  UserCheck,
  Crosshair
} from 'lucide-react';
import { JewelleryType, LLMVisionAnalysis } from '@/lib/virtual-try-on/types';
import { JEWELLERY_GUIDANCE, CategoryGuidance } from '@/lib/virtual-try-on/categoryUtils';

interface JewelleryTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    title: string;
    image: string;
    tryOnImage?: string | null;
    price: number;
    category?: { name?: string };
    attributes?: Record<string, any>;
  };
  jewelleryType: JewelleryType;
}

export default function JewelleryTryOnModal({
  isOpen,
  onClose,
  product,
  jewelleryType
}: JewelleryTryOnModalProps) {
  // Modal states: 'UPLOAD' | 'PROCESSING' | 'RESULT' | 'ERROR'
  const [step, setStep] = useState<'UPLOAD' | 'PROCESSING' | 'RESULT' | 'ERROR'>('UPLOAD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [providerName, setProviderName] = useState<string | null>(null);

  // LLM Vision Analysis Data returned from Gemini Vision API
  const [llmAnalysis, setLlmAnalysis] = useState<LLMVisionAnalysis | null>(null);
  const [showLlmInsights, setShowLlmInsights] = useState(false);

  // Fine-tuning interactive state for positioning items on photo
  const [showAdjustControls, setShowAdjustControls] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startOffsetX: number; startOffsetY: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);

  const guidance: CategoryGuidance =
    JEWELLERY_GUIDANCE[jewelleryType] || JEWELLERY_GUIDANCE.WATCH || JEWELLERY_GUIDANCE.NECKLACE;

  const isEyewear = ['EYEWEAR', 'GLASSES', 'SUNGLASSES'].includes(jewelleryType);
  const isApparel = ['CLOTHING', 'TOP', 'SHIRT', 'DRESS', 'JACKET', 'PANTS'].includes(jewelleryType);

  // Reset state when modal opens or product changes
  useEffect(() => {
    if (isOpen) {
      setStep('UPLOAD');
      setSelectedFile(null);
      setPreviewUrl(null);
      setResultImageUrl(null);
      setLlmAnalysis(null);
      setErrorMsg(null);
      setShowAdjustControls(false);
      setShowLlmInsights(false);
      resetFitParams();
    }
  }, [isOpen, product.id]);

  const resetFitParams = () => {
    setOffsetX(0);
    setOffsetY(0);
    setScale(1.0);
    setRotation(0);
  };

  // Quick Preset Snap Controls for Raised Arm Pose vs Standing Waist Pose
  const applyPosePreset = (type: 'RAISED_ARM' | 'WAIST_ARM' | 'CENTER') => {
    if (type === 'RAISED_ARM') {
      // Snap to Upper-Left Raised Arm (wrist near head: X 24%, Y 28%)
      setOffsetX(-108);
      setOffsetY(-150);
      setRotation(-35);
      setScale(0.95);
    } else if (type === 'WAIST_ARM') {
      // Snap to Lower-Left Waist Arm (wrist by hip)
      setOffsetX(-40);
      setOffsetY(25);
      setRotation(-8);
      setScale(1.0);
    } else {
      // Center reset
      resetFitParams();
    }
  };

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 10MB limit.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmitTryOn = async () => {
    if (!previewUrl) return;

    setStep('PROCESSING');
    setErrorMsg(null);

    try {
      const response = await fetch('/api/virtual-try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userImage: previewUrl,
          productId: product.id,
          jewelleryType
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate virtual try-on.');
      }

      setResultImageUrl(data.resultImageUrl);
      setProviderName(data.providerName || 'Gemini 1.5 Flash Vision');

      if (data.llmAnalysis) {
        setLlmAnalysis(data.llmAnalysis);
        // If Gemini detected a raised arm pose, auto-apply raised arm offset
        if (data.llmAnalysis.userAnalysis?.wristPosition?.wristSide?.toLowerCase().includes('raised') ||
            data.llmAnalysis.userAnalysis?.wristPosition?.yPercent < 35) {
          applyPosePreset('RAISED_ARM');
        }
      }

      setStep('RESULT');
    } catch (err: any) {
      console.error('[JewelleryTryOnModal] Try-on error:', err);
      setErrorMsg(err.message || 'Virtual Try-On service encountered an error.');
      setStep('ERROR');
    }
  };

  // Interactive Dragging on overlay image
  const handleMouseDownOverlay = (e: React.MouseEvent) => {
    if (!showAdjustControls) return;
    e.preventDefault();
    setIsDraggingOverlay(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY
    };
  };

  const handleMouseMoveOverlay = (e: React.MouseEvent) => {
    if (!isDraggingOverlay || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffsetX(dragStartRef.current.startOffsetX + dx);
    setOffsetY(dragStartRef.current.startOffsetY + dy);
  };

  const handleMouseUpOverlay = () => {
    setIsDraggingOverlay(false);
    dragStartRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden text-neutral-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-400/10 border border-amber-400/30 rounded-2xl text-amber-400">
              {isEyewear ? (
                <Glasses className="w-5 h-5" />
              ) : isApparel ? (
                <Shirt className="w-5 h-5" />
              ) : (
                <Watch className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-extrabold text-white tracking-tight">Try On Yourself</h3>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                  {isEyewear ? 'LENSKART AR: EYEWEAR' : isApparel ? 'AI FASHION: APPAREL' : `AI VISION: ${jewelleryType}`}
                </span>
              </div>
              <p className="text-xs text-neutral-400 line-clamp-1">{product.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-800/60 hover:bg-neutral-800 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* UPLOAD STEP */}
          {step === 'UPLOAD' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo Upload Dropzone */}
              <div className="space-y-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-3xl cursor-pointer transition min-h-[280px] bg-neutral-950/50 ${
                    isDragOver
                      ? 'border-amber-400 bg-amber-400/5'
                      : previewUrl
                      ? 'border-neutral-700 hover:border-amber-400/60'
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />

                  {previewUrl ? (
                    <div className="relative w-full h-64 rounded-2xl overflow-hidden group">
                      <Image
                        src={previewUrl}
                        alt="User Photo Preview"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="px-3 py-1.5 bg-neutral-900 text-white rounded-xl text-xs font-semibold flex items-center space-x-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Change</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setPreviewUrl(null);
                          }}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="w-14 h-14 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center mx-auto text-neutral-400">
                        <Upload className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Upload Your Photo</p>
                        <p className="text-xs text-neutral-400">Drag & drop or click to browse</p>
                      </div>
                      <span className="inline-block text-[10px] text-neutral-500 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
                        JPG, PNG, WebP up to 10MB
                      </span>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center space-x-2 text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>

              {/* Product Info & Category Guidance */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Selected Product Card */}
                  <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex items-center space-x-3">
                    <div className="relative w-14 h-14 bg-neutral-900 rounded-xl overflow-hidden flex-shrink-0 border border-neutral-800">
                      <Image
                        src={product.tryOnImage || product.image}
                        alt={product.title}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{product.title}</h4>
                      <p className="text-xs text-amber-400 font-extrabold">${product.price.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Guidance Box */}
                  <div className="p-4 bg-neutral-950/40 border border-neutral-800/80 rounded-2xl space-y-2.5">
                    <div className="flex items-center space-x-2 font-bold text-xs text-amber-300">
                      <UserCheck className="w-4 h-4 text-amber-400" />
                      <span>{guidance.title} Guidance</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-neutral-300">
                      {guidance.bulletPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  disabled={!previewUrl}
                  onClick={handleSubmitTryOn}
                  className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center space-x-2 transition ${
                    previewUrl
                      ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300 shadow-lg shadow-amber-400/20 cursor-pointer'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Try-On</span>
                </button>
              </div>
            </div>
          )}

          {/* PROCESSING STEP */}
          {step === 'PROCESSING' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin" />
                <BrainCircuit className="absolute inset-0 w-8 h-8 text-amber-400 m-auto animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-white">
                  {jewelleryType === 'WATCH' ? 'Perfect Corp AI Watch VTO Processing...' : 'Analyzing Landmarks & Synthesizing Try-On...'}
                </h4>
                <p className="text-xs text-neutral-400 max-w-sm">
                  {jewelleryType === 'WATCH'
                    ? 'Submitting watch & photo to Perfect Corp API for photorealistic wrist synthesis...'
                    : 'Gemini 1.5 Vision is scanning for anatomical landmark & wrapping points.'}
                </p>
              </div>
            </div>
          )}

          {/* RESULT STEP */}
          {step === 'RESULT' && resultImageUrl && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-amber-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>AI Try-On Result</span>
                </div>

                {/* Quick Arm Pose Snap Switcher for Watches */}
                {jewelleryType === 'WATCH' && (
                  <div className="flex items-center space-x-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 font-bold px-1.5">Pose Snap:</span>
                    <button
                      type="button"
                      onClick={() => applyPosePreset('RAISED_ARM')}
                      className="px-2.5 py-1 bg-amber-400 text-neutral-950 rounded-lg text-[10px] font-black hover:bg-amber-300 transition flex items-center space-x-1"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>Raised Arm (Near Head)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPosePreset('WAIST_ARM')}
                      className="px-2.5 py-1 bg-neutral-800 text-neutral-200 hover:text-white rounded-lg text-[10px] font-bold transition"
                    >
                      <span>Waist Arm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPosePreset('CENTER')}
                      className="px-2 py-1 bg-neutral-800 text-neutral-400 hover:text-white rounded-lg text-[10px] font-semibold transition"
                    >
                      <span>Reset</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setStep('UPLOAD')}
                  className="text-xs text-neutral-400 hover:text-white flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Another Photo</span>
                </button>
              </div>

              {/* Interactive Fitting Canvas */}
              <div
                ref={overlayContainerRef}
                onMouseDown={handleMouseDownOverlay}
                onMouseMove={handleMouseMoveOverlay}
                onMouseUp={handleMouseUpOverlay}
                onMouseLeave={handleMouseUpOverlay}
                className={`relative w-full h-[460px] bg-neutral-950 rounded-3xl overflow-hidden border border-neutral-800 flex items-center justify-center select-none ${
                  showAdjustControls ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
              >
                {/* Result Image */}
                <div className="relative w-full h-full">
                  <img
                    src={resultImageUrl}
                    alt="AI Virtual Try-On Result"
                    className="w-full h-full object-contain"
                    style={{
                      transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale}) rotate(${rotation}deg)`,
                      transition: isDraggingOverlay ? 'none' : 'transform 0.1s ease-out'
                    }}
                  />
                </div>

                {providerName && (
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-slate-300 font-semibold border border-white/10 z-10 pointer-events-none flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Engine: {providerName}</span>
                  </div>
                )}

                {/* Fine-tune Overlay Badge / Button */}
                <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
                  {llmAnalysis && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLlmInsights(!showLlmInsights);
                      }}
                      className="bg-amber-400/90 hover:bg-amber-400 text-neutral-950 px-3 py-1.5 rounded-full text-xs font-extrabold shadow-lg flex items-center space-x-1.5 cursor-pointer"
                    >
                      <BrainCircuit className="w-3.5 h-3.5" />
                      <span>{showLlmInsights ? 'Hide AI Reasoning' : 'LLM Vision Insights'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAdjustControls(!showAdjustControls);
                    }}
                    className="bg-indigo-600/90 hover:bg-indigo-600 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold border border-indigo-400/40 shadow-lg flex items-center space-x-1.5 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{showAdjustControls ? 'Hide Controls' : 'Fine-Tune Fit'}</span>
                  </button>
                </div>
              </div>

              {/* LLM VISION REASONING & INSIGHTS DRAWER */}
              {showLlmInsights && llmAnalysis && (
                <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-800 space-y-3.5 animate-fade-in text-white text-xs">
                  <div className="flex items-center justify-between border-b border-indigo-800/80 pb-2">
                    <div className="flex items-center space-x-2 font-black text-amber-300">
                      <BrainCircuit className="w-4 h-4 text-amber-300" />
                      <span>Gemini 1.5 Vision Reasoning & Landmark Decision Breakdown</span>
                    </div>
                    <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                      Confidence: {Math.round(llmAnalysis.confidenceScore * 100)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* User Pose & Landmark Analysis */}
                    <div className="p-3 rounded-xl bg-slate-900/70 border border-indigo-900/60 space-y-1.5">
                      <div className="flex items-center space-x-1.5 font-bold text-indigo-300">
                        <ScanEye className="w-3.5 h-3.5" />
                        <span>Landmark Detection ({jewelleryType})</span>
                      </div>
                      <p className="text-[11px] text-slate-200">
                        Target: <strong>{llmAnalysis.userAnalysis.detectedLandmark}</strong> ({llmAnalysis.userAnalysis.wristPosition.wristSide})
                      </p>
                      
                      {/* Lenskart Eyewear Features */}
                      {llmAnalysis.userAnalysis.facialFeatures && (
                        <p className="text-[11px] text-amber-300 font-medium">
                          Nose Bridge: ({llmAnalysis.userAnalysis.facialFeatures.noseBridgeX}%, {llmAnalysis.userAnalysis.facialFeatures.noseBridgeY}%) | IPD: {llmAnalysis.userAnalysis.facialFeatures.interpupillaryDistancePx}px | Face: {llmAnalysis.userAnalysis.facialFeatures.faceShape}
                        </p>
                      )}

                      {/* Apparel Torso Features */}
                      {llmAnalysis.userAnalysis.torsoFeatures && (
                        <p className="text-[11px] text-indigo-300 font-medium">
                          Shoulder Width: {llmAnalysis.userAnalysis.torsoFeatures.shoulderWidthPx}px | Chest Line Y: {llmAnalysis.userAnalysis.torsoFeatures.chestLineY}% | Silhouette: {llmAnalysis.userAnalysis.torsoFeatures.bodyType}
                        </p>
                      )}

                      <p className="text-[11px] text-slate-300">
                        Coords: X: {llmAnalysis.userAnalysis.wristPosition.xPercent}%, Y: {llmAnalysis.userAnalysis.wristPosition.yPercent}% | Angle: {llmAnalysis.userAnalysis.wristPosition.angleDegrees}°
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Lighting & Tone: {llmAnalysis.userAnalysis.skinToneLighting}
                      </p>
                    </div>

                    {/* Product Attribute Breakdown */}
                    <div className="p-3 rounded-xl bg-slate-900/70 border border-indigo-900/60 space-y-1.5">
                      <div className="flex items-center space-x-1.5 font-bold text-indigo-300">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Product Attribute Extraction</span>
                      </div>
                      <p className="text-[11px] text-slate-200">
                        Metal/Material: <strong>{llmAnalysis.productAnalysis.casingMetal}</strong>
                      </p>
                      <p className="text-[11px] text-slate-300">
                        Dial/Shade: {llmAnalysis.productAnalysis.dialColor} | {llmAnalysis.productAnalysis.strapMaterial}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Key Features: {llmAnalysis.productAnalysis.keyFeatures.join(', ')}
                      </p>
                    </div>
                  </div>

                  {/* Synthesized Generative Prompt */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-400/30 space-y-1">
                    <div className="flex items-center space-x-1.5 text-[11px] font-bold text-amber-300">
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Synthesized Generative AI Prompt (Imagen 3 / FLUX Engine)</span>
                    </div>
                    <p className="text-[11px] text-slate-200 italic leading-relaxed">
                      "{llmAnalysis.generativePrompt}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ERROR STEP */}
          {step === 'ERROR' && (
            <div className="py-8 space-y-4 text-center">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Virtual Try-On Failed</h4>
                <p className="text-xs text-neutral-400 mt-1">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep('UPLOAD')}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
