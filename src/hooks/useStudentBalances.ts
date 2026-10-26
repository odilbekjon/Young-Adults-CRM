import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../app/store";
import { studentsApi } from "../app/api/studentsApi";

// Student balance as the student profile shows it: GET /students/{id}.balance
// — the single figure the profile badge, the Outstanding-balance card, the
// Students list and the group roster are all keyed off. Other places that
// derive a debt another way (Finance > Debtors) use this to show the very same
// number. Fetches each id once through the shared RTK cache (the profile's own
// query), a few at a time, and returns { [studentId]: balance } as they arrive.
export const useStudentBalances = (ids: string[], skip = false): Record<string, number> => {
  const dispatch = useDispatch<AppDispatch>();
  const [balances, setBalances] = useState<Record<string, number>>({});
  const requested = useRef(new Set<string>());
  const mounted = useRef(true);
  const key = [...new Set(ids.filter(Boolean))].sort().join(",");

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (skip || !key) return;
    const pending = key.split(",").filter((id) => !requested.current.has(id));
    pending.forEach((id) => requested.current.add(id));

    const run = async () => {
      // Small batches so a 100-row page doesn't fire 100 requests at once.
      for (let i = 0; i < pending.length; i += 4) {
        const batch = pending.slice(i, i + 4);
        const results = await Promise.all(
          batch.map(async (id) => {
            const sub = dispatch(studentsApi.endpoints.studentById.initiate(id));
            try {
              const res = await sub.unwrap();
              return [id, res.data.balance] as const;
            } catch {
              requested.current.delete(id);
              return null;
            } finally {
              sub.unsubscribe();
            }
          })
        );
        if (!mounted.current) return;
        const ok = results.filter((r): r is readonly [string, number] => r !== null && Number.isFinite(r[1]));
        if (ok.length > 0) setBalances((prev) => ({ ...prev, ...Object.fromEntries(ok) }));
      }
    };
    void run();
  }, [key, skip, dispatch]);

  return balances;
};
