// Highest fret rendered by the Fretboard. Single source of truth — every view
// and the renderer itself must derive their fret loop bounds and defaults from
// this constant. Bumping it changes the visible range across the entire app.
export const FRET_COUNT = 15
