import { PageHeader } from '@/components/common/page-header';
import { DocumentList } from '@/components/upload/DocumentList';

export default function MyDocumentsPage() {
  const handleFileDeleted = () => {
    console.log('Document deleted successfully');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Documents"
        description="Manage and organize your uploaded documents. View, download, and delete your documents."
      />

      <DocumentList onDocumentDeleted={handleFileDeleted} />
    </div>
  );
}
