import { useMemo } from 'react'
import rootsContent from '../content/roots.json'
import { pick, shuffle } from '../utils'
import { QuizGame, type QuizQuestion } from './QuizEngine'
import type { GameResult } from '../types'

const FAMILIES = rootsContent.families

export function RootsGame({ onFinish }: { onFinish: (r: GameResult) => void }) {
  const questions = useMemo<QuizQuestion[]>(() => {
    const families = pick(FAMILIES, 3)
    const roots = families.map((f) => f.root)
    const qs: QuizQuestion[] = []
    for (const family of families) {
      for (const word of pick(family.words, 4)) {
        qs.push({
          instruction: 'לאיזו משפחת שורש שייכת המילה?',
          prompt: word,
          promptEmoji: '🗂️',
          options: roots,
          correct: [family.root],
          explanation: `"${word}" שייכת למשפחת השורש ${family.root} — כמו ${family.words
            .filter((w) => w !== word)
            .slice(0, 3)
            .join(', ')}`,
        })
      }
    }
    return shuffle(qs)
  }, [])

  return <QuizGame questions={questions} onFinish={onFinish} columns={3} />
}
