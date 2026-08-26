import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders dashboard page by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '대시보드' })).toBeInTheDocument();
  });

  it('renders bottom navigation with all links', () => {
    render(<App />);
    expect(screen.getByText('채팅')).toBeInTheDocument();
    expect(screen.getByText('아카이브')).toBeInTheDocument();
  });
});
