export interface GameMeta {
  id: string
  title: string
  emoji: string
  color: string
  desc: string
}

export const GAMES: GameMeta[] = [
  { id: 'roots', title: 'בלש השורשים', emoji: '🗂️', color: '#f5a623', desc: 'מיינו מילים למשפחות לפי השורש' },
  { id: 'wordsort', title: 'מי אני?', emoji: '🕵️', color: '#4f8ef7', desc: 'פועל, שם עצם או שם תואר?' },
  { id: 'imposter', title: 'המילה המתחזה', emoji: '🎭', color: '#e85d75', desc: 'מצאו את המילה שלא שייכת לקבוצה' },
  { id: 'wordchain', title: 'שרשרת מילים', emoji: '🔗', color: '#2fbf8f', desc: 'אספו את כל המילים ממשפחת השורש' },
  { id: 'connectives', title: 'מילות קישור', emoji: '🧩', color: '#9b5ef7', desc: 'השלימו את מילת הקישור המתאימה' },
  { id: 'adjectives', title: 'התואר המתאים', emoji: '🎨', color: '#f76f4f', desc: 'התאימו שם תואר לשם העצם' },
]

export const gameById = (id: string) => GAMES.find((g) => g.id === id)
