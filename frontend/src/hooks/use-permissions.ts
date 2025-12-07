import { useCallback } from 'react';

import { useAppSelector } from './use-redux';

export const usePermissions = () => {
  const user = useAppSelector(state => state.auth.user);
  const isAdmin = useCallback(() => user?.role?.name === 'admin', [user]);
  const isUser = useCallback(() => user?.role?.name === 'user', [user]);
  // Document specific permissions
  const canViewDocument = useCallback(
    (document: any) => {
      if (!document) return false;
      if (isAdmin()) return true;
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
      if (isAdmin()) return true;
      return document.uploaderId === user?.id;
    },
    [isAdmin, user],
  );

  const canDeleteDocument = useCallback(
    (document: any) => {
      if (!document) return false;
      if (isAdmin()) return true;
      return document.uploaderId === user?.id;
    },
    [isAdmin, user],
  );

  const canDownloadDocument = useCallback(
    (document: any) => {
      if (!document) return false;
      if (isAdmin()) return true;
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
      if (isAdmin()) return true;
      return document.uploaderId === user?.id;
    },
    [isAdmin, user],
  );

  // Comment specific permissions
  const canEditComment = useCallback(
    (comment: any) => {
      if (!comment) return false;
      if (isAdmin()) return true;
      return comment.userId === user?.id;
    },
    [isAdmin, user],
  );

  const canDeleteComment = useCallback(
    (comment: any) => {
      if (!comment) return false;
      if (isAdmin()) return true;
      return comment.userId === user?.id;
    },
    [isAdmin, user],
  );

  // Bookmark specific permissions
  const canEditBookmark = useCallback(
    (bookmark: any) => {
      if (!bookmark) return false;
      if (isAdmin()) return true;
      return bookmark.userId === user?.id;
    },
    [isAdmin, user],
  );

  const canDeleteBookmark = useCallback(
    (bookmark: any) => {
      if (!bookmark) return false;
      if (isAdmin()) return true;
      return bookmark.userId === user?.id;
    },
    [isAdmin, user],
  );

  return {
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
};
