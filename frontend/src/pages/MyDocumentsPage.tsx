import { PageHeader } from '@/components/common/page-header';
import { DocumentList } from '@/components/upload/DocumentList';

export default function MyDocumentsPage() {
  const handleFileDeleted = () => {
    console.log('Document deleted successfully');
  };

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
