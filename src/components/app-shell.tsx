"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, ListChecks, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useSession } from "@/lib/auth-client";
import { useMenu, type Collection } from "@/lib/menu";

const WORDMARK = "Fornetto";

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
      <DesktopRail pathname={pathname} navItems={navItems} collections={menu.collections} />
      <div className="shell-main">
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
}: {
  pathname: string;
  navItems: NavItem[];
  collections: Collection[];
}) {
  const { data: session } = useSession();

  const name = session?.user.name || session?.user.email || "You";
  const initial = name.trim().charAt(0) || "?";
  const pinned = collections.slice(0, 4);

  return (
    <aside className="rail" aria-label="Primary">
      <div className="rail-wordmark">{WORDMARK}</div>

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

      <Link href="/account" className="rail-user">
        <span className="rail-user-avatar" aria-hidden>
          {initial}
        </span>
        <span className="rail-user-name">{name}</span>
      </Link>
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
