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
    label: 'Studio Card',
    line: 'Your take framed in a clean studio card, with a storyboard beside it and lime serif hero words.',
    ref: 'Template 1 by Vignesh B S, after Edita Visuals, instagram.com/p/DerbE18txNg',
    swatch: ['#efefee', '#cbe65e', '#de7e59'],
  },
  {
    id: 'creator-mix',
    label: 'Creator Mix',
    line: 'Twenty-two effects from two real reels: glowing words, colour fields, a picture window, a film strip.',
    ref: 'Template 2 by Vignesh B S, after Tahrima, instagram.com/p/DaFaIEGIFvx, and a real estate reel, DfFQiNCT8Lj',
    // purple field, red tint, paper (palette.purple/red/paper): its cyan and magenta on navy would read as neon on black
    swatch: ['#4b1fa8', '#e5333d', '#f1ece2'],
  },
];

export const studioHref = (style: string) => `/studio?style=${encodeURIComponent(style)}`;
