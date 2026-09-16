import verbs from './jlpt/conjugation/verbs.json';
import adjectives from './jlpt/conjugation/adjectives.json';
import nouns from './jlpt/conjugation/nouns.json';
import { vocabularyN3 } from './jlpt/n3/vocabularyN3';
import type { Word } from '../types';

// Ép kiểu một lần duy nhất ở đây
export const vocabulary: Word[] = [...verbs, ...adjectives, ...nouns, ...vocabularyN3] as unknown as Word[];