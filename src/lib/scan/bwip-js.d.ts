// bwip-js only exposes its types under the "node" condition, which this tsconfig does not use.
declare module 'bwip-js' {
	const bwipjs: { toBuffer(options: Record<string, unknown>): Promise<Buffer> };
	export default bwipjs;
}
