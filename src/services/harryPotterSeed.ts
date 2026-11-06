import { Note } from '../types';

export const HARRY_POTTER_SEED_NOTES: Note[] = [
  {
    id: 'wiki-code-showcase',
    type: 'wiki',
    title: 'Code Snippets & Algorithms Demo',
    content: `# Code Snippets & Algorithms Demo

LatticeLedger includes full native support for **syntax-styled code blocks** in modern PKM documents. Each code block features:
- **Language Detection & Badge**: Displays the active language and provides a dropdown to switch syntax styling.
- **1-Click Copy**: Convenient copy button in the top-right corner with visual "Copied!" feedback.
- **Monospace Dark Canvas**: Clean contrast optimized for readability and pair programming.

> [!NOTE]
> All code snippets and formulas in LatticeLedger are stored as standard Markdown triple-backtick fences (\`\`\`language ... \`\`\`), ensuring 100% interoperability with Obsidian, GitHub, and Logseq.

---

## 1. Python Algorithm: Quantum Spell Decay
\`\`\`python
import math
from typing import Dict, Any

def calculate_lumos_intensity(lumens: float, wand_length_cm: float, duration_sec: int) -> Dict[str, Any]:
    """Simulates photon radiation and emotional decay of a Lumos spell."""
    decay_rate = 0.05
    remaining_lumens = lumens * math.exp(-decay_rate * (duration_sec / 60.0))
    effective_range = round((remaining_lumens * (wand_length_cm / 28.0)) ** 0.5, 2)
    
    return {
        "status": "Active" if remaining_lumens > 50 else "Flickering",
        "remaining_lumens": round(remaining_lumens, 1),
        "effective_radius_meters": effective_range,
        "color_temperature_k": 6500
    }

# Execute test simulation
status = calculate_lumos_intensity(lumens=1500, wand_length_cm=28.5, duration_sec=45)
print(f"Lumos Status: {status}")
\`\`\`

---

## 2. TypeScript & React: Spellcasting Hook
\`\`\`typescript
import { useState, useCallback, useMemo } from 'react';

export interface Spell {
  id: string;
  name: string;
  incantation: string;
  category: 'Charms' | 'Transfiguration' | 'Defense';
  powerLevel: number;
}

export function useSpellCaster(initialSpells: Spell[]) {
  const [spellbook, setSpellbook] = useState<Spell[]>(initialSpells);
  const [activeSpellId, setActiveSpellId] = useState<string>(initialSpells[0]?.id || '');
  const [castLog, setCastLog] = useState<{ spell: string; timestamp: number }[]>([]);

  const activeSpell = useMemo(
    () => spellbook.find(s => s.id === activeSpellId),
    [spellbook, activeSpellId]
  );

  const castActiveSpell = useCallback(() => {
    if (!activeSpell) return;
    console.log(\`✨ Casting: \${activeSpell.incantation} (\${activeSpell.name})\`);
    setCastLog(prev => [{ spell: activeSpell.name, timestamp: Date.now() }, ...prev]);
  }, [activeSpell]);

  return { activeSpell, castActiveSpell, castLog, setSpellbook };
}
\`\`\`

---

## 3. SQL Query: Hogwarts Potions Inventory Analytics
\`\`\`sql
-- Query: Identify scarce potion ingredients requiring restock from the Forbidden Forest
SELECT 
    i.ingredient_id,
    i.ingredient_name,
    i.current_stock,
    i.reorder_level,
    p.potion_name,
    COUNT(pi.recipe_step) AS steps_used
FROM ingredients i
JOIN potion_ingredients pi ON i.ingredient_id = pi.ingredient_id
JOIN potions p ON pi.potion_id = p.potion_id
WHERE i.current_stock <= i.reorder_level
  AND i.origin_zone = 'Forbidden Forest'
GROUP BY i.ingredient_id, p.potion_name
ORDER BY i.current_stock ASC
LIMIT 10;
\`\`\`

---

## 4. Rust Systems Implementation: Wand Resonance Engine
\`\`\`rust
// High-performance concurrency simulation for Ollivanders wand resonance
#[derive(Debug, Clone)]
pub struct WandCore {
    pub core_type: String,
    pub resonance_frequency_mhz: f64,
    pub harmonic_stability: f32,
}

impl WandCore {
    pub fn new(core: &str, frequency: f64) -> Self {
        Self {
            core_type: core.to_string(),
            resonance_frequency_mhz: frequency,
            harmonic_stability: 0.998,
        }
    }

    pub fn compute_spell_output(&self, wizard_affinity: f32) -> f64 {
        let base_flux = self.resonance_frequency_mhz * (self.harmonic_stability as f64);
        base_flux * (wizard_affinity as f64).powf(1.5)
    }
}
\`\`\`

---

## 5. Bash / Shell: Automated SQLite Backup Script
\`\`\`bash
#!/usr/bin/env bash
# Automated LatticeLedger SQLite Vault Backup
VAULT_FILE="lattice_vault.db"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$BACKUP_DIR"

if [ -f "$VAULT_FILE" ]; then
    sqlite3 "$VAULT_FILE" ".backup '$BACKUP_DIR/vault_backup_\${TIMESTAMP}.db'"
    echo "✅ SQLite vault successfully backed up to $BACKUP_DIR/vault_backup_\${TIMESTAMP}.db"
else
    echo "⚠️ Vault database $VAULT_FILE not found!"
fi
\`\`\`

---

## Related Knowledge
- Explore visual media and responsive players in [[Media & Video Embeds Gallery]].
- Learn full markdown syntax and callouts in [[Markdown & Callouts Guide]].
- Reference spell formulas used by [[Harry Potter]] and [[Albus Dumbledore]] at [[Hogwarts School of Witchcraft and Wizardry]].
`,
    tags: ['#Code', '#Python', '#TypeScript', '#SQL', '#Rust', '#Bash', '#Syntax'],
    links: [
      'Media & Video Embeds Gallery',
      'Markdown & Callouts Guide',
      'Harry Potter',
      'Albus Dumbledore',
      'Hogwarts School of Witchcraft and Wizardry'
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    updatedAt: Date.now() - 1000 * 60 * 60 * 1,
    isPinned: true
  },
  {
    id: 'wiki-media-gallery',
    type: 'wiki',
    title: 'Media & Video Embeds Gallery',
    content: `# Media & Video Embeds Gallery

LatticeLedger supports seamless **drag-and-drop images**, **click-to-zoom Lightbox**, **media captions**, and **responsive YouTube & local video embeds**.

---

## 1. High-Resolution Image Embeds & Lightbox Zoom
Click on any of the images below to open the **fullscreen modal Lightbox with interactive zoom and pan controls**:

![Harry Potter Portrait](https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80 "Harry James Potter - The Boy Who Lived (Click to zoom)")

> [!TIP]
> You can drag-and-drop any image file directly from your computer or press **Ctrl + V** to paste an image from your clipboard into any note. The file is automatically saved into your vault's \`assets/\` folder!

![Hogwarts Castle](https://images.unsplash.com/photo-1547756536-cde3673fa2e5?auto=format&fit=crop&w=1200&q=80 "Hogwarts Castle in the Scottish Highlands (Click to inspect)")

---

## 2. Responsive YouTube & Video Embeds
LatticeLedger automatically detects video links: **YouTube Shorts (9:16 vertical)**, **standard YouTube (16:9 landscape)**, **Vimeo**, and **local MP4/WebM files in assets/**:

### ⚡ YouTube Short (9:16 Vertical Portrait)
YouTube Shorts are automatically detected and rendered with an authentic vertical mobile ratio:

<iframe src="https://www.youtube.com/embed/vxmv3snAkig" data-is-short="true" allowfullscreen></iframe>

### 🎬 Standard YouTube Video (16:9 Landscape)
<iframe src="https://www.youtube.com/embed/26p_7q7k5n8" allowfullscreen></iframe>

---

## 3. Cartography & Ancient Manuscripts
![Marauder's Map Cartography](https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80 "Magical Parchment and Secret Corridors")

---

## Connected Pages
- See algorithmic code samples in [[Code Snippets & Algorithms Demo]].
- Read the formatting cheat-sheet in [[Markdown & Callouts Guide]].
- Discover historic lore at [[Hogwarts School of Witchcraft and Wizardry]].
`,
    tags: ['#Media', '#Images', '#Video', '#Gallery', '#Lightbox'],
    links: [
      'Code Snippets & Algorithms Demo',
      'Markdown & Callouts Guide',
      'Hogwarts School of Witchcraft and Wizardry'
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    updatedAt: Date.now() - 1000 * 60 * 60 * 1,
    isPinned: true
  },
  {
    id: 'wiki-markdown-callouts',
    type: 'wiki',
    title: 'Markdown & Callouts Guide',
    content: `# Markdown & Callouts Guide

Welcome to the complete formatting guide for LatticeLedger. This page demonstrates all supported **Obsidian/GitHub callout boxes**, **interactive task checklists**, **markdown tables**, and **bi-directional wiki-links**.

---

## 1. Obsidian & GitHub Callout Boxes
Use callouts to highlight tips, warnings, important rules, or notes with distinctive colors and icons:

> [!NOTE]
> A standard information callout. Useful for background context or reference details.

> [!TIP]
> A productivity tip. Use \`Ctrl + K\` on desktop or the Search tab on mobile for instant full-text search and Ask AI knowledge synthesis.

> [!IMPORTANT]
> Crucial information. SQLite transactions provide ACID compliance and sub-millisecond query speed across your notes.

> [!WARNING]
> Warning callout. Ensure you do not delete your \`assets/\` folder, as notes reference images stored there.

> [!CAUTION]
> High-risk warning. Always back up your \`lattice_vault.db\` before wiping your device or changing Google Drive accounts.

---

## 2. Interactive Task Checklists
Check off items directly in the live TipTap WYSIWYG editor:

- [x] Create first evergreen Wiki Page
- [x] Test code block 1-click copy in [[Code Snippets & Algorithms Demo]]
- [x] Zoom into character portraits in [[Media & Video Embeds Gallery]]
- [ ] Connect ideas together using \`[[wiki-links]]\`
- [ ] Bind vault folder to Google Drive in Settings

---

## 3. Feature Comparison Table
| PKM Feature | Markdown Syntax | Supported Platforms | Status |
|---|---|---|---|
| **Code Blocks** | \`\`\`language ... \`\`\` | Desktop, Android, Web | ✅ Supported |
| **1-Click Copy** | Built-in button | Desktop, Android, Web | ✅ Supported |
| **Image Lightbox** | \`![alt](url "title")\` | Desktop, Android, Web | ✅ Supported |
| **YouTube Embeds** | \`<iframe src="...">\` | Desktop, Android, Web | ✅ Supported |
| **Callout Boxes** | \`> [!NOTE]\` / \`> [!TIP]\` | Desktop, Android, Web | ✅ Supported |
| **Wiki Links** | \`[[Page Title]]\` | Desktop, Android, Web | ✅ Supported |
| **SQLite Engine** | \`lattice_vault.db\` | Desktop, Android, Web | ✅ Sub-ms Speed |

---

## 4. Bi-directional Wiki Links in Action
- Link to code examples: [[Code Snippets & Algorithms Demo]]
- Link to media gallery: [[Media & Video Embeds Gallery]]
- Link to canonical lore: [[Harry Potter]], [[The Golden Trio]], and [[Horcruxes]]
`,
    tags: ['#Markdown', '#Callouts', '#Checklists', '#Tables', '#Guide'],
    links: [
      'Code Snippets & Algorithms Demo',
      'Media & Video Embeds Gallery',
      'Harry Potter',
      'The Golden Trio',
      'Horcruxes'
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 4,
    updatedAt: Date.now() - 1000 * 60 * 60 * 1,
    isPinned: true
  },
  {
    id: 'wiki-harry-potter',
    type: 'wiki',
    title: 'Harry Potter',
    content: `# Harry Potter

**Harry James Potter** (born 31 July 1980) is an English half-blood wizard, one of the most famous wizards of modern times. He was the only child and son of James and Lily Potter.

![Harry Potter Portrait](https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80 "Harry James Potter - The Boy Who Lived")

> [!NOTE]
> "It is our choices, Harry, that show what we truly are, far more than our abilities."
> — [[Albus Dumbledore]]

---

## Biography & Legacy
* Known as the **"Boy Who Lived"** after surviving the Killing Curse cast by [[Lord Voldemort]].
* Member of **Gryffindor** House and the Seeker for the Gryffindor Quidditch team at [[Hogwarts School of Witchcraft and Wizardry]].
* Along with his closest friends, he formed [[The Golden Trio]].
* Discovered during the Battle of Hogwarts that he unknowingly served as one of the seven [[Horcruxes]].

---

## Patronus Conjuration Algorithm
The Patronus Charm is the most famous and difficult defensive charm. Below is the computational simulation of spell intensity:

\`\`\`python
# Patronus Charm Conjuration Algorithm
def expecto_patronum(wizard_name: str, memory_intensity: float) -> str:
    """Calculates spell efficacy based on happiest memory resonance."""
    if memory_intensity >= 0.85:
        return f"{wizard_name}'s wand emits a blinding silver Stag (Full Corporeal Patronus)!"
    elif memory_intensity >= 0.50:
        return f"{wizard_name}'s wand forms a dense shield of shimmering silver vapor."
    return "A fleeting spark of silver smoke dissipated."

# Test execution
result = expecto_patronum("Harry Potter", memory_intensity=0.98)
print(result)
\`\`\`

> [!TIP]
> A corporeal Patronus is the only known defense capable of repelling Dementors and Lethifolds.

---

## Key Alliances
- Close mentorship under Headmaster [[Albus Dumbledore]].
- Active leader of Dumbledore's Army and member of the [[Order of the Phoenix]].

## Action Items & Goals
- [x] Master the Patronus charm against Dementors
- [ ] Locate and destroy remaining [[Horcruxes]]
- [ ] Protect fellow students during the siege at [[Hogwarts School of Witchcraft and Wizardry]]
`,
    tags: ['#Gryffindor', '#ChosenOne', '#DefenseAgainstTheDarkArts', '#Hogwarts'],
    links: [
      'Lord Voldemort',
      'Hogwarts School of Witchcraft and Wizardry',
      'The Golden Trio',
      'Horcruxes',
      'Albus Dumbledore',
      'Order of the Phoenix'
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 60 * 12,
    isPinned: true
  },
  {
    id: 'wiki-hogwarts',
    type: 'wiki',
    title: 'Hogwarts School of Witchcraft and Wizardry',
    content: `# Hogwarts School of Witchcraft and Wizardry

Founded in the Scottish Highlands around the 10th century by four of the greatest wizards and witches of the age: **Godric Gryffindor**, **Helga Hufflepuff**, **Rowena Ravenclaw**, and **Salazar Slytherin**.

![Hogwarts Castle](https://images.unsplash.com/photo-1547756536-cde3673fa2e5?auto=format&fit=crop&w=1200&q=80 "Hogwarts Castle in the Scottish Highlands")

<iframe src="https://www.youtube.com/embed/26p_7q7k5n8" allowfullscreen></iframe>

> [!TIP]
> Password to Gryffindor Tower changes every fortnight. Current password: *"Caput Draconis"*.

---

## The Sorting Hat Decision Engine
Below is the logic executed by the Sorting Hat during the opening banquet:

\`\`\`typescript
interface WizardCandidate {
  name: string;
  bravery: number;
  wisdom: number;
  loyalty: number;
  ambition: number;
}

type HogwartsHouse = 'Gryffindor' | 'Ravenclaw' | 'Hufflepuff' | 'Slytherin';

function sortStudent(student: WizardCandidate): HogwartsHouse {
  const scores = [
    { house: 'Gryffindor' as const, value: student.bravery },
    { house: 'Ravenclaw' as const, value: student.wisdom },
    { house: 'Hufflepuff' as const, value: student.loyalty },
    { house: 'Slytherin' as const, value: student.ambition },
  ];
  scores.sort((a, b) => b.value - a.value);
  return scores[0].house;
}
\`\`\`

---

## Castle Mysteries & Locations
- **The Great Hall**: Enchanted ceiling mirroring the sky outside.
- **The Room of Requirement**: Appears only when someone is in real need. Known to house Rowena Ravenclaw's lost Diadem, a suspected [[Horcruxes]].
- **Chamber of Secrets**: Created by Salazar Slytherin, containing the Basilisk.
- Guided under the long tenure of Headmaster [[Albus Dumbledore]].

## Notable Students
- Home to [[Harry Potter]], Hermione Granger, Ron Weasley, and formerly Tom Riddle ([[Lord Voldemort]]).
`,
    tags: ['#Hogwarts', '#MagicCastle', '#WizardingEducation'],
    links: [
      'Albus Dumbledore',
      'Harry Potter',
      'Lord Voldemort',
      'Horcruxes'
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    updatedAt: Date.now() - 1000 * 60 * 60 * 20
  },
  {
    id: 'wiki-voldemort',
    type: 'wiki',
    title: 'Lord Voldemort',
    content: `# Lord Voldemort (Tom Marvolo Riddle)

**Tom Marvolo Riddle**, later known as **Lord Voldemort** or "He-Who-Must-Not-Be-Named", was considered the most dangerous Dark Wizard of all time.

## Dark Magic & Immortality
* Obsessed with blood purity and conquering death.
* Split his soul into seven fragments using the darkest known magic: [[Horcruxes]].
* Believed the prophecy foretold that either he or [[Harry Potter]] must die at the hand of the other.

## Key Targets & Nemeses
- Foiled by [[Harry Potter]] multiple times.
- Feared only one wizard: [[Albus Dumbledore]].
- Opposed by the [[Order of the Phoenix]].
`,
    tags: ['#DarkLord', '#Slytherin', '#DarkArts', '#DeathEaters'],
    links: [
      'Horcruxes',
      'Harry Potter',
      'Albus Dumbledore',
      'Order of the Phoenix'
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 96,
    updatedAt: Date.now() - 1000 * 60 * 60 * 18
  },
  {
    id: 'wiki-horcruxes',
    type: 'wiki',
    title: 'Horcruxes',
    content: `# The Seven Horcruxes of Lord Voldemort

A **Horcrux** is an object created using Dark Magic to attain immortality by concealing a fragment of a wizard's soul.

## The Soul Vessels
1. **Tom Riddle's Diary**: Destroyed with a Basilisk fang by [[Harry Potter]] in the Chamber of Secrets.
2. **Marvolo Gaunt's Ring**: Cursed ring destroyed by [[Albus Dumbledore]] using Gryffindor's sword.
3. **Salazar Slytherin's Locket**: Retrieved from the seaside cave and Umbridge; destroyed by Ron Weasley.
4. **Helga Hufflepuff's Cup**: Kept inside the Lestrange vault at Gringotts.
5. **Rowena Ravenclaw's Diadem**: Hidden inside [[Hogwarts School of Witchcraft and Wizardry]] in the Room of Requirement.
6. **Nagini**: Voldemort's giant serpent companion.
7. **The Unintended Soul Fragment**: Resided within [[Harry Potter]] himself.

## Vulnerabilities & Destruction
- Can only be destroyed by substances beyond magical repair:
  - Basilisk venom
  - Fiendfyre
  - Godric Gryffindor's Sword (imbibed with basilisk venom)
`,
    tags: ['#DarkMagic', '#Horcrux', '#SoulVessels', '#Artifacts'],
    links: [
      'Harry Potter',
      'Albus Dumbledore',
      'Hogwarts School of Witchcraft and Wizardry',
      'Lord Voldemort'
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 110,
    updatedAt: Date.now() - 1000 * 60 * 60 * 8
  },
  {
    id: 'wiki-dumbledore',
    type: 'wiki',
    title: 'Albus Dumbledore',
    content: `# Albus Percival Wulfric Brian Dumbledore

Headmaster of [[Hogwarts School of Witchcraft and Wizardry]], Supreme Mugwump of the International Confederation of Wizards, and Chief Warlock of the Wizengamot.

## Key Accomplishments
* Defeated the Dark Wizard Gellert Grindelwald in 1945, winning the allegiance of the Elder Wand.
* Discovered the twelve uses of dragon's blood.
* Founded and led the [[Order of the Phoenix]].
* Mentored [[Harry Potter]] and deduced Voldemort's secret obsession with [[Horcruxes]].

> "Happiness can be found, even in the darkest of times, if one only remembers to turn on the light."
`,
    tags: ['#Headmaster', '#OrderOfThePhoenix', '#ElderWand', '#Hogwarts'],
    links: [
      'Hogwarts School of Witchcraft and Wizardry',
      'Order of the Phoenix',
      'Harry Potter',
      'Horcruxes'
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 120,
    updatedAt: Date.now() - 1000 * 60 * 60 * 35
  },
  {
    id: 'wiki-golden-trio',
    type: 'wiki',
    title: 'The Golden Trio',
    content: `# The Golden Trio

The collective name given to the three Gryffindor students who shaped the Second Wizarding War:
- **[[Harry Potter]]**: The leader and chosen champion.
- **Hermione Granger**: The brains, master of charms, logic, and arithmancy.
- **Ron Weasley**: The loyal strategist, master wizard's chess player, and heart of the group.

## Major Expeditions
- Infiltrated the Ministry of Magic disguised using Polyjuice Potion.
- Escaped Gringotts Wizarding Bank on the back of a Ukrainian Ironbelly dragon.
- Tracked down [[Horcruxes]] across Britain while evading Snatchers.
`,
    tags: ['#Gryffindor', '#GoldenTrio', '#Friendship', '#Hogwarts'],
    links: [
      'Harry Potter',
      'Horcruxes',
      'Hogwarts School of Witchcraft and Wizardry'
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 130,
    updatedAt: Date.now() - 1000 * 60 * 60 * 14
  },
  {
    id: 'wiki-order-phoenix',
    type: 'wiki',
    title: 'Order of the Phoenix',
    content: `# Order of the Phoenix

A secret society founded by [[Albus Dumbledore]] to fight [[Lord Voldemort]] and his Death Eaters during the First and Second Wizarding Wars.

## Headquarters & Operations
- Base: 12 Grimmauld Place, London (ancestral home of Sirius Black).
- Protected by the Fidelius Charm with Dumbledore serving as Secret-Keeper.
- Members include Remus Lupin, Severus Snape, Minerva McGonagall, Alastor Moody, and Kingsley Shacklebolt.
- Key liaison to [[Harry Potter]] and the student defense network at [[Hogwarts School of Witchcraft and Wizardry]].
`,
    tags: ['#OrderOfThePhoenix', '#Resistance', '#Dumbledore', '#GrimmauldPlace'],
    links: [
      'Albus Dumbledore',
      'Lord Voldemort',
      'Harry Potter',
      'Hogwarts School of Witchcraft and Wizardry'
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 140,
    updatedAt: Date.now() - 1000 * 60 * 60 * 16
  },
  {
    id: 'wiki-magical-algorithms',
    type: 'wiki',
    title: 'Magical Algorithms & Formulas',
    content: `# Magical Algorithms & Formulas

Arithmancy and computational charms represent the synthesis of ancient spellcraft and modern algorithmic thinking.

![Marauder's Magical Map](https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80 "Magical Parchment and Ancient Cartography")

> [!NOTE]
> Computational spell design was first pioneered by Arithmancer Bridget Wenlock in the 13th century, who uncovered the magical properties of the number seven.

---

## 1. Wand Core Resonance Query (SQL)
Below is the standard Ministry of Magic database query for matching wizard resonance frequencies:

\`\`\`sql
-- Query: Find high-affinity wands in Ollivanders Vault
SELECT 
    w.wand_id,
    w.wood_type,
    w.core_material,
    w.length_inches,
    w.flexibility
FROM ollivanders_inventory w
JOIN core_resonance r ON w.core_id = r.core_id
WHERE r.magic_frequency >= 94.5 
  AND w.status = 'unclaimed'
ORDER BY r.harmonic_stability DESC
LIMIT 5;
\`\`\`

---

## 2. Invisibility Cloak Wavelength Phase Cancellation (Python)
The Cloak of Death uses a continuous optical phase cancellation algorithm:

\`\`\`python
import math

def phase_cancellation(visible_wavelength_nm: float) -> dict:
    """Calculates optical distortion index for Deathly Hallows cloak."""
    refractive_index = 1.0 - math.sin(visible_wavelength_nm / 100.0)
    stealth_rating = 100.0 if refractive_index <= 0.05 else 75.0
    return {
        "wavelength_nm": visible_wavelength_nm,
        "refraction": round(refractive_index, 4),
        "stealth_rating": f"{stealth_rating}%"
    }

# Simulation for human visible spectrum (550nm green light)
cloak_status = phase_cancellation(550.0)
print(f"Cloak Status: {cloak_status}")
\`\`\`

> [!WARNING]
> Standard disillusionment charms degrade over decades, but true Hallows garments exhibit zero decay rate across centuries.

---

## Connections
- Studied under [[Albus Dumbledore]] and utilized by [[The Golden Trio]].
- Discovered during investigations into [[Horcruxes]] and ancient artifacts at [[Hogwarts School of Witchcraft and Wizardry]].
`,
    tags: ['#Arithmancy', '#Spells', '#Algorithms', '#MagicFormulas', '#Hogwarts'],
    links: [
      'Albus Dumbledore',
      'The Golden Trio',
      'Horcruxes',
      'Hogwarts School of Witchcraft and Wizardry'
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 60,
    updatedAt: Date.now() - 1000 * 60 * 60 * 4
  },

  // ----------------------------------------------------
  // QUICK NOTES (Fleeting scratchpad observations)
  // ----------------------------------------------------
  {
    id: 'quick-diary-discovery',
    type: 'quick',
    title: 'Quick note: Diary in Moaning Myrtle\'s bathroom',
    content: `Found an old black blank diary in the flooded girls' bathroom on the second floor. Name embossed on the cover: "T.M. Riddle, 1943". When I dropped ink on the page, the ink soaked straight through and vanished! Then handwriting appeared: "Hello, Harry Potter. My name is Tom Riddle." Could this be a dark magical artifact? #Horcrux #DarkMagic #Hogwarts`,
    tags: ['#Horcrux', '#DarkMagic', '#Hogwarts'],
    links: ['Horcruxes'],
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    updatedAt: Date.now() - 1000 * 60 * 60 * 5
  },
  {
    id: 'quick-patronus-success',
    type: 'quick',
    title: 'Quick note: Patronus charm breakthrough',
    content: `Practicing the Patronus Charm with Professor Lupin in the Defense classroom. Need a truly powerful happy memory. Remembering leaving the Dursleys and riding the Hogwarts Express produces silver mist, but thinking of my parents and Sirius made a full silver stag burst from my wand! Incantation: Expecto Patronum. #Spells #DefenseAgainstTheDarkArts #HarryPotter`,
    tags: ['#Spells', '#DefenseAgainstTheDarkArts', '#HarryPotter'],
    links: ['Harry Potter'],
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    updatedAt: Date.now() - 1000 * 60 * 60 * 8
  },
  {
    id: 'quick-room-of-requirement',
    type: 'quick',
    title: 'Quick note: Luna\'s tip on Ravenclaw\'s Diadem',
    content: `Luna Lovegood says no living person has seen Rowena Ravenclaw's Diadem in centuries, but the ghost of the Grey Lady (Helena Ravenclaw) might know where it was hidden. If Tom Riddle hid it in the castle, the Room of Requirement—specifically the Room of Hidden Things—is packed with thousands of years of forbidden clutter. Must check there! #Horcrux #Hogwarts #Ravenclaw`,
    tags: ['#Horcrux', '#Hogwarts', '#Ravenclaw'],
    links: ['Horcruxes', 'Hogwarts School of Witchcraft and Wizardry'],
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    updatedAt: Date.now() - 1000 * 60 * 60 * 3
  },
  {
    id: 'quick-marauders-map',
    type: 'quick',
    title: 'Quick note: Marauder\'s Map secret passages',
    content: `Fred and George gave me parchment showing every corridor in [[Hogwarts School of Witchcraft and Wizardry]]. Tap wand: "I solemnly swear that I am up to no good." The One-Eyed Witch statue leads straight to Honeydukes cellar in Hogsmeade. Wipe clear: "Mischief managed." #Artifacts #Hogwarts #Stealth`,
    tags: ['#Artifacts', '#Hogwarts', '#Stealth'],
    links: ['Hogwarts School of Witchcraft and Wizardry'],
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    updatedAt: Date.now() - 1000 * 60 * 60 * 12
  },
  {
    id: 'quick-grimmauld-briefing',
    type: 'quick',
    title: 'Quick note: Moody\'s briefing at Grimmauld Place',
    content: `Mad-Eye Moody warned the [[Order of the Phoenix]] that the Death Eaters are seeking the Department of Mysteries glass orb prophecy. Guard duties are in effect. Tonks and Lupin are taking tonight's shift under the invisibility cloak. #OrderOfThePhoenix #Voldemort #DefenseAgainstTheDarkArts`,
    tags: ['#OrderOfThePhoenix', '#Voldemort', '#DefenseAgainstTheDarkArts'],
    links: ['Order of the Phoenix', 'Lord Voldemort'],
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    updatedAt: Date.now() - 1000 * 60 * 60 * 2
  }
];
