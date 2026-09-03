"use client";

import {
  Book,
  BookOpen,
  Bookmark,
  ChevronDown,
  Glasses,
  Plus,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Layers,
  Menu,
  MoreHorizontal,
  Search,
  Share,
  SquarePlus,
} from "lucide-react";
import { Logo } from "@/components/logo";
import type { IllustrationKey } from "@/lib/ios-layouts";

// Drawn stand-ins for the browser controls the walkthrough points at, so the
// steps are visual even before real screenshots land (SHOTS in
// install-guide.tsx). HTML rather than SVG so they follow the theme tokens and
// can reuse the lucide glyphs. `.ill-hot` is the thing to tap.

function Hot({ children, text }: { children: React.ReactNode; text?: boolean }) {
  return <span className={`ill-hot${text ? " ill-hot--text" : ""}`}>{children}</span>;
}

export function Illustration({ name }: { name: IllustrationKey }) {
  switch (name) {
    case "safari-compact-more":
      return (
        <div className="ill ill-bottom" aria-hidden>
          <div className="ill-pill">
            <ChevronLeft size={18} />
            <span className="ill-url">fornetto.app</span>
            <Hot>
              <MoreHorizontal size={18} />
            </Hot>
          </div>
        </div>
      );
    case "more-menu-share":
      return (
        <div className="ill ill-list" aria-hidden>
          <div className="ill-row ill-row--hot">
            <Share size={17} /> Share
          </div>
          <div className="ill-row">
            <Bookmark size={17} /> Add to Bookmarks
          </div>
          <div className="ill-row">
            <BookOpen size={17} /> Add Bookmark to…
          </div>
          <div className="ill-row">
            <Plus size={17} /> New Tab
          </div>
        </div>
      );
    case "sheet-view-more":
      return (
        <div className="ill ill-sheet" aria-hidden>
          <div className="ill-actions">
            <span className="ill-action">
              <Copy size={18} />
              <small>Copy</small>
            </span>
            <span className="ill-action">
              <Bookmark size={18} />
              <small>Bookmarks</small>
            </span>
            <span className="ill-action">
              <Glasses size={18} />
              <small>Reading List</small>
            </span>
            <span className="ill-action">
              <Hot>
                <ChevronDown size={18} />
              </Hot>
              <small>View More</small>
            </span>
          </div>
          <div className="ill-list ill-list--nested">
            <div className="ill-row">
              <Search size={17} /> Find on Page
            </div>
            <div className="ill-row ill-row--hot">
              <SquarePlus size={17} /> Add to Home Screen
            </div>
          </div>
        </div>
      );
    case "safari-classic-share":
      return (
        <div className="ill ill-bottom" aria-hidden>
          <div className="ill-toolbar">
            <ChevronLeft size={20} />
            <ChevronRight size={20} />
            <Hot>
              <Share size={20} />
            </Hot>
            <Book size={20} />
            <Layers size={20} />
          </div>
        </div>
      );
    case "chrome-share":
      return (
        <div className="ill ill-top" aria-hidden>
          <div className="ill-pill ill-pill--wide">
            <span className="ill-url">fornetto.app</span>
            <Hot>
              <Share size={18} />
            </Hot>
          </div>
        </div>
      );
    case "chrome-open-safari":
      return (
        <div className="ill ill-list" aria-hidden>
          <div className="ill-row">
            <Copy size={17} /> Copy
          </div>
          <div className="ill-row">
            <Bookmark size={17} /> Bookmark
          </div>
          <div className="ill-row">
            <Search size={17} /> Find in Page
          </div>
          <div className="ill-row ill-row--hot">
            <Compass size={17} /> Open in Safari
          </div>
        </div>
      );
    case "menu-hamburger":
      return (
        <div className="ill ill-bottom" aria-hidden>
          <div className="ill-toolbar">
            <ChevronLeft size={20} />
            <ChevronRight size={20} />
            <Search size={20} />
            <Layers size={20} />
            <Hot>
              <Menu size={20} />
            </Hot>
          </div>
        </div>
      );
    case "sheet-add-row":
      return (
        <div className="ill ill-list" aria-hidden>
          <div className="ill-row">
            <Copy size={17} /> Copy
          </div>
          <div className="ill-row">
            <BookOpen size={17} /> Add to Reading List
          </div>
          <div className="ill-row ill-row--hot">
            <SquarePlus size={17} /> Add to Home Screen
          </div>
          <div className="ill-row">
            <Search size={17} /> Find on Page
          </div>
        </div>
      );
    case "add-screen":
      return (
        <div className="ill ill-add" aria-hidden>
          <div className="ill-add-head">
            <span>Cancel</span>
            <strong>Add to Home Screen</strong>
            <Hot text>Add</Hot>
          </div>
          <div className="ill-add-body">
            <span className="ill-add-icon">
              <Logo size={22} />
            </span>
            <span>
              <strong>Fornetto</strong>
              <small>fornetto.app</small>
            </span>
          </div>
          <div className="ill-add-toggle">
            <span>Open as Web App</span>
            <span className="ill-switch" />
          </div>
        </div>
      );
    case "generic-share":
      return (
        <div className="ill ill-generic" aria-hidden>
          <Hot>
            <Share size={28} />
          </Hot>
        </div>
      );
  }
}
