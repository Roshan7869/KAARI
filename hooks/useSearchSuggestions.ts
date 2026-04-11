import { useState, useEffect, useRef } from 'react';

export interface SearchSuggestion {
  id: string;
  title: string;
  slug: string;
  category: string;
  price: number;
  type: 'product' | 'category';
}

export function useSearchSuggestions(query: string, debounceMs = 300) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(trimmed)}`,
          { signal: abortRef.current.signal }
        );
        if (res.ok) {
          const json = await res.json() as { suggestions: SearchSuggestion[] };
          setSuggestions(json.suggestions ?? []);
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  return { suggestions, isLoading };
}
