import { Link } from "react-router-dom";
import { Mascot } from "./Mascot";
import { VaersLogo } from "./VaersLogo";

/** Redesigned primary navigation (design doc §4.2). */
export function NavBar() {
  return (
    <header className="nav-bar">
      <div className="nav-bar__inner">
        <Link to="/" className="nav-bar__brand" aria-label="VAERS home">
          <Mascot size={30} />
          <VaersLogo height={22} />
        </Link>
        <nav aria-label="Primary" className="nav-bar__links">
          <Link to="/faq">FAQ</Link>
          <Link to="/about">About VAERS</Link>
          <Link to="/accessibility">Accessibility</Link>
          <Link to="/report" className="button button--primary nav-bar__cta">
            Report an Event
          </Link>
          <Link to="/follow-up" className="button button--secondary nav-bar__cta">
            Provide Follow-up Info
          </Link>
        </nav>
      </div>
    </header>
  );
}
