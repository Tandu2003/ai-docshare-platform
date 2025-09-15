import { PageHeader } from '@/components/common/page-header';
import { FileUpload } from '@/components/upload/FileUpload';

export const UploadPage: React.FC = () => {
  const handleUploadComplete = () => {
    console.log('Upload completed successfully');
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Upload"
        description="Upload and share your documents with the community. Support for PDF, Word, Excel, PowerPoint, images, and text files."
      />

      <FileUpload
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
        multiple={true}
      />
    </div>
  );
};
