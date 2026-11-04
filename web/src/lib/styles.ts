/**
 * The five styles Moovi can cut in, copied from engine/styles/*.json (label, line, ref, swatch). The id is the
 * file's name and the value the studio takes in `/studio?style=<id>`. Order follows content.ts `memory.chips`.
 */
export interface StyleCard {
  id: 'card-studio' | 'kinetic-brand' | 'creator-studio' | 'clean-ui' | 'desk-doc';
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
    ref: 'Edita Visuals, instagram.com/p/DerbE18txNg',
    swatch: ['#efefee', '#cbe65e', '#de7e59'],
  },
  {
    id: 'kinetic-brand',
    label: 'Kinetic Brand',
    line: 'One static take turned into a brand ad: huge words behind you, white, gold and one red.',
    ref: 'Hossein (BONOMI ad), instagram.com/p/DduLd-RRDxa',
    swatch: ['#14110f', '#e7b264', '#e5484d'],
  },
  {
    id: 'creator-studio',
    label: 'Creator Studio',
    line: 'A colour-field studio: your wall becomes a violet ground, chapter cards and glowing hero words.',
    ref: 'Tahrima, instagram.com/p/DaFaIEGIFvx',
    swatch: ['#2a1f5c', '#b9a6ff', '#ffffff'],
  },
  {
    id: 'clean-ui',
    label: 'Clean UI',
    line: 'Apple-clean interface cards act out every claim; your take shrinks into a card and comes back.',
    ref: 'Daniel ($10 vs $80), instagram.com/p/DXjyhHEkwOV',
    swatch: ['#ffffff', '#1d1d1f', '#f27c3a'],
  },
  {
    id: 'desk-doc',
    label: 'Desk Doc',
    line: 'Warm documentary: yellow glowing hero words, photos that prove the point, numbers made huge.',
    ref: 'Mahdi (interview), instagram.com/p/DdM89KRMPBJ',
    swatch: ['#2b2622', '#f6d846', '#f7f5f0'],
  },
];

export const studioHref = (style: string) => `/studio?style=${encodeURIComponent(style)}`;
