/**
 * The two templates Moovi cuts in (Card Studio, Creator Mix), copied from engine/styles/*.json (label, line, ref, swatch). The id is the
 * file's name and the value the studio takes in `/studio?style=<id>`. Order follows content.ts `memory.chips`.
 */
export interface StyleCard {
  id: 'card-studio' | 'creator-mix';
  label: string;
  line: string;
  ref: string;
  swatch: readonly [string, string, string];
}

export const STYLES: readonly StyleCard[] = [
  {
    id: 'card-studio',
    label: 'Card Studio',
    line: 'Your take framed in a clean studio card, with a storyboard beside it and lime serif hero words.',
    ref: 'Edita Visuals, instagram.com/p/DerbE18txNg',
    swatch: ['#efefee', '#cbe65e', '#de7e59'],
  },
  {
    id: 'creator-mix',
    label: 'Creator Mix',
    line: 'Two reels in one: colour-world backgrounds, whip and shatter cuts, number posters, photo strips, and a Before/After with Edited by Meta.',
    ref: 'Tahrima, instagram.com/reel/DaFaIEGIFvx, plus a motion reel',
    swatch: ['#e5333d', '#14060a', '#ffffff'],
  },
];

export const studioHref = (style: string) => `/studio?style=${encodeURIComponent(style)}`;
