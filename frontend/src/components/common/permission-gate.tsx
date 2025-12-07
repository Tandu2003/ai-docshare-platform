import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
interface PermissionGateProps {
  children: ReactNode;
  action?: string; // kept for backward compatibility (ignored in simplified RBAC)
  subject?: string; // kept for backward compatibility (ignored)
  fallback?: ReactNode;
}
// Simplified generic gate: with only two roles (admin/user) we default to admin-only
// for any explicit gating previously done via action/subject. If more granular
// ownership checks are needed, use the specific *PermissionGate components below.
export function PermissionGate({
  children,
  fallback = null,
}: PermissionGateProps) {
  const { isAdmin } = usePermissions();
  const hasPermission = isAdmin();
  return <>{hasPermission ? children : fallback}</>;
}

interface RoleGateProps {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
}

export function RoleGate({ children, roles, fallback = null }: RoleGateProps) {
  const { isAdmin, isUser } = usePermissions();

  const userHasAnyRole = () => {
    if (roles.includes('admin') && isAdmin()) return true;
    if (roles.includes('user') && isUser()) return true;
    return false;
  };

  if (!userHasAnyRole()) {
    return <>{fallback}</>;
  }

  if (userHasAnyRole()) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  return (
    <RoleGate roles={['admin']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

interface UserOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function UserOnly({ children, fallback = null }: UserOnlyProps) {
  return (
    <RoleGate roles={['user']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

interface DocumentPermissionGateProps {
  children: ReactNode;
  document: any;
  action: 'view' | 'edit' | 'delete' | 'download' | 'share';
  fallback?: ReactNode;
}

export function DocumentPermissionGate({
  children,
  document,
  action,
  fallback = null,
}: DocumentPermissionGateProps) {
  const {
    canViewDocument,
    canEditDocument,
    canDeleteDocument,
    canDownloadDocument,
    canShareDocument,
  } = usePermissions();

  let hasPermission = false;

  switch (action) {
    case 'view':
      hasPermission = canViewDocument(document);
      break;
    case 'edit':
      hasPermission = canEditDocument(document);
      break;
    case 'delete':
      hasPermission = canDeleteDocument(document);
      break;
    case 'download':
      hasPermission = canDownloadDocument(document);
      break;
    case 'share':
      hasPermission = canShareDocument(document);
      break;
    default:
      hasPermission = false;
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface CommentPermissionGateProps {
  children: ReactNode;
  comment: any;
  action: 'edit' | 'delete';
  fallback?: ReactNode;
}

export function CommentPermissionGate({
  children,
  comment,
  action,
  fallback = null,
}: CommentPermissionGateProps) {
  const { canEditComment, canDeleteComment } = usePermissions();

  let hasPermission = false;

  switch (action) {
    case 'edit':
      hasPermission = canEditComment(comment);
      break;
    case 'delete':
      hasPermission = canDeleteComment(comment);
      break;
    default:
      hasPermission = false;
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface BookmarkPermissionGateProps {
  children: ReactNode;
  bookmark: any;
  action: 'edit' | 'delete';
  fallback?: ReactNode;
}

export function BookmarkPermissionGate({
  children,
  bookmark,
  action,
  fallback = null,
}: BookmarkPermissionGateProps) {
  const { canEditBookmark, canDeleteBookmark } = usePermissions();

  let hasPermission = false;

  switch (action) {
    case 'edit':
      hasPermission = canEditBookmark(bookmark);
      break;
    case 'delete':
      hasPermission = canDeleteBookmark(bookmark);
      break;
    default:
      hasPermission = false;
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
