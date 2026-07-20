import type { Language } from '@/i18n/types';

const SPORT_NAME_TRANSLATIONS: Record<string, string> = {
  Futebol: 'Football',
  Basquetebol: 'Basketball',
  Voleibol: 'Volleyball',
  Ténis: 'Tennis',
  Padel: 'Padel',
  Corrida: 'Running',
  Ciclismo: 'Cycling',
  Natação: 'Swimming',
};

export function translateSportName(sportName: string | undefined, language: Language): string {
  if (!sportName) return '';
  if (language === 'pt') return sportName;

  return SPORT_NAME_TRANSLATIONS[sportName] ?? sportName;
}
