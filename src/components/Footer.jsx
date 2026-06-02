import "./Footer.css";
import {
  FaGithub,
  FaDiscord,
  FaArrowUp,
  FaEnvelope
} from "react-icons/fa";

function Footer() {
  const scrollTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer className="footer">
      <div className="footer-top-line"></div>

      <div className="footer-container">

        <div className="footer-section">
          <h2 className="footer-logo">CollabCE</h2>
          <p>
            Real-time collaborative coding platform built for developers and teams.
          </p>
        </div>

        <div className="footer-section">
          <h3>Quick Links</h3>

          <a href="/">Home</a>
          <a href="/join">Join Room</a>

          <a
            href="https://github.com/suresh1319/Collab-Code-Editor"
            target="_blank"
            rel="noreferrer"
          >
            <FaGithub /> GitHub
          </a>
        </div>

        <div className="footer-section">
          <h3>Connect</h3>

          <a href="#">
            <FaEnvelope /> Support
          </a>

          <a href="#">
            <FaDiscord /> Community
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 CollabCE • Built for collaborative developers</p>

        <button className="top-btn" onClick={scrollTop}>
          <FaArrowUp />
        </button>
      </div>
    </footer>
  );
}

export default Footer;