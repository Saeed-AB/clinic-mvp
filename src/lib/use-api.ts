"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDrawers } from "@/stores/drawers";
import { errorMessage } from "./api/client";

/** تحميل بيانات مع حالات التحميل والخطأ، ويعيد التحميل تلقائيًا بعد أي عملية كتابة */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const version = useDrawers((s) => s.version);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (id === reqId.current) setData(result);
    } catch (e) {
      if (id === reqId.current) setError(errorMessage(e));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load, version]);

  return { data, error, loading, reload: load, setData };
}
