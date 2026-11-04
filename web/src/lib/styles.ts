/**
 * The two render engines Edit Easy cuts in (engine/templates/card-studio.json, engine/templates/creator-mix.json). A new
 * upload is given one of them in turn; after it renders, the creator changes it by prompt (docs/EDIT-API.md). The id is
 * the template's name and the value the studio takes in `/studio?style=<id>`. Order follows content.ts `memory.chips`.
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
    ref: 'Template 1 by Vignesh B S, after Edita Visuals, instagram.com/p/DerbE18txNg',
    swatch: ['#efefee', '#cbe65e', '#de7e59'],
  },
  {
    id: 'creator-mix',
    label: 'Creator Mix',
    line: 'Two reels in one: colour-world backgrounds, whip and shatter cuts, number posters, photo strips, and a Before/After with Edited by Meta.',
    ref: 'Template 2 by Vignesh B S, after Tahrima, instagram.com/reel/DaFaIEGIFvx, plus a motion reel',
    // purple field, red tint, paper (palette.purple/red/paper): near-black and pure white would break the palette rule
    swatch: ['#4b1fa8', '#e5333d', '#f1ece2'],
  },
];

export const studioHref = (style: string) => `/studio?style=${encodeURIComponent(style)}`;
