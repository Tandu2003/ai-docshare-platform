import { useState } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUpload } from '@/components/upload/FileUpload';

export const UploadPage: React.FC = () => {
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleUploadComplete = (document: any) => {
    setUploadStatus({
      type: 'success',
      message: `Document "${document.title}" created successfully!`,
    });
    
    // Clear status after 5 seconds
    setTimeout(() => {
      setUploadStatus({ type: null, message: '' });
    }, 5000);
  };

  const handleUploadError = (error: string) => {
    setUploadStatus({
      type: 'error',
      message: error,
    });
    
    // Clear status after 5 seconds
    setTimeout(() => {
      setUploadStatus({ type: null, message: '' });
    }, 5000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Upload"
        description="Upload and share your documents with the community. Support for PDF, Word, Excel, PowerPoint, images, and text files."
      />

      {uploadStatus.type && (
        <Alert variant={uploadStatus.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{uploadStatus.message}</AlertDescription>
        </Alert>
      )}

      <FileUpload
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
        multiple={true}
      />
    </div>
  );
};
