'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Card from '@/components/ui/Card';

interface FormErrors {
  apiBaseUrl?: string;
  productIds?: string;
  testScenario?: string;
  chatbotName?: string;
  chatbotPurpose?: string;
}

type SubmitPhase = 'idle' | 'creating' | 'executing';

const DEFAULT_PRODUCT_IDS =
  '843785, 843786, 843787, 843788, 843797, 843798, 786456, 843803, 786460, 786463, 843807, 843815, 770095, 843835, 753724, 835646, 843857, 835671, 1032287, 1032288';

export default function NewChipTestForm() {
  const router = useRouter();

  const [apiBaseUrl, setApiBaseUrl] = useState('http://8.233.199.50');
  const [productIdsText, setProductIdsText] = useState(DEFAULT_PRODUCT_IDS);
  const [generateOnDemand, setGenerateOnDemand] = useState(true);
  const [chatbotName, setChatbotName] = useState('PDP Chip Chatbot');
  const [chatbotPurpose, setChatbotPurpose] = useState(
    'Answer product questions via chips on the PDP page',
  );
  const [testScenario, setTestScenario] = useState(
    'Automated chip coverage test: for each product, submit all available chip questions and evaluate chatbot answers for accuracy, completeness, and helpfulness.',
  );
  const [ecommerceCategory, setEcommerceCategory] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [submitError, setSubmitError] = useState('');

  function parseProductIds(): number[] {
    return productIdsText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);
  }

  const parsedIds = parseProductIds();
  const totalEstimated = parsedIds.length * 4;

  function validate(): boolean {
    const newErrors: FormErrors = {};

    try {
      new URL(apiBaseUrl);
    } catch {
      newErrors.apiBaseUrl = 'Must be a valid URL';
    }

    if (parsedIds.length === 0) {
      newErrors.productIds = 'At least 1 valid product ID required';
    } else if (parsedIds.length > 50) {
      newErrors.productIds = 'Maximum 50 product IDs allowed';
    }

    if (!chatbotName.trim()) {
      newErrors.chatbotName = 'Chatbot name is required';
    }
    if (!chatbotPurpose.trim()) {
      newErrors.chatbotPurpose = 'Chatbot purpose is required';
    }
    if (!testScenario.trim()) {
      newErrors.testScenario = 'Test scenario is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    const payload = {
      mode: 'CHIP_TEST',
      chatbotName: chatbotName.trim(),
      chatbotPurpose: chatbotPurpose.trim(),
      testScenario: testScenario.trim(),
      ecommerceCategory: ecommerceCategory.trim() || undefined,
      chipTestConfig: {
        apiBaseUrl: apiBaseUrl.trim(),
        productIds: parsedIds,
        generateOnDemand,
        withReasoning: false,
      },
    };

    let runId: string | null = null;

    try {
      setSubmitPhase('creating');

      const createRes = await fetch('/api/simulation-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const body = await createRes.json().catch(() => null);
        const message =
          body?.error?.message ?? `Failed to create chip test run (${createRes.status})`;
        throw new Error(message);
      }

      const run = await createRes.json();
      runId = run.id;

      setSubmitPhase('executing');

      const execRes = await fetch(`/api/simulation-runs/${runId}/execute`, {
        method: 'POST',
      });

      if (!execRes.ok) {
        router.push(`/simulations/${runId}`);
        return;
      }

      router.push(`/simulations/${runId}`);
    } catch (err) {
      if (runId) {
        router.push(`/simulations/${runId}`);
        return;
      }
      setSubmitPhase('idle');
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  const isSubmitting = submitPhase !== 'idle';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="max-w-md w-full text-center space-y-4">
            <div className="flex justify-center">
              <svg
                className="animate-spin h-8 w-8 text-primary-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-text-primary">
              {submitPhase === 'creating'
                ? 'Creating chip test run...'
                : 'Running chip test... This may take several minutes.'}
            </p>
          </Card>
        </div>
      )}

      {submitError && (
        <div className="rounded-lg border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {submitError}
        </div>
      )}

      {/* API Configuration */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          API Configuration
        </h2>
        <div className="space-y-4">
          <Input
            label="API Base URL"
            placeholder="http://8.233.199.50"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            error={errors.apiBaseUrl}
            required
          />
          <div>
            <Textarea
              label="Product IDs"
              placeholder="Enter product IDs separated by commas or newlines"
              value={productIdsText}
              onChange={(e) => setProductIdsText(e.target.value)}
              error={errors.productIds}
              rows={4}
              required
            />
            <p className="mt-1 text-xs text-text-tertiary">
              {parsedIds.length} product{parsedIds.length !== 1 ? 's' : ''} detected
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={generateOnDemand}
              onChange={(e) => setGenerateOnDemand(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-text-primary">
              Generate chips on-demand if none pre-generated
            </span>
          </label>
        </div>
      </Card>

      {/* Chatbot Details */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Chatbot Details
        </h2>
        <div className="space-y-4">
          <Input
            label="Chatbot Name"
            placeholder="e.g. PDP Chip Chatbot"
            value={chatbotName}
            onChange={(e) => setChatbotName(e.target.value)}
            error={errors.chatbotName}
            required
          />
          <Textarea
            label="Chatbot Purpose"
            placeholder="Describe what this chatbot does..."
            value={chatbotPurpose}
            onChange={(e) => setChatbotPurpose(e.target.value)}
            error={errors.chatbotPurpose}
            required
          />
        </div>
      </Card>

      {/* Test Configuration */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Test Configuration
        </h2>
        <div className="space-y-4">
          <Textarea
            label="Test Scenario"
            placeholder="Describe the scenario to test..."
            value={testScenario}
            onChange={(e) => setTestScenario(e.target.value)}
            error={errors.testScenario}
            required
          />
          <Input
            label="Ecommerce Category"
            placeholder="Optional, e.g. Electronics, Fashion"
            value={ecommerceCategory}
            onChange={(e) => setEcommerceCategory(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <p className="text-sm text-text-secondary">
              Estimated bot responses:{' '}
              <span className="font-semibold text-text-primary">
                {totalEstimated}
              </span>
              <span className="text-text-tertiary ml-1">
                ({parsedIds.length} products x up to 4 chips)
              </span>
            </p>
          </div>
        </div>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={isSubmitting} disabled={isSubmitting}>
          Start Chip Test
        </Button>
      </div>
    </form>
  );
}
