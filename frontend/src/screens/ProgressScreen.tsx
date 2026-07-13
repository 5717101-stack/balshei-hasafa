import { motion } from 'framer-motion'
import type { Profile, Progress } from '../types'
import { GAMES } from '../games/meta'

export function ProgressScreen({
  profile,
  progress,
  onBack,
}: {
  profile: Profile
  progress: Progress
  onBack: () => void
}) {
  const accuracy =
    progress.total_questions > 0 ? Math.round((progress.total_correct / progress.total_questions) * 100) : 0
  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0)

  return (
    <div className="app-shell">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button className="btn-ghost" onClick={onBack} aria-label="חזרה">→</button>
        <div style={{ fontWeight: 900, fontSize: 20 }}>📈 ההתקדמות של {profile.name}</div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{
          background: 'linear-gradient(135deg, #1e2a4a, #33437a)',
          color: '#fff',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 44 }}>{progress.rank.emoji}</div>
        <div style={{ fontWeight: 900, fontSize: 22 }}>{progress.rank.label}</div>
        <div style={{ fontSize: 15, opacity: 0.85, marginTop: 4 }}>⚡ {progress.xp} נקודות חקירה</div>
        {progress.rank.next_label && progress.rank.next_min_xp != null && (
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
            עוד {progress.rank.next_min_xp - progress.xp} נק׳ לדרגת {progress.rank.next_label}
          </div>
        )}
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'סבבים', value: progress.total_rounds, emoji: '🗂️' },
          { label: 'דיוק', value: `${accuracy}%`, emoji: '🎯' },
          { label: 'כוכבים', value: totalStars, emoji: '⭐' },
          { label: 'רצף', value: progress.streak, emoji: '🔥' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card"
            style={{ textAlign: 'center', padding: 12 }}
          >
            <div style={{ fontSize: 22 }}>{stat.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{stat.value}</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <h3 style={{ fontWeight: 900, fontSize: 18, margin: '0 0 10px' }}>כוכבים לפי תיק</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {GAMES.map((game) => {
          const stars = progress.stars[game.id] ?? 0
          return (
            <div key={game.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
              <span style={{ fontSize: 24 }}>{game.emoji}</span>
              <span style={{ fontWeight: 700, flex: 1 }}>{game.title}</span>
              <span style={{ letterSpacing: 2 }}>
                {[1, 2, 3].map((i) => (
                  <span key={i} style={{ opacity: i <= stars ? 1 : 0.2 }}>⭐</span>
                ))}
              </span>
            </div>
          )
        })}
      </div>

      <h3 style={{ fontWeight: 900, fontSize: 18, margin: '0 0 10px' }}>
        🎖️ התגים שלי ({progress.badges.length})
      </h3>
      {progress.badges.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', opacity: 0.7 }}>
          עוד אין תגים — פתרו תיקים כדי לזכות בהם!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {progress.badges.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="card"
              style={{ textAlign: 'center', padding: 12 }}
            >
              <div style={{ fontSize: 30 }}>{b.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: 14, marginTop: 4 }}>{b.name}</div>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{b.desc}</div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
