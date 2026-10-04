<script lang="ts">
	import { onMount } from 'svelte';
	import { isbnFromBarcode } from '#lib/scan/isbn-scan.js';

	type Props = { onscan: (isbn: string) => void };
	let { onscan }: Props = $props();

	// The Barcode Detection API is not in the TypeScript DOM lib yet.
	type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
	type DetectorCtor = {
		new (options: { formats: string[] }): Detector;
		getSupportedFormats(): Promise<string[]>;
	};

	let video = $state<HTMLVideoElement>();
	let message = $state<string | null>('Starting camera…');

	const REPEAT_MS = 3000;

	onMount(() => {
		let stopped = false;
		let cleanup = () => {};
		let lastCode = '';
		let lastAt = 0;

		function found(text: string) {
			const isbn = isbnFromBarcode(text);
			if (!isbn || (isbn === lastCode && Date.now() - lastAt < REPEAT_MS)) return;
			lastCode = isbn;
			lastAt = Date.now();
			navigator.vibrate?.(60);
			onscan(isbn);
		}

		async function start() {
			if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
				message = 'Camera scanning needs HTTPS (or localhost).';
				return;
			}

			let stream: MediaStream;
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					audio: false,
					video: {
						facingMode: { ideal: 'environment' },
						width: { ideal: 1920 },
						height: { ideal: 1080 }
					}
				});
			} catch (e) {
				const name = e instanceof DOMException ? e.name : '';
				message =
					name === 'NotAllowedError'
						? 'Camera access was blocked. Allow it in your browser settings and try again.'
						: name === 'NotFoundError'
							? 'No camera was found on this device.'
							: 'Could not start the camera.';
				return;
			}
			if (stopped || !video) return stream.getTracks().forEach((t) => t.stop());

			const track = stream.getVideoTracks()[0];
			// Continuous autofocus helps with small barcodes; not every camera supports it.
			track
				.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
				.catch(() => {});

			video.srcObject = stream;
			await video.play().catch(() => {});
			message = null;

			cleanup = () => {
				stream.getTracks().forEach((t) => t.stop());
			};

			const Native = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
			if (
				Native &&
				(await Native.getSupportedFormats().catch((): string[] => [])).includes('ean_13')
			) {
				const detector = new Native({ formats: ['ean_13'] });
				const timer = setInterval(async () => {
					if (!video || video.readyState < 2) return;
					const codes = await detector.detect(video).catch(() => []);
					for (const code of codes) found(code.rawValue);
				}, 150);
				const stopStream = cleanup;
				cleanup = () => {
					clearInterval(timer);
					stopStream();
				};
				return;
			}

			// Fallback for browsers without the Barcode Detection API (e.g. Firefox, Safari).
			const [{ BrowserMultiFormatReader }, { decodeHints }] = await Promise.all([
				import('@zxing/browser'),
				import('#lib/scan/decoder.js')
			]);
			if (stopped) return cleanup();
			const reader = new BrowserMultiFormatReader(decodeHints(), { delayBetweenScanAttempts: 100 });
			const controls = await reader.decodeFromStream(stream, video, (result) => {
				// Errors fire on nearly every frame without a barcode, so they are ignored.
				if (result) found(result.getText());
			});
			const stopStream = cleanup;
			cleanup = () => {
				controls.stop();
				stopStream();
			};
		}

		start();
		return () => {
			stopped = true;
			cleanup();
		};
	});
</script>

<div class="relative overflow-hidden rounded-lg bg-black">
	<video bind:this={video} playsinline muted class="aspect-video w-full object-cover"></video>
	{#if message}
		<p
			class="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white"
			role="status"
		>
			{message}
		</p>
	{:else}
		<div
			class="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80"
		></div>
	{/if}
</div>
