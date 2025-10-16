import React from 'react';

import { Eye, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { incrementViewCount } from '@/services/document.service';
import { UploadedFile, UploadService } from '@/services/upload.service';

interface DocumentViewerProps {
  file: UploadedFile;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ file }) => {
  const onOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      incrementViewCount(file.id);
    }
  };

  return (
    <Sheet onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4" /> View
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col sm:max-w-[80vw]">
        <SheetHeader>
          <SheetTitle className="truncate">{file.originalName}</SheetTitle>
        </SheetHeader>
        <div className="flex-1">
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(
              file.secureUrl || '',
            )}&embedded=true`}
            className="h-full w-full"
            frameBorder="0"
          />
        </div>
        <div className="flex items-center justify-between border-t p-4">
          <div>
            <p className="text-sm font-medium">{file.originalName}</p>
            <p className="text-xs text-gray-500">
              {UploadService.formatFileSize(file.fileSize)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              <Info className="mr-2 h-4 w-4" /> Details
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DocumentViewer;
