import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — Fornetto",
  description: "What Fornetto collects, why, how long it is kept, and your rights.",
};

// Public, outside both route groups (like /about): reachable signed out from
// the marketing footer and the sign-up form. Plain language on purpose.
//
// Written to the UK GDPR Article 13 checklist (who we are, what and why, lawful
// basis, categories of recipient, transfers outside the UK, retention, rights,
// the ICO) without naming individual suppliers or internal process. Keep the
// "Last updated" date honest when anything here changes.
//
// STILL TO ADD when they exist: the operator's trading name (sole trader or
// company) in the first paragraph, and a contact address in "Your rights".

const LAST_UPDATED = "5 September 2026";

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
          Fornetto is a recipe, weekly-menu and shopping-list app run from the United Kingdom. This page
          explains what we collect, why, how long we keep it, and what you can ask us to do. It is short
          on purpose, so that you will actually read it.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Your account.</strong> Your name, email address and password. The password is stored in
            a form we cannot read. We also record when you signed up and when you last used the app.
          </li>
          <li>
            <strong>What you make.</strong> Your recipes, photos, weekly menu, shopping lists and
            collections, and your answers to the getting-started questions about what you eat. If you
            share a household, the other members see the same recipes, menu and lists.
          </li>
          <li>
            <strong>How you use it.</strong> Which features you use and roughly when, and the type of
            device you use. We look at this in aggregate to see what works.
          </li>
          <li>
            <strong>Payments.</strong> If you buy Premium, a payment provider handles your card. We never
            see or store card numbers. We keep your plan and whether your subscription is active.
          </li>
        </ul>

        <h2>Why we use it</h2>
        <ul>
          <li>
            <strong>To run Fornetto:</strong> signing you in, showing your recipes, building your list.
          </li>
          <li>
            <strong>To provide the AI features you ask for.</strong> When you import a recipe from a link
            or photo, ask for one from a title, improve a recipe, estimate nutrition or sort a list by
            aisle, the relevant text or image is sent to an AI provider to do that job. It is not used
            to train their models.
          </li>
          <li>
            <strong>To support you and improve the app.</strong> We may look at how Fornetto is used,
            including what people add, to fix problems, help with a request, and decide what to build.
            We keep this to what is needed.
          </li>
          <li>
            <strong>To email you about your account:</strong> verification, password resets, and your
            subscription or trial. We do not send marketing email.
          </li>
        </ul>
        <p>
          Our legal bases are the contract we have with you, our legitimate interest in running and
          improving the service, and your consent for anything optional, which you can withdraw at any
          time.
        </p>

        <h2>Who sees it</h2>
        <p>
          The people who run Fornetto, and the companies that provide our hosting, photo storage,
          payments, email delivery and AI features, each only for that purpose. Some of these companies
          are outside the UK. Where they are, we rely on safeguards approved under UK data-protection
          law. We do not sell your data and we do not share it with advertisers.
        </p>

        <h2>How we protect it</h2>
        <p>
          Everything travels over encrypted connections, passwords are hashed, and access to the systems
          behind Fornetto is limited to the people who need it.
        </p>

        <h2>How long we keep it</h2>
        <p>
          For as long as you have an account. Deleting your account (Account &rarr; Delete account)
          removes it straight away, together with your recipes, lists and photos if you are the only
          person in your household. If you share a household, the shared recipes stay with the other
          members with your name removed. Anonymous usage figures that cannot identify you are kept.
        </p>

        <h2>Your rights</h2>
        <p>
          You can ask for a copy of your data, ask us to correct, delete or stop using it, or take it
          elsewhere. A contact address for these requests will be published on this page shortly, and
          we will reply within a month. If you are unhappy with how we handle your data, you can complain
          to the Information Commissioner&rsquo;s Office at ico.org.uk.
        </p>

        <h2>Cookies and children</h2>
        <p>
          Fornetto uses one cookie, to keep you signed in. There are no advertising or tracking cookies.
          Fornetto is not intended for children under 13.
        </p>

        <h2>Changes</h2>
        <p>
          If this page changes in a way that matters, we will tell you in the app. The date at the top is
          when it last changed.
        </p>

        <p className="legal-foot">
          <Link href="/">Back to Fornetto</Link>
        </p>
      </div>
    </div>
  );
}
