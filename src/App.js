import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';
import NotFound from './pages/NotFound';
import { Toaster } from "react-hot-toast";
import LandingPage from './pages/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';


function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          info: {
            theme: {
              primary: "#49343",
            },
          },
          success: {
            theme: {
              primary: "#4aed88",
            },
          },
        }}
      />

      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/join" element={<Home />} />
          <Route path="/editor/:roomId" element={<EditorPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

        
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;