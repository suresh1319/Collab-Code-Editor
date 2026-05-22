import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Code2,
  Users,
  FolderKanban,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Sun,
  Moon,
  Activity,
  TimerReset,
  GitBranch,
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [theme, setTheme] = React.useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.body.setAttribute('data-theme', 'light');
    } else {
      document.body.removeAttribute('data-theme');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const roomId = searchParams.get('roomId');

    if (roomId) {
      navigate(`/join?roomId=${roomId}`);
    }
  }, [navigate, searchParams]);

  const heroStats = [
    { label: 'Live cursors', value: '08', icon: <Users size={16} /> },
    { label: 'File sync', value: '<120ms', icon: <Activity size={16} /> },
    { label: 'Shared branches', value: '24', icon: <GitBranch size={16} /> },
  ];

  const heroSignals = [
    'Pair programming',
    'Review flow',
    'Live presence',
    'Multi-file workspaces',
  ];

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-navbar">
        <div className="landing-logo">
          <span className="logo-collab">Collab</span>
          <span className="logo-ce">CE</span>
        </div>

        <div className="landing-nav-actions">
          <button
            className="landing-outline-btn"
            onClick={toggleTheme}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>

          <button
            className="landing-primary-btn"
            onClick={() => navigate('/join')}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-badge">
            <Sparkles size={14} />
            Real-Time Collaborative Coding
          </div>

          <h1 className="landing-title">
            Code Together.
            <br />
            Ship With Momentum.
          </h1>

          <p className="landing-subtitle">
            CollabCE is a modern collaborative code editor that lets developers
            spin up rooms, co-edit files in real time, and keep teams aligned
            without losing flow.
          </p>

          <div className="landing-hero-buttons">
            <button
              className="landing-primary-btn hero-btn"
              onClick={() => navigate('/join')}
            >
              Start Collaborating
              <ArrowRight size={17} />
            </button>

            <button
              className="landing-outline-btn hero-btn"
              onClick={() => window.open('https://github.com/suresh1319/Collab-Code-Editor', '_blank')}
            >
              View Repository
            </button>
          </div>

          <div className="landing-signal-row">
            {heroSignals.map((signal) => (
              <span key={signal} className="landing-signal-pill">
                {signal}
              </span>
            ))}
          </div>
        </div>

        <div className="landing-hero-visual" aria-hidden="true">
          <div className="hero-visual-glow hero-visual-glow-one" />
          <div className="hero-visual-glow hero-visual-glow-two" />

          <div className="hero-canvas-card">
            <div className="hero-canvas-header">
              <div className="hero-canvas-dots">
                <span />
                <span />
                <span />
              </div>
              <div className="hero-canvas-status">
                <TimerReset size={14} />
                Room synced
              </div>
            </div>

            <div className="hero-canvas-body">
              <div className="hero-code-column">
                <div className="hero-code-line line-strong" />
                <div className="hero-code-line line-medium" />
                <div className="hero-code-line line-short" />
                <div className="hero-code-line line-medium accent" />
                <div className="hero-code-line line-strong" />
              </div>

              <div className="hero-presence-panel">
                <div className="hero-presence-title">Active room</div>
                {heroStats.map((item) => (
                  <div key={item.label} className="hero-presence-item">
                    <span className="hero-presence-label">
                      {item.icon}
                      {item.label}
                    </span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="hero-floating-card hero-floating-card-top">
            <span className="hero-floating-kicker">Presence</span>
            <strong>4 teammates editing</strong>
          </div>

          <div className="hero-floating-card hero-floating-card-bottom">
            <span className="hero-floating-kicker">Permissions</span>
            <strong>Reviewer lock active</strong>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-section">
        <div className="section-header">
          <h2>Features</h2>
          <p>Everything needed for collaborative development workflows.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Users size={26} />
            </div>
            <h3>Real-Time Collaboration</h3>
            <p>
              Collaborate instantly with teammates using synchronized editing
              and live updates.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <FolderKanban size={26} />
            </div>
            <h3>Multi-File Workspace</h3>
            <p>
              Create folders, manage files, and work with a structured coding
              environment.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <ShieldCheck size={26} />
            </div>
            <h3>Permission Management</h3>
            <p>
              Control editing access with role-based collaboration and approval
              systems.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="landing-section">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Start collaborating in just a few simple steps.</p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Create a Room</h3>
            <p>Generate a collaboration room instantly with a unique ID.</p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Invite Your Team</h3>
            <p>Share the room link and bring your collaborators together.</p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Code in Real-Time</h3>
            <p>Write, edit, and manage projects together seamlessly.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="cta-box">
          <Code2 size={40} />
          <h2>Ready to Start Collaborating?</h2>
          <p>
            Create a room and experience real-time collaborative coding with
            your team.
          </p>

          <button
            className="landing-primary-btn cta-btn"
            onClick={() => navigate('/join')}
          >
            Launch Editor
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>Built with ❤️ for collaborative developers.</p>
      </footer>
    </div>
  );
};

export default LandingPage;



