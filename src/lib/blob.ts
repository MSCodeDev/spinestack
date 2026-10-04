/** A small seeded PRNG (mulberry32), so shapes are the same on server and client. */
export function seeded(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export const hashString = (s: string) =>
	[...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

type Point = [number, number];

/**
 * A smooth, irregular closed blob inside a 0..size square, as an SVG path.
 * Points sit at uneven radii around the centre and are joined with Catmull-Rom curves.
 */
export function blobPath(seed: number, { size = 200, points = 8, wobble = 0.28 } = {}): string {
	const rand = seeded(seed);
	const centre = size / 2;
	const pts: Point[] = [];
	for (let i = 0; i < points; i++) {
		const angle = (i / points) * Math.PI * 2 + (rand() - 0.5) * 0.35;
		const radius = (centre * (1 - wobble) + rand() * centre * wobble) * 0.96;
		pts.push([centre + Math.cos(angle) * radius, centre + Math.sin(angle) * radius]);
	}

	const f = (n: number) => n.toFixed(1);
	const at = (i: number) => pts[(i + points) % points];
	let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
	for (let i = 0; i < points; i++) {
		const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
		const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
		const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
		d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
	}
	return `${d}Z`;
}
