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
      message: `Tài liệu "${document.title}" đã được tạo thành công!`,
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
        title="Tải lên tài liệu"
        description="Tải lên và chia sẻ tài liệu của bạn với cộng đồng. Hỗ trợ PDF, Word, Excel, PowerPoint, hình ảnh và tệp văn bản."
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
