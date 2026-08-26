import type {SearchRecord} from '@/src/lib/shared/search';

export type {SearchRecord} from '@/src/lib/shared/search';

/** Search record decorated with the optional relevance score returned by the search API. */
export type SearchResult = SearchRecord & {score?: number | null};
