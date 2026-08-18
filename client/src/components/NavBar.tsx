import { Link } from "react-router-dom";

/** Redesigned primary navigation (design doc §4.2). */
export function NavBar() {
  return (
    <header className="nav-bar">
      <div className="nav-bar__inner">
        <Link to="/" className="nav-bar__brand">
          VAERS <span className="nav-bar__brand-sub">Reporting (Prototype)</span>
        </Link>
        <nav aria-label="Primary" className="nav-bar__links">
          <Link to="/faq">FAQ</Link>
          <Link to="/about">About VAERS</Link>
          <Link to="/accessibility">Accessibility</Link>
          <Link to="/report" className="button button--primary nav-bar__cta">
            Report an Event
          </Link>
        </nav>
      </div>
    </header>
  );
}
