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
const muted78 = "color-mix(in srgb, var(--color-text) 78%, transparent)";

/** A "How it works" step: number, title, paragraph, and a screenshot that
    bottom-aligns with its siblings via marginTop:auto. */
function Step({
  num,
  title,
  body,
  src,
  alt,
  objectPosition = "top",
}: {
  num: string;
  title: string;
  body: string;
  src: string;
  alt: string;
  objectPosition?: "top" | "center";
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 15,
            color: "var(--color-accent)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {num}
        </span>
        <h3 style={{ fontWeight: 400, fontSize: 25, margin: 0 }}>{title}</h3>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: 1.65,
          color: muted78,
          textWrap: "pretty",
        }}
      >
        {body}
      </p>
      <div
        style={{
          width: "100%",
          maxWidth: 290,
          border: "1px solid var(--color-divider)",
          borderRadius: 26,
          padding: 7,
          background: "var(--color-bg)",
          boxShadow: "var(--shadow-sm)",
          marginTop: "auto",
        }}
      >
        <div style={{ borderRadius: 20, overflow: "hidden", height: 340 }}>
          <Image
            src={src}
            alt={alt}
            width={552}
            height={680}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: "cover",
              objectPosition,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** One of the four "ways in" cards. The accent-bordered variant is the
    Photograph a page card. `icon` is the inline accent SVG. */
function AiCard({
  title,
  body,
  accentBorder = false,
  children,
}: {
  title: string;
  body: string;
  accentBorder?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${
          accentBorder ? "var(--color-accent-300)" : "var(--color-divider)"
        }`,
        borderRadius: "var(--radius-md)",
        padding: 26,
        background: "var(--color-bg)",
      }}
    >
      {children}
      <h3 style={{ fontWeight: 400, fontSize: 22, margin: "16px 0 0" }}>
        {title}
      </h3>
      <p
        className="text-muted"
        style={{ margin: "9px 0 0", fontSize: 14, lineHeight: 1.65 }}
      >
        {body}
      </p>
    </div>
  );
}

/** Icon wrapper shared by the AI cards. */
function AiIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** A hairline-ruled item in the "In the shop" grid. */
function ShopPoint({
  title,
  body,
  span = false,
}: {
  title: string;
  body: string;
  span?: boolean;
}) {
  return (
    <div
      style={{
        padding: "20px 0",
        borderTop: "1px solid var(--color-divider)",
        ...(span
          ? { borderBottom: "1px solid var(--color-divider)", gridColumn: "1/-1" }
          : {}),
      }}
    >
      <h4 style={{ margin: 0, fontWeight: 400, fontSize: 19 }}>{title}</h4>
      <p
        className="text-muted"
        style={{
          margin: "7px 0 0",
          fontSize: 14,
          lineHeight: 1.6,
          ...(span ? { maxWidth: 620 } : {}),
        }}
      >
        {body}
      </p>
    </div>
  );
}

/** A hairline-ruled item in the "The rest of it" feature list. */
function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{ padding: "26px 0", borderBottom: "1px solid var(--color-divider)" }}
    >
      <h4 style={{ margin: 0, fontWeight: 400, fontSize: 20 }}>{title}</h4>
      <p
        className="text-muted"
        style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6 }}
      >
        {body}
      </p>
    </div>
  );
}

/** A hairline-separated question/answer in the FAQ. `last` adds the closing rule. */
function Faq({
  q,
  a,
  last = false,
}: {
  q: string;
  a: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        padding: "24px 0",
        borderTop: "1px solid var(--color-divider)",
        ...(last ? { borderBottom: "1px solid var(--color-divider)" } : {}),
      }}
    >
      <h4 style={{ margin: 0, fontWeight: 400, fontSize: 21 }}>{q}</h4>
      <p
        className="text-muted"
        style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.65, maxWidth: 660 }}
      >
        {a}
      </p>
    </div>
  );
}

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

      {/* ── How it works ──────────────────────────────────────── */}
      <section
        id="how"
        style={{
          borderTop: "1px solid var(--color-divider)",
          background: "var(--color-surface)",
        }}
      >
        <div
          data-pad
          style={{ maxWidth: 1180, margin: "0 auto", padding: "78px 32px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 20,
              paddingBottom: 16,
              borderBottom: "1px solid var(--color-divider)",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  color: "var(--color-accent)",
                }}
              >
                How it works
              </div>
              <h2
                data-h2-lg
                style={{ fontWeight: 400, fontSize: 42, margin: "10px 0 0" }}
              >
                Three steps, once a week
              </h2>
            </div>
            <p
              className="text-muted"
              style={{
                margin: "0 0 0 auto",
                maxWidth: 340,
                fontSize: 15,
                textWrap: "pretty",
              }}
            >
              The whole loop takes a few minutes on a Sunday, and ends with a
              clean slate for next week.
            </p>
          </div>

          <div
            data-grid="how"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 44,
              marginTop: 52,
            }}
          >
            <Step
              num="01"
              title="Pick what you fancy"
              body={
                "Your recipes in one place, with photos and per-serving macros. Search by title — or by ingredient, when the question is really “what can I do with chicken?”"
              }
              src="/home-recipe-library.jpg"
              alt="Recipe library"
            />
            <Step
              num="02"
              title="Tick what you're missing"
              body={
                "The stock check asks one question: what do you actually need to buy? Leave out what's already in the cupboard, and it never reaches your list."
              }
              src="/home-stock-check.jpg"
              alt="Stock check — tick what you need to buy"
              objectPosition="center"
            />
            <Step
              num="03"
              title="Shop it by aisle"
              body={
                "Everything from your recipes, plus your own bits, sorted into supermarket sections — so you walk the shop once instead of zig-zagging it."
              }
              src="/home-in-the-shop.jpg"
              alt="Sorted by aisle"
            />
          </div>
        </div>
      </section>

      {/* ── In the shop ───────────────────────────────────────── */}
      <section id="shop" style={{ borderTop: "1px solid var(--color-divider)" }}>
        <div
          data-grid="shop"
          data-pad
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "84px 32px",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 72,
            alignItems: "center",
          }}
        >
          <div
            data-phone-shop
            style={{
              width: 320,
              border: "1px solid var(--color-divider)",
              borderRadius: 34,
              padding: 9,
              background: "var(--color-bg)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div style={{ borderRadius: 26, overflow: "hidden", height: 600 }}>
              <Image
                src="/home-in-the-shop.jpg"
                alt="In the shop mode"
                width={604}
                height={1200}
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
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
              }}
            >
              In the shop
            </div>
            <h2
              data-h2-lg
              style={{
                fontWeight: 400,
                fontSize: 44,
                margin: "12px 0 0",
                lineHeight: 1.08,
              }}
            >
              One hand, a trolley,
              <br />
              and no signal
            </h2>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.6,
                margin: "20px 0 0",
                maxWidth: 540,
                color: muted80,
                textWrap: "pretty",
              }}
            >
              Most list apps stop being useful the moment you&rsquo;re standing
              in a supermarket holding a basket. This is the part we spent the
              longest on.
            </p>

            <div
              data-grid="shopfeat"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 40px",
                marginTop: 36,
              }}
            >
              <ShopPoint
                title="Aisles in your order"
                body="Drag the sections to match the layout of your shop. Fornetto remembers it for next time."
              />
              <ShopPoint
                title="Ticks survive bad signal"
                body="Tick things off in a concrete-walled aisle. Changes queue up and sync when you're back on."
              />
              <ShopPoint
                title="The screen stays awake"
                body="No unlocking your phone with one hand while you hold a bag of onions in the other."
              />
              <ShopPoint
                title="Forgot something?"
                body="Add it there and then, without regenerating the list and losing everything you've ticked."
              />
              <ShopPoint
                span
                title="Finish shop, and it's a clean slate"
                body="One tap at the checkout clears the list and the week. You don't start next Sunday untangling last Sunday's leftovers."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Where the AI helps ────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--color-divider)",
          background: "var(--color-surface)",
        }}
      >
        <div
          data-pad
          style={{ maxWidth: 1180, margin: "0 auto", padding: "80px 32px" }}
        >
          <div style={{ maxWidth: 640 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
              }}
            >
              Where the AI helps
            </div>
            <h2
              data-h2-lg
              style={{
                fontWeight: 400,
                fontSize: 44,
                margin: "12px 0 0",
                lineHeight: 1.08,
              }}
            >
              Getting recipes in shouldn&rsquo;t be admin
            </h2>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.6,
                margin: "20px 0 0",
                color: muted80,
                textWrap: "pretty",
              }}
            >
              Typing out a recipe is the reason most meal planners get abandoned
              in week two. There are four ways in, and none of them is typing it
              all out.
            </p>
          </div>

          <div
            data-grid="ai"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 24,
              marginTop: 46,
            }}
          >
            <AiCard
              title="Paste a link"
              body="Drop in any recipe URL. It reads the page and fills in the title, ingredients, method and times for you to check over before saving."
            >
              <AiIcon>
                <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
                <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
              </AiIcon>
            </AiCard>
            <AiCard
              accentBorder
              title="Photograph a page"
              body="The good recipes are usually in a battered cookbook on the shelf. Take a photo of the page and it reads the ingredients and method straight off it."
            >
              <AiIcon>
                <path d="M14.5 4h-5L8 6.5H4.5A1.5 1.5 0 0 0 3 8v10.5A1.5 1.5 0 0 0 4.5 20h15a1.5 1.5 0 0 0 1.5-1.5V8a1.5 1.5 0 0 0-1.5-1.5H16z" />
                <circle cx="12" cy="13" r="3.5" />
              </AiIcon>
            </AiCard>
            <AiCard
              title="Type a title"
              body={
                "“Thai green chicken curry.” That's enough — it drafts the ingredients and method, and you edit it into your version."
              }
            >
              <AiIcon>
                <path d="M12 3v4M12 17v4M4.5 12h4M15.5 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M17.5 6.5l-2.8 2.8M9.3 14.7l-2.8 2.8" />
              </AiIcon>
            </AiCard>
            <AiCard
              title="Brain-dump the rest"
              body={
                "“milk, kitchen roll, 2 tins chopped toms, coffee” — one messy line, split into tidy separate items on your list."
              }
            >
              <AiIcon>
                <path d="M8 6h12M8 12h12M8 18h12" />
                <path d="m3.5 6 1.2 1.2L7 5" />
                <path d="m3.5 12 1.2 1.2L7 11" />
              </AiIcon>
            </AiCard>
          </div>

          <div
            data-grid="macros"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 56,
              alignItems: "center",
              marginTop: 56,
              paddingTop: 44,
              borderTop: "1px solid var(--color-divider)",
            }}
          >
            <div style={{ maxWidth: 520 }}>
              <h3
                data-h2
                style={{ fontWeight: 400, fontSize: 32, margin: 0 }}
              >
                Know what&rsquo;s in it, before you commit
              </h3>
              <p
                style={{
                  fontSize: 16,
                  lineHeight: 1.65,
                  margin: "16px 0 0",
                  color: muted78,
                  textWrap: "pretty",
                }}
              >
                Every recipe carries calories and protein, carbs and fat per
                serving — on the card and on the page, so you can weigh a meal up
                while you&rsquo;re choosing rather than after you&rsquo;ve eaten
                it. Haven&rsquo;t got the numbers? One tap estimates them from
                the ingredients, and says plainly when the estimate is rough.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <span className="tag tag-outline">722 kcal</span>
                <span className="tag tag-neutral">P 31.6g</span>
                <span className="tag tag-neutral">C 23.7g</span>
                <span className="tag tag-neutral">F 53.8g</span>
              </div>
            </div>
            <div
              data-phone-macro
              style={{
                width: 270,
                border: "1px solid var(--color-divider)",
                borderRadius: 28,
                padding: 7,
                background: "var(--color-bg)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <div
                style={{ borderRadius: 22, overflow: "hidden", height: 420 }}
              >
                <Image
                  src="/home-recipe-detail.jpg"
                  alt="Recipe detail with per-serving macros"
                  width={512}
                  height={840}
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
        </div>
      </section>

      {/* ── The rest of it ────────────────────────────────────── */}
      <section
        id="features"
        style={{ borderTop: "1px solid var(--color-divider)" }}
      >
        <div
          data-pad
          style={{ maxWidth: 1180, margin: "0 auto", padding: "80px 32px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 20,
              paddingBottom: 16,
              borderBottom: "1px solid var(--color-divider)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  color: "var(--color-accent)",
                }}
              >
                Everything else
              </div>
              <h2
                data-h2-lg
                style={{ fontWeight: 400, fontSize: 42, margin: "10px 0 0" }}
              >
                The rest of it
              </h2>
            </div>
          </div>
          <div
            data-grid="features"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "0 40px",
              marginTop: 8,
            }}
          >
            <Feature
              title="One list for the household"
              body="Invite whoever you live with. Same recipes, same week, same list — updating live on everyone's phone."
            />
            <Feature
              title="Search by ingredient"
              body={
                "Not just titles. Type “chorizo” and find every recipe you own that uses it."
              }
            />
            <Feature
              title="Collections and favourites"
              body="Tag recipes however you think about them — quick, hearty, the ones the kids will eat."
            />
            <Feature
              title="Share a single recipe"
              body="Send someone a link. They can save their own copy without joining anything."
            />
            <Feature
              title={"Undo, not “are you sure?”"}
              body="Deleting is instant and reversible. No confirmation dialogs standing between you and a tidy list."
            />
            <Feature
              title="Light or dark"
              body="Follows your phone, or pick one and stay there."
            />
            <Feature
              title="Your own photos"
              body="Drop a picture on a recipe. It's a cookbook you actually want to look at."
            />
            <Feature
              title="Shared ingredients, counted once"
              body="Three recipes need onions, you buy onions once — and they only leave the list when nothing needs them."
            />
          </div>
        </div>
      </section>

      {/* ── Install it like an app ─────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--color-divider)",
          background: "var(--color-surface)",
        }}
      >
        <div
          data-grid="pwa"
          data-pad
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "72px 32px",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 56,
            alignItems: "center",
          }}
        >
          <div style={{ maxWidth: 560 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
              }}
            >
              On your phone
            </div>
            <h2
              data-h2-lg
              style={{
                fontWeight: 400,
                fontSize: 40,
                margin: "12px 0 0",
                lineHeight: 1.1,
              }}
            >
              Install it like an app
            </h2>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.6,
                margin: "18px 0 0",
                color: muted80,
                textWrap: "pretty",
              }}
            >
              Add Fornetto to your home screen and it behaves like any other app
              — full screen, its own icon, and it opens even when the signal
              doesn&rsquo;t. Nothing to download from a store.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginTop: 28,
              }}
            >
              <Link
                href="/sign-up"
                className="btn btn-primary"
                style={{
                  height: 46,
                  paddingInline: 26,
                  textDecoration: "none",
                }}
              >
                Get started
              </Link>
              <span className="text-muted" style={{ fontSize: 13 }}>
                Works on iPhone and Android
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 210,
              height: 210,
              border: "1px solid var(--color-divider)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-bg)",
            }}
          >
            <Logo size={88} />
          </div>
        </div>
      </section>

      {/* ── Questions ─────────────────────────────────────────── */}
      <section id="faq" style={{ borderTop: "1px solid var(--color-divider)" }}>
        <div
          data-grid="faq"
          data-pad
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "80px 32px",
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            gap: 72,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
              }}
            >
              Questions
            </div>
            <h2
              data-h2-lg
              style={{
                fontWeight: 400,
                fontSize: 38,
                margin: "12px 0 0",
                lineHeight: 1.1,
              }}
            >
              Before you sign up
            </h2>
          </div>
          <div>
            <Faq
              q={"Do I have to add all my recipes before it’s useful?"}
              a="No. There are forty ready-made recipes with photos you can add in one tap, so the app is genuinely usable the minute you sign up. Add your own as you go."
            />
            <Faq
              q="What does it cost?"
              a={
                "Nothing. It was built to solve a weekly annoyance, and it’s free to use."
              }
            />
            <Faq
              q="Will it work in my supermarket with no signal?"
              a={
                "Yes. Installed on your home screen, it opens offline, and anything you tick while you’re disconnected is stored and synced the moment you have a connection again."
              }
            />
            <Faq
              q="How accurate is the nutrition information?"
              a={
                "If a recipe came with figures, they’re the recipe’s own. If you asked Fornetto to work them out from the ingredients, they’re an estimate — and clearly labelled as one. Useful for choosing between meals; not a substitute for a proper food diary."
              }
            />
            <Faq
              q="Can my partner see the same list?"
              a={
                "Invite them to your household by email and you share everything — recipes, the week’s menu, and one live shopping list. Whoever gets to the shop first ticks things off, and the other person sees it."
              }
            />
            <Faq
              last
              q="Does importing always work?"
              a="Usually, on ordinary recipe pages — and photographs of cookbook pages work best on a flat page in decent light. Either way you see what it read before anything is saved, so you can correct it, and the original link is kept on the recipe."
            />
          </div>
        </div>
      </section>

      {/* ── Closing CTA ───────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--color-divider)",
          background: "var(--color-surface)",
        }}
      >
        <div
          data-pad
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "88px 32px",
            textAlign: "center",
          }}
        >
          <h2
            data-h1
            style={{
              fontWeight: 400,
              fontSize: 50,
              margin: 0,
              lineHeight: 1.06,
            }}
          >
            Sunday&rsquo;s job, done
            <br />
            in a few minutes
          </h2>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.6,
              margin: "20px auto 0",
              maxWidth: 520,
              color: muted78,
              textWrap: "pretty",
            }}
          >
            Pick the week&rsquo;s meals, get a list you can actually shop from,
            and stop buying a third jar of cumin.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 14,
              marginTop: 32,
            }}
          >
            <Link
              href="/sign-up"
              className="btn btn-primary"
              style={{
                height: 50,
                paddingInline: 32,
                fontSize: 16,
                textDecoration: "none",
              }}
            >
              Get started
            </Link>
            <Link
              href="/sign-in"
              className="btn btn-ghost"
              style={{ height: 50, textDecoration: "none" }}
            >
              Sign in
            </Link>
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
