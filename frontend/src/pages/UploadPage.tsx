import React, { useState } from 'react'
import { toast } from 'sonner'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DocumentList } from '@/components/upload/DocumentList'
import { FileUpload } from '@/components/upload/FileUpload'

import type { FileUploadResponse } from '@/services/upload.service';

export const UploadPage: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = (results: FileUploadResponse[]) => {
    toast.success('Files uploaded successfully');
    setRefreshTrigger((prev) => prev + 1);
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
            <TabsTrigger value="upload">Upload Documents</TabsTrigger>
            <TabsTrigger value="files">My Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              multiple={true}
            />
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <DocumentList refreshTrigger={refreshTrigger} onDocumentDeleted={handleFileDeleted} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
