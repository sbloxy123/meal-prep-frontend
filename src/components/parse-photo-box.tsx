"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Images, X, Sparkles } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { fileToDownscaledBase64 } from "@/lib/image";
import type { RecipeFormInitial } from "@/components/recipe-form";

const MAX_PHOTOS = 4;

interface Photo {
  file: File;
  url: string; // object URL for the thumbnail; revoked when removed/cleared
}

// "Take a photo" — photographs a recipe (e.g. a cookbook page, or both pages of
// a spread) and POST /recipes/parse-from-photo reads it with Claude vision,
// returning a draft (not persisted) that prefills the form below for review.
// Mirrors ImportBox: the button is disabled + shows a pending label while the
// (multi-second) call runs, and failures surface inline, distinguished by status
// (429 = rate limit, no retry; 400 = unreadable photo). Photos are downscaled in
// the browser, sent as base64, and discarded — nothing is stored.
//
// Two separate triggers: "Take photo" uses capture="environment" to open the
// camera directly (Android's photo picker for a plain file input has no camera),
// and "Choose photos" opens the gallery/library with multi-select.
export function ParsePhotoBox({
  onParsed,
}: {
  onParsed: (draft: RecipeFormInitial) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);

  // Revoke any outstanding object URLs on unmount (add/remove/clear revoke as
  // they go; this covers navigating away with photos still selected). The ref is
  // kept in sync via an effect so the unmount cleanup sees the latest list.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  function addFiles(input: HTMLInputElement) {
    const list = input.files;
    if (!list || list.length === 0) return;
    setError(null);
    setPhotos((prev) => {
      const additions = Array.from(list).map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }));
      const combined = [...prev, ...additions];
      // If the selection overflows the cap, revoke the URLs we drop.
      combined.slice(MAX_PHOTOS).forEach((p) => URL.revokeObjectURL(p.url));
      return combined.slice(0, MAX_PHOTOS);
    });
    input.value = ""; // let the same file be picked again
  }

  function removeAt(index: number) {
    setPhotos((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function clearPhotos() {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }

  async function submit() {
    if (photos.length === 0 || pending) return;
    setPending(true);
    setError(null);
    try {
      const images = await Promise.all(photos.map((p) => fileToDownscaledBase64(p.file)));
      const draft = await apiFetch<RecipeFormInitial>("/recipes/parse-from-photo", {
        method: "POST",
        body: JSON.stringify({ images }),
      });
      clearPhotos();
      onParsed(draft);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError({ message: "Photo limit reached — 15 per 6 hours. Try again later.", retry: false });
      } else if (err instanceof ApiError && err.status === 400) {
        setError({ message: "Couldn’t read a recipe from that photo.", retry: true });
      } else {
        setError({ message: "Something went wrong. Please try again.", retry: true });
      }
    } finally {
      setPending(false);
    }
  }

  const atLimit = photos.length >= MAX_PHOTOS;
  const disabled = pending || atLimit;

  return (
    <div className="ai-box">
      <div className="ai-head">
        <Camera size={14} color="var(--color-accent)" aria-hidden />
        <span className="ai-label">Take a photo</span>
      </div>

      <div className="ai-photo-triggers">
        <label className="btn btn-secondary" data-disabled={disabled || undefined}>
          <Camera size={15} aria-hidden style={{ marginRight: 6 }} />
          Take photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => addFiles(e.currentTarget)}
            disabled={disabled}
          />
        </label>
        <label className="btn btn-secondary" data-disabled={disabled || undefined}>
          <Images size={15} aria-hidden style={{ marginRight: 6 }} />
          Choose photos
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => addFiles(e.currentTarget)}
            disabled={disabled}
          />
        </label>
      </div>

      {photos.length > 0 && (
        <ul className="ai-thumbs">
          {photos.map((photo, i) => (
            <li key={photo.url} className="ai-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={`Recipe photo ${i + 1}`} />
              <button
                type="button"
                className="ai-thumb-remove"
                onClick={() => removeAt(i)}
                aria-label={`Remove photo ${i + 1}`}
                disabled={pending}
              >
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="ai-error" role="alert">
          {error.message}
          {error.retry && (
            <>
              {" "}
              <button type="button" className="btn btn-ghost" onClick={submit}>
                Retry
              </button>
            </>
          )}
        </p>
      )}

      <div className="ai-foot">
        <span className="ai-hint text-muted">
          {atLimit
            ? "Maximum 4 photos."
            : "Snap a cookbook page (or both pages of a spread) — we’ll fill in the details below for you to review."}
        </span>
        <button
          type="button"
          className="btn btn-ai"
          style={{ height: 34, flex: "none" }}
          onClick={submit}
          disabled={pending || photos.length === 0}
        >
          <Sparkles size={15} className="btn-ai-spark" aria-hidden />
          {pending ? "Reading…" : "Extract"}
        </button>
      </div>
    </div>
  );
}
