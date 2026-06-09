'use client';

import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Checkbox from '@/components/ui/Checkbox';
import type { Persona } from '@/components/personas/PersonaTable';

interface PersonaFormData {
  name: string;
  description: string;
  systemPrompt: string;
  skillFocus: string;
  active: boolean;
  ecommerceContext: {
    browsingStyle: string;
    patienceLevel: string;
    productKnowledge: string;
    tone: string;
    intent: string;
  };
}

interface PersonaFormProps {
  initialData?: Persona;
  onSubmit: (data: PersonaFormData) => Promise<void>;
  isLoading: boolean;
}

export default function PersonaForm({ initialData, onSubmit, isLoading }: PersonaFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [systemPrompt, setSystemPrompt] = useState(initialData?.systemPrompt ?? '');
  const [skillFocus, setSkillFocus] = useState(initialData?.skillFocus ?? '');
  const [active, setActive] = useState(initialData?.active ?? true);

  const [browsingStyle, setBrowsingStyle] = useState(initialData?.ecommerceContext?.browsingStyle ?? '');
  const [patienceLevel, setPatienceLevel] = useState(initialData?.ecommerceContext?.patienceLevel ?? '');
  const [productKnowledge, setProductKnowledge] = useState(initialData?.ecommerceContext?.productKnowledge ?? '');
  const [tone, setTone] = useState(initialData?.ecommerceContext?.tone ?? '');
  const [intent, setIntent] = useState(initialData?.ecommerceContext?.intent ?? '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!systemPrompt.trim()) newErrors.systemPrompt = 'System prompt is required';
    if (!skillFocus.trim()) newErrors.skillFocus = 'Skill focus is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const ecommerceContext = {
      browsingStyle: browsingStyle.trim(),
      patienceLevel: patienceLevel.trim(),
      productKnowledge: productKnowledge.trim(),
      tone: tone.trim(),
      intent: intent.trim(),
    };

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      systemPrompt: systemPrompt.trim(),
      skillFocus: skillFocus.trim(),
      active,
      ecommerceContext,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Impatient Shopper"
        error={errors.name}
        required
      />

      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="A short description of this persona's behavior and goals..."
        rows={3}
        error={errors.description}
        required
      />

      <Textarea
        label="System Prompt"
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        placeholder="You are a customer who is browsing an online store..."
        rows={8}
        className="min-h-[200px]"
        error={errors.systemPrompt}
        required
      />

      <Input
        label="Skill / Focus"
        value={skillFocus}
        onChange={(e) => setSkillFocus(e.target.value)}
        placeholder="e.g. Product discovery, Returns, Pricing"
        error={errors.skillFocus}
        required
      />

      <Checkbox
        label="Active"
        checked={active}
        onChange={(e) => setActive(e.target.checked)}
      />

      {/* Ecommerce Context Section */}
      <fieldset className="space-y-4 rounded-lg border border-border p-4">
        <legend className="px-2 text-sm font-semibold text-text-primary">
          Ecommerce Context
        </legend>

        <Input
          label="Browsing Style"
          value={browsingStyle}
          onChange={(e) => setBrowsingStyle(e.target.value)}
          placeholder="e.g. Quick scanner, Detailed reader"
        />

        <Input
          label="Patience Level"
          value={patienceLevel}
          onChange={(e) => setPatienceLevel(e.target.value)}
          placeholder="e.g. Low, Medium, High"
        />

        <Input
          label="Product Knowledge"
          value={productKnowledge}
          onChange={(e) => setProductKnowledge(e.target.value)}
          placeholder="e.g. Expert, Beginner, Moderate"
        />

        <Input
          label="Tone"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder="e.g. Friendly, Demanding, Confused"
        />

        <Input
          label="Intent"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="e.g. Buying, Browsing, Returning"
        />
      </fieldset>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isLoading}>
          {initialData ? 'Update Persona' : 'Create Persona'}
        </Button>
      </div>
    </form>
  );
}
