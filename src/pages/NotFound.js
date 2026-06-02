import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';

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
    <div className="notFoundShell">
      <div className="notFoundPage">
        <h1 className="notFoundCode">404</h1>
        <h2 className="notFoundTitle">Page Not Found</h2>
        <p className="notFoundText">
          Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/')}
          className="notFoundButton"
        >
          Go Back Home
        </button>
      </div>
      <SiteFooter />
    </div>
  );
}

export default NotFound;
