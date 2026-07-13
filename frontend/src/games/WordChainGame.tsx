import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import wordchainContent from '../content/wordchain.json'
import { pick, shuffle } from '../utils'
import type { GameResult } from '../types'

interface ChainRound {
  root: string
  family: string[]
  distractors: string[]
}

const ROUNDS = wordchainContent.rounds as ChainRound[]
const BOARDS_PER_GAME = 2

export function WordChainGame({ onFinish }: { onFinish: (r: GameResult) => void }) {
  const boards = useMemo(() => {
    return pick(ROUNDS, BOARDS_PER_GAME).map((round) => ({
      ...round,
      words: shuffle([...round.family, ...round.distractors]),
    }))
  }, [])

  const [boardIndex, setBoardIndex] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [checked, setChecked] = useState(false)
  const [correctSoFar, setCorrectSoFar] = useState(0)

  const board = boards[boardIndex]
  const familySet = useMemo(() => new Set(board.family), [board])
  const totalPerBoard = board.words.length
  const total = boards.reduce((sum, b) => sum + b.words.length, 0)

  function toggle(word: string) {
    if (checked) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(word)) next.delete(word)
      else next.add(word)
      return next
    })
  }

  function boardScore(): number {
    let score = 0
    for (const word of board.words) {
      const inFamily = familySet.has(word)
      const isSelected = selected.has(word)
      if (inFamily === isSelected) score++
    }
    return score
  }

  function check() {
    setChecked(true)
    setCorrectSoFar((c) => c + boardScore())
  }

  function next() {
    if (boardIndex + 1 >= boards.length) {
      onFinish({ correct: correctSoFar, total })
    } else {
      setBoardIndex(boardIndex + 1)
      setSelected(new Set())
      setChecked(false)
    }
  }

  const score = checked ? boardScore() : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="round-progress">
          <div style={{ width: `${(boardIndex / boards.length) * 100}%` }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, opacity: 0.7, whiteSpace: 'nowrap' }}>
          תיק {boardIndex + 1} / {boards.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={boardIndex}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.25 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}
        >
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, opacity: 0.65, fontWeight: 600, marginBottom: 8 }}>
              סמנו את כל המילים ממשפחת השורש — היזהרו ממילים מתחזות!
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 2 }}>🔗 {board.root}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {board.words.map((word) => {
              let cls = 'option-btn'
              if (!checked) {
                if (selected.has(word)) cls += ' selected'
              } else {
                const inFamily = familySet.has(word)
                const isSelected = selected.has(word)
                if (inFamily && isSelected) cls += ' correct'
                else if (!inFamily && isSelected) cls += ' wrong'
                else if (inFamily && !isSelected) cls += ' wrong'
                else cls += ' dim'
              }
              return (
                <button key={word} className={cls} onClick={() => toggle(word)}>
                  {word}
                  {checked && familySet.has(word) && ' ✓'}
                </button>
              )
            })}
          </div>

          {!checked ? (
            <button
              className="btn-primary"
              style={{ alignSelf: 'center' }}
              disabled={selected.size === 0}
              onClick={check}
            >
              🔍 בדקו את החקירה
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
              style={{
                borderInlineStart: `6px solid ${score === totalPerBoard ? 'var(--green-ok)' : 'var(--gold)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {score === totalPerBoard ? 'חקירה מושלמת! 🎉' : `זיהית נכון ${score} מתוך ${totalPerBoard} מילים`}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.5 }}>
                משפחת {board.root}: {board.family.join(', ')}
              </div>
              <button className="btn-primary" onClick={next} style={{ alignSelf: 'flex-start' }}>
                {boardIndex + 1 >= boards.length ? 'סיום התיק' : 'לשורש הבא ←'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
