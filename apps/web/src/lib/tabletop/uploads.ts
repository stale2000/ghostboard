import type { MediaSource } from "@ghostboard/shared";

const TABLETOP_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

type TabletopImageMimeType = (typeof TABLETOP_IMAGE_MIME_TYPES)[number];

export type LocalTabletopImageRecord = {
  id: string;
  createdAt: string;
  fileName: string;
  fileSizeBytes: number;
  objectUrl: string;
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

function getImageDimensions(objectUrl: string): Promise<{ width: number; height: number }> {
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

    image.src = objectUrl;
  });
}

export async function createLocalTabletopImageRecord(file: File): Promise<LocalTabletopImageRecord> {
  const validationError = validateTabletopImageFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const objectUrl = URL.createObjectURL(file);
  const mimeType = file.type as TabletopImageMimeType;

  try {
    const dimensions = await getImageDimensions(objectUrl);
    const createdAt = new Date().toISOString();

    return {
      id: `local-image-${createdAt}-${file.name}`,
      createdAt,
      fileName: file.name,
      fileSizeBytes: file.size,
      objectUrl,
      mediaSource: {
        kind: "image",
        assetUrl: objectUrl,
        width: dimensions.width,
        height: dimensions.height,
        mimeType
      }
    };
  } catch (error) {
    revokeLocalTabletopImageRecord({ objectUrl } as LocalTabletopImageRecord);
    throw error;
  }
}

export function revokeLocalTabletopImageRecord(record: LocalTabletopImageRecord | null): void {
  if (!record) {
    return;
  }

  URL.revokeObjectURL(record.objectUrl);
}
