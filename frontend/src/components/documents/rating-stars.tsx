import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
interface RatingStarsProps {
  rating: number;
  averageRating?: number;
  totalRatings?: number;
  onRatingChange?: (rating: number) => void;
  disabled?: boolean;
  showAverage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function RatingStars({
  rating,
  averageRating = 0,
  totalRatings = 0,
  onRatingChange,
  disabled = false,
  showAverage = false,
  size = 'md',
  loading = false,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const handleStarClick = (starRating: number) => {
    if (disabled || loading || !onRatingChange) return;
    onRatingChange(starRating);
  };

  const handleStarHover = (starRating: number) => {
    if (disabled || loading) return;
    setHoverRating(starRating);
  };

  const handleMouseLeave = () => {
    if (disabled || loading) return;
    setHoverRating(0);
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <Tooltip key={star} delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => handleStarHover(star)}
                  onMouseLeave={handleMouseLeave}
                  disabled={disabled || loading}
                  aria-label={`Đánh giá ${star} sao`}
                >
                  <Star
                    className={`${sizeClasses[size]} transition-colors ${
                      star <= displayRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-200'
                    }`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {star === 1 && 'Rất tệ'}
                  {star === 2 && 'Tệ'}
                  {star === 3 && 'Bình thường'}
                  {star === 4 && 'Tốt'}
                  {star === 5 && 'Rất tốt'}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {showAverage && (
        <div className="text-muted-foreground flex items-center gap-1 text-sm">
          <span className="font-medium">{averageRating.toFixed(1)}</span>
          <span>({totalRatings} đánh giá)</span>
        </div>
      )}
    </div>
  );
}
