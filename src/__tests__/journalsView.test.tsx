// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { JournalsView } from '../components/JournalsView';
import { Note } from '../types';

afterEach(() => {
  cleanup();
});

const mockNotes: Note[] = [
  {
    id: 'journal-2026-11-10',
    type: 'journal',
    title: 'Tuesday, November 10, 2026',
    content: '- [ ] Complete the potions assignment\n- Reviewed [[Hogwarts School of Witchcraft and Wizardry]] notes',
    tags: ['#Study'],
    links: ['Hogwarts School of Witchcraft and Wizardry'],
    createdAt: 1000,
    updatedAt: 1000
  },
  {
    id: 'wiki-hogwarts',
    type: 'wiki',
    title: 'Hogwarts School of Witchcraft and Wizardry',
    content: 'Castle in Scotland...',
    tags: ['#School'],
    links: [],
    createdAt: 1000,
    updatedAt: 1000
  }
];

describe('JournalsView Continuous Canvas', () => {
  it('renders Journals header and Today section at the top', () => {
    const handleSave = vi.fn();
    const handleDelete = vi.fn();
    const handleNavigate = vi.fn();

    render(
      <JournalsView
        notes={mockNotes}
        onSaveJournal={handleSave}
        onDeleteJournal={handleDelete}
        onNavigateToNote={handleNavigate}
      />
    );

    // Expect header title
    expect(screen.getByText(/Journals & Daily Stream/i)).toBeDefined();
    // Expect Today badge and jump button
    expect(screen.getAllByText('Today').length).toBeGreaterThanOrEqual(1);
  });

  it('renders dates separated by lines (<hr>) in continuous stream', () => {
    const handleSave = vi.fn();
    const handleDelete = vi.fn();
    const handleNavigate = vi.fn();

    const { container } = render(
      <JournalsView
        notes={mockNotes}
        onSaveJournal={handleSave}
        onDeleteJournal={handleDelete}
        onNavigateToNote={handleNavigate}
      />
    );

    // Since mockNotes has a past date and today is also present, there should be an <hr> divider
    const hrs = container.querySelectorAll('hr');
    expect(hrs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders action buttons (+ TODO, • Bullet, [[ ]]) for journal entry', () => {
    const handleSave = vi.fn();
    const handleDelete = vi.fn();
    const handleNavigate = vi.fn();

    render(
      <JournalsView
        notes={mockNotes}
        onSaveJournal={handleSave}
        onDeleteJournal={handleDelete}
        onNavigateToNote={handleNavigate}
      />
    );

    const todoButtons = screen.getAllByTitle(/Insert checklist TODO/i);
    expect(todoButtons.length).toBeGreaterThan(0);

    const bulletButtons = screen.getAllByTitle(/Insert bullet point/i);
    expect(bulletButtons.length).toBeGreaterThan(0);

    const linkButtons = screen.getAllByTitle(/Insert Wiki Link reference/i);
    expect(linkButtons.length).toBeGreaterThan(0);
  });
});
