import { Download, Eye, Info } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { downloadFile, incrementViewCount } from '@/services/document.service'
import { UploadedFile, UploadService } from '@/services/upload.service'

interface DocumentViewerProps {
  file: UploadedFile;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ file }) => {
  const onOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      incrementViewCount(file.id);
    }
  };

  const onDownload = async () => {
    try {
      await downloadFile(file.id, file.title || file.originalName);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  return (
    <Sheet onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4" /> View
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[80vw] h-full flex flex-col">
        <SheetHeader>
          <SheetTitle className="truncate">{file.title || file.originalName}</SheetTitle>
        </SheetHeader>
        <div className="flex-1">
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(
              file.filePath || file.storageUrl || ''
            )}&embedded=true`}
            className="w-full h-full"
            frameBorder="0"
          />
        </div>
        <div className="p-4 border-t flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">{file.title || file.originalName}</p>
            <p className="text-xs text-gray-500">{UploadService.formatFileSize(file.fileSize)}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onDownload}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
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
