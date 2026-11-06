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

  it('renders YouTube Shorts embeds with responsive iframe', () => {
    const markdown = `Check out this short:
<iframe src="https://www.youtube.com/shorts/vxmv3snAkig" data-is-short="true" allowfullscreen></iframe>`;

    const { container } = render(<MarkdownViewer content={markdown} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeDefined();
    expect(iframe?.getAttribute('src')).toBe('https://www.youtube.com/embed/vxmv3snAkig');
  });

  it('auto-embeds standalone YouTube Shorts link into video player', () => {
    const markdown = `https://www.youtube.com/shorts/vxmv3snAkig`;

    const { container } = render(<MarkdownViewer content={markdown} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeDefined();
    expect(iframe?.getAttribute('src')).toBe('https://www.youtube.com/embed/vxmv3snAkig');
  });

  it('renders HTML5 video elements', () => {
    const markdown = `<video src="assets/demo.mp4" controls></video>`;

    const { container } = render(<MarkdownViewer content={markdown} />);
    const video = container.querySelector('video');
    expect(video).toBeDefined();
    expect(video?.getAttribute('src')).toBe('assets/demo.mp4');
  });
});
