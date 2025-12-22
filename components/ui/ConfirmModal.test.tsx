import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfirmModal from './ConfirmModal';
import { X } from 'lucide-react';

// Define a minimal required props object for reuse across tests
const minProps = {
  title: 'Required Title',
  message: 'Required Message Body',
  primaryAction: {
    label: 'Proceed',
    handler: jest.fn(),
    variant: 'primary' as const,
  },
  onClose: jest.fn(),
};

describe('ConfirmModal Component (Generic)', () => {
  // --- Test 1: Visibility ---
  test('does not render when isOpen is false', () => {
    render(
      <ConfirmModal isOpen={false} {...minProps} />
    );

    // Checks that the element is NOT in the document
    expect(screen.queryByText(minProps.title)).not.toBeInTheDocument();
  });

  // --- Test 2: Basic Content Rendering ---
  test('renders provided title, message, and primary label when open', () => {
    render(
      <ConfirmModal isOpen={true} {...minProps} />
    );

    // Checks that the elements ARE in the document
    expect(screen.getByText(minProps.title)).toBeInTheDocument();
    expect(screen.getByText(minProps.message)).toBeInTheDocument();

    const primaryBtn = screen.getByRole('button', { name: minProps.primaryAction.label });
    expect(primaryBtn).toBeInTheDocument();
  });

  // --- Test 3: Primary Action Execution ---
  test('calls primaryAction handler when primary button is clicked', () => {
    const handleConfirm = jest.fn();
    render(
      <ConfirmModal
        isOpen={true}
        {...minProps}
        primaryAction={{
          label: 'Execute',
          handler: handleConfirm,
          variant: 'danger',
        }}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Execute' });
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  // --- Test 4: Default Secondary Action (Cancel) Execution ---
  test('renders "Cancel" button and calls onClose when clicked (default secondary action)', () => {
    const handleClose = jest.fn();
    render(
      <ConfirmModal
        isOpen={true}
        {...minProps}
        onClose={handleClose}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  // --- Test 5: Custom Primary Label and Variant (Danger) ---
  test('renders custom primary label and applies danger variant styles', () => {
    render(
      <ConfirmModal
        isOpen={true}
        {...minProps}
        primaryAction={{
          ...minProps.primaryAction,
          label: 'Danger Action',
          variant: 'danger'
        }}
      />
    );

    const dangerBtn = screen.getByRole('button', { name: 'Danger Action' });

    // Checks that the button element HAS the expected class
    expect(dangerBtn).toHaveClass('hover:text-red-700');
  });

// --- Test 6: Custom Icon Rendering (Corrected) ---
  test('renders custom icon and respects icon color class', () => {
    render(
      <ConfirmModal
        isOpen={true}
        {...minProps}
        icon={X} // Using X icon from lucide-react
        iconColorClass="text-green-500"
      />
    );

    // Find the H3 element containing the title text, and then grab its parent.
    // In the component, the parent is the div containing the icon and the title, which receives the iconColorClass.
    const headerDiv = screen.getByText(minProps.title).parentElement;

    // Assert that the parent element was found and has the correct class
    expect(headerDiv).toBeInTheDocument(); // Added safety check
    expect(headerDiv).toHaveClass('text-green-500');
  });
});