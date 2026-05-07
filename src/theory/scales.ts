// Step pattern between consecutive notes of the major scale: 1→2, 2→3, …, 7→1(octave).
export type ScaleStep = "whole" | "half";

export type ChordQuality = "maj7" | "m7" | "7" | "m7b5";

export type DiatonicChord = {
  degree: number; // 1-7
  romanNumeral: string; // 'Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7'
  quality: ChordQuality;
  symbol: string; // 'Cmaj7', 'Dm7', 'G7', 'Bm7b5'
  notes: [string, string, string, string];
};

export type TriadQuality = "maj" | "min" | "dim";

export type DiatonicTriad = {
  degree: number; // 1-7
  romanNumeral: string; // 'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'
  quality: TriadQuality;
  symbol: string; // 'C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°'
  notes: [string, string, string];
};
