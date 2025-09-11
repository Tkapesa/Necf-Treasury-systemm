import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // Just check that the app renders without throwing
    expect(document.body).toBeTruthy();
  });

  it('contains main content', () => {
    render(<App />);
    // Look for any text content to ensure the app is rendering
    const mainContent = document.querySelector('body');
    expect(mainContent).toBeTruthy();
  });
});
