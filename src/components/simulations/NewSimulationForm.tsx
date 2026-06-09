'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import PersonaSelector from '@/components/personas/PersonaSelector';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: string;
  notes: string | null;
}

interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  skillFocus: string;
  ecommerceContext: Record<string, string> | null;
  active: boolean;
}

interface NewSimulationFormProps {
  webhooks: WebhookConfig[];
  personas: Persona[];
}

interface FormErrors {
  webhookConfigId?: string;
  personaIds?: string;
  chatbotName?: string;
  chatbotPurpose?: string;
  testScenario?: string;
  initialQuestionCount?: string;
  followUpQuestionCount?: string;
}

type SubmitPhase = 'idle' | 'creating' | 'executing';

export default function NewSimulationForm({
  webhooks,
  personas,
}: NewSimulationFormProps) {
  const router = useRouter();

  const [webhookConfigId, setWebhookConfigId] = useState('');
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [chatbotName, setChatbotName] = useState('');
  const [chatbotPurpose, setChatbotPurpose] = useState('');
  const [testScenario, setTestScenario] = useState('');
  const [ecommerceCategory, setEcommerceCategory] = useState('');
  const [initialQuestionCount, setInitialQuestionCount] = useState('3');
  const [followUpQuestionCount, setFollowUpQuestionCount] = useState('2');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [submitError, setSubmitError] = useState('');

  const initialCount = parseInt(initialQuestionCount, 10) || 0;
  const followUpCount = parseInt(followUpQuestionCount, 10) || 0;
  const totalBotResponses = selectedPersonaIds.length * (initialCount + followUpCount);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!webhookConfigId) {
      newErrors.webhookConfigId = 'Please select a webhook configuration';
    }
    if (selectedPersonaIds.length === 0) {
      newErrors.personaIds = 'Select at least 1 persona';
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
    if (!initialQuestionCount || initialCount < 1) {
      newErrors.initialQuestionCount = 'At least 1 initial question required';
    }
    if (followUpQuestionCount === '' || followUpCount < 0) {
      newErrors.followUpQuestionCount = 'Follow-up count must be 0 or more';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    const payload = {
      webhookConfigId,
      personaIds: selectedPersonaIds,
      chatbotName: chatbotName.trim(),
      chatbotPurpose: chatbotPurpose.trim(),
      testScenario: testScenario.trim(),
      ecommerceCategory: ecommerceCategory.trim() || undefined,
      initialQuestionCount: initialCount,
      followUpQuestionCount: followUpCount,
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
          body?.error?.message ?? `Failed to create simulation (${createRes.status})`;
        throw new Error(message);
      }

      const run = await createRes.json();
      runId = run.id;

      setSubmitPhase('executing');

      const execRes = await fetch(`/api/simulation-runs/${runId}/execute`, {
        method: 'POST',
      });

      if (!execRes.ok) {
        // Execute failed but run was created -- navigate to it so partial
        // transcript and error details are visible
        router.push(`/simulations/${runId}`);
        return;
      }

      router.push(`/simulations/${runId}`);
    } catch (err) {
      if (runId) {
        // Run was created but something went wrong after -- still navigate
        router.push(`/simulations/${runId}`);
        return;
      }
      setSubmitPhase('idle');
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  const isSubmitting = submitPhase !== 'idle';

  const webhookOptions = webhooks.map((w) => ({
    value: w.id,
    label: `${w.name} (${w.url})`,
  }));

  const selectedWebhook = webhooks.find((w) => w.id === webhookConfigId);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Loading / progress overlay */}
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
                ? 'Creating simulation...'
                : 'Running simulation... This may take a few minutes.'}
            </p>
          </Card>
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div className="rounded-lg border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {submitError}
        </div>
      )}

      {/* Section 1: Webhook Configuration */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Webhook Configuration
        </h2>
        <Select
          label="Webhook"
          placeholder="Select a webhook configuration"
          options={webhookOptions}
          value={webhookConfigId}
          onChange={(e) => setWebhookConfigId(e.target.value)}
          error={errors.webhookConfigId}
        />
        {selectedWebhook && (
          <p className="mt-2 text-xs text-text-tertiary">
            {selectedWebhook.method} {selectedWebhook.url}
          </p>
        )}
      </Card>

      {/* Section 2: Persona Selection */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Persona Selection
        </h2>
        <PersonaSelector
          personas={personas}
          selectedIds={selectedPersonaIds}
          onChange={setSelectedPersonaIds}
          max={20}
        />
        {errors.personaIds && (
          <p className="mt-2 text-sm text-danger-600" role="alert">
            {errors.personaIds}
          </p>
        )}
      </Card>

      {/* Section 3: Chatbot Details */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Chatbot Details
        </h2>
        <div className="space-y-4">
          <Input
            label="Chatbot Name"
            placeholder="e.g. Acme Support Bot"
            value={chatbotName}
            onChange={(e) => setChatbotName(e.target.value)}
            error={errors.chatbotName}
            required
          />
          <Textarea
            label="Chatbot Purpose"
            placeholder="Describe what this chatbot does and who it serves..."
            value={chatbotPurpose}
            onChange={(e) => setChatbotPurpose(e.target.value)}
            error={errors.chatbotPurpose}
            required
          />
        </div>
      </Card>

      {/* Section 4: Test Configuration */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Test Configuration
        </h2>
        <div className="space-y-4">
          <Textarea
            label="Test Scenario"
            placeholder="Describe the scenario to test, e.g. customer returns a defective product..."
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Initial Question Count"
              type="number"
              min={1}
              value={initialQuestionCount}
              onChange={(e) => setInitialQuestionCount(e.target.value)}
              error={errors.initialQuestionCount}
              required
            />
            <Input
              label="Follow-up Question Count"
              type="number"
              min={0}
              value={followUpQuestionCount}
              onChange={(e) => setFollowUpQuestionCount(e.target.value)}
              error={errors.followUpQuestionCount}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-text-secondary">
              Total bot responses:{' '}
              <span className="font-semibold text-text-primary">
                {totalBotResponses}
              </span>
            </p>
            {totalBotResponses > 100 && (
              <span className="inline-flex items-center rounded-md bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700 border border-warning-200">
                High volume -- this may take a while
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={isSubmitting} disabled={isSubmitting}>
          Start Simulation
        </Button>
      </div>
    </form>
  );
}
