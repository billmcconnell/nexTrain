'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    setValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/?q=${encodeURIComponent(trimmed)}`);
  }

  function handleClear() {
    setValue('');
    router.push('/');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search for a station…"
          className="w-full rounded-xl bg-zinc-800 px-4 py-3 pr-10 text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-700 focus:ring-2 focus:ring-blue-500 transition"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      <button
        type="submit"
        className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-500 active:bg-blue-700 transition"
      >
        Search
      </button>
    </form>
  );
}
