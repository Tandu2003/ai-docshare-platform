import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status:
    | 'active'
    | 'inactive'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'draft'
    | 'published';
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return { label: 'Đang hoạt động', variant: 'default' as const };
      case 'inactive':
        return { label: 'Không hoạt động', variant: 'destructive' as const };
      case 'pending':
        return { label: 'Đang chờ', variant: 'secondary' as const };
      case 'approved':
        return { label: 'Đã duyệt', variant: 'default' as const };
      case 'rejected':
        return { label: 'Đã từ chối', variant: 'destructive' as const };
      case 'draft':
        return { label: 'Bản nháp', variant: 'outline' as const };
      case 'published':
        return { label: 'Đã xuất bản', variant: 'default' as const };
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
