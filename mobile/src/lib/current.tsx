import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type EventItem } from './api';
import { storage } from './storage';
import { useRefresh } from './useRefresh';

// Текущее мероприятие: все четыре вкладки (как в макете) работают с ним.
// Если мероприятий несколько, организатор переключает их на главной.
const KEY = 'currentEventId';
const CurrentContext = createContext<{ currentId: string | null; setCurrentId: (id: string | null) => void }>({
  currentId: null, setCurrentId: () => {},
});

export function CurrentEventProvider({ children }: { children: ReactNode }) {
  const [currentId, setId] = useState<string | null>(null);
  useEffect(() => { storage.get(KEY).then((v) => v && setId(v)).catch(() => {}); }, []);
  const setCurrentId = useCallback((id: string | null) => {
    setId(id);
    (id ? storage.set(KEY, id) : storage.remove(KEY)).catch(() => {});
  }, []);
  return <CurrentContext.Provider value={{ currentId, setCurrentId }}>{children}</CurrentContext.Provider>;
}

// Ближайшее предстоящее, если выбранное удалено или ещё не выбрано.
export function pickCurrent(events: EventItem[], id: string | null): EventItem | null {
  const chosen = events.find((e) => e.id === id);
  if (chosen) return chosen;
  const now = Date.now();
  return events.find((e) => new Date(e.startsAt).getTime() > now) ?? events[events.length - 1] ?? null;
}

export function useCurrentEvent(intervalMs = 8000) {
  const { currentId, setCurrentId } = useContext(CurrentContext);
  const { data, error, loading, reload } = useRefresh(api.events, intervalMs);
  const events = data ?? [];
  return { events, event: pickCurrent(events, currentId), error, loading, reload, setCurrentId };
}
