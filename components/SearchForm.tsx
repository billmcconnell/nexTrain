'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import type { Stop } from '@/lib/types';

export default function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const [suggestions, setSuggestions] = useState<Stop[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stops?q=${encodeURIComponent(trimmed)}`);
        const data: Stop[] = await res.json();
        setSuggestions(data.slice(0, 8));
        setShowDropdown(data.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  function selectStop(stop: Stop) {
    setValue(stop.name);
    setSuggestions([]);
    setShowDropdown(false);
    router.push(`/?stop=${encodeURIComponent(stop.id)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      selectStop(suggestions[activeIndex]);
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) return;
    setShowDropdown(false);
    router.push(`/?q=${encodeURIComponent(trimmed)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  }

  function handleClear() {
    setValue('');
    setSuggestions([]);
    setShowDropdown(false);
    router.push('/');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1" ref={containerRef}>
        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          placeholder="Search for a station…"
          className="w-full rounded-xl bg-zinc-800 px-4 py-3 pr-10 text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-700 focus:ring-2 focus:ring-blue-500 transition"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
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

        {showDropdown && suggestions.length > 0 && (
          <ul
            className="absolute z-10 mt-1 w-full rounded-xl bg-zinc-800 ring-1 ring-zinc-700 shadow-lg overflow-hidden"
            role="listbox"
          >
            {suggestions.map((stop, i) => (
              <li
                key={stop.id}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={() => selectStop(stop)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                  i === activeIndex
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {stop.name}
              </li>
            ))}
          </ul>
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
