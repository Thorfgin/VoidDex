import { render, fireEvent } from '@testing-library/react';
import { describe, expect, test } from '@jest/globals';
import Input from './Input';

describe('Input Component', () => {
  test('renders standard input', () => {
    const { getByLabelText, getByRole } = render(<Input label="Test Label" name="test" />);
    expect(getByLabelText(/Test Label/i)).toBeTruthy();
    expect(getByRole('textbox').getAttribute('type')).toBe('text');
  });

  test('renders error message and applies error styles', () => {
    const { getByText, getByRole } = render(<Input label="Test" error="Required field" />);
    expect(getByText('Required field')).toBeTruthy();
    const inputContainer = getByRole('textbox').parentElement;
    expect(inputContainer?.className).toContain('border-red-500');
  });

  test('handles multiline expansion interaction', () => {
    const { getByRole, getByTitle } = render(<Input label="Description" multiline value="Line 1" readOnly={false} />);

    // Initially collapsed
    const collapsed = getByRole('button', { name: /tap to expand/i });
    expect(collapsed).toBeTruthy();

    // Click to expand
    fireEvent.click(collapsed);

    const textarea = getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Line 1');

    // Click collapse button
    const collapseBtn = getByTitle('Tap to collapse');
    fireEvent.click(collapseBtn);

    // Should be collapsed again
    expect(getByRole('button', { name: /tap to expand/i })).toBeTruthy();
  });

  test('renders simple textarea when expandable is false', () => {
    const { getByRole, queryByRole } = render(<Input label="Simple" multiline expandable={false} />);
    const textarea = getByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
    // Should NOT have the expand button wrapper which is a div with role button
    expect(queryByRole('button', { name: /tap to expand/i })).toBeNull();
  });

  test('handles read-only multiline expansion', () => {
    const { getByRole, getByTitle, queryByRole } = render(<Input label="Notes" multiline value="Note 1" readOnly />);

    const collapsed = getByRole('button', { name: /tap to expand/i });
    fireEvent.click(collapsed);

    const expanded = getByTitle('Tap to collapse');
    expect(expanded.textContent).toContain('Note 1');
    // Should not render an editable textarea
    expect(queryByRole('textbox')).toBeNull();
  });
});