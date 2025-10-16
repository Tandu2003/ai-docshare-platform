import { useCallback } from 'react';

import { useCasl } from '@/lib/casl';

export const usePermissions = () => {
  try {
    const { can, user } = useCasl();

    if (!can) {
      console.warn('usePermissions: can function not available');
      return {
        can: () => false,
        canRead: () => false,
        canCreate: () => false,
        canUpdate: () => false,
        canDelete: () => false,
        canManage: () => false,
        canUpload: () => false,
        canDownload: () => false,
        canShare: () => false,
        canComment: () => false,
        canRate: () => false,
        canBookmark: () => false,
        isAdmin: () => false,
        isUser: () => false,
        canViewDocument: () => false,
        canEditDocument: () => false,
        canDeleteDocument: () => false,
        canDownloadDocument: () => false,
        canShareDocument: () => false,
        canEditComment: () => false,
        canDeleteComment: () => false,
        canEditBookmark: () => false,
        canDeleteBookmark: () => false,
      };
    }

    // Permission helpers
    const canRead = useCallback(
      (subject: string, conditions?: any) => {
        return can('read', subject, conditions);
      },
      [can],
    );

    const canCreate = useCallback(
      (subject: string, conditions?: any) => {
        return can('create', subject, conditions);
      },
      [can],
    );

    const canUpdate = useCallback(
      (subject: string, conditions?: any) => {
        return can('update', subject, conditions);
      },
      [can],
    );

    const canDelete = useCallback(
      (subject: string, conditions?: any) => {
        return can('delete', subject, conditions);
      },
      [can],
    );

    const canManage = useCallback(
      (subject: string, conditions?: any) => {
        return can('manage', subject, conditions);
      },
      [can],
    );

    const canUpload = useCallback(
      (subject: string, conditions?: any) => {
        return can('upload', subject, conditions);
      },
      [can],
    );

    const canDownload = useCallback(
      (subject: string, conditions?: any) => {
        return can('download', subject, conditions);
      },
      [can],
    );

    const canShare = useCallback(
      (subject: string, conditions?: any) => {
        return can('share', subject, conditions);
      },
      [can],
    );

    const canComment = useCallback(
      (subject: string, conditions?: any) => {
        return can('comment', subject, conditions);
      },
      [can],
    );

    const canRate = useCallback(
      (subject: string, conditions?: any) => {
        return can('rate', subject, conditions);
      },
      [can],
    );

    const canBookmark = useCallback(
      (subject: string, conditions?: any) => {
        return can('bookmark', subject, conditions);
      },
      [can],
    );

    // Role helpers
    const isAdmin = useCallback(() => {
      return user?.role?.name === 'admin';
    }, [user]);

    const isUser = useCallback(() => {
      return user?.role?.name === 'user';
    }, [user]);

    // Document specific permissions
    const canViewDocument = useCallback(
      (document: any) => {
        if (!document) return false;

        // Admin can view all documents
        if (isAdmin()) return true;

        // User can view public approved documents or their own documents
        return (
          (document.isPublic && document.isApproved) ||
          document.uploaderId === user?.id
        );
      },
      [isAdmin, user],
    );

    const canEditDocument = useCallback(
      (document: any) => {
        if (!document) return false;

        // Admin can edit all documents
        if (isAdmin()) return true;

        // User can only edit their own documents
        return document.uploaderId === user?.id;
      },
      [isAdmin, user],
    );

    const canDeleteDocument = useCallback(
      (document: any) => {
        if (!document) return false;

        // Admin can delete all documents
        if (isAdmin()) return true;

        // User can only delete their own documents
        return document.uploaderId === user?.id;
      },
      [isAdmin, user],
    );

    const canDownloadDocument = useCallback(
      (document: any) => {
        if (!document) return false;

        // Admin can download all documents
        if (isAdmin()) return true;

        // User can download public approved documents or their own documents
        return (
          (document.isPublic && document.isApproved) ||
          document.uploaderId === user?.id
        );
      },
      [isAdmin, user],
    );

    const canShareDocument = useCallback(
      (document: any) => {
        if (!document) return false;

        // Admin can share all documents
        if (isAdmin()) return true;

        // User can only share their own documents
        return document.uploaderId === user?.id;
      },
      [isAdmin, user],
    );

    // Comment specific permissions
    const canEditComment = useCallback(
      (comment: any) => {
        if (!comment) return false;

        // Admin can edit all comments
        if (isAdmin()) return true;

        // User can only edit their own comments
        return comment.userId === user?.id;
      },
      [isAdmin, user],
    );

    const canDeleteComment = useCallback(
      (comment: any) => {
        if (!comment) return false;

        // Admin can delete all comments
        if (isAdmin()) return true;

        // User can only delete their own comments
        return comment.userId === user?.id;
      },
      [isAdmin, user],
    );

    // Bookmark specific permissions
    const canEditBookmark = useCallback(
      (bookmark: any) => {
        if (!bookmark) return false;

        // Admin can edit all bookmarks
        if (isAdmin()) return true;

        // User can only edit their own bookmarks
        return bookmark.userId === user?.id;
      },
      [isAdmin, user],
    );

    const canDeleteBookmark = useCallback(
      (bookmark: any) => {
        if (!bookmark) return false;

        // Admin can delete all bookmarks
        if (isAdmin()) return true;

        // User can only delete their own bookmarks
        return bookmark.userId === user?.id;
      },
      [isAdmin, user],
    );

    return {
      // Raw CASL can function
      can,

      // Basic permissions
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canManage,
      canUpload,
      canDownload,
      canShare,
      canComment,
      canRate,
      canBookmark,

      // Role helpers
      isAdmin,
      isUser,

      // Document permissions
      canViewDocument,
      canEditDocument,
      canDeleteDocument,
      canDownloadDocument,
      canShareDocument,

      // Comment permissions
      canEditComment,
      canDeleteComment,

      // Bookmark permissions
      canEditBookmark,
      canDeleteBookmark,
    };
  } catch (error) {
    console.error('usePermissions error:', error);
    return {
      can: () => false,
      canRead: () => false,
      canCreate: () => false,
      canUpdate: () => false,
      canDelete: () => false,
      canManage: () => false,
      canUpload: () => false,
      canDownload: () => false,
      canShare: () => false,
      canComment: () => false,
      canRate: () => false,
      canBookmark: () => false,
      isAdmin: () => false,
      isUser: () => false,
      canViewDocument: () => false,
      canEditDocument: () => false,
      canDeleteDocument: () => false,
      canDownloadDocument: () => false,
      canShareDocument: () => false,
      canEditComment: () => false,
      canDeleteComment: () => false,
      canEditBookmark: () => false,
      canDeleteBookmark: () => false,
    };
  }
};
