// Client-side image downscaling for the "take a photo" recipe extractor. Phone
// photos are far larger than Claude vision needs; we cap the long edge and
// re-encode as JPEG before base64-uploading, which keeps the request small and
// the vision token cost down. `createImageBitmap(..., from-image)` applies EXIF
// orientation so sideways phone shots come out upright.

const MAX_EDGE = 1600;
const QUALITY = 0.8;

export interface EncodedImage {
  media_type: "image/jpeg";
  data: string; // base64, without the "data:" prefix
}

export async function fileToDownscaledBase64(file: File): Promise<EncodedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
    const data = dataUrl.split(",")[1] ?? "";
    return { media_type: "image/jpeg", data };
  } finally {
    bitmap.close();
  }
}
