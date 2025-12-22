import {render, fireEvent} from '@testing-library/react';
import Input from './Input';

describe('Input Component', () => {
  test('renders standard input', () => {
    const {getByText, getByRole} = render(
      <Input label="Test Label" name="test" placeholder="Type…" id={''}/>
    );

    expect(getByText('Test Label:')).toBeTruthy();

    const textbox = getByRole('textbox') as HTMLInputElement;
    expect(textbox.tagName).toBe('INPUT');
    expect(textbox.type).toBe('text');
    expect(textbox.name).toBe('test');
    expect(textbox.placeholder).toBe('Type…');
  });

  test('applies read-only styles for single-line input', () => {
    const {getByRole} = render(
      <Input label="ReadOnly" value="Value" readOnly id={''}/>
    );

    const input = getByRole('textbox') as HTMLInputElement;
    // readOnly branch: gray background and text
    expect(input.className).toContain('bg-gray-100');
    expect(input.className).toContain('text-gray-600');
  });

  test('renders error message and applies error styles to the field', () => {
    const {getByText, getByRole} = render(
      <Input label="Test" error="Required field" id={''}/>
    );

    expect(getByText('Required field')).toBeTruthy();

    const input = getByRole('textbox') as HTMLInputElement;
    expect(input.className).toContain('border-red-500');
    expect(input.className).toContain('bg-red-50');
  });

  test('applies error styles for multiline textarea as well', () => {
    const {getByText, getByRole} = render(
      <Input label="Multiline" multiline expandable={false} error="Bad" id={''}/>
    );

    expect(getByText('Bad')).toBeTruthy();

    const textarea = getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.className).toContain('border-red-500');
    expect(textarea.className).toContain('bg-red-50');
  });

  test('handles multiline expansion interaction (editable)', () => {
    const {getByTitle, getByRole} = render(
      <Input
        label="Description"
        multiline
        value="Line 1"
        readOnly={false} id={''}/>
    );

    // Initially collapsed: clickable container with title "Tap to expand"
    const collapsed = getByTitle('Tap to expand');
    expect(collapsed).toBeTruthy();

    // Click to expand
    fireEvent.click(collapsed);

    const textarea = getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.value).toBe('Line 1');

    // Click collapse control
    const collapseBtn = getByTitle('Tap to collapse');
    fireEvent.click(collapseBtn);

    // Should show collapsed view again
    expect(getByTitle('Tap to expand')).toBeTruthy();
  });

  test('collapsed multiline view shows placeholder when empty', () => {
    const {getByTitle} = render(
      <Input
        label="Desc"
        multiline
        placeholder="Write something…"
        value=""
        readOnly={false} id={''}/>
    );

    const collapsed = getByTitle('Tap to expand');
    expect(collapsed.textContent).toContain('Write something…');
  });

  test('collapsed multiline view converts newlines to comma-separated preview', () => {
    const {getByTitle} = render(
      <Input
        label="Preview"
        multiline
        value={'Line 1\nLine 2\nLine 3'}
        readOnly={false} id={''}/>
    );

    const collapsed = getByTitle('Tap to expand');
    // In collapsed state, newlines are replaced with ","
    expect(collapsed.textContent).toContain('Line 1, Line 2, Line 3');
  });

  test('renders simple textarea when expandable is false', () => {
    const {getByRole, queryByTitle} = render(
      <Input label="Simple" multiline expandable={false} id={''}/>
    );

    const textarea = getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');

    // No expand/collapse UI
    expect(queryByTitle('Tap to expand')).toBeNull();
  });

  test('handles read-only multiline expansion (no editable textarea)', () => {
    const {getByTitle, queryByRole} = render(
      <Input label="Notes" multiline value="Note 1" readOnly id={''}/>
    );

    const collapsed = getByTitle('Tap to expand');
    fireEvent.click(collapsed);

    const expanded = getByTitle('Tap to collapse');
    expect(expanded.textContent).toContain('Note 1');

    // No editable textarea should be present
    expect(queryByRole('textbox')).toBeNull();
  });

  test('forwards disabled prop to underlying input', () => {
    const {getByRole} = render(
      <Input label="Disabled" disabled id={''}/>
    );

    const input = getByRole('textbox') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
