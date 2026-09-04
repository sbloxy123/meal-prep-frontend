"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, ListChecks, User, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useSession } from "@/lib/auth-client";
import { useMenu, type Collection } from "@/lib/menu";
import { logPremiumCta } from "@/components/ai-allowance";
import { PremiumBanner } from "@/components/premium-banner";
import { TrialPrompt } from "@/components/trial-prompt";

const WORDMARK = "Fornetto";

/** The Fornetto oven mark — gold dome, ink base + opening. Colours come from
    the design tokens so it tracks the theme. */
function FornettoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden focusable="false">
      <path d="M14 86 V46 A36 36 0 0 1 86 46 V86" stroke="var(--color-accent)" strokeWidth="3.4" />
      <path d="M6 86 H94" stroke="var(--color-text)" strokeWidth="3.4" strokeLinecap="square" />
      <path d="M34 86 A16 16 0 0 1 66 86" stroke="var(--color-text)" strokeWidth="3.4" />
    </svg>
  );
}

/** Mobile-only top brand bar (the desktop rail is hidden below 1024px). */
function MobileHeader() {
  return (
    <header className="mobile-header">
      <Link href="/recipes" className="mobile-brand">
        <FornettoMark size={20} />
        <span>{WORDMARK}</span>
      </Link>
    </header>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

/** Match /recipes for both the list and its detail routes, etc. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const menu = useMenu();
  const navItems: NavItem[] = [
    { href: "/recipes", label: "Recipes", icon: BookOpen },
    { href: "/this-week", label: "This week", icon: Calendar, count: menu.thisWeek.length },
    { href: "/shopping-list", label: "List", icon: ListChecks, count: menu.listCount },
  ];

  return (
    <div className="shell">
      <DesktopRail
        pathname={pathname}
        navItems={navItems}
        collections={menu.collections}
        isPremium={menu.allowance.isPremium}
      />
      <div className="shell-main">
        <MobileHeader />
        <TrialPrompt />
        <PremiumBanner />
        <div className="shell-page">{children}</div>
      </div>
      <MobileTabBar pathname={pathname} navItems={navItems} />
    </div>
  );
}

function DesktopRail({
  pathname,
  navItems,
  collections,
  isPremium,
}: {
  pathname: string;
  navItems: NavItem[];
  collections: Collection[];
  isPremium: boolean;
}) {
  const { data: session } = useSession();

  const name = session?.user.name || session?.user.email || "You";
  const initial = name.trim().charAt(0) || "?";
  const pinned = collections.slice(0, 4);

  return (
    <aside className="rail" aria-label="Primary">
      <Link href="/recipes" className="rail-wordmark">
        <FornettoMark size={22} />
        <span>{WORDMARK}</span>
      </Link>

      <hr className="rail-divider" />

      <nav className="rail-nav" aria-label="Sections">
        {navItems.map(({ href, label, icon: Icon, count }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className="rail-nav-item"
              aria-current={active ? "page" : undefined}
            >
              <Icon size={17} aria-hidden />
              <span className="rail-nav-label">{label}</span>
              {count != null && count > 0 && (
                <span className="rail-nav-count">{count}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <hr className="rail-divider" />

      <h6 className="rail-collections-title">Collections</h6>
      <div className="rail-collections">
        {pinned.map(({ name: cName, count }) => (
          <div key={cName} className="rail-collection">
            <span>{cName}</span>
            <span>{count}</span>
          </div>
        ))}
        {collections.length > 0 && (
          <Link href="/recipes" className="rail-collections-all">
            All {collections.length} collections
          </Link>
        )}
      </div>

      {/* Pinned to the bottom of the rail: About sits directly above the user. */}
      <div style={{ marginTop: "auto" }}>
        <Link href="/recipes?starters=1" className="rail-nav-item">
          <span className="rail-nav-label">Add starter recipes</span>
        </Link>

        {!isPremium && (
          <Link
            href="/premium"
            className="rail-nav-item rail-premium"
            aria-current={isActive(pathname, "/premium") ? "page" : undefined}
            onClick={() => logPremiumCta("rail_nav")}
          >
            <Sparkles size={17} aria-hidden />
            <span className="rail-nav-label">Go Premium</span>
          </Link>
        )}

        <Link
          href="/about"
          className="rail-nav-item"
          style={{ color: "var(--color-accent)" }}
        >
          <span className="rail-nav-label">How to use Fornetto</span>
        </Link>

        <Link href="/install?from=account" className="rail-nav-item">
          <span className="rail-nav-label">Get it on your phone</span>
        </Link>

        <Link href="/account" className="rail-user">
          <span className="rail-user-avatar" aria-hidden>
            {initial}
          </span>
          <span className="rail-user-name">{name}</span>
        </Link>
      </div>
    </aside>
  );
}

function MobileTabBar({
  pathname,
  navItems,
}: {
  pathname: string;
  navItems: NavItem[];
}) {
  return (
    <nav className="tabbar" aria-label="Primary">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className="tab"
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} aria-hidden />
            <span className="tab-label">{label}</span>
          </Link>
        );
      })}
      <Link
        href="/account"
        className="tab"
        aria-current={isActive(pathname, "/account") ? "page" : undefined}
      >
        <User size={20} aria-hidden />
        <span className="tab-label">Account</span>
      </Link>
    </nav>
  );
}
