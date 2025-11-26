import { useState } from 'react';

import { AlertCircle, Database, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { EmbeddingService } from '@/services/embedding.service';

interface RegenerateEmbeddingDialogProps {
  documentId: string;
  documentTitle?: string;
  onSuccess?: () => void;
}

/**
 * Dialog to regenerate embedding for a document
 */
export function RegenerateEmbeddingDialog({
  documentId,
  documentTitle,
  onSuccess,
}: RegenerateEmbeddingDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    embeddingDimension?: number;
    message: string;
  } | null>(null);

  const handleRegenerate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await EmbeddingService.regenerateEmbedding(documentId);
      setResult(response);

      if (response.success) {
        toast.success('Đã tạo lại embedding thành công');
        onSuccess?.();
        // Close dialog after 2 seconds
        setTimeout(() => {
          setOpen(false);
          setResult(null);
        }, 2000);
      } else {
        toast.error(response.message || 'Không thể tạo lại embedding');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không thể tạo lại embedding';
      setResult({
        success: false,
        message,
      });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tạo lại Embedding
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Tạo lại Vector Embedding
          </DialogTitle>
          <DialogDescription>
            Tạo lại vector embedding cho tài liệu này để cải thiện độ chính xác
            tìm kiếm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {documentTitle && (
            <div>
              <p className="mb-1 text-sm font-medium">Tài liệu:</p>
              <p className="text-muted-foreground text-sm">{documentTitle}</p>
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Lưu ý:</p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  <li>
                    Quá trình này sẽ tạo lại embedding vector 768 chiều từ nội
                    dung tài liệu
                  </li>
                  <li>Có thể mất 1-2 giây để hoàn thành</li>
                  <li>
                    Embedding mới sẽ cải thiện độ chính xác khi tìm kiếm
                    semantic
                  </li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">
                    {result.success ? '✅ Thành công' : '❌ Thất bại'}
                  </p>
                  <p className="text-sm">{result.message}</p>
                  {result.success && result.embeddingDimension && (
                    <Badge variant="outline" className="mt-2">
                      {result.embeddingDimension} dimensions
                    </Badge>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button onClick={handleRegenerate} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Tạo lại Embedding
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
