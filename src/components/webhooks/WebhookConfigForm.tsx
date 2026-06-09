'use client';

import { useState, type FormEvent } from 'react';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import type { WebhookConfig } from './WebhookConfigTable';

interface WebhookFormData {
  name: string;
  url: string;
  method: string;
  notes: string;
}

interface WebhookConfigFormProps {
  initialData?: WebhookConfig;
  onSubmit: (data: WebhookFormData) => Promise<void>;
  isLoading: boolean;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const METHOD_OPTIONS = [
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
];

export default function WebhookConfigForm({
  initialData,
  onSubmit,
  isLoading,
}: WebhookConfigFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [url, setUrl] = useState(initialData?.url ?? '');
  const [method, setMethod] = useState(initialData?.method ?? 'POST');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) {
      next.name = 'Name is required';
    }
    if (!url.trim()) {
      next.url = 'URL is required';
    } else if (!isValidUrl(url.trim())) {
      next.url = 'Enter a valid HTTP or HTTPS URL';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      name: name.trim(),
      url: url.trim(),
      method,
      notes: notes.trim(),
    });
  }

  const isEdit = Boolean(initialData);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <Input
        label="Name"
        placeholder="My Webhook"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
      />
      <Input
        label="URL"
        placeholder="https://example.com/webhook"
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        error={errors.url}
        required
      />
      <Select
        label="Method"
        options={METHOD_OPTIONS}
        value={method}
        onChange={(e) => setMethod(e.target.value)}
      />
      <Textarea
        label="Notes"
        placeholder="Optional description or notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
      />
      <div className="pt-2">
        <Button type="submit" variant="primary" loading={isLoading}>
          {isEdit ? 'Update Webhook' : 'Create Webhook'}
        </Button>
      </div>
    </form>
  );
}
