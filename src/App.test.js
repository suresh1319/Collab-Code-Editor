import { render, screen } from '@testing-library/react';
import App from './App';

test('renders landing page with footer navigation', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /Get Started/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Join Room/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /GitHub/i })).toBeInTheDocument();
});
