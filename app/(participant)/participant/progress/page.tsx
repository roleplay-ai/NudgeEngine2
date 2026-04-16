import Topbar from '@/components/layout/Topbar';
import Link from 'next/link';

export default function ProgressPlaceholderPage() {
  return (
    <>
      <Topbar title="My Progress" />
      <main className="flex-1 overflow-y-auto px-7 py-6 max-w-lg mx-auto text-center">
        <div className="card py-12">
          <p className="text-3xl mb-4">📈</p>
          <h1 className="font-bold text-brand-dark text-lg mb-2">Progress tracking</h1>
          <p className="text-sm text-text-muted mb-6">
            The full progress hub (actions, skill journey, confidence check-ins) is part of the next phase.
            For now, use your training day page to review your commitment and actions.
          </p>
          <Link href="/participant/training-day" className="btn-primary inline-flex justify-center">
            Back to Training Day
          </Link>
        </div>
      </main>
    </>
  );
}
