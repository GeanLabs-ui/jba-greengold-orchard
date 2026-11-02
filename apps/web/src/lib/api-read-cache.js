import { queryClientInstance } from './query-client';
import { subscribeToDataChanges } from './data-sync';

const key = ['api-read'];

// Memory only: never persist staff records or reuse them across account changes.
export function clearApiReadCache() {
  queryClientInstance.removeQueries({ queryKey: key });
}

export function invalidateApiEntity(entity) {
  if (!entity) return clearApiReadCache();
  queryClientInstance.removeQueries({
    queryKey: key,
    predicate: query => {
      const path = query.queryKey[1];
      const match = /^\/entities\/([^/?]+)/.exec(path);
      // Relational summaries may depend on any entity. Other entity collections
      // remain reusable, avoiding a full workspace reload after each small edit.
      const name = match && decodeURIComponent(match[1]);
      return !match || name === entity || name === 'Notification'
        || (['Farm', 'FarmBlock'].includes(entity) && ['Farm', 'FarmBlock'].includes(name));
    },
  });
}

export function cachedApiRead(path, load) {
  const [pathname, search] = path.split('?');
  const params = new URLSearchParams(search);
  if (params.get('offset') === '0') params.delete('offset');
  params.sort();
  const canonicalPath = pathname + (params.size ? `?${params}` : '');
  return queryClientInstance.fetchQuery({
    queryKey: [...key, canonicalPath],
    queryFn: ({ signal }) => load(signal),
    staleTime: 15_000,
    gcTime: 60_000,
    retry: false,
  });
}

// Registered before page subscribers so their refreshes always see new data,
// including writes made in a different tab or through the relational APIs.
subscribeToDataChanges(detail => invalidateApiEntity(detail?.entity));
