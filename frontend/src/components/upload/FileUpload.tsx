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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DocumentsService, FilesService } from '@/services/files.service';
import { UploadService } from '@/services/upload.service';

interface FileUploadProps {
  onUploadComplete?: (document: any) => void;
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
  uploadedFileId?: string; // Store the uploaded file ID from backend
}

interface DocumentData {
  title?: string;
  description?: string;
  isPublic: boolean;
  language: string;
  tags: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  multiple = true,
  className,
}) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [uploadData, setUploadData] = useState<DocumentData>({
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
    async (newFiles: File[]) => {
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

      // Add files to state first
      if (multiple) {
        setFiles((prev) => [...prev, ...processedFiles]);
      } else {
        setFiles(processedFiles.slice(0, 1));
      }

      // Auto-upload valid files
      const validFiles = processedFiles.filter((f) => !f.error);
      if (validFiles.length > 0) {
        await uploadFilesToStorage(validFiles);
      }
    },
    [allowedTypes, allowedTypesLoaded, multiple]
  );

  // Upload files to storage immediately
  const uploadFilesToStorage = async (filesToUpload: FileWithMetadata[]) => {
    try {
      // Set uploading state for these files
      setFiles((prev) =>
        prev.map((f) => (filesToUpload.find((tf) => tf.id === f.id) ? { ...f, progress: 10 } : f))
      );

      const fileObjects = filesToUpload.map((f) => f.file);
      const uploadResults = await FilesService.uploadFiles(fileObjects);
      const uploadData = uploadResults.data;

      if (!uploadData || uploadData.length === 0) {
        throw new Error('No data returned from API');
      }
      console.log({ uploadResults });
      // Update files with uploaded file IDs
      setFiles((prev) =>
        prev.map((f) => {
          const fileIndex = filesToUpload.findIndex((tf) => tf.id === f.id);
          console.log({ fileIndex, uploadResults });
          if (fileIndex !== -1 && uploadData[fileIndex]) {
            return {
              ...f,
              uploaded: true,
              progress: 100,
              uploadedFileId: uploadData[fileIndex].id,
            };
          }
          return f;
        })
      );
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert('Failed to upload files. Please try again.');
      // Mark files with error
      setFiles((prev) =>
        prev.map((f) =>
          filesToUpload.find((tf) => tf.id === f.id)
            ? { ...f, error: 'Upload failed', progress: undefined }
            : f
        )
      );
    }
  };

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
      setUploadData((prev: DocumentData) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setUploadData((prev: DocumentData) => ({
      ...prev,
      tags: prev.tags?.filter((t: string) => t !== tag) || [],
    }));
  };

  const handleCreateDocument = async () => {
    const uploadedFiles = files.filter((f) => f.uploaded && f.uploadedFileId);
    if (uploadedFiles.length === 0) {
      onUploadError?.('Please upload files first');
      return;
    }

    if (!uploadData.title?.trim()) {
      onUploadError?.('Please provide a title for the document');
      return;
    }

    setUploading(true);

    try {
      const documentData = {
        title: uploadData.title,
        description: uploadData.description,
        fileIds: uploadedFiles.map((f) => f.uploadedFileId!),
        isPublic: uploadData.isPublic,
        tags: uploadData.tags,
        language: uploadData.language,
      };

      const document = await DocumentsService.createDocument(documentData);
      console.log({ document });
      onUploadComplete?.(document);

      // Reset form after successful document creation
      setFiles([]);
      setUploadData({ isPublic: true, language: 'en', tags: [] });
    } catch (error) {
      console.error('Failed to create document:', error);
      onUploadError?.(error instanceof Error ? error.message : 'Failed to create document');
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
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
            dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400',
            files.length > 0 && 'mb-4'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">Click here or drop documents to upload</p>
          <p className="text-sm text-gray-500">
            {multiple ? 'Upload multiple documents' : 'Upload a single document'} (max 100MB each)
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

        {/* Document List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Selected Documents</h3>
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
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={uploadData.title || ''}
              onChange={(e) =>
                setUploadData((prev: DocumentData) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Document title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              value={uploadData.language}
              onValueChange={(value) =>
                setUploadData((prev: DocumentData) => ({ ...prev, language: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="vi">Vietnamese</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
                <SelectItem value="ko">Korean</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={uploadData.description || ''}
            onChange={(e) =>
              setUploadData((prev: DocumentData) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Brief description of the document"
            rows={3}
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {uploadData.tags?.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeTag(tag)}
                  title={`Remove ${tag} tag`}
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
              placeholder="Add a tag (e.g., research, tutorial, guide)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={addTag}
              disabled={!newTag.trim()}
              className="px-3"
            >
              <Plus className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Add</span>
            </Button>
          </div>
          {uploadData.tags && uploadData.tags.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {uploadData.tags.length} tag{uploadData.tags.length > 1 ? 's' : ''} added
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/50">
          <Checkbox
            id="isPublic"
            checked={uploadData.isPublic}
            onCheckedChange={(checked) =>
              setUploadData((prev: DocumentData) => ({ ...prev, isPublic: !!checked }))
            }
          />
          <div className="flex-1">
            <Label htmlFor="isPublic" className="font-medium cursor-pointer">
              Make this document public
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Public documents can be viewed by anyone without login
            </p>
          </div>
        </div>

        {/* Create Document Button */}
        <Button
          onClick={handleCreateDocument}
          disabled={
            files.length === 0 ||
            !files.some((f) => f.uploaded) ||
            !uploadData.title?.trim() ||
            uploading
          }
          className="w-full"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Creating Document...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Create Document
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
