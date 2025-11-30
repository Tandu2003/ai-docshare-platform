import React, { useCallback, useRef, useState } from 'react';

import {
  AlertCircle,
  CheckCircle,
  FileText,
  FolderTree,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { CategorySelector } from '@/components/categories/CategorySelector';
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
import { AIService, type DocumentAnalysisResult } from '@/services/ai.service';
import {
  DocumentsService,
  FilesService,
  FileUploadResult,
} from '@/services/files.service';

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
  fileId?: string; // ID returned from upload API
}

interface DocumentData {
  title?: string;
  description?: string;
  categoryId?: string;
  isPublic: boolean;
  language: string;
  tags: string[];
  downloadCost?: number | null; // null = use system default
}

interface AIAnalysisState {
  isAnalyzing: boolean;
  analysisResult: DocumentAnalysisResult | null;
  error: string | null;
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
    categoryId: undefined,
    downloadCost: null, // null = use system default
  });
  const [userEditedLanguage, setUserEditedLanguage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisState>({
    isAnalyzing: false,
    analysisResult: null,
    error: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File validation
  const validateFile = (file: File): string | null => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (file.size > maxSize) {
      return 'Kích thước tệp phải nhỏ hơn 100MB';
    }

    if (!allowedTypes.includes(file.type)) {
      return 'Loại tệp không được hỗ trợ';
    }

    return null;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Process files helper function
  const handleFiles = useCallback(
    async (newFiles: File[]) => {
      const processedFiles: FileWithMetadata[] = newFiles.map(file => {
        const error = validateFile(file);
        return {
          file,
          id: Math.random().toString(36).substring(7),
          preview: file.type.startsWith('image/')
            ? URL.createObjectURL(file)
            : undefined,
          error: error || undefined,
        };
      });

      // Add files to state
      if (multiple) {
        setFiles(prev => [...prev, ...processedFiles]);
      } else {
        // For single file mode, completely clear state and start fresh
        setFiles(processedFiles.slice(0, 1));
        setAiAnalysis({
          isAnalyzing: false,
          analysisResult: null,
          error: null,
        });
        // Clear any cached file IDs
        localStorage.removeItem('cachedFileIds');
        sessionStorage.removeItem('cachedFileIds');
      }

      // Upload valid files using real API
      const validFiles = processedFiles.filter(f => !f.error);
      if (validFiles.length > 0) {
        await uploadFilesToAPI(validFiles);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [multiple],
  );

  // Real file upload using API
  const uploadFilesToAPI = async (filesToUpload: FileWithMetadata[]) => {
    try {
      // Set uploading state
      setFiles(prev =>
        prev.map(f =>
          filesToUpload.find(tf => tf.id === f.id) ? { ...f, progress: 10 } : f,
        ),
      );

      // Extract File objects for upload
      const fileObjects = filesToUpload.map(f => f.file);

      // Upload files using real API
      const response = await FilesService.uploadFiles(fileObjects);

      if (response.success && response.data) {
        toast.success(`Tải lên ${response.data.length} tệp thành công`);
        // Build a robust mapping from server results to local files
        const results = response.data;
        const resultsBuckets = new Map<string, FileUploadResult[]>();
        results.forEach(r => {
          const key = `${r.originalName}|${r.mimeType}|${r.fileSize}`;
          const arr = resultsBuckets.get(key) || [];
          arr.push(r);
          resultsBuckets.set(key, arr);
        });

        setFiles(prev =>
          prev.map(f => {
            const fileToUpload = filesToUpload.find(tf => tf.id === f.id);
            if (!fileToUpload) return f;

            // Prefer name+type+size matching; fallback to index order when needed
            const key = `${fileToUpload.file.name}|${fileToUpload.file.type}|${fileToUpload.file.size}`;
            let matched: FileUploadResult | undefined;

            const bucket = resultsBuckets.get(key);
            if (bucket && bucket.length > 0) {
              matched = bucket.shift();
            } else {
              const index = filesToUpload.findIndex(tf => tf.id === f.id);
              matched = results[index];
            }

            return matched
              ? {
                  ...f,
                  uploaded: true,
                  progress: 100,
                  fileId: matched.id,
                }
              : f;
          }),
        );

        // Trigger AI analysis after successful upload (consider ALL uploaded files)
        const newlyUploadedIds = response.data.map(f => f.id);

        // Create a combined file info mapping for AI analysis
        const fileInfoMap = new Map<
          string,
          { id: string; name: string; type: string }
        >();

        // Add current batch file infos
        response.data.forEach((uploadedFile, index) => {
          const originalFile = filesToUpload[index];
          fileInfoMap.set(uploadedFile.id, {
            id: uploadedFile.id,
            name: originalFile.file.name,
            type: originalFile.file.type,
          });
        });

        // Add previously uploaded file infos from state
        files
          .filter(f => f.uploaded && f.fileId)
          .forEach(f => {
            if (!fileInfoMap.has(f.fileId!)) {
              fileInfoMap.set(f.fileId!, {
                id: f.fileId!,
                name: f.file.name,
                type: f.file.type,
              });
            }
          });

        // Only analyze the newly uploaded files, not all files in state
        if (newlyUploadedIds.length === 0) {
          toast.error('Không tìm thấy file vừa upload. Vui lòng thử lại.');
          return;
        }

        analyzeFilesWithAI(newlyUploadedIds, fileInfoMap);
      } else {
        toast.error('Tải lên thất bại');
        throw new Error('Tải lên thất bại');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'Tải lên thất bại');
      setFiles(prev =>
        prev.map(f =>
          filesToUpload.find(tf => tf.id === f.id)
            ? { ...f, error: 'Tải lên thất bại', progress: undefined }
            : f,
        ),
      );
    }
  };

  // AI Analysis function
  const analyzeFilesWithAI = async (
    fileIds: string[],
    fileInfoMap?: Map<string, { id: string; name: string; type: string }>,
  ) => {
    try {
      setAiAnalysis(prev => ({ ...prev, isAnalyzing: true, error: null }));

      // Note: We don't validate file ownership here in the frontend
      // because the backend will handle this validation properly.
      // The backend will check if the files belong to the current user
      // and return appropriate error messages if they don't.

      let supportedFiles: { id: string; name: string; type: string }[] = [];

      if (fileInfoMap) {
        // Use file info from upload response
        supportedFiles = fileIds
          .map(id => fileInfoMap.get(id))
          .filter(
            fileInfo =>
              fileInfo && AIService.isFileTypeSupported(fileInfo.name),
          ) as {
          id: string;
          name: string;
          type: string;
        }[];
      } else {
        // Fallback to state-based approach
        const uploadedFiles = files.filter(
          f => f.uploaded && f.fileId && fileIds.includes(f.fileId),
        );
        supportedFiles = uploadedFiles
          .filter(f => AIService.isFileTypeSupported(f.file.name))
          .map(f => ({ id: f.fileId!, name: f.file.name, type: f.file.type }));
      }

      if (supportedFiles.length === 0) {
        const allFileInfo = fileIds
          .map(id => {
            const fileInfo = fileInfoMap?.get(id);
            return fileInfo
              ? `${fileInfo.name} (${fileInfo.name.split('.').pop()?.toLowerCase()})`
              : 'unknown';
          })
          .join(', ');

        setAiAnalysis(prev => ({
          ...prev,
          isAnalyzing: false,
          error: `No supported file types for AI analysis. Files: ${allFileInfo}. Supported: ${AIService.getSupportedFileTypes().join(', ')}`,
        }));
        return;
      }

      // Use only supported file IDs for analysis
      const supportedFileIds = supportedFiles.map(f => f.id);
      const analysisResponse = await AIService.analyzeDocument({
        fileIds: supportedFileIds,
      });

      if (analysisResponse.success && analysisResponse.data) {
        const analysisResult = analysisResponse.data;

        // Update form with AI suggestions
        setUploadData(prev => {
          const resolvedLanguage = userEditedLanguage
            ? prev.language || 'en'
            : analysisResult.language || prev.language || 'en';

          return {
            ...prev,
            title: prev.title || analysisResult.title || '',
            description: prev.description || analysisResult.description || '',
            tags: prev.tags.length > 0 ? prev.tags : analysisResult.tags || [],
            language: resolvedLanguage,
            // Auto-select category if AI suggests one and user hasn't selected
            categoryId:
              prev.categoryId ||
              analysisResult.suggestedCategoryId ||
              undefined,
          };
        });

        setAiAnalysis(prev => ({
          ...prev,
          isAnalyzing: false,
          analysisResult,
          error: null,
        }));
      } else {
        throw new Error('Phân tích AI thất bại');
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      setAiAnalysis(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Phân tích AI thất bại',
      }));
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
    [handleFiles],
  );

  // Handle file input
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(Array.from(e.target.files));
      }
    },
    [handleFiles],
  );

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const fileWithMetadata = prev.find(f => f.id === fileId);
      if (fileWithMetadata?.preview) {
        URL.revokeObjectURL(fileWithMetadata.preview);
      }
      return prev.filter(f => f.id !== fileId);
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
    const uploadedFiles = files.filter(f => f.uploaded && f.fileId);
    if (uploadedFiles.length === 0) {
      onUploadError?.('Vui lòng tải lên tệp trước');
      return;
    }

    if (!uploadData.title?.trim()) {
      onUploadError?.('Vui lòng cung cấp tiêu đề cho tài liệu');
      return;
    }

    if (!uploadData.categoryId) {
      toast.error('Vui lòng chọn danh mục cho tài liệu');
      onUploadError?.('Vui lòng chọn danh mục cho tài liệu');
      return;
    }

    setUploading(true);

    try {
      // Create document using real API
      const documentData = {
        title: uploadData.title,
        description: uploadData.description,
        fileIds: uploadedFiles.map(f => f.fileId!),
        categoryId: uploadData.categoryId,
        isPublic: uploadData.isPublic,
        tags: uploadData.tags,
        language: uploadData.language,
        downloadCost: uploadData.downloadCost,
      };

      const document = await DocumentsService.createDocument(documentData);

      onUploadComplete?.(document);
      toast.success('Tạo tài liệu thành công');

      // Reset form after successful document creation
      setFiles([]);
      setUploadData({
        isPublic: true,
        language: 'en',
        tags: [],
        categoryId: undefined,
        downloadCost: null,
      });
      setAiAnalysis({ isAnalyzing: false, analysisResult: null, error: null });
      setUserEditedLanguage(false);
    } catch (error) {
      console.error('Failed to create document:', error);
      toast.error(
        error instanceof Error ? error.message : 'Không thể tạo tài liệu',
      );
      onUploadError?.(
        error instanceof Error ? error.message : 'Không thể tạo tài liệu',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Tải lên tài liệu
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Drop Zone */}
        <div
          className={cn(
            'cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
            files.length > 0 && 'mb-4',
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="mb-2 text-lg font-medium">
            Nhấn vào đây hoặc kéo thả tài liệu để tải lên
          </p>
          <p className="text-muted-foreground text-sm">
            {multiple ? 'Tải lên nhiều tài liệu' : 'Tải lên một tài liệu'} (tối
            đa 100MB mỗi tệp)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple={multiple}
            onChange={handleFileInput}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
          />
        </div>

        {/* Document List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Tài liệu đã chọn</h3>
            {files.map(file => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3',
                  file.error && 'border-destructive/50 bg-destructive/5',
                  file.uploaded && 'border-green-500/50 bg-green-500/5',
                )}
              >
                <div className="flex-shrink-0">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <FileText className="text-muted-foreground h-10 w-10" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {file.file.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatFileSize(file.file.size)}
                  </p>

                  {file.error && (
                    <Alert className="mt-2 py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {file.error}
                      </AlertDescription>
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
                    <AlertCircle className="text-destructive h-5 w-5" />
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

        {/* AI Analysis Status */}
        {aiAnalysis.isAnalyzing && (
          <Alert className="flex items-center gap-2">
            <div className="border-primary h-4 w-4 animate-spin rounded-full border-b-2"></div>
            <span className="text-sm">
              AI đang phân tích tài liệu của bạn...
            </span>
          </Alert>
        )}

        {aiAnalysis.error && (
          <Alert variant="destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Lỗi phân tích AI: {aiAnalysis.error}
              </span>
            </div>
          </Alert>
        )}

        {aiAnalysis.analysisResult && (
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    AI đã phân tích tài liệu của bạn!
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const uploadedFiles = files.filter(
                        f => f.uploaded && f.fileId,
                      );
                      const supportedFiles = uploadedFiles.filter(f =>
                        AIService.isFileTypeSupported(f.file.name),
                      );
                      if (supportedFiles.length > 0) {
                        analyzeFilesWithAI(supportedFiles.map(f => f.fileId!));
                      }
                    }}
                    disabled={aiAnalysis.isAnalyzing}
                    className="text-xs"
                  >
                    Phân tích lại
                  </Button>
                </div>
                {aiAnalysis.analysisResult.summary && (
                  <p className="text-sm">
                    <strong>Tóm tắt:</strong>{' '}
                    {aiAnalysis.analysisResult.summary}
                  </p>
                )}
                {aiAnalysis.analysisResult.keyPoints &&
                  aiAnalysis.analysisResult.keyPoints.length > 0 && (
                    <div className="text-sm">
                      <strong>Điểm chính:</strong>
                      <ul className="ml-2 list-inside list-disc">
                        {aiAnalysis.analysisResult.keyPoints
                          .slice(0, 3)
                          .map((point, index) => (
                            <li key={index}>{point}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                {aiAnalysis.analysisResult.confidence && (
                  <p className="text-sm">
                    <strong>Độ tin cậy:</strong>{' '}
                    {Math.round(aiAnalysis.analysisResult.confidence * 100)}%
                  </p>
                )}
                {aiAnalysis.analysisResult.suggestedCategoryName && (
                  <p className="text-sm">
                    <strong>Danh mục gợi ý:</strong>{' '}
                    {aiAnalysis.analysisResult.suggestedCategoryName}
                    {aiAnalysis.analysisResult.categoryConfidence && (
                      <span className="text-muted-foreground ml-1">
                        (
                        {Math.round(
                          aiAnalysis.analysisResult.categoryConfidence * 100,
                        )}
                        % chắc chắn)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Settings */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề *</Label>
            <div className="relative">
              <Input
                id="title"
                value={uploadData.title || ''}
                onChange={e =>
                  setUploadData((prev: DocumentData) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Tiêu đề tài liệu"
                required
                className={cn(
                  aiAnalysis.analysisResult?.title &&
                    !uploadData.title &&
                    'border-blue-300 bg-blue-50',
                )}
              />
              {aiAnalysis.analysisResult?.title && !uploadData.title && (
                <div className="absolute top-1/2 right-2 -translate-y-1/2 transform">
                  <Badge variant="secondary" className="text-xs">
                    Được đề xuất bởi AI
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              value={uploadData.language}
              onValueChange={value => {
                setUserEditedLanguage(true);
                setUploadData((prev: DocumentData) => ({
                  ...prev,
                  language: value,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn ngôn ngữ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">Tiếng Anh</SelectItem>
                <SelectItem value="vi">Tiếng Việt</SelectItem>
                <SelectItem value="es">Tiếng Tây Ban Nha</SelectItem>
                <SelectItem value="fr">Tiếng Pháp</SelectItem>
                <SelectItem value="de">Tiếng Đức</SelectItem>
                <SelectItem value="zh">Tiếng Trung</SelectItem>
                <SelectItem value="ja">Tiếng Nhật</SelectItem>
                <SelectItem value="ko">Tiếng Hàn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Mô tả (tùy chọn)</Label>
          <div className="relative">
            <Textarea
              id="description"
              value={uploadData.description || ''}
              onChange={e =>
                setUploadData((prev: DocumentData) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Mô tả ngắn gọn về tài liệu"
              rows={3}
              className={cn(
                aiAnalysis.analysisResult?.description &&
                  !uploadData.description &&
                  'border-blue-300 bg-blue-50',
              )}
            />
            {aiAnalysis.analysisResult?.description &&
              !uploadData.description && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-xs">
                    AI Suggested
                  </Badge>
                </div>
              )}
          </div>
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Danh mục *
          </Label>
          <CategorySelector
            value={uploadData.categoryId}
            onChange={categoryId =>
              setUploadData((prev: DocumentData) => ({
                ...prev,
                categoryId,
              }))
            }
            disabled={uploading}
            showAiSuggestions={false}
            required
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Thẻ</Label>
            {aiAnalysis.analysisResult?.tags &&
              aiAnalysis.analysisResult.tags.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUploadData(prev => ({
                      ...prev,
                      tags: [
                        ...(prev.tags || []),
                        ...(aiAnalysis.analysisResult?.tags || []),
                      ],
                    }));
                  }}
                  className="text-xs"
                >
                  Áp dụng thẻ AI
                </Button>
              )}
          </div>
          <div className="mb-2 flex flex-wrap gap-2">
            {uploadData.tags?.map((tag: string) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {tag}
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:bg-destructive hover:text-destructive-foreground h-4 w-4 p-0"
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
              onChange={e => setNewTag(e.target.value)}
              placeholder="Thêm thẻ (ví dụ: nghiên cứu, hướng dẫn, tài liệu)"
              onKeyPress={e => {
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
              <span className="ml-1 hidden sm:inline">Thêm</span>
            </Button>
          </div>
          {uploadData.tags && uploadData.tags.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {uploadData.tags.length} thẻ đã được thêm
            </p>
          )}
        </div>

        <div className="bg-muted/50 flex items-center space-x-2 rounded-lg border p-3">
          <Checkbox
            id="isPublic"
            checked={uploadData.isPublic}
            onCheckedChange={checked =>
              setUploadData((prev: DocumentData) => ({
                ...prev,
                isPublic: !!checked,
              }))
            }
          />
          <div className="flex-1">
            <Label htmlFor="isPublic" className="cursor-pointer font-medium">
              Làm cho tài liệu này công khai
            </Label>
            <p className="text-muted-foreground mt-1 text-xs">
              Tài liệu công khai có thể được xem bởi bất kỳ ai mà không cần đăng
              nhập
            </p>
          </div>
        </div>

        {/* Download Cost Setting */}
        <div className="space-y-2">
          <Label htmlFor="downloadCost">Điểm tải xuống (tùy chọn)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="downloadCost"
              type="number"
              min={0}
              value={uploadData.downloadCost ?? ''}
              onChange={e => {
                const value = e.target.value;
                setUploadData((prev: DocumentData) => ({
                  ...prev,
                  downloadCost: value === '' ? null : parseInt(value, 10),
                }));
              }}
              placeholder="Để trống = dùng mặc định hệ thống"
              className="w-80"
            />
            {uploadData.downloadCost !== null && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setUploadData((prev: DocumentData) => ({
                    ...prev,
                    downloadCost: null,
                  }))
                }
                className="text-xs"
              >
                Đặt lại mặc định
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            Số điểm người dùng cần để tải tài liệu này. Để trống sẽ dùng cài đặt
            mặc định của admin.
          </p>
        </div>

        {/* Create Document Button */}
        <Button
          onClick={handleCreateDocument}
          disabled={
            files.length === 0 ||
            !files.some(f => f.uploaded) ||
            !uploadData.title?.trim() ||
            !uploadData.categoryId ||
            uploading
          }
          className="w-full"
        >
          {uploading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
              Đang tạo tài liệu...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Tạo tài liệu
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
