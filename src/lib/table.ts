import { useEffect, useMemo, useState } from 'react';
import { paginate } from '../store/selectors';

export function useTableFilter<T, F>(
  items: T[],
  filters: F,
  predicate: (item: T, filters: F) => boolean,
) {
  return useMemo(
    () => items.filter((item) => predicate(item, filters)),
    [items, filters, predicate],
  );
}

export function usePagination<T>(items: T[], size = 20) {
  const [requestedPage, setPage] = useState(1);
  const result = useMemo(() => paginate(items, requestedPage, size), [items, requestedPage, size]);

  useEffect(() => {
    if (requestedPage !== result.page) setPage(result.page);
  }, [requestedPage, result.page]);

  return { ...result, setPage };
}
