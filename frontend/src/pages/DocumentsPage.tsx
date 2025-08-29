import { FileText, Search, Upload } from 'lucide-react';

import React, { useEffect, useState } from 'react';

import DocumentCard from '@/components/document/DocumentCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { DocumentsService, PaginatedDocuments } from '@/services/files.service';

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<PaginatedDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const data = await DocumentsService.getPublicDocuments(page, 9); // 9 for a 3x3 grid
        setDocuments(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch documents.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  const handleUploadClick = () => {
    // TODO: Navigate to upload page
    console.log('Navigate to upload page');
  };

  const hasDocuments = documents && documents.documents.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Explore Documents
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-lg text-muted-foreground">
            Browse through a collection of public documents shared by our community.
          </p>
        </div>

        {/* Search and Actions Bar */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Documents
            </CardTitle>
            <CardDescription>Find specific documents by title, content, or tags</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-4">
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="outline">
                Search
              </Button>
              <Button onClick={handleUploadClick} className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Document
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }, (_, i) => (
              <LoadingSkeleton key={i} count={1} variant="card" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-center text-destructive">
                <p className="text-lg font-medium">Error loading documents</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Grid or Empty State */}
        {!loading && !error && (
          <>
            {hasDocuments ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {documents.documents.map((document) => (
                    <DocumentCard key={document.id} document={document} />
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-8 flex justify-center">
                  <Button onClick={() => setPage(page - 1)} disabled={page <= 1 || loading}>
                    Previous
                  </Button>
                  <span className="mx-4 self-center text-muted-foreground">
                    Page {page} of {Math.ceil((documents.total || 0) / 9)}
                  </span>
                  <Button
                    onClick={() => setPage(page + 1)}
                    disabled={!documents || documents.documents.length < 9 || loading}
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                icon={FileText}
                title="No documents found"
                description="There are no documents available at the moment. Be the first to share a document with the community!"
                action={{
                  label: 'Upload First Document',
                  onClick: handleUploadClick,
                  variant: 'default',
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default DocumentsPage;
