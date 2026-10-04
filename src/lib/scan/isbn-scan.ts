import { toIsbn13 } from '../isbn.js';

/** ISBN-13 from a scanned EAN-13: only Bookland codes (978/979) with a valid checksum count. */
export function isbnFromBarcode(text: string): string | null {
	const code = text.trim();
	return /^97[89]\d{10}$/.test(code) ? toIsbn13(code) : null;
}

export type QueueStatus = 'looking' | 'found' | 'missing' | 'error';

export type QueueItem = { isbn: string; status: QueueStatus };

/** Add an ISBN to the scan queue unless it is already there. */
export function enqueue(queue: QueueItem[], isbn: string): QueueItem[] {
	return queue.some((q) => q.isbn === isbn) ? queue : [...queue, { isbn, status: 'looking' }];
}
