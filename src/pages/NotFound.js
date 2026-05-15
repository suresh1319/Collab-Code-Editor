import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'light') {
      document.body.setAttribute('data-theme', 'light');
    } else {
      document.body.removeAttribute('data-theme');
    }
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      fontFamily: 'Inter, sans-serif',
      textAlign: 'center',
      padding: '20px',
      transition: 'background 0.3s ease, color 0.3s ease',
    }}>
      <h1 style={{ fontSize: '6rem', margin: '0', color: '#4aed88' }}>404</h1>
      <h2 style={{ fontSize: '1.8rem', margin: '10px 0', color: 'var(--text-color)' }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--text-color)', opacity: '0.6', marginBottom: '30px' }}>
        Oops! The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          backgroundColor: '#4aed88',
          color: '#1c1e29',
          border: 'none',
          padding: '12px 30px',
          fontSize: '1rem',
          fontWeight: 'bold',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'background 0.2s ease',
        }}
        onMouseOver={e => e.target.style.backgroundColor = '#2b824c'}
        onMouseOut={e => e.target.style.backgroundColor = '#4aed88'}
      >
        Go Back Home
      </button>
    </div>
  );
}

export default NotFound;