import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import React from 'react';

describe('Unit Tests', () => {
  it('cn utility should merge classes correctly', () => {
    const result = cn('bg-red-500', 'bg-blue-500', 'text-white');
    // tailwind-merge should resolve conflict to the last one (blue)
    expect(result).toContain('bg-blue-500');
    expect(result).not.toContain('bg-red-500');
    expect(result).toContain('text-white');
  });

  it('Button component should render correctly', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });
});
