import { motion } from 'framer-motion'
import type { Profile, Progress } from '../types'
import { GAMES } from '../games/meta'

function Stars({ count }: { count: number }) {
  return (
    <span style={{ fontSize: 16, letterSpacing: 2 }}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ opacity: i <= count ? 1 : 0.25 }}>⭐</span>
      ))}
    </span>
  )
}

interface CaseMapProps {
  profile: Profile
  progress: Progress | null
  onPlay: (gameId: string) => void
  onProgress: () => void
  onBoard: () => void
  onSwitchProfile: () => void
}

export function CaseMap({ profile, progress, onPlay, onProgress, onBoard, onSwitchProfile }: CaseMapProps) {
  const rank = progress?.rank
  const xp = progress?.xp ?? 0
  const xpIntoRank = rank ? xp - rank.min_xp : 0
  const xpRankSpan = rank?.next_min_xp != null ? rank.next_min_xp - rank.min_xp : null
  const xpPct = xpRankSpan ? Math.min(100, (xpIntoRank / xpRankSpan) * 100) : 100

  return (
    <div className="app-shell">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{
          background: 'linear-gradient(135deg, #1e2a4a, #33437a)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 40 }}>{profile.avatar}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>{profile.name}</div>
            {rank && (
              <div style={{ fontSize: 14, opacity: 0.85 }}>
                {rank.emoji} {rank.label}
              </div>
            )}
          </div>
          {progress && progress.streak > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26 }}>🔥</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {progress.streak} {progress.streak === 1 ? 'יום' : 'ימים'}
              </div>
            </div>
          )}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ fontWeight: 700 }}>⚡ {xp} נק׳ חקירה</span>
            {rank?.next_label && rank.next_min_xp != null && (
              <span style={{ opacity: 0.8 }}>
                עוד {rank.next_min_xp - xp} נק׳ ל{rank.next_label}
              </span>
            )}
          </div>
          <div className="xp-bar">
            <div style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </motion.div>

      <h2 className="screen-title" style={{ marginTop: 20 }}>תיקי החקירה 🗂️</h2>
      <p className="screen-subtitle">בחרו תיק ופענחו אותו — אספו כוכבים ונקודות!</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {GAMES.map((game, i) => {
          const stars = progress?.stars?.[game.id] ?? 0
          return (
            <motion.button
              key={game.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileTap={{ scale: 0.95 }}
              className="card"
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                borderTop: `6px solid ${game.color}`,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                alignItems: 'center',
              }}
              onClick={() => onPlay(game.id)}
            >
              <div style={{ fontSize: 38 }}>{game.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{game.title}</div>
              <div style={{ fontSize: 12.5, opacity: 0.65, lineHeight: 1.35, minHeight: 34 }}>{game.desc}</div>
              <Stars count={stars} />
            </motion.button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn-ghost" onClick={onProgress}>📈 ההתקדמות שלי</button>
        <button className="btn-ghost" onClick={onBoard}>🏆 לוח הבלשים</button>
        <button className="btn-ghost" onClick={onSwitchProfile}>👥 החלפת בלש</button>
      </div>
    </div>
  )
}
