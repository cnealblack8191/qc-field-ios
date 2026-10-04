import { useCallback, useEffect, useRef } from "react";

/**
 * Saves typed text shortly after the inspector stops typing, and at the
 * latest when the field's screen goes away, so leaving mid-sentence never
 * loses what was typed. Queued saves of the same field supersede each other
 * in the outbox, so saving often costs nothing.
 */
export function useDebouncedSave(delay = 800) {
  const pending = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const save = pending.current;
    pending.current = null;
    save?.();
  }, []);

  const schedule = useCallback(
    (save: () => void) => {
      pending.current = save;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush]
  );

  useEffect(() => flush, [flush]);

  return { schedule, flush };
}
