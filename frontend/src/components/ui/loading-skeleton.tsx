import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

interface LoadingCardProps {
  showIcon?: boolean;
  showDescription?: boolean;
  className?: string;
}

export function LoadingCard({ 
  showIcon = true, 
  showDescription = true, 
  className 
}: LoadingCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          {showDescription && <Skeleton className="h-3 w-32" />}
        </div>
        {showIcon && <Skeleton className="h-8 w-8 rounded" />}
      </div>
    </div>
  );
}

interface LoadingStatsGridProps {
  count?: number;
  className?: string;
}

export function LoadingStatsGrid({ count = 4, className }: LoadingStatsGridProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingTable({ rows = 5, columns = 4, className }: LoadingTableProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-6 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {Array.from({ length: columns - 1 }).map((_, colIndex) => (
              <div key={colIndex} className="flex items-center gap-1">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface LoadingListProps {
  items?: number;
  className?: string;
}

export function LoadingList({ items = 5, className }: LoadingListProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="mt-1 h-2 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface LoadingPageProps {
  title?: string;
  description?: string;
  showStats?: boolean;
  showTable?: boolean;
  showList?: boolean;
  className?: string;
}

export function LoadingPage({ 
  title = "Đang tải...",
  description = "Vui lòng chờ trong giây lát",
  showStats = true,
  showTable = false,
  showList = false,
  className 
}: LoadingPageProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      
      {showStats && <LoadingStatsGrid />}
      
      {showTable && <LoadingTable />}
      
      {showList && <LoadingList />}
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-4 border-t-transparent border-primary',
          sizeClasses[size],
        )}
      />
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
}

export function LoadingOverlay({ isLoading, children, className }: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>;

  return (
    <div className={cn('relative', className)}>
      {children}
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <LoadingSpinner size="lg" />
      </div>
    </div>
  );
}