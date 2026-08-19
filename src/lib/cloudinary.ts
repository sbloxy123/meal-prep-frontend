// Cloudinary rendering + upload helpers (§9). Photos are served through
// Cloudinary URL transformations (f_auto,q_auto,c_fill + an explicit width),
// never full-size downloads.

export const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
export const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

/** next/image loader: inject transformations into a stored Cloudinary URL. */
export function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src.includes("/upload/")) return src; // not a Cloudinary URL — leave it
  const params = ["f_auto", "c_fill", `w_${width}`, `q_${quality ?? "auto"}`];
  return src.replace("/upload/", `/upload/${params.join(",")}/`);
}

export interface CloudinaryUpload {
  secure_url: string;
  public_id: string;
}

/** Unsigned, direct browser → Cloudinary upload. Reports progress. */
export function uploadToCloudinary(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<CloudinaryUpload> {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      reject(new Error("Cloudinary is not configured"));
      return;
    }
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText);
        resolve({ secure_url: res.secure_url, public_id: res.public_id });
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(form);
  });
}
