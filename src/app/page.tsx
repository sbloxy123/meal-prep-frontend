import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { HomeEnhancements } from "@/components/home-enhancements";

export const metadata: Metadata = {
  title: "Fornetto — Plan the week. Shop it by aisle.",
  description:
    "Pick a few recipes. Fornetto works out what you're actually missing, builds the shopping list for you, and sorts it into the order you walk the shop.",
};

/** Fornetto oven mark — accent arch, base line + door arch in ink. */
function Logo({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <path
        d="M17 86 V50 A33 33 0 0 1 83 50 V86"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="8"
      />
      <path
        d="M6 86 H94"
        stroke="var(--color-text)"
        strokeWidth="8"
        strokeLinecap="square"
      />
      <path
        d="M36 86 A14 14 0 0 1 64 86"
        fill="none"
        stroke="var(--color-text)"
        strokeWidth="8"
      />
    </svg>
  );
}

const muted80 = "color-mix(in srgb, var(--color-text) 80%, transparent)";

export default function HomePage() {
  return (
    <div
      className="home"
      style={{
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
        minHeight: "100vh",
      }}
    >
      <HomeEnhancements />

      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "color-mix(in srgb, var(--color-bg) 92%, transparent)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        <div
          data-header-row
          data-pad
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "16px 32px",
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
        >
          <a
            href="#top"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "var(--color-text)",
            }}
          >
            <Logo size={27} />
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 22,
                letterSpacing: ".01em",
              }}
            >
              Fornetto
            </span>
          </a>

          <nav
            data-nav
            style={{
              display: "flex",
              gap: 26,
              marginLeft: "auto",
              alignItems: "center",
              fontSize: 14,
            }}
          >
            <a href="#how">How it works</a>
            <a href="#shop">In the shop</a>
            <a href="#features">Features</a>
            <a href="#faq">Questions</a>
          </nav>

          <div
            data-actions
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <Link data-signin href="/sign-in" style={{ fontSize: 14 }}>
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="btn btn-primary"
              style={{ height: 38, textDecoration: "none" }}
            >
              Get started
            </Link>
            <details data-burger style={{ position: "relative" }}>
              <summary
                aria-label="Menu"
                style={{
                  width: 44,
                  height: 44,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid var(--color-divider)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-text)",
                }}
              >
                <svg
                  data-burger-bars
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <svg
                  data-burger-x
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </summary>
              <nav
                data-burger-panel
                style={{
                  position: "absolute",
                  top: "calc(100% + 13px)",
                  right: -20,
                  width: 240,
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-divider)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                  padding: 8,
                  display: "flex",
                  flexDirection: "column",
                  zIndex: 30,
                }}
              >
                {[
                  ["How it works", "#how"],
                  ["In the shop", "#shop"],
                  ["Features", "#features"],
                  ["Questions", "#faq"],
                ].map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: 44,
                      padding: "0 12px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 15,
                      color: "var(--color-text)",
                    }}
                  >
                    {label}
                  </a>
                ))}
                <span
                  style={{
                    height: 1,
                    background: "var(--color-divider)",
                    margin: "6px 12px",
                  }}
                />
                <Link
                  href="/sign-in"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    minHeight: 44,
                    padding: "0 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 15,
                    color: "var(--color-accent-700)",
                  }}
                >
                  Sign in
                </Link>
              </nav>
            </details>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section
        id="top"
        data-grid="hero"
        data-pad
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "76px 32px 84px",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 64,
          alignItems: "center",
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--color-accent)",
            }}
          >
            Fornetto
          </div>
          <h1
            data-h1
            style={{
              fontWeight: 400,
              fontSize: 66,
              lineHeight: 1.02,
              margin: "16px 0 0",
              letterSpacing: "-.01em",
            }}
          >
            Plan the week.
            <br />
            <em style={{ fontStyle: "italic" }}>Shop it by aisle.</em>
          </h1>
          <p
            style={{
              fontSize: 19,
              lineHeight: 1.6,
              margin: "24px 0 0",
              color: muted80,
              textWrap: "pretty",
            }}
          >
            Pick a few recipes. Fornetto works out what you&rsquo;re actually
            missing, builds the shopping list for you, and sorts it into the
            order you walk the shop.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 34,
            }}
          >
            <Link
              href="/sign-up"
              className="btn btn-primary"
              style={{
                height: 50,
                paddingInline: 30,
                fontSize: 16,
                textDecoration: "none",
              }}
            >
              Get started
            </Link>
            <a
              href="#how"
              className="btn btn-ghost"
              style={{ height: 50, textDecoration: "none" }}
            >
              See how it works
            </a>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px 22px",
              marginTop: 30,
              paddingTop: 22,
              borderTop: "1px solid var(--color-divider)",
              fontSize: 13,
              color: "color-mix(in srgb, var(--color-text) 62%, transparent)",
            }}
          >
            <span>Free to use</span>
            <span>·</span>
            <span>Works in the shop with no signal</span>
            <span>·</span>
            <span>Installs on your phone</span>
          </div>
        </div>

        <div
          data-phones
          style={{
            display: "flex",
            alignItems: "flex-end",
            position: "relative",
          }}
        >
          <div
            data-phone-sm
            style={{
              width: 252,
              border: "1px solid var(--color-divider)",
              borderRadius: 28,
              padding: 7,
              background: "var(--color-bg)",
              boxShadow: "var(--shadow-md)",
              position: "relative",
              zIndex: 1,
              marginRight: -34,
              marginBottom: 34,
            }}
          >
            <div
              style={{ borderRadius: 22, overflow: "hidden", height: 428 }}
            >
              <Image
                src="/home-this-week.jpg"
                alt="This week — four recipes chosen"
                width={476}
                height={856}
                priority
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                  objectPosition: "top",
                }}
              />
            </div>
          </div>
          <div
            data-phone-lg
            style={{
              width: 290,
              border: "1px solid var(--color-divider)",
              borderRadius: 32,
              padding: 8,
              background: "var(--color-bg)",
              boxShadow: "var(--shadow-lg)",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{ borderRadius: 25, overflow: "hidden", height: 562 }}
            >
              <Image
                src="/home-in-the-shop.jpg"
                alt="In the shop — list sorted by aisle"
                width={548}
                height={1124}
                priority
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                  objectPosition: "top",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--color-divider)" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "44px 32px",
            display: "flex",
            alignItems: "center",
            gap: 28,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={23} />
            <span
              style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}
            >
              Fornetto
            </span>
          </div>
          <span className="text-muted" style={{ fontSize: 13 }}>
            Made for people who cook on weeknights.
          </span>
          <div
            style={{
              display: "flex",
              gap: 22,
              marginLeft: "auto",
              fontSize: 13,
            }}
          >
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#faq">Questions</a>
            <Link href="/sign-in">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
