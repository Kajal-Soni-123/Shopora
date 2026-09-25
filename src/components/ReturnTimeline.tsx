'use client';

import React from 'react';
import { CheckCircle2, Clock, Truck, RotateCcw, AlertCircle, DollarSign, PackageCheck } from 'lucide-react';

export interface ReturnTimelineProps {
  status: string;
  requestedAt?: string | Date;
  approvedAt?: string | Date;
  pickedUpAt?: string | Date;
  receivedAt?: string | Date;
  completedAt?: string | Date;
  reverseAwb?: string;
}

const STEPS = [
  { id: 'RETURN_REQUESTED', label: 'Requested', icon: Clock },
  { id: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  { id: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled', icon: Truck },
  { id: 'PICKED_UP', label: 'Picked Up', icon: RotateCcw },
  { id: 'RECEIVED', label: 'Received', icon: PackageCheck },
  { id: 'COMPLETED', label: 'Refunded', icon: DollarSign },
];

export const ReturnTimeline: React.FC<ReturnTimelineProps> = ({
  status,
  requestedAt,
  approvedAt,
  pickedUpAt,
  receivedAt,
  completedAt,
  reverseAwb,
}) => {
  const isRejected = status === 'REJECTED';

  const getStepIndex = (currentStatus: string) => {
    switch (currentStatus) {
      case 'RETURN_REQUESTED':
      case 'UNDER_REVIEW':
        return 0;
      case 'APPROVED':
        return 1;
      case 'PICKUP_SCHEDULED':
        return 2;
      case 'PICKED_UP':
      case 'IN_TRANSIT':
        return 3;
      case 'RECEIVED':
      case 'REFUND_PROCESSING':
        return 4;
      case 'COMPLETED':
        return 5;
      default:
        return 0;
    }
  };

  const currentIndex = isRejected ? -1 : getStepIndex(status);

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-indigo-100 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
          <RotateCcw className="w-4 h-4 text-indigo-600" />
          Return & Reverse Logistics Progress
        </span>
        {reverseAwb && (
          <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded-lg border border-indigo-200 text-indigo-700 font-bold shadow-2xs">
            Reverse AWB: {reverseAwb}
          </span>
        )}
      </div>

      {isRejected ? (
        <div className="p-3 rounded-xl bg-rose-100/70 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>This return request was reviewed and rejected by the vendor partner.</span>
        </div>
      ) : (
        <div className="relative pt-2">
          <div className="flex items-center justify-between relative z-10">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx <= currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div key={step.id} className="flex flex-col items-center gap-1 text-center flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? isCurrent
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-4 ring-indigo-100'
                          : 'bg-emerald-500 text-white'
                        : 'bg-white border-2 border-slate-200 text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-[10px] font-bold leading-tight ${
                      isCompleted ? (isCurrent ? 'text-indigo-900' : 'text-slate-800') : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress Connecting Line */}
          <div className="absolute top-5 left-[8%] right-[8%] h-0.5 bg-slate-200 -z-0">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{
                width: `${Math.max(0, (currentIndex / (STEPS.length - 1)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
