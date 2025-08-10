import React, { useState } from 'react'
import { toast } from 'sonner'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileList } from '@/components/upload/FileList'
import { FileUpload } from '@/components/upload/FileUpload'

import type { FileUploadResponse } from '@/services/upload.service';

export const UploadPage: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = (results: FileUploadResponse[]) => {
    const successCount = results.filter((r) => r.file).length;
    const errorCount = results.filter((r) => 'error' in r).length;

    if (successCount > 0) {
      toast.success(
        `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}`
      );
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleUploadError = (error: string) => {
    toast.error(`Upload failed: ${error}`);
  };

  const handleFileDeleted = () => {
    toast.success('File deleted successfully');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Management</h1>
          <p className="text-gray-600">
            Upload and manage your documents. Supports PDF, Word, Excel, PowerPoint, images, and
            text files.
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
            <TabsTrigger value="files">My Files</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              multiple={true}
            />
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <FileList refreshTrigger={refreshTrigger} onFileDeleted={handleFileDeleted} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
