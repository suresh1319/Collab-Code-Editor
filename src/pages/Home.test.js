import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Home from './Home';

test('navigates back to the landing page from the join screen', () => {
  render(
    <MemoryRouter
      initialEntries={['/join']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<div>Landing Page</div>} />
        <Route path="/join" element={<Home />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: /back to home/i }));

  expect(screen.getByText(/landing page/i)).toBeInTheDocument();
});

test('does not render a self-referential join link in the footer on the join screen', () => {
  render(
    <MemoryRouter
      initialEntries={['/join']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/join" element={<Home />} />
      </Routes>
    </MemoryRouter>
  );

  const footerNav = screen.getByRole('navigation', { name: /footer/i });

  expect(screen.getAllByRole('link', { name: /home/i })).toHaveLength(1);
  expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument();
  expect(footerNav).not.toHaveTextContent(/join room/i);
});
