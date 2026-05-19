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
