import NewChipTestForm from '@/components/simulations/NewChipTestForm';

export default function NewChipTestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">New Chip Test</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Test chatbot chip responses across multiple products using the PDP chat API.
        </p>
      </div>
      <NewChipTestForm />
    </div>
  );
}
