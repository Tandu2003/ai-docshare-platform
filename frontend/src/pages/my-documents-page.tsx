import type { ReactElement } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { DocumentList } from '@/components/upload/document-list';

export function MyDocumentsPage(): ReactElement {
  const handleFileDeleted = () => {};
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tài liệu của tôi"
        description="Quản lý và tổ chức các tài liệu đã tải lên. Xem, tải xuống và xóa tài liệu của bạn."
      />
      <DocumentList onDocumentDeleted={handleFileDeleted} />
    </div>
  );
}
