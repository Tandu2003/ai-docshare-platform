import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  AlertCircle,
  CheckCircle,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { CategorySelector } from '@/components/categories/category-selector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AIService, type DocumentAnalysisResult } from '@/services/ai.service';
import {
  getDocumentById,
  type DocumentView,
} from '@/services/document.service';
import { DocumentsService, FilesService } from '@/services/files.service';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'Tiếng Anh' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'es', label: 'Tiếng Tây Ban Nha' },
  { value: 'fr', label: 'Tiếng Pháp' },
  { value: 'de', label: 'Tiếng Đức' },
  { value: 'zh', label: 'Tiếng Trung' },
  { value: 'ja', label: 'Tiếng Nhật' },
  { value: 'ko', label: 'Tiếng Hàn' },
];

interface FileWithMetadata {
  file?: File;
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  preview?: string;
  error?: string;
  uploaded?: boolean;
  progress?: number;
  fileId?: string;
  isExisting?: boolean;
  isDeleted?: boolean;
  secureUrl?: string;
}

interface DocumentEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentView;
  onDocumentUpdated: (updatedDocument: DocumentView) => void;
}

export function DocumentEditSheet({
  open,
  onOpenChange,
  document,
  onDocumentUpdated,
}: DocumentEditSheetProps): React.ReactElement {
  // Form state
  const [title, setTitle] = useState(document.title || '');
  const [description, setDescription] = useState(document.description || '');
  const [categoryId, setCategoryId] = useState(
    document.category?.id || document.categoryId || '',
  );
  const [tags, setTags] = useState<string[]>(document.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [language, setLanguage] = useState(document.language || 'vi');
  const [isPublic, setIsPublic] = useState(document.isPublic);
  const [downloadCost, setDownloadCost] = useState<number | null>(
    document.downloadCost ?? null,
  );

  // File management state
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // AI analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<DocumentAnalysisResult | null>(null);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize files from document
  useEffect(() => {
    if (document.files) {
      const existingFiles: FileWithMetadata[] = document.files.map(f => ({
        id: f.id,
        originalName: f.originalName,
        mimeType: f.mimeType,
        fileSize:
          typeof f.fileSize === 'string'
            ? parseInt(f.fileSize, 10)
            : f.fileSize,
        fileId: f.id,
        isExisting: true,
        uploaded: true,
        secureUrl: f.secureUrl,
      }));
      setFiles(existingFiles);
    }
  }, [document.files]);

  // Reset form when document changes or sheet opens
  useEffect(() => {
    if (open) {
      setTitle(document.title || '');
      setDescription(document.description || '');
      setCategoryId(document.category?.id || document.categoryId || '');
      setTags(document.tags || []);
      setLanguage(document.language || 'vi');
      setIsPublic(document.isPublic);
      setDownloadCost(document.downloadCost ?? null);
      setTagInput('');
      setAnalysisResult(null);
    }
  }, [open, document]);

  // Check if files were modified
  const filesModified = useCallback(() => {
    const originalFileIds = new Set(document.files?.map(f => f.id) || []);
    const currentFileIds = new Set(
      files.filter(f => !f.isDeleted && f.fileId).map(f => f.fileId),
    );
    const newFiles = files.filter(f => !f.isExisting && !f.isDeleted);

    // Check if any original files were deleted
    const deletedFiles = files.filter(f => f.isExisting && f.isDeleted);

    return (
      newFiles.length > 0 ||
      deletedFiles.length > 0 ||
      originalFileIds.size !== currentFileIds.size
    );
  }, [files, document.files]);

  // Check if re-moderation is needed
  const needsReModeration =
    (!document.isPublic && isPublic) || // Changing to public
    filesModified(); // Files were modified

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

  // Handle file selection
  const handleFiles = useCallback(async (newFiles: File[]) => {
    const processedFiles: FileWithMetadata[] = newFiles.map(file => {
      const error = validateFile(file);
      return {
        file,
        id: Math.random().toString(36).substring(7),
        originalName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        preview: file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined,
        error: error || undefined,
        isExisting: false,
      };
    });

    setFiles(prev => [...prev, ...processedFiles]);

    // Upload new files immediately
    const validFiles = processedFiles.filter(f => !f.error);
    if (validFiles.length > 0) {
      await uploadNewFiles(validFiles);
    }
  }, []);

  // Upload new files
  const uploadNewFiles = async (filesToUpload: FileWithMetadata[]) => {
    setUploadingFiles(true);

    try {
      for (const fileWithMeta of filesToUpload) {
        if (!fileWithMeta.file) continue;

        // Update progress
        setFiles(prev =>
          prev.map(f =>
            f.id === fileWithMeta.id ? { ...f, progress: 10 } : f,
          ),
        );

        try {
          const result = await FilesService.uploadFiles([fileWithMeta.file!]);

          if (result.success && result.data && result.data.length > 0) {
            const uploadedFile = result.data[0];
            setFiles(prev =>
              prev.map(f =>
                f.id === fileWithMeta.id
                  ? {
                      ...f,
                      fileId: uploadedFile.id,
                      uploaded: true,
                      progress: 100,
                    }
                  : f,
              ),
            );
          } else {
            throw new Error(result.message || 'Tải lên thất bại');
          }
        } catch (error: any) {
          setFiles(prev =>
            prev.map(f =>
              f.id === fileWithMeta.id
                ? { ...f, error: error.message || 'Tải lên thất bại' }
                : f,
            ),
          );
        }
      }
    } finally {
      setUploadingFiles(false);
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    },
    [handleFiles],
  );

  // Remove file
  const handleRemoveFile = (fileId: string) => {
    setFiles(prev =>
      prev.map(f => {
        if (f.id === fileId || f.fileId === fileId) {
          if (f.isExisting) {
            // Mark existing file as deleted
            return { ...f, isDeleted: true };
          } else {
            // Remove new file from list
            return { ...f, isDeleted: true };
          }
        }
        return f;
      }),
    );
  };

  // Restore deleted file
  const handleRestoreFile = (fileId: string) => {
    setFiles(prev =>
      prev.map(f =>
        f.id === fileId || f.fileId === fileId ? { ...f, isDeleted: false } : f,
      ),
    );
  };

  // Handle tags
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  // AI Analysis
  const handleAIAnalysis = async () => {
    const uploadedFileIds = files
      .filter(f => f.fileId && !f.isDeleted)
      .map(f => f.fileId!);

    if (uploadedFileIds.length === 0) {
      toast.error('Không có tệp nào để phân tích');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const response = await AIService.analyzeDocument({
        fileIds: uploadedFileIds,
      });

      if (response.success && response.data) {
        setAnalysisResult(response.data);
        toast.success('Phân tích AI hoàn tất!');
      } else {
        throw new Error(response.message || 'Phân tích thất bại');
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể phân tích tài liệu');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Apply AI suggestions
  const applyAISuggestions = () => {
    if (!analysisResult) return;

    if (analysisResult.title) setTitle(analysisResult.title);
    if (analysisResult.description) setDescription(analysisResult.description);
    if (analysisResult.tags) setTags(analysisResult.tags);
    if (analysisResult.language) setLanguage(analysisResult.language);
    if (analysisResult.suggestedCategoryId) {
      setCategoryId(analysisResult.suggestedCategoryId);
    }

    toast.success('Đã áp dụng gợi ý từ AI');
  };

  // Save document
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề');
      return;
    }

    const activeFiles = files.filter(f => !f.isDeleted);
    if (activeFiles.length === 0) {
      toast.error('Tài liệu cần có ít nhất một tệp');
      return;
    }

    // Check if any file is still uploading
    const stillUploading = files.some(
      f => !f.isDeleted && !f.isExisting && !f.uploaded,
    );
    if (stillUploading) {
      toast.error('Vui lòng đợi tệp tải lên hoàn tất');
      return;
    }

    setIsSaving(true);

    try {
      // Prepare file IDs if files were modified
      const fileIds = filesModified()
        ? files.filter(f => !f.isDeleted && f.fileId).map(f => f.fileId!)
        : undefined;

      // Update document metadata
      const updateData: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId: categoryId || undefined,
        tags,
        language,
        isPublic,
        downloadCost,
        ...(fileIds && { fileIds }), // Only include fileIds if modified
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const response = await DocumentsService.updateDocument(
        document.id,
        updateData,
      );

      if (response) {
        toast.success(
          needsReModeration
            ? 'Đã cập nhật! Tài liệu sẽ được kiểm duyệt lại.'
            : 'Đã cập nhật tài liệu',
        );

        // Refetch document to get full data including AI analysis
        try {
          const fullDocument = await getDocumentById(document.id);
          onDocumentUpdated(fullDocument);
        } catch {
          // Fallback to partial response if refetch fails
          onDocumentUpdated(response as DocumentView);
        }

        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể cập nhật tài liệu');
    } finally {
      setIsSaving(false);
    }
  };

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
      return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
      return '📽️';
    return '📁';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full px-4 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Chỉnh sửa tài liệu</SheetTitle>
          <SheetDescription>
            Cập nhật thông tin và tệp đính kèm của tài liệu
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="files">
              Tệp đính kèm
              {filesModified() && (
                <span className="ml-1 h-2 w-2 rounded-full bg-amber-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="ai">AI phân tích</TabsTrigger>
          </TabsList>

          <ScrollArea className="mt-4 h-[calc(100vh-280px)] pr-4">
            {/* Info Tab */}
            <TabsContent value="info" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Nhập tiêu đề tài liệu"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Thêm mô tả ngắn gọn về tài liệu"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Danh mục</Label>
                <CategorySelector
                  value={categoryId}
                  onChange={setCategoryId}
                  disabled={isSaving}
                  showAiSuggestions={false}
                />
              </div>

              <div className="space-y-2">
                <Label>Thẻ</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Nhập thẻ và nhấn Enter"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleAddTag}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.length > 0 ? (
                    tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Chưa có thẻ
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ngôn ngữ</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ngôn ngữ" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Điểm tải xuống</Label>
                <Input
                  type="number"
                  min={0}
                  value={downloadCost ?? ''}
                  onChange={e => {
                    const value = e.target.value;
                    setDownloadCost(value === '' ? null : parseInt(value, 10));
                  }}
                  placeholder="Mặc định hệ thống"
                />
                <p className="text-muted-foreground text-xs">
                  Để trống để sử dụng cài đặt mặc định của hệ thống
                </p>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Công khai</p>
                    <p className="text-muted-foreground text-xs">
                      Chuyển sang công khai sẽ cần duyệt lại
                    </p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
              </div>

              {needsReModeration && (
                <Alert className="border-amber-200 bg-amber-50">
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>Cần kiểm duyệt lại</AlertTitle>
                  <AlertDescription>
                    Thay đổi của bạn sẽ được gửi tới kiểm duyệt trước khi hiển
                    thị công khai.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="space-y-4">
              {/* Drop zone */}
              <div
                className={cn(
                  'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50',
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={e => {
                    if (e.target.files) {
                      handleFiles(Array.from(e.target.files));
                    }
                    e.target.value = '';
                  }}
                />
                <Upload className="text-muted-foreground mx-auto mb-2 h-10 w-10" />
                <p className="text-sm font-medium">
                  Kéo thả hoặc nhấn để thêm tệp
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  PDF, Word, Excel, PowerPoint, hình ảnh (tối đa 100MB)
                </p>
              </div>

              {/* File list */}
              <div className="space-y-2">
                <Label>
                  Tệp hiện tại ({files.filter(f => !f.isDeleted).length})
                </Label>
                <div className="space-y-2">
                  {files.map(file => (
                    <Card
                      key={file.id}
                      className={cn(
                        'overflow-hidden',
                        file.isDeleted && 'opacity-50',
                      )}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg text-xl">
                            {getFileIcon(file.mimeType)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'truncate text-sm font-medium',
                                file.isDeleted && 'line-through',
                              )}
                            >
                              {file.originalName}
                            </p>
                            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                              <span>{formatFileSize(file.fileSize)}</span>
                              {file.isExisting && (
                                <Badge variant="outline" className="text-xs">
                                  Đã có
                                </Badge>
                              )}
                              {file.uploaded && !file.isExisting && (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-green-600"
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Đã tải lên
                                </Badge>
                              )}
                              {file.error && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  <AlertCircle className="mr-1 h-3 w-3" />
                                  Lỗi
                                </Badge>
                              )}
                            </div>
                            {file.progress !== undefined &&
                              file.progress < 100 &&
                              !file.error && (
                                <Progress
                                  value={file.progress}
                                  className="mt-1 h-1"
                                />
                              )}
                            {file.error && (
                              <p className="text-destructive mt-1 text-xs">
                                {file.error}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {file.isDeleted ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRestoreFile(file.id)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() =>
                                  handleRemoveFile(file.fileId || file.id)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {files.filter(f => !f.isDeleted).length === 0 && (
                  <div className="text-muted-foreground py-6 text-center">
                    <FileText className="mx-auto mb-2 h-10 w-10 opacity-50" />
                    <p className="text-sm">
                      Tài liệu cần có ít nhất một tệp đính kèm
                    </p>
                  </div>
                )}
              </div>

              {filesModified() && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Tệp đã thay đổi</AlertTitle>
                  <AlertDescription>
                    Bạn đã thay đổi tệp đính kèm. Tài liệu sẽ cần được kiểm
                    duyệt lại nếu đang công khai.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* AI Tab */}
            <TabsContent value="ai" className="space-y-4">
              <div className="py-4 text-center">
                <Sparkles className="text-primary mx-auto mb-2 h-10 w-10" />
                <h3 className="font-medium">Phân tích bằng AI</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Sử dụng AI để tự động phân tích và gợi ý thông tin cho tài
                  liệu dựa trên nội dung các tệp đính kèm.
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleAIAnalysis}
                disabled={
                  isAnalyzing ||
                  files.filter(f => !f.isDeleted && f.fileId).length === 0
                }
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Phân tích với AI
                  </>
                )}
              </Button>

              {analysisResult && (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Kết quả phân tích</h4>
                    <Button size="sm" onClick={applyAISuggestions}>
                      Áp dụng tất cả
                    </Button>
                  </div>

                  {analysisResult.title && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">
                        Tiêu đề gợi ý
                      </Label>
                      <div className="flex items-center gap-2">
                        <p className="flex-1 text-sm">{analysisResult.title}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTitle(analysisResult.title!)}
                        >
                          Áp dụng
                        </Button>
                      </div>
                    </div>
                  )}

                  {analysisResult.description && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">
                        Mô tả gợi ý
                      </Label>
                      <div className="space-y-2">
                        <p className="text-sm">{analysisResult.description}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setDescription(analysisResult.description!)
                          }
                        >
                          Áp dụng
                        </Button>
                      </div>
                    </div>
                  )}

                  {analysisResult.tags && analysisResult.tags.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">
                        Thẻ gợi ý
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.tags.map(tag => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => setTags(analysisResult.tags!)}
                      >
                        Áp dụng thẻ
                      </Button>
                    </div>
                  )}

                  {analysisResult.summary && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">
                        Tóm tắt nội dung
                      </Label>
                      <p className="bg-muted rounded-md p-3 text-sm">
                        {analysisResult.summary}
                      </p>
                    </div>
                  )}

                  {analysisResult.keyPoints &&
                    analysisResult.keyPoints.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">
                          Điểm chính
                        </Label>
                        <ul className="list-inside list-disc space-y-1 text-sm">
                          {analysisResult.keyPoints.map((point, idx) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {analysisResult.difficulty && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">
                        Độ khó
                      </Label>
                      <Badge>
                        {analysisResult.difficulty === 'beginner'
                          ? 'Cơ bản'
                          : analysisResult.difficulty === 'intermediate'
                            ? 'Trung bình'
                            : 'Nâng cao'}
                      </Badge>
                    </div>
                  )}

                  {analysisResult.suggestedCategoryName && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">
                        Danh mục gợi ý
                      </Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {analysisResult.suggestedCategoryName}
                        </Badge>
                        {analysisResult.categoryConfidence && (
                          <span className="text-muted-foreground text-xs">
                            (Độ tin cậy:{' '}
                            {Math.round(
                              analysisResult.categoryConfidence * 100,
                            )}
                            %)
                          </span>
                        )}
                        {analysisResult.suggestedCategoryId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setCategoryId(analysisResult.suggestedCategoryId!)
                            }
                          >
                            Áp dụng
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!analysisResult && !isAnalyzing && (
                <div className="text-muted-foreground rounded-lg border-2 border-dashed py-6 text-center">
                  <p className="text-sm">Nhấn nút phân tích để bắt đầu</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="mt-4 flex gap-2 border-t pt-4">
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isSaving || uploadingFiles}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Lưu thay đổi
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Hủy
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
