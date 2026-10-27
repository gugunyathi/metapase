import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

const LEGACY_PREFIX = 'mpae:';
const CURRENT_PREFIX = 'metapase:';

const readRaw = (key: string): string | null => {
  const current = window.localStorage.getItem(key);
  if (current !== null) return current;
  if (!key.startsWith(CURRENT_PREFIX)) return null;
  const legacyKey = LEGACY_PREFIX + key.slice(CURRENT_PREFIX.length);
  const legacy = window.localStorage.getItem(legacyKey);
  if (legacy !== null) {
    window.localStorage.setItem(key, legacy);
    window.localStorage.removeItem(legacyKey);
  }
  return legacy;
};

const read = <T,>(key: string, fallback: T): T => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = readRaw(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T;
    if (fallback !== null && typeof fallback === 'object') return (parsed && typeof parsed === 'object' ? { ...fallback, ...(parsed as object) } : fallback) as T;
    return parsed as T;
  } catch {
    return fallback;
  }
};

export function usePersistentState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => read(key, fallback));

  useEffect(() => {
    try {
      window.localStorage?.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  }, [key, value]);

  return [value, setValue];
}
