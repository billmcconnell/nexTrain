import { Suspense } from 'react';
import { searchStops, getStopPredictions } from '@/lib/mbta';
import SearchForm from '@/components/SearchForm';
import StopList from '@/components/StopList';
import PredictionBoard from '@/components/PredictionBoard';
import AutoRefresh from '@/components/AutoRefresh';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stop?: string }>;
}) {
  const { q, stop } = await searchParams;

  let content: React.ReactNode = null;

  if (stop) {
    const data = await getStopPredictions(stop);
    if (data) {
      content = (
        <>
          <AutoRefresh intervalMs={30_000} />
          <PredictionBoard data={data} />
        </>
      );
    } else {
      content = (
        <p className="text-zinc-400 text-sm mt-4">
          Station &ldquo;{stop}&rdquo; not found.
        </p>
      );
    }
  } else if (q) {
    const stops = await searchStops(q);
    if (stops.length === 1) {
      // Auto-select single match
      const data = await getStopPredictions(stops[0].id);
      if (data) {
        content = (
          <>
            <AutoRefresh intervalMs={30_000} />
            <PredictionBoard data={data} />
          </>
        );
      }
    } else {
      content = <StopList stops={stops} query={q} />;
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-blue-400">nex</span>Train
          </h1>
          <p className="text-zinc-400 text-sm mt-1">MBTA real-time arrivals</p>
        </header>

        <Suspense>
          <SearchForm />
        </Suspense>

        {content ?? (
          <div className="mt-10 text-center text-zinc-600">
            <p className="text-4xl mb-3">🚇</p>
            <p>Search for a station to see upcoming arrivals.</p>
          </div>
        )}
      </div>
    </main>
  );
}
