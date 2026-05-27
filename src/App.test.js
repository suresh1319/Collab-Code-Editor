import { render, screen } from '@testing-library/react';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

test('renders landing page call to action', () => {
  render(<App />);
  const buttonElement = screen.getByText(/Get Started/i);
  expect(buttonElement).toBeInTheDocument();
});

test('renders the error boundary fallback UI when a child throws', () => {
  const Thrower = () => {
    throw new Error('Boom');
  };

  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  render(
    <ErrorBoundary>
      <Thrower />
    </ErrorBoundary>
  );

  expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  expect(screen.getByText(/Boom/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Go Home/i })).toBeInTheDocument();

  consoleErrorSpy.mockRestore();
});
