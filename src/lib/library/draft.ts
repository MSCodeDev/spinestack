import type { Draft, MetadataResult } from '../types.js';

/** Form prefill from a provider result. */
export function resultToDraft(r: MetadataResult): Draft {
	return {
		title: r.title,
		subtitle: r.subtitle,
		authors: r.authors,
		isbn: r.isbn,
		publisher: r.publisher,
		pageCount: r.pageCount,
		language: r.language,
		synopsis: r.synopsis,
		coverUrl: r.coverUrl,
		status: 'owned'
	};
}
