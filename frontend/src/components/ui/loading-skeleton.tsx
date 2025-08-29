import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
  variant?: 'card' | 'list' | 'table' | 'text';
}

export function LoadingSkeleton({ className, count = 1, variant = 'card' }: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => {
    switch (variant) {
      case 'card':
        return (
          <div key={i} className="animate-pulse">
            <div className="bg-muted rounded-lg border p-6">
              <div className="space-y-3">
                <div className="h-6 bg-muted-foreground/20 rounded w-3/4"></div>
                <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted-foreground/20 rounded w-full"></div>
                  <div className="h-4 bg-muted-foreground/20 rounded w-2/3"></div>
                </div>
                <div className="flex justify-between pt-2">
                  <div className="h-8 bg-muted-foreground/20 rounded w-20"></div>
                  <div className="h-8 bg-muted-foreground/20 rounded w-24"></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-4 p-4">
              <div className="h-12 w-12 bg-muted-foreground/20 rounded-full"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted-foreground/20 rounded w-1/4"></div>
                <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div key={i} className="animate-pulse">
            <div className="border-b p-4">
              <div className="flex items-center space-x-4">
                <div className="h-4 bg-muted-foreground/20 rounded w-1/4"></div>
                <div className="h-4 bg-muted-foreground/20 rounded w-1/3"></div>
                <div className="h-4 bg-muted-foreground/20 rounded w-1/6"></div>
                <div className="h-4 bg-muted-foreground/20 rounded w-1/5"></div>
              </div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-4 bg-muted-foreground/20 rounded w-full"></div>
            <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
            <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
          </div>
        );

      default:
        return null;
    }
  });

  return <div className={cn('space-y-4', className)}>{skeletons}</div>;
}
