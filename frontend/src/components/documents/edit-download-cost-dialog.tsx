import { useEffect, useState, type ReactElement } from 'react';

import { Save, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
  getDocumentById,
  type DocumentView,
} from '@/services/document.service';
import { DocumentsService } from '@/services/files.service';

interface EditDownloadCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  onUpdated?: () => void;
}

export function EditDownloadCostDialog({
  open,
  onOpenChange,
  documentId,
  onUpdated,
}: EditDownloadCostDialogProps): ReactElement {
  const [document, setDocument] = useState<DocumentView | null>(null);
  const [downloadCost, setDownloadCost] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && documentId) {
      loadDocument();
    }
  }, [open, documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const doc = await getDocumentById(documentId);
      setDocument(doc);
      setDownloadCost(doc.originalDownloadCost ?? null);
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải thông tin tài liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!documentId) return;

    try {
      setSaving(true);
      await DocumentsService.updateDocument(documentId, {
        downloadCost,
      });
      toast.success('Đã cập nhật điểm tải xuống');
      onUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Không thể cập nhật điểm tải xuống');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDownloadCost(document?.originalDownloadCost ?? null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa điểm tải xuống</DialogTitle>
          <DialogDescription>
            Đặt số điểm người dùng cần trả để tải xuống tài liệu này. Để trống
            để sử dụng giá trị mặc định của hệ thống.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="text-muted-foreground text-center text-sm">
              Đang tải...
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="downloadCost">Điểm tải xuống</Label>
                <Input
                  id="downloadCost"
                  type="number"
                  min={0}
                  value={downloadCost ?? ''}
                  onChange={e => {
                    const value = e.target.value;
                    setDownloadCost(value === '' ? null : parseInt(value, 10));
                  }}
                  placeholder={`Mặc định: ${document?.systemDefaultDownloadCost ?? 0} điểm`}
                />
                <p className="text-muted-foreground text-xs">
                  Giá trị mặc định hiện tại:{' '}
                  {document?.systemDefaultDownloadCost ?? 0} điểm
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            <X className="mr-2 h-4 w-4" />
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
