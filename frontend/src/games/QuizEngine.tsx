import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GameResult } from '../types'

export interface QuizQuestion {
  /** Small line above the main prompt, e.g. the game instruction */
  instruction?: string
  /** The big prompt (word / sentence). */
  prompt: string
  /** Optional emoji rendered next to the prompt */
  promptEmoji?: string
  options: string[]
  /** Options considered correct (usually one, connectives may have several) */
  correct: string[]
  /** Shown after answering — always, right or wrong */
  explanation: string
}

interface QuizGameProps {
  questions: QuizQuestion[]
  onFinish: (result: GameResult) => void
  /** Number of columns for the options grid (default 1) */
  columns?: number
}

/**
 * Generic one-question-at-a-time quiz with immediate explanatory feedback.
 * Powers wordsort / imposter / connectives / adjectives / roots.
 */
export function QuizGame({ questions, onFinish, columns = 1 }: QuizGameProps) {
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)

  const question = questions[index]
  const answered = chosen !== null
  const wasCorrect = answered && question.correct.includes(chosen)

  const gridStyle = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: 12,
    }),
    [columns],
  )

  function choose(option: string) {
    if (answered) return
    setChosen(option)
    if (question.correct.includes(option)) setCorrectCount((c) => c + 1)
  }

  function next() {
    if (index + 1 >= questions.length) {
      onFinish({ correct: correctCount, total: questions.length })
    } else {
      setIndex(index + 1)
      setChosen(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="round-progress">
          <div style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, opacity: 0.7, whiteSpace: 'nowrap' }}>
          {index + 1} / {questions.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.25 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}
        >
          <div className="card" style={{ textAlign: 'center' }}>
            {question.instruction && (
              <div style={{ fontSize: 14, opacity: 0.65, fontWeight: 600, marginBottom: 8 }}>
                {question.instruction}
              </div>
            )}
            <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.4 }}>
              {question.promptEmoji && <span style={{ marginInlineEnd: 10 }}>{question.promptEmoji}</span>}
              {question.prompt}
            </div>
          </div>

          <div style={gridStyle}>
            {question.options.map((option) => {
              let cls = 'option-btn'
              if (answered) {
                if (question.correct.includes(option)) cls += ' correct'
                else if (option === chosen) cls += ' wrong'
                else cls += ' dim'
              }
              return (
                <button key={option} className={cls} onClick={() => choose(option)}>
                  {option}
                </button>
              )
            })}
          </div>

          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="card"
                style={{
                  borderInlineStart: `6px solid ${wasCorrect ? 'var(--green-ok)' : 'var(--red-bad)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 18, color: wasCorrect ? 'var(--green-ok)' : 'var(--red-bad)' }}>
                  {wasCorrect ? 'מעולה, פענחת! 🎉' : 'לא בדיוק... 🔍'}
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.5 }}>{question.explanation}</div>
                <button className="btn-primary" onClick={next} style={{ alignSelf: 'flex-start' }}>
                  {index + 1 >= questions.length ? 'סיום התיק' : 'לרמז הבא ←'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
