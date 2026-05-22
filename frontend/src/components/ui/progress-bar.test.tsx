import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './progress-bar';

describe('ProgressBar', () => {
  it('renders with correct progress percentage', () => {
    render(<ProgressBar progress={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('clamps progress to 0-100 range', () => {
    const { rerender } = render(<ProgressBar progress={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();

    rerender(<ProgressBar progress={-20} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows label when provided', () => {
    render(<ProgressBar progress={30} label="Processing" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('hides percentage when showPercentage is false', () => {
    render(<ProgressBar progress={50} showPercentage={false} />);
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('applies gradient variant', () => {
    const { container } = render(<ProgressBar progress={50} variant="gradient" />);
    expect(container.querySelector('.progress-gradient')).toBeInTheDocument();
  });
});
