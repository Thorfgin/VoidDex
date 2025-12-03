import { render, fireEvent } from '@testing-library/react';
import { describe, expect, test, jest } from '@jest/globals';
import Button from './Button';

describe('Button Component', () => {
  test('renders children correctly', () => {
    const { getByText } = render(<Button>Click Me</Button>);
    expect(getByText('Click Me')).toBeTruthy();
  });

  test('handles onClick event', () => {
    const handleClick = jest.fn();
    const { getByText } = render(<Button onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('shows loading state', () => {
    const { getByText } = render(<Button isLoading>Click Me</Button>);
    expect(getByText('Processing...')).toBeTruthy();
    const btn = getByText('Processing...').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  test('applies variant classes', () => {
    const { getByText } = render(
      <>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
      </>
    );

    expect(getByText('Primary').className).toContain('bg-brand-primary');
    expect(getByText('Secondary').className).toContain('bg-gray-100');
    expect(getByText('Danger').className).toContain('hover:text-red-700');
  });

  test('is disabled when disabled prop is set', () => {
    const handleClick = jest.fn();
    const { getByText } = render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    const btn = getByText('Disabled') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });
});