import { Note } from '../types';

export const HARRY_POTTER_SEED_NOTES: Note[] = [
  {
    id: 'wiki-harry-potter',
    type: 'wiki',
    title: 'Harry Potter',
    content: `# Harry Potter

**Harry James Potter** (born 31 July 1980) is an English half-blood wizard, one of the most famous wizards of modern times. He was the only child and son of James and Lily Potter.

## Biography & Legacy
* Known as the **"Boy Who Lived"** after surviving the Killing Curse cast by [[Lord Voldemort]].
* Member of **Gryffindor** House and the Seeker for the Gryffindor Quidditch team at [[Hogwarts School of Witchcraft and Wizardry]].
* Along with his closest friends, he formed [[The Golden Trio]].
* Discovered during the Battle of Hogwarts that he unknowingly served as one of the seven [[Horcruxes]].

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
    summary: {
      tldr: [
        'The Boy Who Lived and sole survivor of the Avada Kedavra curse.',
        'Core protagonist leading the resistance against Voldemort.',
        'Unwittingly acted as the seventh Horcrux due to the events at Godric\'s Hollow.'
      ],
      actionItems: [
        'Locate and destroy remaining Horcruxes',
        'Protect fellow students at Hogwarts'
      ],
      tags: ['#Gryffindor', '#ChosenOne', '#HorcruxHunt'],
      keyEntities: ['Voldemort', 'Dumbledore', 'Hogwarts', 'Gryffindor'],
      generatedAt: Date.now() - 1000 * 60 * 60 * 24,
      model: 'Gemini 2.5 Flash'
    },
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
    summary: {
      tldr: [
        'Ancient premier magical institution founded in the 10th century.',
        'Contains crucial secret chambers including the Room of Requirement.',
        'Served as the final battleground in the Second Wizarding War.'
      ],
      actionItems: [
        'Guard castle wards and defensive enchantments',
        'Investigate hidden relics inside the Room of Requirement'
      ],
      tags: ['#Hogwarts', '#AncientMagic', '#Dumbledore'],
      keyEntities: ['Dumbledore', 'Gryffindor', 'Slytherin', 'Highlands'],
      generatedAt: Date.now() - 1000 * 60 * 60 * 30,
      model: 'Gemini 2.5 Flash'
    },
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
    summary: {
      tldr: [
        'Heir of Slytherin and commander of the Death Eaters.',
        'Sought immortality through the creation of multiple Horcruxes.',
        'Feared only Albus Dumbledore throughout his reign.'
      ],
      actionItems: [
        'Identify all soul vessels and sever his anchors to life'
      ],
      tags: ['#DarkLord', '#Horcrux', '#DeathEaters'],
      keyEntities: ['Riddle', 'Potter', 'Dumbledore', 'Slytherin'],
      generatedAt: Date.now() - 1000 * 60 * 60 * 22,
      model: 'Gemini 2.5 Flash'
    },
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
    summary: {
      tldr: [
        'Seven receptacles containing fragments of Voldemort’s fractured soul.',
        'Impervious to normal damage; require Basilisk venom or Fiendfyre.',
        'Systematic destruction is the only pathway to Voldemort\'s mortality.'
      ],
      actionItems: [
        'Extract Helga Hufflepuff\'s Cup from Gringotts',
        'Search the Room of Requirement for the Diadem',
        'Kill Nagini to dismantle the final tether'
      ],
      tags: ['#Horcrux', '#DarkMagic', '#SoulVessels'],
      keyEntities: ['Voldemort', 'Basilisk', 'Gryffindor', 'Ravenclaw'],
      generatedAt: Date.now() - 1000 * 60 * 60 * 15,
      model: 'Gemini 2.5 Flash'
    },
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
    summary: {
      tldr: [
        'Legendary Headmaster of Hogwarts and founder of the Order of the Phoenix.',
        'Bearer of the Elder Wand and mastermind behind the plan to defeat Voldemort.',
        'Understood the magical sacrifice that protected Harry Potter.'
      ],
      actionItems: [
        'Instruct Harry regarding the memory traces in the Pensieve',
        'Secure the defense of Hogwarts against Death Eater infiltration'
      ],
      tags: ['#Headmaster', '#Dumbledore', '#OrderOfThePhoenix'],
      keyEntities: ['Grindelwald', 'Potter', 'Hogwarts', 'ElderWand'],
      generatedAt: Date.now() - 1000 * 60 * 60 * 40,
      model: 'Gemini 2.5 Flash'
    },
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
    summary: {
      tldr: [
        'Harry Potter, Hermione Granger, and Ron Weasley.',
        'Inseparable team responsible for uncovering and destroying soul anchors.',
        'Demonstrated peerless loyalty and courage throughout the Second Wizarding War.'
      ],
      actionItems: [
        'Maintain Polyjuice potion supplies',
        'Prepare protective spells around camp: Protego Totalum, Muffliato'
      ],
      tags: ['#GoldenTrio', '#Gryffindor', '#Resistance'],
      keyEntities: ['Harry', 'Hermione', 'Ron', 'Gringotts'],
      generatedAt: Date.now() - 1000 * 60 * 60 * 25,
      model: 'Gemini 2.5 Flash'
    },
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
    summary: {
      tldr: [
        'Clandestine resistance alliance created by Albus Dumbledore.',
        'Headquartered at 12 Grimmauld Place under the Fidelius Charm.',
        'Guarded the Department of Mysteries prophecy and opposed Death Eaters.'
      ],
      actionItems: [
        'Maintain guard rotations over the Hall of Prophecy',
        'Keep communications secure via Patronus messaging'
      ],
      tags: ['#OrderOfThePhoenix', '#Resistance', '#GrimmauldPlace'],
      keyEntities: ['Dumbledore', 'Voldemort', 'Black', 'Moody'],
      generatedAt: Date.now() - 1000 * 60 * 60 * 16,
      model: 'Gemini 2.5 Flash'
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 140,
    updatedAt: Date.now() - 1000 * 60 * 60 * 16
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
