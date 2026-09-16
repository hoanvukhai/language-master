import type { Word } from '../../../../../types';

import lesson01_10 from './lesson01_10.json';
import lesson11_20 from './lesson11_20.json';
import lesson21_30 from './lesson21_30.json';
import lesson31_40 from './lesson31_40.json';
import lesson41_50 from './lesson41_50.json';
import lesson51_60 from './lesson51_60.json';
import lesson61_70 from './lesson61_70.json';
import lesson71_80 from './lesson71_80.json';
import lesson81_93 from './lesson81_93.json';

export const vocabularyRikiN2: Word[] = [
  ...(lesson01_10 as any),
  ...(lesson11_20 as any),
  ...(lesson21_30 as any),
  ...(lesson31_40 as any),
  ...(lesson41_50 as any),
  ...(lesson51_60 as any),
  ...(lesson61_70 as any),
  ...(lesson71_80 as any),
  ...(lesson81_93 as any)
] as Word[];
