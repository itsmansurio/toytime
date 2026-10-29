import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { t } from './i18n';

// Загружает данные при открытии экрана и обновляет их раз в intervalMs,
// чтобы статистика менялась сама, когда гости отвечают.
export function useRefresh<T>(loader: () => Promise<T>, intervalMs = 8000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Ошибка'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
      const timer = setInterval(reload, intervalMs);
      return () => clearInterval(timer);
    }, [reload, intervalMs]),
  );

  return { data, error, loading, reload, setData };
}
