"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { RecipeImage } from "@/components/recipe-image";
import { CLOUD_NAME, UPLOAD_PRESET, uploadToCloudinary } from "@/lib/cloudinary";

export interface RecipePhoto {
  url: string;
  publicId: string;
}

interface ImageDropProps {
  value: RecipePhoto | null;
  onChange: (next: RecipePhoto | null) => void;
}

const configured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

// Photo drop zone above Title in the recipe form (§9.7). Unsigned upload
// straight to Cloudinary with progress; replace and remove. Bordered, no
// filled accent. Degrades to a hint if Cloudinary isn't configured.
export function ImageDrop({ value, onChange }: ImageDropProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function upload(file: File | undefined | null) {
    if (!file || uploading) return;
    setUploading(true);
    setProgress(0);
    setError("");
    try {
      const res = await uploadToCloudinary(file, setProgress);
      onChange({ url: res.secure_url, publicId: res.public_id });
    } catch {
      setError("That upload didn't work. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="field">
      <label>Photo</label>

      {value ? (
        <div className="img-drop img-drop--has">
          <div className="img-drop-preview">
            <RecipeImage src={value.url} sizes="600px" />
          </div>
          <div className="img-drop-actions">
            <label className="btn btn-secondary">
              Replace
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => upload(e.target.files?.[0])}
              />
            </label>
            <button type="button" className="btn btn-ghost" onClick={() => onChange(null)}>
              Remove
            </button>
          </div>
        </div>
      ) : uploading ? (
        <div className="img-drop img-drop--uploading">
          <div className="img-drop-bar">
            <div className="img-drop-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-muted" style={{ fontSize: 12 }}>
            Uploading… {progress}%
          </span>
        </div>
      ) : configured ? (
        <label
          className="img-drop img-drop--empty"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files?.[0]);
          }}
        >
          <ImagePlus size={22} aria-hidden />
          <span className="img-drop-title">Add a photo</span>
          <span className="text-muted" style={{ fontSize: 12 }}>
            Drag &amp; drop, or tap to choose
          </span>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
      ) : (
        <div className="img-drop img-drop--disabled text-muted">
          Photo uploads aren&rsquo;t set up yet.
        </div>
      )}

      {error && <p className="rf-error">{error}</p>}
    </div>
  );
}
