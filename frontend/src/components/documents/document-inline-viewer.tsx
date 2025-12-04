import { useEffect, useMemo, useState } from 'react';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface InlineViewerFile {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number | string;
  secureUrl?: string;
}

interface DocumentInlineViewerProps {
  files: InlineViewerFile[];
}

// Text content viewer with UTF-8 support
function TextContentViewer({ url }: { url: string }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;

    setLoading(true);
    setError(null);

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Không thể tải nội dung file');
        return res.text();
      })
      .then(text => {
        setContent(text);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Lỗi khi tải nội dung');
        setLoading(false);
      });
  }, [url]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto">
      <pre className="min-w-max p-4 font-mono text-sm whitespace-pre">
        {content}
      </pre>
    </div>
  );
}

function isOfficeMime(mimeType: string): boolean {
  const officeMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ];
  return officeMimes.includes(mimeType);
}

function isOfficeExt(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.pptx') ||
    lower.endsWith('.ppt')
  );
}

function getViewerType(
  mimeType: string,
  originalName?: string,
): 'image' | 'pdf' | 'office' | 'audio' | 'video' | 'text' | 'html' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'text/html') return 'html';
  if (mimeType.startsWith('text/')) return 'text';

  // Common text-like application types
  if (
    mimeType === 'application/json' ||
    mimeType === 'application/xml' ||
    mimeType === 'text/xml'
  ) {
    return 'text';
  }

  if (isOfficeMime(mimeType) || (originalName && isOfficeExt(originalName))) {
    return 'office';
  }
  return 'other';
}

export function DocumentInlineViewer({ files }: DocumentInlineViewerProps) {
  const safeFiles = useMemo(
    () => files?.filter(f => !!f.secureUrl) || [],
    [files],
  );
  const [activeId, setActiveId] = useState<string | undefined>(
    safeFiles[0]?.id,
  );

  const activeFile = useMemo(
    () => safeFiles.find(f => f.id === activeId) || safeFiles[0],
    [activeId, safeFiles],
  );

  if (!safeFiles.length) {
    return (
      <div className="text-muted-foreground text-sm">
        Không có tệp khả dụng để xem trước.
      </div>
    );
  }

  const viewerType = getViewerType(
    activeFile?.mimeType || '',
    activeFile?.originalName,
  );
  const url = activeFile?.secureUrl || '';

  return (
    <div className="space-y-3">
      {safeFiles.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {safeFiles.map(file => (
            <Button
              key={file.id}
              variant={file.id === activeFile?.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveId(file.id)}
            >
              {file.originalName}
            </Button>
          ))}
        </div>
      )}

      <div className="h-[60vh] w-full overflow-hidden rounded-md border">
        {viewerType === 'image' && (
          <img
            src={url}
            alt={activeFile?.originalName}
            className="h-full w-full object-contain"
          />
        )}
        {viewerType === 'audio' && (
          <div className="flex h-full w-full items-center justify-center p-4">
            <audio controls className="w-full max-w-2xl">
              <source src={url} />
            </audio>
          </div>
        )}
        {viewerType === 'video' && (
          <video controls className="h-full w-full">
            <source src={url} />
          </video>
        )}
        {viewerType === 'text' && <TextContentViewer url={url} />}
        {viewerType === 'html' && (
          <iframe src={url} className="h-full w-full" frameBorder={0} />
        )}
        {viewerType === 'pdf' && (
          <iframe src={url} className="h-full w-full" frameBorder={0} />
        )}
        {viewerType === 'office' && (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
              url,
            )}`}
            className="h-full w-full"
            frameBorder={0}
          />
        )}
        {viewerType === 'other' && (
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(
              url,
            )}&embedded=true`}
            className="h-full w-full"
            frameBorder={0}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {activeFile?.originalName}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {activeFile?.mimeType}
          </p>
        </div>
      </div>
    </div>
  );
}
