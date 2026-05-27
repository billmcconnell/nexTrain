import Link from 'next/link';
import type { Stop } from '@/lib/types';

export default function StopList({ stops, query }: { stops: Stop[]; query: string }) {
  if (stops.length === 0) {
    return (
      <p className="text-zinc-400 text-sm mt-4">
        No stations found matching &ldquo;{query}&rdquo;. Try a different name.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-zinc-400 text-sm">
        {stops.length} station{stops.length !== 1 ? 's' : ''} found — pick one:
      </p>
      <ul className="space-y-1">
        {stops.map((stop) => (
          <li key={stop.id}>
            <Link
              href={`/?stop=${encodeURIComponent(stop.id)}`}
              className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-3 hover:bg-zinc-700 transition"
            >
              <span className="text-white font-medium">{stop.name}</span>
              <span className="text-zinc-500 text-sm font-mono">{stop.id}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
