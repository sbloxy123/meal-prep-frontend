import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — Fornetto",
  description: "What Fornetto collects, why, who processes it, how long it is kept, and your rights.",
};

// Public, outside both route groups (like /about): reachable signed out from
// the marketing footer and the sign-up form. Plain language on purpose.
// DRAFT: reviewed by the owner before it ships; keep the "Last updated" date
// honest when anything here changes.

const LAST_UPDATED = "5 September 2026";
// No contact address yet — add one here (and in the "Your rights" paragraph) as soon as there is a monitored inbox.

export default function PrivacyPage() {
  return (
    <div className="legal">
      <div className="legal-inner">
        <p className="legal-kicker">
          <Link href="/">Fornetto</Link>
        </p>
        <h1>Privacy</h1>
        <p className="legal-updated">Last updated {LAST_UPDATED}</p>

        <p>
          Fornetto is a recipe, weekly-menu and shopping-list app run from the UK. This page says what we
          collect, why, who helps us process it, how long we keep it, and what you can ask us to do. It is
          written to be read, not skimmed past.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Your account.</strong> Name, email address and a password (stored hashed, never
            readable by us). Whether your email is verified, and when you signed up and last used the app.
          </li>
          <li>
            <strong>What you make.</strong> Your recipes (titles, ingredients, methods, notes, photos), your
            weekly menu, your shopping lists, your collections, and your answers to the getting-started
            questionnaire (what you eat, what you avoid). If you share a household, the people in it see
            the same recipes, menu and lists.
          </li>
          <li>
            <strong>How you use it.</strong> Events such as opening the app, adding a recipe, generating a
            list or finishing a shop, which AI feature you used and what it cost us, and the device type.
            We use these to see what works and what does not.
          </li>
          <li>
            <strong>Payments.</strong> If you buy Premium, Stripe handles your card. We never see or store
            card numbers; we hold your Stripe customer id, your plan, and whether the subscription is
            active.
          </li>
        </ul>

        <h2>Why we use it</h2>
        <ul>
          <li><strong>To run the service</strong> — signing you in, showing you your recipes, building your list.</li>
          <li>
            <strong>To provide the AI features you ask for.</strong> When you import a recipe from a link
            or photo, ask for one from a title, improve a recipe, estimate nutrition, ask for inspiration
            or sort a list by aisle, the relevant text or image is sent to Anthropic&rsquo;s Claude models to
            do that job. Anthropic does not use this data to train its models.
          </li>
          <li>
            <strong>To support you and improve Fornetto.</strong> The people who run Fornetto can see
            usage figures and, when needed, an account&rsquo;s recipe titles and activity. Reading the full
            text of a recipe is done only for a reason (for example a support request or checking that an
            import worked) and every such look is recorded in a log.
          </li>
          <li>
            <strong>To email you</strong> about your account: verification, password resets, the
            install guide, and two reminders before your free trial ends. No marketing lists, no
            newsletters unless you ask for one.
          </li>
        </ul>
        <p>
          The legal bases for this are the contract we have with you (running the service), our
          legitimate interest in supporting and improving it, and your consent for anything optional.
        </p>

        <h2>Who helps us process it</h2>
        <ul>
          <li><strong>Railway</strong> hosts the API and database; <strong>Vercel</strong> serves the app.</li>
          <li><strong>Anthropic</strong> runs the AI features on the content you submit for them.</li>
          <li><strong>Cloudinary</strong> stores recipe photos.</li>
          <li><strong>Stripe</strong> takes payments and manages subscriptions.</li>
          <li><strong>Resend</strong> delivers our emails.</li>
        </ul>
        <p>We do not sell your data and we do not share it with advertisers.</p>

        <h2>How long we keep it</h2>
        <p>
          For as long as you have an account. Deleting your account (Account &rarr; Delete account)
          removes your account, and if you are the only person in your household, your recipes, lists and
          photos with it, immediately. If you share a household, the shared recipes stay with the other
          members with your name removed. Aggregate usage figures that do not identify you are kept.
        </p>

        <h2>Your rights</h2>
        <p>
          You can ask for a copy of your data, ask us to correct or delete it, or object to how we use
          it. A contact address for these requests will be published on this page shortly, and we will
          reply within a month of hearing from you. You can also complain to the Information
          Commissioner&rsquo;s Office (ico.org.uk).
        </p>

        <h2>Cookies</h2>
        <p>
          Fornetto uses one cookie, to keep you signed in. There are no advertising or tracking cookies.
        </p>

        <h2>Changes</h2>
        <p>
          If this page changes in a way that matters, we will say so in the app. The date at the top is
          when it last changed.
        </p>

        <p className="legal-foot">
          <Link href="/">Back to Fornetto</Link>
        </p>
      </div>
    </div>
  );
}
