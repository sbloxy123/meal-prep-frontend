"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

// "Email me the link" — for someone reading on a laptop who wants the install
// guide on their phone. POST /install/email is capped server-side (3/day);
// the 429 carries a message worth showing verbatim.
export function InstallEmailButton() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function send() {
    setState("sending");
    setMessage("");
    try {
      const res = await apiFetch<{ ok: boolean; email: string }>("/install/email", {
        method: "POST",
      });
      setMessage(`Sent to ${res.email}. Open it on your phone and tap the button.`);
      setState("sent");
    } catch (err) {
      let text = "Couldn’t send the email just now. Please try again.";
      if (err instanceof ApiError && err.status === 429) {
        try {
          const body = JSON.parse(err.body) as { message?: string };
          if (body.message) text = body.message;
        } catch {
          /* keep the fallback */
        }
      }
      setMessage(text);
      setState("error");
    }
  }

  return (
    <div className="install-email">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={send}
        disabled={state === "sending" || state === "sent"}
      >
        {state === "sent" ? "Email sent" : state === "sending" ? "Sending…" : "Email me the link"}
      </button>
      {message && (
        <p className={state === "error" ? "account-err" : "account-ok"} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
