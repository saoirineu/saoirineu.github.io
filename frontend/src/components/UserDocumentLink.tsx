import { useState } from 'react';

import { resolveUserDocumentUrl } from '../lib/users';

/**
 * Link to a file an applicant uploaded. The download URL is only resolved on the
 * first click: a review screen lists many documents and most are never opened.
 */
export function UserDocumentLink({ name, path, fallback }: { name?: string; path?: string; fallback: string }) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!path) {
    return <span className="text-slate-400 italic">{fallback}</span>;
  }

  return (
    <span>
      <a
        href={downloadUrl ?? '#'}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2"
        onClick={async event => {
          if (downloadUrl || loading) return;
          event.preventDefault();
          setLoading(true);
          setError('');
          try {
            const url = await resolveUserDocumentUrl(path);
            setDownloadUrl(url);
            window.open(url, '_blank', 'noopener,noreferrer');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar arquivo');
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? '...' : (name ?? path.split('/').pop())}
      </a>
      {error ? <span className="ml-2 text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
