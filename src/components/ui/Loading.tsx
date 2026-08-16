import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`w-5 h-5 animate-spin ${className}`} />;
}

export function FullPageLoader({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: 'rgb(var(--bg))' }}>
      <Spinner className="w-8 h-8 text-primary" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-4 w-24 rounded bg-black/5 dark:bg-white/10 mb-3" />
      <div className="h-8 w-32 rounded bg-black/5 dark:bg-white/10" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="h-10 w-10 rounded-full bg-black/5 dark:bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 rounded bg-black/5 dark:bg-white/10" />
        <div className="h-3 w-24 rounded bg-black/5 dark:bg-white/10" />
      </div>
      <div className="h-4 w-20 rounded bg-black/5 dark:bg-white/10" />
    </div>
  );
}
