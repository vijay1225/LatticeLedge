import { Note } from '../types';

/**
 * Serializes the entire vault into a clean JSON file for local backup / backup.
 */
export function exportVaultToJson(notes: Note[]): string {
  const payload = {
    version: '1.0',
    exportedAt: Date.now(),
    notesCount: notes.length,
    notes
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Validates and parses notes imported from a local file backup.
 */
export function importVaultFromJson(rawJson: string): { success: boolean; notes?: Note[]; error?: string } {
  try {
    const data = JSON.parse(rawJson);
    const candidateNotes = Array.isArray(data) ? data : data.notes;

    if (!Array.isArray(candidateNotes)) {
      return { success: false, error: 'Invalid backup file format: notes array not found.' };
    }

    // Validate note structure
    const validNotes: Note[] = candidateNotes.filter(n => (
      typeof n === 'object' &&
      n !== null &&
      typeof n.id === 'string' &&
      typeof n.title === 'string' &&
      typeof n.content === 'string' &&
      (n.type === 'wiki' || n.type === 'quick')
    ));

    if (validNotes.length === 0) {
      return { success: false, error: 'No valid notes found in the selected file.' };
    }

    return { success: true, notes: validNotes };
  } catch (err: any) {
    return { success: false, error: `JSON Parse error: ${err.message}` };
  }
}

/**
 * Formats a Note into standard Markdown with Obsidian/Logseq-compatible YAML frontmatter.
 */
export function formatNoteAsMarkdown(note: Note): string {
  const frontmatter = [
    '---',
    `id: "${note.id}"`,
    `title: "${note.title.replace(/"/g, '\\"')}"`,
    `type: "${note.type}"`,
    `tags: [${note.tags.map(t => `"${t}"`).join(', ')}]`,
    `updatedAt: ${note.updatedAt}`,
    '---',
    '',
    note.content
  ].join('\n');

  return frontmatter;
}

/**
 * Triggers a browser/device download of the vault backup for local backup.
 */
export function downloadVaultBackup(notes: Note[]) {
  const jsonContent = exportVaultToJson(notes);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = url;
  a.download = `LatticeLedger-Vault-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
