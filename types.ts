export enum PixelStyle {
  Bit8 = '8-bit NES (Retro)',
  Bit16 = '16-bit SNES (Vibrant)',
  GameBoy = 'Game Boy (Green Mono)',
  NeoGeo = 'Neo-Geo (Arcade Fighter)',
  Cyberpunk = 'Cyberpunk (Neon)',
  GrimDark = 'Grim Dark (Gothic)',
  Chibi = 'Chibi (Cute/Kawaii)',
  PlayStation = '32-bit (Pre-rendered Style)',
  Vaporwave = 'Vaporwave (Retro-Future)',
  ASCII = 'ASCII Art (Terminal)',
  DitheredMonochrome = 'Dithered Mono (1-bit)',
  Anime = 'Anime Pixel (Modern)'
}

export enum AnimationState {
  Idle = 'Idle',
  Run = 'Run',
  Jump = 'Jump',
  Attack = 'Attack',
  Hurt = 'Hurt',
  Death = 'Death',
  Special = 'Special Attack',
  Charge = 'Charge',
  Spin = 'Spin',
  Ranged = 'Ranged'
}

export interface CharacterAnalysis {
  name: string;
  description: string;
  features: string[];
  colors: string[];
  animationSuggestions: string[];
  bodyType: string;
}

export interface GenerationConfig {
  style: PixelStyle;
  rows: number;
  cols: number;
}

export interface SpriteSheetData {
  imageUrl: string;
  config: GenerationConfig;
}