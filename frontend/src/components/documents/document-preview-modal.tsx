/**
 * @deprecated This component is deprecated as of the Document Detail Page Redesign.
 * The preview is now displayed inline using DocumentPreviewPanel instead of in a modal.
 * This file is kept for potential future use but should not be used in new code.
 * @see DocumentPreviewPanel for the current inline preview implementation
 */
import { useEffect, useState, type ReactElement } from 'react';

import { DocumentPreviewViewer } from '@/components/documents/document-preview-viewer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  DocumentPreview,
  PreviewStatus,
} from '@/services/document.service';
import { PreviewService } from '@/services/preview.service';

/**
 * @deprecated Use DocumentPreviewPanel for inline preview display instead.
 */
interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  previews?: DocumentPreview[];
  previewStatus?: PreviewStatus;
  previewCount?: number;
  isOwner?: boolean;
  hasAccess?: boolean;
  apiKey?: string;
}

/**
 * @deprecated This component is deprecated. Use DocumentPreviewPanel for inline preview display.
 * The Document Detail Page Redesign moved preview display from modal to inline panel.
 */
export function DocumentPreviewModal({
  open,
  onOpenChange,
  documentId,
  previews: initialPreviews,
  previewStatus: initialStatus,
  previewCount,
  isOwner = false,
  hasAccess = true,
  apiKey,
}: DocumentPreviewModalProps): ReactElement {
  const [previews, setPreviews] = useState<DocumentPreview[]>(
    initialPreviews || [],
  );
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>(
    initialStatus || 'PENDING',
  );

  // Refresh previews when modal opens to get fresh URLs
  useEffect(() => {
    if (!open || !hasAccess) {
      // Reset to initial values when modal closes
      if (initialPreviews) {
        setPreviews(initialPreviews);
      }
      if (initialStatus) {
        setPreviewStatus(initialStatus);
      }
      return;
    }

    const refreshPreviews = async () => {
      try {
        // First check status
        const status = await PreviewService.getPreviewStatus(documentId);
        setPreviewStatus(status.status);

        if (status.status === 'COMPLETED') {
          // Fetch fresh preview URLs
          const result = await PreviewService.getDocumentPreviews(
            documentId,
            apiKey,
          );
          setPreviews(result.previews);
        }
      } catch (err) {
        // Keep initial values on error
        if (initialPreviews) {
          setPreviews(initialPreviews);
        }
        if (initialStatus) {
          setPreviewStatus(initialStatus);
        }
      }
    };

    // Always refresh when modal opens to get fresh URLs
    // This ensures URLs are not expired
    void refreshPreviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentId, apiKey, hasAccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95vh] w-full max-w-[95vw] flex-col p-0">
        <DialogHeader className="flex-shrink-0 border-b px-6 pt-6 pb-4">
          <DialogTitle>Xem trước tài liệu</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6 pb-6">
          <DocumentPreviewViewer
            documentId={documentId}
            previews={previews}
            previewStatus={previewStatus}
            previewCount={previewCount}
            isOwner={isOwner}
            hasAccess={hasAccess}
            apiKey={apiKey}
            className="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
