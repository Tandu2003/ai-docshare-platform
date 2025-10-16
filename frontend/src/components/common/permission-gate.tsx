import { ReactNode } from 'react';

import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGateProps {
  children: ReactNode;
  action: string;
  subject: string;
  conditions?: any;
  fallback?: ReactNode;
  requireAll?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  action,
  subject,
  conditions,
  fallback = null,
  requireAll = false,
}) => {
  try {
    const { can } = usePermissions();
    
    if (!can) {
      console.warn('PermissionGate: can function not available');
      return <>{fallback}</>;
    }
    
    const hasPermission = can(action, subject, conditions);
    
    if (hasPermission) {
      return <>{children}</>;
    }
    
    return <>{fallback}</>;
  } catch (error) {
    console.error('PermissionGate error:', error);
    return <>{fallback}</>;
  }
};

interface RoleGateProps {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
  requireAll?: boolean;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  children,
  roles,
  fallback = null,
  requireAll = false,
}) => {
  try {
    const { user } = usePermissions();
    
    if (!user?.role) {
      return <>{fallback}</>;
    }
    
    const hasRole = requireAll
      ? roles.every(role => user.role.name === role)
      : roles.includes(user.role.name);
    
    if (hasRole) {
      return <>{children}</>;
    }
    
    return <>{fallback}</>;
  } catch (error) {
    console.error('RoleGate error:', error);
    return <>{fallback}</>;
  }
};

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AdminOnly: React.FC<AdminOnlyProps> = ({
  children,
  fallback = null,
}) => {
  try {
    return (
      <RoleGate roles={['admin']} fallback={fallback}>
        {children}
      </RoleGate>
    );
  } catch (error) {
    console.error('AdminOnly error:', error);
    return <>{fallback}</>;
  }
};

interface UserOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const UserOnly: React.FC<UserOnlyProps> = ({
  children,
  fallback = null,
}) => {
  return (
    <RoleGate roles={['user']} fallback={fallback}>
      {children}
    </RoleGate>
  );
};

interface DocumentPermissionGateProps {
  children: ReactNode;
  document: any;
  action: 'view' | 'edit' | 'delete' | 'download' | 'share';
  fallback?: ReactNode;
}

export const DocumentPermissionGate: React.FC<DocumentPermissionGateProps> = ({
  children,
  document,
  action,
  fallback = null,
}) => {
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
};

interface CommentPermissionGateProps {
  children: ReactNode;
  comment: any;
  action: 'edit' | 'delete';
  fallback?: ReactNode;
}

export const CommentPermissionGate: React.FC<CommentPermissionGateProps> = ({
  children,
  comment,
  action,
  fallback = null,
}) => {
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
};

interface BookmarkPermissionGateProps {
  children: ReactNode;
  bookmark: any;
  action: 'edit' | 'delete';
  fallback?: ReactNode;
}

export const BookmarkPermissionGate: React.FC<BookmarkPermissionGateProps> = ({
  children,
  bookmark,
  action,
  fallback = null,
}) => {
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
};
