import { useMemo } from 'react'
import wordsortContent from '../content/wordsort.json'
import { pick } from '../utils'
import { QuizGame, type QuizQuestion } from './QuizEngine'
import type { GameResult } from '../types'

const TYPES = wordsortContent.types as Record<string, { label: string; hint: string; emoji: string }>
const WORDS = wordsortContent.words as { word: string; type: string }[]

export function WordSortGame({ onFinish }: { onFinish: (r: GameResult) => void }) {
  const questions = useMemo<QuizQuestion[]>(() => {
    const typeLabels = Object.values(TYPES).map((t) => `${t.emoji} ${t.label}`)
    return pick(WORDS, 10).map((entry) => {
      const t = TYPES[entry.type]
      return {
        instruction: 'איזה סוג מילה אני?',
        prompt: entry.word,
        options: typeLabels,
        correct: [`${t.emoji} ${t.label}`],
        explanation: `"${entry.word}" היא ${t.label} — ${t.hint}`,
      }
    })
  }, [])

  return <QuizGame questions={questions} onFinish={onFinish} columns={1} />
}
