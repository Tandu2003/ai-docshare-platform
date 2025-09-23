import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'draft' | 'published';
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return { label: 'Active', variant: 'default' as const };
      case 'inactive':
        return { label: 'Inactive', variant: 'destructive' as const };
      case 'pending':
        return { label: 'Pending', variant: 'secondary' as const };
      case 'approved':
        return { label: 'Approved', variant: 'default' as const };
      case 'rejected':
        return { label: 'Rejected', variant: 'destructive' as const };
      case 'draft':
        return { label: 'Draft', variant: 'outline' as const };
      case 'published':
        return { label: 'Published', variant: 'default' as const };
      default:
        return { label: status, variant: 'secondary' as const };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant={variant || config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
