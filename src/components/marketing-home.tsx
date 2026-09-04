import Link from "next/link";
import { Logo } from "@/components/logo";
import Image from "next/image";
import {
  MarketingHeaderActions,
  MarketingClosingCta,
  MarketingInstallButton,
  MarketingFooterAuthLink,
  MarketingPriceCta,
} from "@/components/marketing-client";


/** A "How it works" step: number, title, paragraph, and a screenshot that
    bottom-aligns with its siblings. */
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
    <div className="home-step">
      <div className="home-step-head">
        <span className="home-step-num">{num}</span>
        <h3 className="home-step-title">{title}</h3>
      </div>
      <p className="home-step-body">{body}</p>
      <div className="home-phone home-phone-step">
        <div className="home-phone-clip">
          <Image
            src={src}
            alt={alt}
            width={552}
            height={680}
            className={
              objectPosition === "center" ? "home-shot home-shot--center" : "home-shot"
            }
          />
        </div>
      </div>
    </div>
  );
}

/** One of the four "ways in" cards. The accent-bordered variant is the
    Photograph a page card. `children` is the inline accent SVG. */
function AiCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="home-aicard">
      {children}
      <h3 className="home-aicard-title">{title}</h3>
      <p className="text-muted home-aicard-body">{body}</p>
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
    <div className={span ? "home-shoppoint home-shoppoint--span" : "home-shoppoint"}>
      <h4 className="home-shoppoint-title">{title}</h4>
      <p className="text-muted home-shoppoint-body">{body}</p>
    </div>
  );
}

/** A hairline-ruled item in the "The rest of it" feature list. */
function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="home-feature">
      <h4 className="home-feature-title">{title}</h4>
      <p className="text-muted home-feature-body">{body}</p>
    </div>
  );
}

/** Accent tick used in the pricing feature lists (inline SVG to match the
    page's icon style — no icon dependency). */
function Tick() {
  return (
    <svg
      className="home-pricecard-tick"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** One plan in the pricing band. `accent` is the highlighted Premium variant. */
function PriceCard({
  plan,
  name,
  price,
  unit,
  blurb,
  features,
  accent = false,
  badge,
}: {
  plan: "free" | "premium";
  name: string;
  price: string;
  unit: string;
  blurb: string;
  features: string[];
  accent?: boolean;
  badge?: string;
}) {
  return (
    <div className={accent ? "home-pricecard home-pricecard--accent" : "home-pricecard"}>
      {badge && <span className="tag tag-accent home-pricecard-badge">{badge}</span>}
      <h3 className="home-pricecard-name">{name}</h3>
      <div className="home-pricecard-priceline">
        <span className="home-pricecard-price">{price}</span>
        <span className="home-pricecard-unit">{unit}</span>
      </div>
      <p className="text-muted home-pricecard-blurb">{blurb}</p>
      <ul className="home-pricecard-list">
        {features.map((f) => (
          <li key={f}>
            <Tick />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <MarketingPriceCta plan={plan} />
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
    <div className={last ? "home-faq-item home-faq-item--last" : "home-faq-item"}>
      <h4 className="home-faq-q">{q}</h4>
      <p className="text-muted home-faq-a">{a}</p>
    </div>
  );
}

export function MarketingHome() {
  return (
    <div className="home">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="home-header">
        <div className="home-container home-header-row">
          <a href="#top" className="home-brand">
            <Logo size={27} />
            <span className="home-wordmark">Fornetto</span>
          </a>

          <nav className="home-nav">
            <a href="#how">How it works</a>
            <a href="#shop">In the shop</a>
            <a href="#pricing">Pricing</a>
            <a href="#features">Features</a>
            <a href="#faq">Questions</a>
          </nav>

          <MarketingHeaderActions />
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section id="top" className="home-container home-hero">
        <div className="home-hero-copy">
          <div className="home-kicker">Fornetto</div>
          <h1 className="home-hero-title home-h1">
            Plan the week.
            <br />
            <em style={{ fontStyle: "italic" }}>Shop it by aisle.</em>
          </h1>
          <p className="home-hero-lead">
            Pick a few recipes. Fornetto works out what you&rsquo;re actually
            missing, builds the shopping list for you, and sorts it into the
            order you walk the shop.
          </p>
          <div className="home-hero-actions">
            <Link href="/sign-up" className="btn btn-primary home-cta">
              Get started
            </Link>
            <a href="#how" className="btn btn-ghost home-cta-ghost">
              See how it works
            </a>
          </div>
          <div className="home-trust">
            <span>Free to use</span>
            <span>·</span>
            <span>Works in the shop with no signal</span>
            <span>·</span>
            <span>Installs on your phone</span>
          </div>
        </div>

        <div className="home-phones">
          <div className="home-phone home-phone-sm">
            <div className="home-phone-clip">
              <Image
                src="/home-this-week.jpg"
                alt="This week — four recipes chosen"
                width={476}
                height={856}
                priority
                className="home-shot"
              />
            </div>
          </div>
          <div className="home-phone home-phone-lg">
            <div className="home-phone-clip">
              <Image
                src="/home-in-the-shop.jpg"
                alt="In the shop — list sorted by aisle"
                width={548}
                height={1124}
                priority
                className="home-shot"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section id="how" className="home-band home-band--surface">
        <div className="home-container home-how">
          <div className="home-section-head">
            <div>
              <div className="home-kicker">How it works</div>
              <h2 className="home-how-title home-h2-lg">Three steps, once a week</h2>
            </div>
            <p className="text-muted home-how-note">
              The whole loop takes a few minutes on a Sunday, and ends with a
              clean slate for next week.
            </p>
          </div>

          <div className="home-how-grid">
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
      <section id="shop" className="home-band">
        <div className="home-container home-shop">
          <div className="home-phone home-phone-shop">
            <div className="home-phone-clip">
              <Image
                src="/home-in-the-shop.jpg"
                alt="In the shop mode"
                width={604}
                height={1200}
                className="home-shot"
              />
            </div>
          </div>
          <div>
            <div className="home-kicker">In the shop</div>
            <h2 className="home-shop-title home-h2-lg">
              One hand, a trolley,
              <br />
              and no signal
            </h2>
            <p className="home-shop-lead">
              Most list apps stop being useful the moment you&rsquo;re standing
              in a supermarket holding a basket. This is the part we spent the
              longest on.
            </p>

            <div className="home-shopfeat">
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
      <section className="home-band home-band--surface">
        <div className="home-container home-ai">
          <div className="home-ai-intro">
            <div className="home-kicker">Where the AI helps</div>
            <h2 className="home-ai-title home-h2-lg">
              Getting recipes in shouldn&rsquo;t be admin
            </h2>
            <p className="home-ai-lead">
              Typing out a recipe is the reason most meal planners get abandoned
              in week two. There are four ways in, and none of them is typing it
              all out.
            </p>
          </div>

          <div className="home-ai-grid">
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
              title="Save it from a reel"
              body="Half the good stuff lives on Instagram, TikTok and YouTube now. Paste the link and Fornetto reads the recipe out of the caption — or paste the caption yourself when the app won't share it."
            >
              <AiIcon>
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="M11 9.5l4.5 2.5-4.5 2.5z" />
              </AiIcon>
            </AiCard>
            <AiCard
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
          </div>

          <div className="home-macros-wrap">
            <div className="home-macros">
              <div className="home-macros-copy">
                <h3 className="home-macros-title home-h2">
                  Know what&rsquo;s in it, before you commit
                </h3>
                <p className="home-macros-lead">
                  Every recipe carries calories and protein, carbs and fat per
                  serving — on the card and on the page, so you can weigh a meal up
                  while you&rsquo;re choosing rather than after you&rsquo;ve eaten
                  it. Haven&rsquo;t got the numbers? One tap estimates them from
                  the ingredients, and says plainly when the estimate is rough.
                </p>
                <div className="home-tags">
                  <span className="tag tag-outline">722 kcal</span>
                  <span className="tag tag-neutral">P 31.6g</span>
                  <span className="tag tag-neutral">C 23.7g</span>
                  <span className="tag tag-neutral">F 53.8g</span>
                </div>
              </div>
              <div className="home-phone home-phone-macro">
                <div className="home-phone-clip">
                  <Image
                    src="/home-recipe-detail.jpg"
                    alt="Recipe detail with per-serving macros"
                    width={512}
                    height={840}
                    className="home-shot"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────── */}
      <section id="pricing" className="home-band">
        <div className="home-container home-pricing">
          <div className="home-section-head">
            <div>
              <div className="home-kicker">Membership</div>
              <h2 className="home-pricing-title home-h2-lg">
                Free to start. Unlimited when you&rsquo;re ready
              </h2>
            </div>
            <p className="text-muted home-pricing-note">
              Every feature is free, with 50 AI credits a month. Every new
              account starts with 14 days of Premium on us &mdash; no card
              needed. When you&rsquo;re cooking with it every week, Premium
              gives the whole household six times the AI.
            </p>
          </div>

          <div className="home-pricing-grid">
            <PriceCard
              plan="free"
              name="Free"
              price="£0"
              unit="always"
              blurb="Everything Fornetto does, with a monthly allowance for the AI."
              features={[
                "All recipes, menus & shopping-list features",
                "50 AI credits a month — the shopping list never costs one",
                "Share with one other person",
                "Works offline in the shop",
              ]}
            />
            <PriceCard
              plan="premium"
              accent
              badge="Most popular"
              name="Premium"
              price="£3.99"
              unit="per month"
              blurb="Six times the AI, for the whole household."
              features={[
                "Everything in Free",
                "300 AI credits a month — drafts, photos, improve & macros",
                "Your whole household, however many of you",
                "14 days free to start · cancel anytime",
              ]}
            />
          </div>

          <p className="text-muted home-pricing-reassure">
            Start with 14 days of Premium, free. Cancel anytime — and your
            recipes are always yours.
          </p>
        </div>
      </section>

      {/* ── The rest of it ────────────────────────────────────── */}
      <section id="features" className="home-band">
        <div className="home-container home-features">
          <div className="home-section-head">
            <div>
              <div className="home-kicker">Everything else</div>
              <h2 className="home-features-title home-h2-lg">The rest of it</h2>
            </div>
          </div>
          <div className="home-features-grid">
            <Feature
              title="Brain-dump your list"
              body={
                "“milk, kitchen roll, 2 tins chopped toms, coffee” — one messy line, split into tidy separate items on your list."
              }
            />
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
      <section className="home-band home-band--surface">
        <div className="home-container home-pwa">
          <div className="home-pwa-copy">
            <div className="home-kicker">On your phone</div>
            <h2 className="home-pwa-title home-h2-lg">Install it like an app</h2>
            <p className="home-pwa-lead">
              Add Fornetto to your home screen and it behaves like any other app
              — full screen, its own icon, and it opens even when the signal
              doesn&rsquo;t. Nothing to download from a store.
            </p>
            <MarketingInstallButton />
          </div>
          <div className="home-pwa-mark">
            <Logo size={88} />
          </div>
        </div>
      </section>

      {/* ── On your desktop ───────────────────────────────────── */}
      <section className="home-band">
        <div className="home-container home-desktop">
          <div className="home-desktop-frame">
            <Image
              src="/home-desktop.png"
              alt="Fornetto on desktop — the shopping list, recipes and your own items side by side"
              width={1437}
              height={701}
              className="home-desktop-shot"
            />
          </div>
          <div className="home-desktop-copy">
            <div className="home-kicker">On your desktop</div>
            <h2 className="home-desktop-title home-h2-lg">
              Just as at home on a big screen
            </h2>
            <p className="home-desktop-lead">
              Rather plan with a laptop and a coffee? Fornetto runs exactly the
              same in the browser — pick the week&rsquo;s recipes, build the list
              and manage everything with room to spread out. It all stays in sync
              with your phone, so you can plan on the sofa and shop from your
              pocket.
            </p>
          </div>
        </div>
      </section>

      {/* ── Questions ─────────────────────────────────────────── */}
      <section id="faq" className="home-band">
        <div className="home-container home-faq">
          <div>
            <div className="home-kicker">Questions</div>
            <h2 className="home-faq-title home-h2-lg">Before you sign up</h2>
          </div>
          <div>
            <Faq
              q={"Do I have to add all my recipes before it’s useful?"}
              a="No. There are forty ready-made recipes with photos you can add in one tap, so the app is genuinely usable the minute you sign up. Add your own as you go."
            />
            <Faq
              q="What does it cost?"
              a={
                "The whole app — planning, shopping and sharing — is free, and every new account starts with 14 days of Premium, no card needed. After that the AI extras (drafting a recipe from a link, photo, title or reel, plus macro estimates and inspiration) come with 50 free credits a month: most actions cost one, a photo scan three, and the shopping list never costs anything. Free accounts can share with one other person; Premium is £3.99 a month for 300 credits and as many people as live in your kitchen; upgrade or cancel anytime."
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
              a="Usually, on ordinary recipe pages — and photographs of cookbook pages work best on a flat page in decent light. Instagram and TikTok sometimes won't hand over a link automatically, so you can paste the caption instead and it reads that. Either way you see what it read before anything is saved, so you can correct it, and the original link is kept on the recipe."
            />
          </div>
        </div>
      </section>

      {/* ── Closing CTA ───────────────────────────────────────── */}
      <section className="home-band home-band--surface">
        <div className="home-container home-cta-band">
          <h2 className="home-cta-title home-h1">
            Sunday&rsquo;s job, done
            <br />
            in a few minutes
          </h2>
          <p className="home-cta-lead">
            Pick the week&rsquo;s meals, get a list you can actually shop from,
            and stop buying a third jar of cumin.
          </p>
          <MarketingClosingCta />
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="home-band">
        <div className="home-container home-footer">
          <div className="home-footer-brand">
            <Logo size={23} />
            <span className="home-footer-wordmark">Fornetto</span>
          </div>
          <span className="text-muted home-footer-tagline">
            Made for people who cook on weeknights.
          </span>
          <div className="home-footer-links">
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#features">Features</a>
            <a href="#faq">Questions</a>
            <MarketingFooterAuthLink />
          </div>
        </div>
      </footer>
    </div>
  );
}
