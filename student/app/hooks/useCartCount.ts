import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from '~/services/httpMethods/get';
import { useAppSelector } from '~/hooks/useAppSelector';

/** The one key every reader of "how many things are in my cart" shares. */
export const CART_COUNT_KEY = ['cart', 'me', 'count'] as const;

/**
 * Fired by the cart service after any mutation — add, remove, clear, coupon —
 * so every subscriber refetches from ONE signal instead of each screen
 * remembering to invalidate. The header badge listens; so can anything else.
 */
export const CART_CHANGED_EVENT = 'etutor:cart-changed';

type CartLike = { items?: unknown[] } | { data?: { items?: unknown[] } } | null | undefined;
const countOf = (c: CartLike): number => {
  const bag = (c as { data?: { items?: unknown[] } })?.data ?? (c as { items?: unknown[] });
  return Array.isArray(bag?.items) ? bag.items.length : 0;
};

export function useCartCount(): number {
  const user = useAppSelector((s) => s.auth?.user);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: CART_COUNT_KEY,
    queryFn: async () => countOf((await get<CartLike>('/cart')) as CartLike),
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  useEffect(() => {
    const onChange = () => { void qc.invalidateQueries({ queryKey: CART_COUNT_KEY }); };
    window.addEventListener(CART_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CART_CHANGED_EVENT, onChange);
  }, [qc]);
  return user ? (q.data ?? 0) : 0;
}
