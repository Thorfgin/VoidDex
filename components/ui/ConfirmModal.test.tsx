import { render, fireEvent } from '@testing-library/react';
import { describe, expect, test, jest } from '@jest/globals';
import ConfirmModal from './ConfirmModal';

describe('ConfirmModal Component', () => {
  test('does not render when isOpen is false', () => {
    const { queryByText } = render(
      <ConfirmModal isOpen={false} onClose={() => {}} onConfirm={() => {}} />
    );
    expect(queryByText('Discard Changes?')).toBeNull();
  });

  test('renders correctly when isOpen is true', () => {
    const { getByText } = render(
      <ConfirmModal 
        isOpen={true} 
        onClose={() => {}} 
        onConfirm={() => {}} 
        title="Test Title" 
        message="Test Message"
      />
    );
    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Message')).toBeTruthy();
  });

  test('calls onClose when Cancel is clicked', () => {
    const handleClose = jest.fn();
    const { getByText } = render(
      <ConfirmModal isOpen={true} onClose={handleClose} onConfirm={() => {}} />
    );
    
    fireEvent.click(getByText('Cancel'));
    expect(handleClose).toHaveBeenCalled();
  });

  test('calls onConfirm when Confirm button is clicked', () => {
    const handleConfirm = jest.fn();
    const { getByText } = render(
      <ConfirmModal isOpen={true} onClose={() => {}} onConfirm={handleConfirm} confirmLabel="Yes, Do it" />
    );
    
    fireEvent.click(getByText('Yes, Do it'));
    expect(handleConfirm).toHaveBeenCalled();
  });
});