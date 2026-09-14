import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  reviewsCount?: number;
  showNumeric?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const RatingStars: React.FC<RatingStarsProps> = React.memo(({
  rating,
  maxStars = 5,
  reviewsCount,
  showNumeric = true,
  size = 'sm',
  className,
}) => {
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxStars }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = rating >= starValue;
          const isHalf = rating > index && rating < starValue;

          return (
            <Star
              key={index}
              className={cn(
                sizeMap[size],
                'transition-colors',
                isFilled
                  ? 'text-amber-400 fill-amber-400'
                  : isHalf
                  ? 'text-amber-400 fill-amber-400/50'
                  : 'text-slate-700 fill-slate-800'
              )}
            />
          );
        })}
      </div>
      {showNumeric && (
        <span className="text-xs font-semibold text-slate-300">
          {rating.toFixed(1)}
        </span>
      )}
      {reviewsCount !== undefined && (
        <span className="text-xs text-slate-500 font-normal">
          ({reviewsCount})
        </span>
      )}
    </div>
  );
});

RatingStars.displayName = 'RatingStars';
