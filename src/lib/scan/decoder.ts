import { BarcodeFormat, DecodeHintType } from '@zxing/library';

/**
 * Book barcodes are EAN-13; restricting formats makes decoding faster and fewer false reads.
 *
 * TRY_HARDER is off: with it, zxing rotates frames through a canvas helper that throws
 * "Could not create a Canvas element" in @zxing/browser 0.2, so no frame ever decodes.
 */
export const decodeHints = () =>
	new Map<DecodeHintType, unknown>([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]);
