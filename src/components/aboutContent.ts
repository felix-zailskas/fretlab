// Help text for the About modal, as [term, description] pairs.

export const VIEWS = [
  [
    "Note Map",
    "Every note of the key across the whole neck. Pick a chord and its root, 3rd, 5th and 7th light up in their fixed colours against the rest of the scale.",
  ],
  [
    "Scale Positions",
    "The five CAGED positions, switched on and off from the labels above the board. Overlapping positions show where neighbouring boxes connect. Switch between the full scale and its pentatonic, and show context notes outside the selected boxes.",
  ],
  [
    "Chord Shapes",
    "Inversions: triads on four string groups, or seventh chords as Close, Drop 2, Drop 3 or Drop 2&4 voicings. CAGED: the chord's full five shapes, barre included, toggled from the labels above the board.",
  ],
] as const;

export const CONTROLS = [
  ["Key", "Any of the 12 keys, or All notes to see the full chromatic set."],
  [
    "Mode",
    "The 7 modes of the major scale. Chords, positions and the gold characteristic-note ring follow the mode.",
  ],
  [
    "Chord map",
    "Below the board: the key's diatonic chords, the secondary dominants above the chord they resolve to, and chords borrowed from the parallel mode. Click a chord to show it on the board; click it again to clear it. Triads / Sevenths switches every row.",
  ],
  [
    "Highlight",
    "Show or hide each chord-tone role. A greyed-out role says why it's unavailable when you hover or focus it.",
  ],
  [
    "Legend",
    "Lists what each symbol on the board means for the current view. Hover or focus an entry for the full explanation.",
  ],
  ["Strings", "The eye icons left of the board dim individual strings in every view."],
  [
    "Settings",
    "The gear button: ♭ / ♯ spelling for the chromatic notes, theme, tuning (18 presets plus your own custom tunings, saved in this browser) and the visible fret range.",
  ],
] as const;

export const PROGRESSION = [
  [
    "Build",
    "＋ Add chord in the strip under the header opens the chord map; click chords to append them. Drag a chord by ⠿ to reorder it, set its length with − / +, remove it with ×.",
  ],
  [
    "Play",
    "Play runs the progression with an optional metronome Click and Loop. The board follows the current chord; a line fills each chord's chip, with ticks on every beat and taller ones on each bar's 1.",
  ],
  [
    "Preview",
    "Just before a change, rings mark where the next chord's highlighted notes land, fading in as it approaches. Turn roles off in Highlight to aim at one, e.g. only roots. Choose how many beats ahead (1–8) or no preview in the transport.",
  ],
  [
    "Metronome",
    "With no chords, Play is a plain metronome. Progressions are saved by scale degree, so they follow key and mode changes.",
  ],
] as const;

export const SHORTCUTS = [
  ["1 - 7", "Select a diatonic chord (again to clear)"],
  ["t", "Switch the chord map to Triads"],
  ["s", "Switch the chord map to Sevenths"],
  ["Space", "Play / stop"],
] as const;
