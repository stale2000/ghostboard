import type { MediaSource } from "../ghostboard-shared";

const TABLETOP_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

type TabletopImageMimeType = (typeof TABLETOP_IMAGE_MIME_TYPES)[number];

export type LocalTabletopImageRecord = {
  id: string;
  createdAt: string;
  fileName: string;
  fileSizeBytes: number;
  previewUrl: string;
  mediaSource: MediaSource;
};

export function isSupportedTabletopImageType(value: string): value is TabletopImageMimeType {
  return TABLETOP_IMAGE_MIME_TYPES.includes(value as TabletopImageMimeType);
}

export function getAcceptedTabletopImageTypes(): readonly TabletopImageMimeType[] {
  return TABLETOP_IMAGE_MIME_TYPES;
}

export function validateTabletopImageFile(file: File): string | null {
  if (!isSupportedTabletopImageType(file.type)) {
    return "GhostBoard currently supports only PNG, JPEG, and WebP table images in this scaffold.";
  }

  return null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The selected file could not be encoded for room sharing."));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("The selected file could not be encoded for room sharing."));
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(assetUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
    };

    image.onload = () => {
      cleanup();
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight
      });
    };

    image.onerror = () => {
      cleanup();
      reject(new Error("The selected file could not be read as an image."));
    };

    image.src = assetUrl;
  });
}

export async function createLocalTabletopImageRecord(file: File): Promise<LocalTabletopImageRecord> {
  const validationError = validateTabletopImageFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const mimeType = file.type as TabletopImageMimeType;
  const assetUrl = await readFileAsDataUrl(file);
  const dimensions = await getImageDimensions(assetUrl);
  const createdAt = new Date().toISOString();

  return {
    id: `shared-image-${createdAt}-${file.name}`,
    createdAt,
    fileName: file.name,
    fileSizeBytes: file.size,
    previewUrl: assetUrl,
    mediaSource: {
      kind: "image",
      assetUrl,
      width: dimensions.width,
      height: dimensions.height,
      mimeType
    }
  };
}

export function revokeLocalTabletopImageRecord(_record: LocalTabletopImageRecord | null): void {}
