import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CreateDocumentData,
  DocumentsService,
  FileUploadResult,
  FilesService,
} from '@/services/files.service';
import { UploadService } from '@/services/upload.service';

const FileUploadDemo: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [documentData, setDocumentData] = useState<CreateDocumentData>({
    title: '',
    description: '',
    fileIds: [],
    isPublic: true,
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const results = await FilesService.uploadFiles(selectedFiles);
      if (results.data) {
        setUploadedFiles(results.data);
        setDocumentData((prev) => ({
          ...prev,
          fileIds: results.data!.map((f) => f.id),
        }));
      }
      alert('Files uploaded successfully!');
    } catch (error) {
      alert('Failed to upload files: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  console.log({ uploadedFiles, documentData });

  const handleCreateDocument = async () => {
    if (!documentData.title || uploadedFiles.length === 0) {
      alert('Please provide a title and upload files first');
      return;
    }

    setIsCreatingDocument(true);
    try {
      const document = await DocumentsService.createDocument(documentData);
      alert('Document created successfully!');
      console.log('Created document:', document);

      // Reset form
      setSelectedFiles([]);
      setUploadedFiles([]);
      setDocumentData({
        title: '',
        description: '',
        fileIds: [],
        isPublic: true,
      });
    } catch (error) {
      alert('Failed to create document: ' + (error as Error).message);
    } finally {
      setIsCreatingDocument(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>File Upload Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="files">Select Files</Label>
            <Input
              id="files"
              type="file"
              multiple
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.txt,.jpg,.png"
            />
          </div>

          {selectedFiles.length > 0 && (
            <div>
              <p className="text-sm text-gray-600">Selected {selectedFiles.length} file(s):</p>
              <ul className="text-sm">
                {selectedFiles.map((file, index) => (
                  <li key={index}>
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={handleUploadFiles} disabled={selectedFiles.length === 0 || isUploading}>
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex justify-between items-center p-2 border rounded">
                  <span>{file.originalName}</span>
                  <span className="text-sm text-gray-500">
                    {UploadService.formatFileSize(file.fileSize)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Create Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={documentData.title}
                onChange={(e) => setDocumentData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Enter document title"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={documentData.description}
                onChange={(e) =>
                  setDocumentData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Enter document description"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={documentData.isPublic}
                onChange={(e) =>
                  setDocumentData((prev) => ({ ...prev, isPublic: e.target.checked }))
                }
              />
              <Label htmlFor="isPublic">Make document public</Label>
            </div>

            <Button
              onClick={handleCreateDocument}
              disabled={!documentData.title || isCreatingDocument}
            >
              {isCreatingDocument ? 'Creating...' : 'Create Document'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUploadDemo;
