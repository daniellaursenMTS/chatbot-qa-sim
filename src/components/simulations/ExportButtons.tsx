'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

interface ExportButtonsProps {
  runId: string;
}

export default function ExportButtons({ runId }: ExportButtonsProps) {
  const [loadingMd, setLoadingMd] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const handleExport = async (format: 'markdown' | 'pdf') => {
    const setLoading = format === 'markdown' ? setLoadingMd : setLoadingPdf;
    setLoading(true);
    try {
      const url = `/api/simulation-runs/${runId}/export/${format}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      // Small delay so the user sees the loading state briefly
      setTimeout(() => setLoading(false), 1000);
    }
  };

  return (
    <div className="flex gap-3">
      <Button
        variant="secondary"
        size="sm"
        loading={loadingMd}
        onClick={() => handleExport('markdown')}
      >
        Export Markdown
      </Button>
      <Button
        variant="secondary"
        size="sm"
        loading={loadingPdf}
        onClick={() => handleExport('pdf')}
      >
        Export PDF
      </Button>
    </div>
  );
}
