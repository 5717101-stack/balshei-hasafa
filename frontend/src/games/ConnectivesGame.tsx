import { useMemo } from 'react'
import connectivesContent from '../content/connectives.json'
import { pick, shuffle } from '../utils'
import { QuizGame, type QuizQuestion } from './QuizEngine'
import type { GameResult } from '../types'

interface Sentence {
  text: string
  accepted: string[]
  explanation: string
}

const BANK = connectivesContent.bank as string[]
const SENTENCES = connectivesContent.sentences as Sentence[]

export function ConnectivesGame({ onFinish }: { onFinish: (r: GameResult) => void }) {
  const questions = useMemo<QuizQuestion[]>(() => {
    return pick(SENTENCES, 8).map((s) => {
      // 6 options: all accepted answers + random distractors from the bank
      const distractors = shuffle(BANK.filter((w) => !s.accepted.includes(w))).slice(
        0,
        Math.max(0, 6 - s.accepted.length),
      )
      return {
        instruction: 'בחרו את מילת הקישור המתאימה',
        prompt: s.text.replace('____', '_____'),
        promptEmoji: '🧩',
        options: shuffle([...s.accepted, ...distractors]),
        correct: s.accepted,
        explanation: s.explanation,
      }
    })
  }, [])

  return <QuizGame questions={questions} onFinish={onFinish} columns={2} />
}
