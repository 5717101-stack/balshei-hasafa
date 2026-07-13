import { useMemo } from 'react'
import adjectivesContent from '../content/adjectives.json'
import { pick, shuffle } from '../utils'
import { QuizGame, type QuizQuestion } from './QuizEngine'
import type { GameResult } from '../types'

interface AdjRound {
  noun: string
  emoji: string
  correct: string[]
  wrong: string[]
  explanation: string
}

const ROUNDS = adjectivesContent.rounds as AdjRound[]

export function AdjectivesGame({ onFinish }: { onFinish: (r: GameResult) => void }) {
  const questions = useMemo<QuizQuestion[]>(() => {
    return pick(ROUNDS, 8).map((round) => {
      const correct = pick(round.correct, 1)[0]
      const wrong = pick(round.wrong, 3)
      return {
        instruction: 'איזה שם תואר מתאים?',
        prompt: round.noun,
        promptEmoji: round.emoji,
        options: shuffle([correct, ...wrong]),
        correct: [correct],
        explanation: round.explanation,
      }
    })
  }, [])

  return <QuizGame questions={questions} onFinish={onFinish} columns={2} />
}
