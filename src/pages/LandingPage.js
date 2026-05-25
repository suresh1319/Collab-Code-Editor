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
  <div className="hero-grid-overlay"></div>

  {/* World Map SVG */}
  <div className="hero-map-wrap">
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
        d="M182,72 L196,60 L218,52 L248,46 L282,44 L316,46 L346,54 L370,66 L386,82 L392,100 L386,118 L374,132 L362,140 L356,154 L362,166 L378,172 L396,168 L414,162 L432,162 L446,172 L452,188 L448,206 L438,222 L424,238 L408,254 L390,272 L372,292 L354,314 L336,336 L318,356 L300,374 L282,390 L266,404 L252,416 L240,428 L230,442 L224,456 L220,470 L222,482 L230,490 L236,496 L228,506 L214,510 L198,504 L184,490 L172,470 L160,446 L148,420 L136,392 L126,362 L116,330 L108,298 L102,266 L100,234 L102,202 L108,172 L118,144 L132,118 L150,96 L166,80 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.2"
        d="M102,202 L88,196 L70,194 L54,200 L44,214 L48,230 L62,238 L80,234 L96,222 L104,210"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.2" strokeLinejoin="round"
        d="M310,30 L336,18 L370,12 L406,12 L436,20 L454,34 L456,52 L444,68 L422,78 L394,82 L364,78 L338,66 L318,50 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M136,330 L128,346 L122,366 L120,384 L124,398 L130,406"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.1"
        d="M228,506 L222,522 L218,540 L216,558 L220,572 L228,582 L236,590"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
        d="M236,590 L258,578 L286,570 L318,566 L350,568 L378,578 L400,596 L414,618 L418,644 L414,670 L404,696 L388,720 L368,742 L344,762 L318,778 L290,788 L262,792 L234,786 L208,772 L186,750 L168,724 L156,696 L150,666 L150,636 L156,608 L168,584 L184,568 L204,560 L222,560 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.4" strokeLinejoin="round"
        d="M566,56 L590,42 L622,34 L658,30 L692,34 L720,46 L740,64 L748,84 L744,106 L732,124 L714,140 L692,152 L666,160 L638,164 L610,160 L584,150 L562,134 L550,114 L550,92 L556,74 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M550,114 L538,118 L528,130 L526,146 L532,158 L546,164 L562,160 L572,148 L568,134"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M648,152 L652,168 L656,186 L660,202 L654,214 L644,218 L636,210 L632,196 L636,178 L642,162"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.1"
        d="M638,30 L636,12 L642,0 L656,0 L668,10 L670,28 L664,46 L654,58"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M658,30 L664,10 L678,4 L692,12 L696,30 L690,46"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M526,72 L534,56 L548,48 L562,54 L566,70 L556,84 L540,88 L528,80 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="0.9"
        d="M508,82 L516,70 L528,66 L534,74 L528,86 L516,90 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
        d="M548,168 L576,156 L612,148 L652,146 L690,152 L724,166 L750,186 L766,210 L772,238 L768,268 L756,300 L738,334 L714,370 L686,408 L654,446 L620,482 L588,514 L560,540 L536,558 L518,564 L508,556 L504,538 L508,514 L510,488 L506,460 L498,430 L492,398 L490,364 L494,330 L502,298 L512,268 L520,240 L526,214 L530,190 L536,172 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M766,210 L784,206 L800,210 L812,224 L808,240 L794,248 L778,244 L768,232"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1" strokeLinejoin="round"
        d="M804,388 L812,368 L824,356 L836,356 L844,368 L846,388 L840,410 L828,428 L814,436 L802,428 L796,410 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.2" strokeLinejoin="round"
        d="M748,186 L772,178 L800,172 L828,170 L856,174 L880,184 L896,200 L904,220 L902,242 L892,260 L876,274 L856,282 L834,284 L812,278 L792,266 L776,250 L764,232 L756,212"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M876,274 L882,296 L878,318 L866,334 L850,338 L836,326 L830,306 L834,284"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
        d="M828,50 L872,36 L924,26 L982,20 L1040,20 L1096,28 L1146,42 L1188,62 L1220,86 L1242,114 L1250,144 L1244,174 L1228,200 L1204,222 L1172,240 L1134,254 L1090,264 L1042,270 L992,272 L940,270 L888,264 L838,252 L796,236 L762,216 L742,194 L736,170 L740,146 L752,124 L772,104 L798,86 L816,66 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M1244,174 L1256,166 L1268,158 L1276,148 L1272,136 L1260,130 L1248,136 L1244,150"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.3" strokeLinejoin="round"
        d="M940,270 L950,298 L956,328 L952,358 L940,386 L922,410 L900,428 L876,438 L852,438 L830,426 L814,406 L808,382 L812,356 L824,330 L840,306 L858,284 L880,268 L906,260 L930,258 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="0.9"
        d="M882,440 L888,450 L886,462 L876,466 L868,458 L868,446 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.1" strokeLinejoin="round"
        d="M1042,270 L1052,292 L1058,316 L1054,340 L1042,358 L1024,368 L1006,366 L992,350 L988,328 L994,304 L1008,284 L1026,272 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M1054,340 L1058,358 L1060,376 L1056,392 L1048,402 L1038,398 L1032,384 L1036,366 L1042,350"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1" strokeLinejoin="round"
        d="M1096,330 L1118,318 L1144,316 L1164,326 L1174,346 L1170,368 L1154,384 L1132,392 L1108,386 L1092,368 L1088,346 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M1048,402 L1068,392 L1092,386 L1110,388 L1122,400 L1116,414 L1096,420 L1072,416 L1052,408"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="0.9"
        d="M1082,432 L1104,426 L1130,424 L1152,428 L1160,438 L1144,446 L1118,448 L1094,444 L1080,438"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.1" strokeLinejoin="round"
        d="M1228,100 L1240,86 L1256,80 L1270,86 L1274,102 L1264,116 L1248,122 L1234,116 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M1252,128 L1264,114 L1280,110 L1294,118 L1296,134 L1282,146 L1266,148 L1254,140 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="0.9"
        d="M1280,152 L1290,140 L1302,138 L1310,146 L1308,160 L1296,166 L1284,162 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M1194,134 L1202,118 L1216,112 L1228,118 L1228,136 L1218,150 L1202,154 L1192,146 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="0.9"
        d="M1194,240 L1200,228 L1210,224 L1218,230 L1216,244 L1206,252 L1196,250 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="0.9"
        d="M1192,266 L1200,254 L1212,252 L1218,262 L1212,276 L1200,280 L1192,272"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="0.9"
        d="M1210,284 L1218,272 L1228,272 L1232,282 L1224,294 L1212,294 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
        d="M1044,478 L1076,458 L1114,444 L1156,436 L1198,436 L1238,446 L1268,462 L1288,484 L1296,510 L1292,538 L1278,564 L1256,586 L1228,604 L1196,616 L1160,622 L1122,620 L1086,610 L1056,592 L1034,568 L1022,540 L1018,510 L1022,482 L1032,460 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M1112,444 L1108,460 L1112,476 L1124,484 L1140,482 L1150,468 L1148,452 L1136,444"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M1148,436 L1160,420 L1170,412 L1178,418 L1176,434 L1164,444"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1"
        d="M1138,634 L1146,622 L1158,618 L1168,626 L1166,640 L1154,648 L1142,644 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1" strokeLinejoin="round"
        d="M1332,594 L1344,576 L1358,564 L1372,562 L1380,574 L1374,590 L1358,602 L1342,606 Z"/>
      <path fill="none" stroke="var(--map-stroke)" strokeWidth="1" strokeLinejoin="round"
        d="M1336,614 L1350,604 L1366,604 L1376,616 L1372,632 L1356,644 L1340,642 L1330,630 Z"/>

      {/* Animated dashed connection lines from "You" (India) */}
      <line x1="893" y1="540" x2="186" y2="378" stroke="var(--dash)" strokeWidth="1" strokeDasharray="5 9">
        <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="2s" repeatCount="indefinite"/>
      </line>
      <line x1="893" y1="540" x2="630" y2="112" stroke="var(--dash)" strokeWidth="1" strokeDasharray="5 9">
        <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="2.5s" repeatCount="indefinite"/>
      </line>
      <line x1="893" y1="540" x2="1090" y2="148" stroke="var(--dash)" strokeWidth="1" strokeDasharray="5 9">
        <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1.9s" repeatCount="indefinite"/>
      </line>
      <line x1="893" y1="540" x2="300" y2="680" stroke="var(--dash)" strokeWidth="1" strokeDasharray="5 9">
        <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="2.3s" repeatCount="indefinite"/>
      </line>
      <line x1="893" y1="540" x2="1152" y2="520" stroke="var(--dash)" strokeWidth="1" strokeDasharray="5 9">
        <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="2.7s" repeatCount="indefinite"/>
      </line>
      <line x1="893" y1="540" x2="682" y2="690" stroke="var(--dash)" strokeWidth="1" strokeDasharray="5 9">
        <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="2.1s" repeatCount="indefinite"/>
      </line>
    </svg>
  </div>

  {/* Location Pins */}
  <div className="hero-pin pulsing show-label" style={{ top: '60%', left: '62%', animationDelay: '.3s' }}>
    <div className="pin-dot" style={{ background: '#4aed88' }}><span className="pin-initial">Y</span></div>
    <div className="pin-tail"></div>
    <div className="pin-label" style={{ color: '#4aed88', borderColor: 'rgba(74,237,136,.45)' }}>● you · admin</div>
  </div>
  <div className="hero-pin show-label" style={{ top: '38%', left: '13%', animationDelay: '.5s' }}>
    <div className="pin-dot" style={{ background: '#3a82c4' }}><span className="pin-initial">B</span></div>
    <div className="pin-tail"></div>
    <div className="pin-label">● bob · editing</div>
  </div>
  <div className="hero-pin show-label" style={{ top: '10%', left: '43%', animationDelay: '.7s' }}>
    <div className="pin-dot" style={{ background: '#e8843a' }}><span className="pin-initial">S</span></div>
    <div className="pin-tail"></div>
    <div className="pin-label">● sara · viewer</div>
  </div>
  <div className="hero-pin show-label" style={{ top: '14%', left: '76%', animationDelay: '.85s' }}>
    <div className="pin-dot" style={{ background: '#9b59b6' }}><span className="pin-initial">A</span></div>
    <div className="pin-tail"></div>
    <div className="pin-label">● arjun · editing</div>
  </div>
  <div className="hero-pin show-label" style={{ top: '72%', left: '21%', animationDelay: '1s' }}>
    <div className="pin-dot" style={{ background: '#d4547a' }}><span className="pin-initial">M</span></div>
    <div className="pin-tail"></div>
    <div className="pin-label">● mia · editing</div>
  </div>
  <div className="hero-pin show-label" style={{ top: '74%', left: '47%', animationDelay: '1.15s' }}>
    <div className="pin-dot" style={{ background: '#e8a030' }}><span className="pin-initial">L</span></div>
    <div className="pin-tail"></div>
    <div className="pin-label">● lena · viewer</div>
  </div>
  <div className="hero-pin show-label" style={{ top: '55%', left: '80%', animationDelay: '1.3s' }}>
    <div className="pin-dot" style={{ background: '#2a9e8a' }}><span className="pin-initial">K</span></div>
    <div className="pin-tail"></div>
    <div className="pin-label">● kai · editing</div>
  </div>

  {/* Hero Content */}
  <div className="hero-content">
    <div className="landing-badge">
      <span className="hero-pulse-dot"></span>
      6 collaborators online
    </div>
    <h1 className="landing-title">
      Code together,<br />
      <span className="title-green">anywhere on earth</span>
    </h1>
    <p className="landing-subtitle">
      Create, edit, and ship full projects with your team —<br />
      live cursors, instant sync, role-based access.
    </p>
    <div className="landing-hero-buttons">
      <button className="landing-primary-btn hero-btn" onClick={() => navigate('/join')}>
        Start a room
      </button>
      <button className="landing-outline-btn hero-btn" onClick={() => navigate('/join')}>
        Join with code
      </button>
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



