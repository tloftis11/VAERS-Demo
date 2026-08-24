import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface NavBarProps {
  /** "marketing" = full header (landing/content pages); "flow" = minimal header used during the reporting wizard. */
  variant?: "marketing" | "flow";
}

/** Redesigned primary navigation, styled after the reference prototype. */
export function NavBar({ variant = "marketing" }: NavBarProps) {
  if (variant === "flow") return <FlowHeader />;
  return <MarketingHeader />;
}

function MarketingHeader() {
  return (
    <header className="nav-bar nav-bar--marketing">
      <div className="nav-bar__utility">
        <Link to="/faq" className="nav-bar__utility-link" aria-label="Search the FAQ">
          <SearchIcon />
        </Link>
        <Link to="/accessibility" className="nav-bar__utility-link" aria-label="Accessibility statement">
          <span style={{ fontSize: "0.8rem" }}>Accessibility</span>
        </Link>
      </div>
      <div className="nav-bar__inner">
        <Link to="/" className="nav-bar__brand">
          VAERS
        </Link>
        <nav aria-label="Primary" className="nav-bar__links">
          <Link to="/report">Report Online</Link>
          <Link to="/about">About VAERS</Link>
          <Link to="/faq">Vaccine Information &amp; FAQs</Link>
        </nav>
      </div>
    </header>
  );
}

function FlowHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isConfirmation = location.pathname.endsWith("/confirmation");

  return (
    <header className="nav-bar nav-bar--flow">
      <div className="nav-bar__inner">
        <Link to="/" className="nav-bar__brand">
          VAERS
        </Link>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="nav-bar__menu-button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MenuIcon />
          </button>
          {menuOpen && (
            <div className="faq-widget__panel" style={{ position: "absolute", right: 0, top: "2.75rem", minWidth: 180 }}>
              <nav aria-label="Site" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <Link to="/" onClick={() => setMenuOpen(false)}>
                  Home
                </Link>
                <Link to="/faq" onClick={() => setMenuOpen(false)}>
                  FAQ
                </Link>
                <Link to="/about" onClick={() => setMenuOpen(false)}>
                  About VAERS
                </Link>
                <Link to="/accessibility" onClick={() => setMenuOpen(false)}>
                  Accessibility
                </Link>
              </nav>
            </div>
          )}
        </div>
      </div>
      <div className="nav-bar__breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">›</span>
        <strong>{isConfirmation ? "Confirmation" : "Report"}</strong>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
