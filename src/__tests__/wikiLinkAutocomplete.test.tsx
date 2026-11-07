// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WikiLinkSuggestionPopup } from '../components/editor/WikiLinkSuggestionPopup';
import { Note } from '../types';

const mockNotes: Note[] = [
  {
    id: 'wiki-hogwarts',
    type: 'wiki',
    title: 'Hogwarts School of Witchcraft and Wizardry',
    content: 'A magical school...',
    tags: ['#School', '#Lore'],
    links: [],
    createdAt: 1000,
    updatedAt: 1000
  },
  {
    id: 'wiki-harry',
    type: 'wiki',
    title: 'Harry Potter',
    content: 'The boy who lived...',
    tags: ['#Character'],
    links: [],
    createdAt: 1000,
    updatedAt: 1000
  },
  {
    id: 'wiki-potions',
    type: 'wiki',
    title: 'Advanced Potion-Making',
    content: 'Handbook for N.E.W.T. students...',
    tags: ['#Magic'],
    links: [],
    createdAt: 1000,
    updatedAt: 1000
  }
];

describe('WikiLinkSuggestionPopup Component', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <WikiLinkSuggestionPopup
        isOpen={false}
        query=""
        coords={{ left: 100, top: 100, bottom: 120 }}
        allNotes={mockNotes}
        currentNoteId="wiki-harry"
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all other wiki pages when query is empty', () => {
    render(
      <WikiLinkSuggestionPopup
        isOpen={true}
        query=""
        coords={{ left: 100, top: 100, bottom: 120 }}
        allNotes={mockNotes}
        currentNoteId="wiki-harry"
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Current note "Harry Potter" should be excluded
    expect(screen.queryByText('Harry Potter')).toBeNull();
    // Other pages should be listed
    expect(screen.getByText('Hogwarts School of Witchcraft and Wizardry')).toBeDefined();
    expect(screen.getByText('Advanced Potion-Making')).toBeDefined();
  });

  it('filters pages as the user types letters of the page name', () => {
    render(
      <WikiLinkSuggestionPopup
        isOpen={true}
        query="Potion"
        coords={{ left: 100, top: 100, bottom: 120 }}
        allNotes={mockNotes}
        currentNoteId="wiki-harry"
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Advanced Potion-Making')).toBeDefined();
    expect(screen.queryByText('Hogwarts School of Witchcraft and Wizardry')).toBeNull();
  });

  it('shows "+ Create new page" when query has no exact match', () => {
    render(
      <WikiLinkSuggestionPopup
        isOpen={true}
        query="Room of Requirement"
        coords={{ left: 100, top: 100, bottom: 120 }}
        allNotes={mockNotes}
        currentNoteId="wiki-harry"
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Create new page:')).toBeDefined();
    expect(screen.getByText('"Room of Requirement"')).toBeDefined();
  });

  it('does NOT show create new page option for "pagename" placeholder', () => {
    render(
      <WikiLinkSuggestionPopup
        isOpen={true}
        query="pagename"
        coords={{ left: 100, top: 100, bottom: 120 }}
        allNotes={mockNotes}
        currentNoteId="wiki-harry"
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText('Create new page:')).toBeNull();
  });

  it('calls onSelect with page title when an item is clicked', () => {
    const handleSelect = vi.fn();

    render(
      <WikiLinkSuggestionPopup
        isOpen={true}
        query="Hog"
        coords={{ left: 100, top: 100, bottom: 120 }}
        allNotes={mockNotes}
        currentNoteId="wiki-harry"
        selectedIndex={0}
        onSelect={handleSelect}
        onClose={vi.fn()}
      />
    );

    const pageBtn = screen.getByText('Hogwarts School of Witchcraft and Wizardry');
    fireEvent.mouseDown(pageBtn);

    expect(handleSelect).toHaveBeenCalledWith('Hogwarts School of Witchcraft and Wizardry');
  });

  it('calls onSelect with query when "Create new page" is clicked', () => {
    const handleSelect = vi.fn();

    render(
      <WikiLinkSuggestionPopup
        isOpen={true}
        query="Diagon Alley"
        coords={{ left: 100, top: 100, bottom: 120 }}
        allNotes={mockNotes}
        currentNoteId="wiki-harry"
        selectedIndex={1}
        onSelect={handleSelect}
        onClose={vi.fn()}
      />
    );

    const createBtn = screen.getByText('"Diagon Alley"');
    fireEvent.mouseDown(createBtn);

    expect(handleSelect).toHaveBeenCalledWith('Diagon Alley');
  });
});
