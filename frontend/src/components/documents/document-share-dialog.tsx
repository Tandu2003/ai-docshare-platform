import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ClipboardCopy, Link, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createDocumentShareLink,
  revokeDocumentShareLink,
  type DocumentShareLink,
  type ShareDocumentRequest,
  type ShareDocumentResponse,
} from '@/services/document.service';

const DURATION_OPTIONS = [
  { label: '1 giờ', value: '60' },
  { label: '24 giờ', value: '1440' },
  { label: '7 ngày', value: String(7 * 24 * 60) },
  { label: 'Tùy chọn ngày giờ', value: 'custom' },
] as const;

interface DocumentShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  shareLink?: DocumentShareLink | null;
  onShareLinkUpdated: (share: ShareDocumentResponse) => void;
  onShareLinkRevoked: () => void;
}

export function DocumentShareDialog({
  open,
  onOpenChange,
  documentId,
  shareLink,
  onShareLinkUpdated,
  onShareLinkRevoked,
}: DocumentShareDialogProps): ReactElement {
  const [durationValue, setDurationValue] = useState<string>('1440');
  const [customExpiresAt, setCustomExpiresAt] = useState<string>('');
  const [regenerateToken, setRegenerateToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setDurationValue('1440');
      setCustomExpiresAt('');
      setRegenerateToken(false);
    }
  }, [open]);

  const shareUrl = useMemo(() => {
    if (shareLink?.token) {
      if (typeof window === 'undefined') {
        return undefined;
      }
      const base = window.location.origin;
      return `${base}/documents/${documentId}?apiKey=${shareLink.token}`;
    }
    return undefined;
  }, [documentId, shareLink?.token]);

  const formattedExpiry = useMemo(() => {
    if (!shareLink?.expiresAt) return null;
    try {
      return formatDistanceToNow(parseISO(shareLink.expiresAt), {
        addSuffix: true,
      });
    } catch (error) {
      return null;
    }
  }, [shareLink?.expiresAt]);

  const handleCopy = async () => {
    if (!shareUrl) {
      toast.error('Chưa có đường dẫn chia sẻ để sao chép.');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Đã sao chép đường dẫn chia sẻ vào clipboard.');
    } catch (error) {
      toast.error('Không thể sao chép đường dẫn. Vui lòng thử lại.');
    }
  };

  const handleCreateShareLink = async () => {
    if (!documentId) {
      toast.error('Không xác định được tài liệu để chia sẻ.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: ShareDocumentRequest = {};

      if (durationValue === 'custom') {
        if (!customExpiresAt) {
          toast.error('Vui lòng chọn thời gian hết hạn cụ thể.');
          return;
        }
        payload.expiresAt = new Date(customExpiresAt).toISOString();
      } else {
        payload.expiresInMinutes = Number(durationValue);
      }

      if (regenerateToken) {
        payload.regenerateToken = true;
      }

      const response = await createDocumentShareLink(documentId, payload);
      onShareLinkUpdated(response);
      toast.success('Đã tạo liên kết chia sẻ cho tài liệu.');
      setRegenerateToken(false);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Không thể tạo liên kết chia sẻ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeShareLink = async () => {
    if (!documentId) {
      toast.error('Không xác định được tài liệu để hủy chia sẻ.');
      return;
    }

    try {
      setIsSubmitting(true);
      await revokeDocumentShareLink(documentId);
      onShareLinkRevoked();
      toast.success('Đã hủy liên kết chia sẻ.');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Không thể hủy liên kết chia sẻ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isShareLinkActive = Boolean(shareLink && !shareLink.isRevoked);
  const isGenerateDisabled =
    isSubmitting ||
    (durationValue === 'custom' && customExpiresAt.trim().length === 0) ||
    (durationValue !== 'custom' && Number.isNaN(Number(durationValue)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chia sẻ tài liệu</DialogTitle>
          <DialogDescription>
            Tạo đường dẫn tạm thời để cấp quyền xem tài liệu cho người khác mà
            không cần đăng nhập.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Link className="text-muted-foreground h-4 w-4" />
              Đường dẫn hiện tại
            </Label>
            {isShareLinkActive && shareUrl ? (
              <>
                <div className="flex items-center gap-2">
                  <Input value={shareUrl} readOnly />
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    <ClipboardCopy className="h-4 w-4" />
                    <span className="sr-only">Sao chép liên kết</span>
                  </Button>
                </div>
                {formattedExpiry && (
                  <p className="text-muted-foreground text-xs">
                    Liên kết sẽ hết hạn {formattedExpiry}.
                  </p>
                )}
              </>
            ) : (
              <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                Chưa có liên kết chia sẻ đang hoạt động cho tài liệu này.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Thời hạn chia sẻ</Label>
            <Select value={durationValue} onValueChange={setDurationValue}>
              <SelectTrigger className="w-full justify-between">
                <SelectValue placeholder="Chọn thời hạn" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {durationValue === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="custom-expiry">Chọn thời điểm hết hạn</Label>
                <Input
                  id="custom-expiry"
                  type="datetime-local"
                  value={customExpiresAt}
                  onChange={event => setCustomExpiresAt(event.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-muted-foreground text-xs">
                  Lưu ý: múi giờ được tính theo thiết bị của bạn.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-md border p-3">
            <Checkbox
              id="regenerate-token"
              checked={regenerateToken}
              onCheckedChange={checked => setRegenerateToken(Boolean(checked))}
              className="mt-1"
            />
            <div>
              <Label
                htmlFor="regenerate-token"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <RefreshCw className="text-muted-foreground h-4 w-4" />
                Tạo mã chia sẻ mới
              </Label>
              <p className="text-muted-foreground text-xs">
                Ở lần tạo tiếp theo, hệ thống sẽ sinh mã chia sẻ mới và vô hiệu
                hóa đường dẫn cũ.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            disabled={!isShareLinkActive || isSubmitting}
            onClick={handleRevokeShareLink}
          >
            Hủy liên kết
          </Button>
          <Button
            type="button"
            disabled={isGenerateDisabled}
            onClick={handleCreateShareLink}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Tạo liên kết'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
