import { LucideIcon, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NoResultsProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  searchQuery?: string;
  onClearSearch?: () => void;
  className?: string;
}

export function NoResults({
  icon: Icon = Search,
  title = 'No results found',
  description,
  searchQuery,
  onClearSearch,
  className,
}: NoResultsProps) {
  const defaultDescription = searchQuery
    ? `No results found for "${searchQuery}". Try adjusting your search terms or browse all documents.`
    : 'No results match your current criteria.';

  return (
    <div
      className={cn(
        'flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50',
        className
      )}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>

      <h3 className="mt-4 text-lg font-semibold">{title}</h3>

      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {description || defaultDescription}
      </p>

      {onClearSearch && (
        <Button onClick={onClearSearch} variant="outline" className="mt-4">
          Clear Search
        </Button>
      )}
    </div>
  );
}
