import type { ReactNode } from "react";

const WORDMARK = "Fornetto";

interface PageHeaderProps {
  title: string;
  /** Page-specific kicker shown on desktop (e.g. "58 recipes"). The rail
      carries the wordmark there, so this line is free for context. On mobile
      the wordmark takes the kicker slot instead. */
  kicker?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, kicker, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <div className="page-header-wordmark page-header-kicker">{WORDMARK}</div>
        {kicker != null && (
          <div className="page-header-pagekicker page-header-kicker">{kicker}</div>
        )}
        <h1 className="page-header-title">{title}</h1>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
