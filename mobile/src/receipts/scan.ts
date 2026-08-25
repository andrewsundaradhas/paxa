/**
 * Camera / gallery capture + on-device OCR, behind guarded requires.
 *
 * Native modules are optional at build time: if they aren't installed/linked the
 * scan buttons degrade to manual entry instead of crashing. To enable, install
 * and rebuild (see PHASE_NOTES):
 *   react-native-image-picker            (camera + library)
 *   @react-native-ml-kit/text-recognition (on-device OCR, no network, no key)
 *
 * On-device OCR keeps receipt images off our servers — only the fields the user
 * confirms are ever sent.
 */
export class ScanUnavailable extends Error {}

/* eslint-disable @typescript-eslint/no-var-requires */
// Literal requires (wrapped in try/catch) so Metro treats them as OPTIONAL
// dependencies — the bundle builds with or without the native modules installed
// (see metro.config.js → resolver.allowOptionalDependencies).
function requireImagePicker(): any | null {
  try {
    return require('react-native-image-picker');
  } catch {
    return null;
  }
}

function requireTextRecognition(): any | null {
  try {
    return require('@react-native-ml-kit/text-recognition');
  } catch {
    return null;
  }
}

/** True when both camera/picker and OCR native modules are present. */
export function scanSupported(): boolean {
  return Boolean(requireImagePicker() && requireTextRecognition());
}

async function pickImageUri(source: 'camera' | 'library'): Promise<string | null> {
  const picker = requireImagePicker();
  if (!picker) {
    throw new ScanUnavailable('Camera module is not available in this build');
  }
  const opts = {
    mediaType: 'photo' as const,
    quality: 0.7 as const, // compress before OCR — faster, lighter
    includeBase64: false,
    maxWidth: 1600,
    maxHeight: 1600,
    saveToPhotos: false,
  };
  const res = source === 'camera' ? await picker.launchCamera(opts) : await picker.launchImageLibrary(opts);
  if (res?.didCancel) {
    return null;
  }
  if (res?.errorCode) {
    throw new ScanUnavailable(res.errorMessage || 'Could not open the camera');
  }
  return res?.assets?.[0]?.uri ?? null;
}

/** Run ML Kit text recognition on a local image uri, returning the raw text. */
async function ocr(uri: string): Promise<string> {
  const mod = requireTextRecognition();
  const TextRecognition = mod?.default ?? mod;
  if (!TextRecognition?.recognize) {
    throw new ScanUnavailable('OCR module is not available in this build');
  }
  const result = await TextRecognition.recognize(uri);
  return typeof result?.text === 'string' ? result.text : '';
}

/**
 * Capture (or pick) a receipt photo and OCR it. Returns the raw text plus the
 * image uri, or null if the user cancelled. Throws ScanUnavailable when the
 * native modules are missing so the caller can offer manual entry.
 */
export async function captureAndScan(source: 'camera' | 'library'): Promise<{rawText: string; uri: string} | null> {
  const uri = await pickImageUri(source);
  if (!uri) {
    return null;
  }
  const rawText = await ocr(uri);
  return {rawText, uri};
}
