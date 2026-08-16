"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Client-side pagination for lists that are already loaded in full (realtime
 * hooks refetch whole collections, so we slice for display and grow on demand).
 * The visible window resets whenever the underlying list changes identity.
 */
export function usePaginatedList<T>(items: T[], pageSize: number) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  const showMore = useCallback(() => {
    setVisibleCount((c) => c + pageSize);
  }, [pageSize]);

  return {
    visible: items.slice(0, visibleCount),
    total: items.length,
    hasMore: visibleCount < items.length,
    showMore,
  };
}