import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, jest } from '@jest/globals';
import ConfirmModal from './ConfirmModal';

describe('ConfirmModal Component', () => {
  test('does not render when isOpen is false', () => {
    render(
        <ConfirmModal isOpen={false} onClose={() => {}} onConfirm={() => {}} />
    );

    // Default title should not exist when closed
    const defaultTitle = screen.queryByText('Discard Changes?');
    expect(defaultTitle).toBeNull();
  });

  test('renders default title, message and confirm label when open with no overrides', () => {
    render(
        <ConfirmModal isOpen={true} onClose={() => {}} onConfirm={() => {}} />
    );

    expect(screen.getByText('Discard Changes?')).toBeTruthy();
    expect(
        screen.getByText(
            'You have unsaved changes. Are you sure you want to discard them?'
        )
    ).toBeTruthy();

    const confirmBtn = screen.getByRole('button', { name: 'Discard' });
    expect(confirmBtn).toBeTruthy();
  });

  test('renders custom title and message when provided', () => {
    render(
        <ConfirmModal
            isOpen={true}
            onClose={() => {}}
            onConfirm={() => {}}
            title="Test Title"
            message="Test Message"
        />
    );

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByText('Test Message')).toBeTruthy();
  });

  test('calls onClose when Cancel is clicked', () => {
    const handleClose = jest.fn();
    render(
        <ConfirmModal
            isOpen={true}
            onClose={handleClose}
            onConfirm={() => {}}
        />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = jest.fn();
    render(
        <ConfirmModal
            isOpen={true}
            onClose={() => {}}
            onConfirm={handleConfirm}
            confirmLabel="Yes, Do it"
        />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Yes, Do it' });
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  test('applies danger variant styles to confirm button when confirmVariant="danger"', () => {
    render(
        <ConfirmModal
            isOpen={true}
            onClose={() => {}}
            onConfirm={() => {}}
            confirmLabel="Danger Action"
            confirmVariant="danger"
        />
    );

    const dangerBtn = screen.getByRole('button', { name: 'Danger Action' });

    // Danger variant in Button.tsx contains these classes:
    // "hover:bg-red-50 hover:border-red-300 hover:text-red-700 ..."
    expect(dangerBtn.className).toContain('hover:bg-red-50');
    expect(dangerBtn.className).toContain('hover:text-red-700');
  });

  test('applies primary variant styles when confirmVariant="primary"', () => {
    render(
        <ConfirmModal
            isOpen={true}
            onClose={() => {}}
            onConfirm={() => {}}
            confirmLabel="Primary Action"
            confirmVariant="primary"
        />
    );

    const primaryBtn = screen.getByRole('button', { name: 'Primary Action' });

    // Primary variant in Button.tsx contains "bg-brand-primary"
    expect(primaryBtn.className).toContain('bg-brand-primary');
  });
});
