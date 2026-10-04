// Start script for the built app (`npm start`, Docker).
//
// adapter-node 6 assumes requests arrive over https unless a header says otherwise, so a plain-http
// install fails SvelteKit's CSRF check. When ORIGIN is set, take the protocol from it. Behind a
// proxy, set PROTOCOL_HEADER (and HOST_HEADER) yourself and this does nothing.
import http from 'node:http';

// Cover uploads go through form posts; adapter-node's default body limit (512K) is too small.
process.env.BODY_SIZE_LIMIT ||= '8M';

const origin = process.env.ORIGIN ? new URL(process.env.ORIGIN) : null;

if (origin && !process.env.PROTOCOL_HEADER) {
	const header = 'x-spinestack-protocol';
	const protocol = origin.protocol.slice(0, -1);
	process.env.PROTOCOL_HEADER = header;

	const emit = http.Server.prototype.emit;
	http.Server.prototype.emit = function (event, req, ...rest) {
		if (event === 'request') req.headers[header] = protocol;
		return emit.call(this, event, req, ...rest);
	};
}

await import('./build/index.js');
