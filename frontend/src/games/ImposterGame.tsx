import { useMemo } from 'react'
import imposterContent from '../content/imposter.json'
import { pick, shuffle } from '../utils'
import { QuizGame, type QuizQuestion } from './QuizEngine'
import type { GameResult } from '../types'

interface ImposterRound {
  words: string[]
  imposter: string
  reason: string
  wrongReasons: string[]
}

const ROUNDS = imposterContent.rounds as ImposterRound[]

export function ImposterGame({ onFinish }: { onFinish: (r: GameResult) => void }) {
  const questions = useMemo<QuizQuestion[]>(() => {
    const qs: QuizQuestion[] = []
    for (const round of pick(ROUNDS, 5)) {
      qs.push({
        instruction: 'אחת המילים מתחזה ולא שייכת לקבוצה',
        prompt: 'מי המילה המתחזה? 🎭',
        options: shuffle(round.words),
        correct: [round.imposter],
        explanation: round.reason,
      })
      qs.push({
        instruction: `למה "${round.imposter}" היא המתחזה?`,
        prompt: round.imposter,
        promptEmoji: '🔍',
        options: shuffle([round.reason, ...round.wrongReasons]),
        correct: [round.reason],
        explanation: round.reason,
      })
    }
    return qs
  }, [])

  return <QuizGame questions={questions} onFinish={onFinish} columns={1} />
}
