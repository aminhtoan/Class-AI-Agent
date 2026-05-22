import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('renders pending status correctly', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders ready status correctly', () => {
    render(<StatusBadge status="ready" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('renders failed status correctly', () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders crawling status with animation', () => {
    const { container } = render(<StatusBadge status="crawling" />);
    expect(screen.getByText('Crawling')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders succeeded status correctly', () => {
    render(<StatusBadge status="succeeded" />);
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<StatusBadge status="ready" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
