import { render, screen } from '@testing-library/react';
import App from './App';

test('renders join button', () => {
  render(<App />);
  const buttonElement = screen.getByText(/Join/i);
  expect(buttonElement).toBeInTheDocument();
});
