// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownViewer } from '../components/MarkdownViewer';

describe('MarkdownViewer Component', () => {
  it('renders markdown headings and bullet points', () => {
    const markdown = `# Overview
## Details
- First point
- Second point`;

    render(<MarkdownViewer content={markdown} />);

    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Details')).toBeDefined();
    expect(screen.getByText('First point')).toBeDefined();
    expect(screen.getByText('Second point')).toBeDefined();
  });

  it('renders [[Wiki Links]] as interactive clickable buttons', () => {
    const markdown = `Learn more about [[Lord Voldemort]] and [[Horcruxes]].`;
    let clickedLink = '';

    render(
      <MarkdownViewer
        content={markdown}
        onLinkClick={(title) => {
          clickedLink = title;
        }}
      />
    );

    const voldemortBtn = screen.getByText('Lord Voldemort');
    expect(voldemortBtn).toBeDefined();

    fireEvent.click(voldemortBtn);
    expect(clickedLink).toBe('Lord Voldemort');

    const horcruxBtn = screen.getByText('Horcruxes');
    expect(horcruxBtn).toBeDefined();

    fireEvent.click(horcruxBtn);
    expect(clickedLink).toBe('Horcruxes');
  });

  it('renders bold and inline code styling', () => {
    const markdown = `This is **bold concept** and \`inline code\`.`;

    render(<MarkdownViewer content={markdown} />);

    expect(screen.getByText('bold concept')).toBeDefined();
    expect(screen.getByText('inline code')).toBeDefined();
  });
});
