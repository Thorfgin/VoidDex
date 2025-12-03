import { render, fireEvent } from '@testing-library/react';
import { describe, expect, test } from '@jest/globals';
import Input from './Input';

describe('Input Component', () => {
  test('renders standard input', () => {
    const { getByLabelText, getByRole } = render(<Input label="Test Label" name="test" />);
    expect(getByLabelText(/Test Label/i)).toBeTruthy();
    expect(getByRole('textbox').getAttribute('type')).toBe('text');
  });

  test('renders error message', () => {
    const { getByText } = render(<Input label="Test" error="Required field" />);
    expect(getByText('Required field')).toBeTruthy();
  });

  test('handles multiline expansion interaction', () => {
    const { getByRole, getByTitle } = render(<Input label="Description" multiline value="Line 1" readOnly={false} />);
    
    const collapsed = getByRole('button', { name: /tap to expand/i });
    expect(collapsed).toBeTruthy();
    
    fireEvent.click(collapsed);
    
    const textarea = getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Line 1');
    
    const collapseBtn = getByTitle('Tap to collapse');
    fireEvent.click(collapseBtn);
    
    expect(getByRole('button', { name: /tap to expand/i })).toBeTruthy();
  });

  test('handles read-only multiline expansion', () => {
    const { getByRole, getByTitle, queryByRole } = render(<Input label="Notes" multiline value="Note 1" readOnly />);
    
    const collapsed = getByRole('button', { name: /tap to expand/i });
    fireEvent.click(collapsed);
    
    const expanded = getByTitle('Tap to collapse');
    expect(expanded.textContent).toContain('Note 1');
    expect(queryByRole('textbox')).toBeNull();
  });
});