const TOXIC_WORDS: string[] = [
  'anjing', 'babi', 'bangsat', 'bajingan', 'brengsek', 'kampret',
  'kontol', 'memek', 'ngentot', 'pepek', 'perek', 'sialan', 'tai',
  'tolol', 'bodoh', 'goblok', 'idiot', 'bego', 'ngawur', 'sarap',
  'gila', 'sinting', 'edan', 'setan', 'iblis', 'lonte', 'sundal',
  'pelacur', 'monyet', 'keparat', 'jancok', 'asu', 'cukimai',
  'fuck', 'shit', 'asshole', 'bastard', 'bitch', 'damn', 'dick',
  'motherfucker', 'pussy', 'slut', 'whore', 'cunt', 'twat',
  'wanker', 'prick', 'douche', 'retard', 'moron',
  'anjir', 'ngentod', 'ngntd', 'mmk', 'kontl', 'bgst', 'bangsatt',
];

function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/4/g, 'a')
    .replace(/@/g, 'a')
    .replace(/3/g, 'e')
    .replace(/1/g, 'i')
    .replace(/\$/g, 's')
    .replace(/5/g, 's')
    .replace(/[^a-z\s]/g, '');
}

export function isToxic(text: string): boolean {
  const normalizedText = normalizeWord(text);
  const words = normalizedText.split(/\s+/);

  for (const word of words) {
    const normalizedWord = normalizeWord(word);
    for (const toxic of TOXIC_WORDS) {
      const normalizedToxic = normalizeWord(toxic);
      if (normalizedWord === normalizedToxic) {
        return true;
      }
    }
  }

  return false;
}
