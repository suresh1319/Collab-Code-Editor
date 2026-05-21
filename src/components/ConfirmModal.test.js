import { fireEvent, render, screen } from '@testing-library/react';
import ConfirmModal from './ConfirmModal';

test('renders destructive confirmation copy and submits once', () => {
  const onClose = jest.fn();
  const onConfirm = jest.fn();

  render(
    <ConfirmModal
      isOpen
      title="Delete File?"
      message='Are you sure you want to delete "notes.txt"?'
      onClose={onClose}
      onConfirm={onConfirm}
      confirmText="Delete"
      submittingText="Deleting..."
      variant="delete"
    />
  );

  const deleteButton = screen.getByRole('button', { name: /delete/i });
  fireEvent.click(deleteButton);

  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
});
