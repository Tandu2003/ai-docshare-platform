import { AlertCircle, CheckCircle, FileText, Plus, Upload, X } from 'lucide-react';

import React, { useCallback, useRef, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FileUploadResponse, UploadFileData, UploadService } from '@/services/upload.service';

interface FileUploadProps {
  onUploadComplete?: (results: FileUploadResponse[]) => void;
  onUploadError?: (error: string) => void;
  multiple?: boolean;
  className?: string;
}

interface FileWithMetadata {
  file: File;
  id: string;
  preview?: string;
  error?: string;
  uploaded?: boolean;
  progress?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  multiple = true,
  className,
}) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [uploadData, setUploadData] = useState<UploadFileData>({
    isPublic: true,
    language: 'en',
    tags: [],
  });
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [allowedTypes, setAllowedTypes] = useState<string[]>([]);
  const [allowedTypesLoaded, setAllowedTypesLoaded] = useState(false);
  const [newTag, setNewTag] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load allowed types on component mount
  React.useEffect(() => {
    UploadService.getAllowedTypes()
      .then((types) => {
        setAllowedTypes(types);
        setAllowedTypesLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load allowed types:', error);
        // If API fails, allow all types
        setAllowedTypes([]);
        setAllowedTypesLoaded(true);
      });
  }, []);

  // Process files helper function wrapped in useCallback to avoid recreation
  const handleFiles = useCallback(
    (newFiles: File[]) => {
      const processedFiles: FileWithMetadata[] = newFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substring(7),
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }));

      // Validate files only if allowed types are loaded
      if (allowedTypesLoaded) {
        processedFiles.forEach((fileWithMetadata) => {
          const error = UploadService.validateFile(fileWithMetadata.file, allowedTypes);
          if (error) {
            fileWithMetadata.error = error;
          }
        });
      }

      if (multiple) {
        setFiles((prev) => [...prev, ...processedFiles]);
      } else {
        setFiles(processedFiles.slice(0, 1));
      }
    },
    [allowedTypes, allowedTypesLoaded, multiple]
  );

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop events
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    },
    [handleFiles]
  );

  // Handle file input
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(Array.from(e.target.files));
      }
    },
    [handleFiles]
  );

  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const fileWithMetadata = prev.find((f) => f.id === fileId);
      if (fileWithMetadata?.preview) {
        URL.revokeObjectURL(fileWithMetadata.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const addTag = () => {
    if (newTag.trim() && !uploadData.tags?.includes(newTag.trim())) {
      setUploadData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setUploadData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  const handleUpload = async () => {
    const validFiles = files.filter((f) => !f.error);
    if (validFiles.length === 0) return;

    console.log(
      'Starting upload with files:',
      validFiles.map((f) => ({ name: f.file.name, size: f.file.size, type: f.file.type }))
    );
    console.log('Upload data:', uploadData);

    setUploading(true);

    // Update files with progress indicators
    setFiles((prev) => prev.map((f) => (!f.error ? { ...f, progress: 0 } : f)));

    try {
      // Extract File objects from FileWithMetadata
      const fileObjects = validFiles.map((f) => f.file);
      console.log({ fileObjects });

      // Use the unified upload method with progress tracking
      console.log('Uploading files...');

      // Set initial progress
      const fileProgresses = new Map<string, number>();
      validFiles.forEach((f) => fileProgresses.set(f.id, 5)); // Start at 5%

      // Update progress periodically to show activity
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) => {
            if (!f.error && !f.uploaded && fileProgresses.has(f.id)) {
              const currentProgress = fileProgresses.get(f.id) || 0;
              // Simulate gradual progress up to 90% (the last 10% when complete)
              const newProgress = Math.min(90, currentProgress + 5);
              fileProgresses.set(f.id, newProgress);
              return { ...f, progress: newProgress };
            }
            return f;
          })
        );
      }, 500);

      try {
        // Perform the upload
        const uploadResult = await UploadService.uploadFiles(fileObjects, uploadData);

        // Clear the progress interval
        clearInterval(progressInterval);

        // Convert to array if single result
        const results: FileUploadResponse[] = Array.isArray(uploadResult)
          ? uploadResult
          : [uploadResult];

        console.log('Upload successful:', results);

        // Mark files as uploaded
        setFiles((prev) => prev.map((f) => ({ ...f, uploaded: true, progress: 100 })));

        onUploadComplete?.(results);

        // Reset form after successful upload
        setTimeout(() => {
          setFiles([]);
          setUploadData({ isPublic: true, language: 'en', tags: [] });
        }, 2000);
      } catch (error) {
        // This shouldn't normally happen since uploadFiles already handles errors
        // but just in case there's an uncaught exception
        clearInterval(progressInterval);
        throw error; // Re-throw to be caught by the outer catch block
      }
    } catch (error) {
      console.error('Upload error:', error);

      // Extract a user-friendly error message
      let errorMessage: string;

      if (error instanceof Error) {
        // Try to determine if it's an R2 error vs database error
        if (error.message.includes('database') || error.message.includes('prisma')) {
          errorMessage =
            'Your file was uploaded to the cloud, but there was an issue saving its information. Please contact support.';
        } else if (error.message.includes('timeout')) {
          errorMessage =
            'The upload timed out. Please try again with a smaller file or check your network connection.';
        } else if (error.message.includes('Upload failed:')) {
          // Keep the specific error message from the server
          errorMessage = error.message;
        } else {
          errorMessage = error.message || 'Upload failed';
        }
      } else {
        errorMessage = 'Upload failed due to an unknown error';
      }

      console.log('Showing error to user:', errorMessage);
      onUploadError?.(errorMessage);

      // Mark files with errors
      setFiles((prev) => prev.map((f) => ({ ...f, error: errorMessage, progress: undefined })));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className={cn('w-full max-w-4xl mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Documents
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Drop Zone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400',
            files.length > 0 && 'mb-4'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">
            Drop files here or{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => fileInputRef.current?.click()}
            >
              browse
            </Button>
          </p>
          <p className="text-sm text-gray-500">
            {multiple ? 'Upload multiple files' : 'Upload a single file'} (max 100MB each)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple={multiple}
            onChange={handleFileInput}
            className="hidden"
            accept={allowedTypes.join(',')}
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Selected Files</h3>
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-3 p-3 border rounded-lg',
                  file.error && 'border-red-200 bg-red-50',
                  file.uploaded && 'border-green-200 bg-green-50'
                )}
              >
                <div className="flex-shrink-0">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    <FileText className="h-10 w-10 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {UploadService.formatFileSize(file.file.size)}
                  </p>

                  {file.error && (
                    <Alert className="mt-2 py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{file.error}</AlertDescription>
                    </Alert>
                  )}

                  {file.progress !== undefined && (
                    <Progress value={file.progress} className="mt-2 h-2" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {file.uploaded ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : file.error ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(file.id)}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={uploadData.title || ''}
              onChange={(e) => setUploadData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Document title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select
              id="language"
              value={uploadData.language}
              onChange={(e) => setUploadData((prev) => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="vi">Vietnamese</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={uploadData.description || ''}
            onChange={(e) => setUploadData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the document"
            rows={3}
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {uploadData.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0"
                  onClick={() => removeTag(tag)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button type="button" size="sm" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isPublic"
            checked={uploadData.isPublic}
            onCheckedChange={(checked) =>
              setUploadData((prev) => ({ ...prev, isPublic: !!checked }))
            }
          />
          <Label htmlFor="isPublic">Make this document public</Label>
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || files.some((f) => f.error) || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload {files.length > 1 ? `${files.length} Files` : 'File'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
