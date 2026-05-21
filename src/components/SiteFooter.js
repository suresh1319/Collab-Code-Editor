import { Link } from 'react-router-dom';

function SiteFooter({ showJoinLink = true }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <div className="logo-text">
            <span className="logo-collab">Collab</span>
            <span className="logo-ce">CE</span>
          </div>
          <p className="site-footer-copy">
            Real-time rooms, shared files, and collaboration without friction.
          </p>
        </div>

        <nav className="site-footer-nav" aria-label="Footer">
          <Link to="/">Home</Link>
          {showJoinLink ? <Link to="/join">Join Room</Link> : null}
          <a
            href="https://github.com/suresh1319/Collab-Code-Editor"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}

export default SiteFooter;
