import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { api } from '../api'
import type { GameResult, Profile, Progress, RoundSummary } from '../types'
import { gameById } from '../games/meta'
import { RootsGame } from '../games/RootsGame'
import { WordSortGame } from '../games/WordSortGame'
import { ImposterGame } from '../games/ImposterGame'
import { WordChainGame } from '../games/WordChainGame'
import { ConnectivesGame } from '../games/ConnectivesGame'
import { AdjectivesGame } from '../games/AdjectivesGame'

const GAME_COMPONENTS: Record<string, React.ComponentType<{ onFinish: (r: GameResult) => void }>> = {
  roots: RootsGame,
  wordsort: WordSortGame,
  imposter: ImposterGame,
  wordchain: WordChainGame,
  connectives: ConnectivesGame,
  adjectives: AdjectivesGame,
}

interface GameScreenProps {
  profile: Profile
  gameId: string
  onProgressUpdate: (p: Progress) => void
  onExit: () => void
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target <= 0) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

function Summary({
  result,
  summary,
  onReplay,
  onExit,
}: {
  result: GameResult
  summary: RoundSummary
  onReplay: () => void
  onExit: () => void
}) {
  const xpShown = useCountUp(summary.xp_earned)
  const stars = summary.round_stars

  useEffect(() => {
    if (stars >= 2) {
      confetti({ particleCount: stars === 3 ? 160 : 80, spread: 75, origin: { y: 0.6 } })
    }
  }, [stars])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginTop: 24 }}
    >
      {stars > 0 && <div className="stamp pop">פוענח!</div>}

      <div style={{ display: 'flex', gap: 8, fontSize: 52 }}>
        {[1, 2, 3].map((i) => (
          <motion.span
            key={i}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0, opacity: i <= stars ? 1 : 0.2 }}
            transition={{ delay: 0.3 + i * 0.25, type: 'spring', stiffness: 260 }}
          >
            ⭐
          </motion.span>
        ))}
      </div>

      <div className="card" style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>
          ענית נכון על {result.correct} מתוך {result.total} שאלות
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--gold)', marginTop: 8 }}>+{xpShown} ⚡</div>
        <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>
          {summary.rank.emoji} {summary.rank.label}
          {summary.streak > 1 && <> · 🔥 {summary.streak} ימים ברצף</>}
        </div>
        {summary.stars_improved && (
          <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--teal)' }}>שיא חדש בתיק הזה! 🎉</div>
        )}
      </div>

      {summary.new_badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="card"
          style={{ width: '100%', borderInlineStart: '6px solid var(--purple)' }}
        >
          <div style={{ fontWeight: 900, marginBottom: 10 }}>🎖️ תגים חדשים!</div>
          {summary.new_badges.map((b) => (
            <div key={b.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 28 }}>{b.emoji}</span>
              <div>
                <div style={{ fontWeight: 700 }}>{b.name}</div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn-primary" onClick={onReplay}>🔁 עוד סבב</button>
        <button className="btn-ghost" onClick={onExit}>למפת התיקים</button>
      </div>
    </motion.div>
  )
}

export function GameScreen({ profile, gameId, onProgressUpdate, onExit }: GameScreenProps) {
  const meta = gameById(gameId)
  const [round, setRound] = useState(0) // bump to remount the game for a fresh round
  const [result, setResult] = useState<GameResult | null>(null)
  const [summary, setSummary] = useState<RoundSummary | null>(null)
  const [error, setError] = useState('')

  const GameComponent = GAME_COMPONENTS[gameId]

  async function handleFinish(r: GameResult) {
    setResult(r)
    try {
      const resp = await api.submitRound(profile.id, gameId, r.correct, r.total)
      setSummary(resp.summary)
      onProgressUpdate(resp.progress)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירה')
    }
  }

  function replay() {
    setResult(null)
    setSummary(null)
    setError('')
    setRound((n) => n + 1)
  }

  if (!meta || !GameComponent) {
    return (
      <div className="app-shell">
        <p>המשחק לא נמצא</p>
        <button className="btn-ghost" onClick={onExit}>חזרה</button>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button className="btn-ghost" onClick={onExit} aria-label="חזרה">→</button>
        <div style={{ fontWeight: 900, fontSize: 20 }}>
          {meta.emoji} {meta.title}
        </div>
      </div>

      {result === null ? (
        <GameComponent key={round} onFinish={handleFinish} />
      ) : summary !== null ? (
        <Summary result={result} summary={summary} onReplay={replay} onExit={onExit} />
      ) : error ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: 'var(--red-bad)', marginBottom: 10 }}>{error}</div>
          <button className="btn-primary" onClick={() => handleFinish(result)}>נסו שוב</button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', fontSize: 32, marginTop: 40 }}>🔍</div>
      )}
    </div>
  )
}
