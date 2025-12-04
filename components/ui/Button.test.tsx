import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, jest } from '@jest/globals';
import Button from './Button';

describe('Button Component', () => {
  test('renders children as label', () => {
    render(<Button>Click Me</Button>);

    const btn = screen.getByRole('button', { name: 'Click Me' });
    expect(btn).toBeTruthy();
  });

  test('handles onClick event when enabled', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    const btn = screen.getByRole('button', { name: 'Click Me' });
    fireEvent.click(btn);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('shows loading state, hides children and disables button', () => {
    render(<Button isLoading>Click Me</Button>);

    // Button label changes to "Processing..."
    const loadingLabel = screen.getByText('Processing...');
    expect(loadingLabel).toBeTruthy();

    const btn = loadingLabel.closest('button') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(true);

    // Original children should no longer be visible as label
    const originalLabel = screen.queryByText('Click Me');
    expect(originalLabel).toBeNull();
  });

  test('applies variant classes correctly', () => {
    render(
        <>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
        </>
    );

    const primary = screen.getByRole('button', { name: 'Primary' });
    const secondary = screen.getByRole('button', { name: 'Secondary' });
    const danger = screen.getByRole('button', { name: 'Danger' });

    expect(primary.className).toContain('bg-brand-primary');
    expect(secondary.className).toContain('bg-gray-100');
    // Danger is neutral until hover; we assert the hover-related class is present
    expect(danger.className).toContain('hover:text-red-700');
  });

  test('merges custom className with base and variant classes', () => {
    render(
        <Button className="custom-class extra-margin">Labeled</Button>
    );

    const btn = screen.getByRole('button', { name: 'Labeled' });
    expect(btn.className).toContain('custom-class');
    expect(btn.className).toContain('extra-margin');
    // still has base styles
    expect(btn.className).toContain('rounded-md');
  });

  test('defaults type attribute to "button"', () => {
    render(<Button>Default Type</Button>);

    const btn = screen.getByRole('button', { name: 'Default Type' }) as HTMLButtonElement;
    expect(btn.type).toBe('button');
  });

  test('forwards type attribute (e.g., submit)', () => {
    render(<Button type="submit">Submit</Button>);

    const btn = screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement;
    expect(btn.type).toBe('submit');
  });

  test('is disabled when disabled prop is set and does not trigger onClick', () => {
    const handleClick = jest.fn();
    render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
    );

    const btn = screen.getByRole('button', { name: 'Disabled' }) as HTMLButtonElement;

    expect(btn.disabled).toBe(true);

    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('sets disabled when isLoading is true even if disabled is not passed', () => {
    const handleClick = jest.fn();
    render(
        <Button isLoading onClick={handleClick}>
          Submit
        </Button>
    );

    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
