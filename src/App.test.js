import { render, screen } from '@testing-library/react';
import App from './App';

test('renders landing page call to action', () => {
  render(<App />);
  const buttonElement = screen.getByText(/Get Started/i);
  expect(buttonElement).toBeInTheDocument();
});
