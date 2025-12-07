import type { DocumentModerationStatus } from '@/types/database.types';
export interface DocumentStatusInfo {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}
export function getDocumentStatusInfo(
  isApproved: boolean,
  moderationStatus?: DocumentModerationStatus,
  needsReModeration?: boolean,
): DocumentStatusInfo {
  // If document requires re-moderation (e.g., user changed privacy),
  // always show "Chờ kiểm duyệt lại" regardless of previous approval
  if (needsReModeration) {
    return {
      label: 'Chờ kiểm duyệt lại',
      variant: 'secondary',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
  }

  // If document is approved, show approved status
  if (isApproved) {
    return {
      label: 'Đã duyệt',
      variant: 'default',
      className: 'bg-green-100 text-green-800 border-green-200',
    };
  }

  // If document is rejected, show rejected status
  if (moderationStatus === 'REJECTED') {
    return {
      label: 'Bị từ chối',
      variant: 'destructive',
      className: 'bg-red-100 text-red-800 border-red-200',
    };
  }

  // If document is pending or undefined, show pending status
  if (moderationStatus === 'PENDING' || !moderationStatus) {
    return {
      label: 'Chờ duyệt',
      variant: 'secondary',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
  }

  // Default case - should not happen but fallback to pending
  return {
    label: 'Chờ duyệt',
    variant: 'secondary',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };
}

export function getStatusIcon(status: DocumentStatusInfo) {
  switch (status.variant) {
    case 'default':
      return '✅';
    case 'destructive':
      return '❌';
    case 'secondary':
      return '⏳';
    default:
      return '⏳';
  }
}
