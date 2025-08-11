import React, { useEffect, useState } from 'react';

import DocumentCard from '@/components/document/DocumentCard';
import { Button } from '@/components/ui/button';
import { DocumentsService, PaginatedDocuments } from '@/services/files.service';

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<PaginatedDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

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

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Explore Documents
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-600">
            Browse through a collection of public documents shared by our community.
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="text-red-500 text-center">{error}</div>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents?.documents.map((document) => (
                <DocumentCard key={document.id} document={document} />
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Button onClick={() => setPage(page - 1)} disabled={page <= 1 || loading}>
                Previous
              </Button>
              <span className="mx-4 self-center">Page {page}</span>
              <Button
                onClick={() => setPage(page + 1)}
                disabled={!documents || documents.documents.length < 9 || loading}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DocumentsPage;
