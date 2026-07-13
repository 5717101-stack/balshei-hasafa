import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api'
import type { LeaderboardRow } from '../types'

const MEDALS = ['🥇', '🥈', '🥉']

export function LeaderboardScreen({ myId, onBack }: { myId: string; onBack: () => void }) {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .leaderboard(myId)
      .then(({ leaderboard }) => setRows(leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [myId])

  return (
    <div className="app-shell">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button className="btn-ghost" onClick={onBack} aria-label="חזרה">→</button>
        <div style={{ fontWeight: 900, fontSize: 20 }}>🏆 לוח הבלשים</div>
      </div>
      <p style={{ fontSize: 13, opacity: 0.65, margin: '0 0 14px' }}>
        🤫 כל שאר הבלשים חשאיים — רואים רק את המיקום שלך ביניהם
      </p>

      {loading && <div style={{ textAlign: 'center', fontSize: 32 }}>🔍</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row, i) => (
          <motion.div
            key={row.id ?? `anon-${i}`}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 18px',
              border: row.is_me ? '3px solid var(--gold)' : '3px solid transparent',
              opacity: row.is_me ? 1 : 0.75,
            }}
          >
            <div style={{ fontSize: 26, width: 34, textAlign: 'center' }}>{MEDALS[i] ?? `${i + 1}`}</div>
            <div style={{ fontSize: 32 }}>{row.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>
                {row.name}
                {row.is_me && <span style={{ fontSize: 13, opacity: 0.6 }}> (אני)</span>}
              </div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                {row.rank.emoji} {row.rank.label}
              </div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div style={{ fontWeight: 900, color: 'var(--gold)' }}>⚡ {row.xp}</div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                ⭐ {row.total_stars} · 🎖️ {row.badges_count}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {!loading && rows.length === 0 && (
        <div className="card" style={{ textAlign: 'center', opacity: 0.7 }}>עוד אין בלשים בלוח</div>
      )}
    </div>
  )
}
