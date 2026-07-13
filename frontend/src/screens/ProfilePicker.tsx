import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api'
import { getDeviceId } from '../utils'
import type { Profile } from '../types'

const AVATARS = ['🕵️', '🕵️‍♀️', '🦊', '🐼', '🦁', '🐸', '🦄', '🐯', '🦉', '🐙', '🐳', '🚀']

type Mode = 'list' | 'create' | 'link'

export function ProfilePicker({ onSelect }: { onSelect: (p: Profile) => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [mode, setMode] = useState<Mode>('list')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [linkCode, setLinkCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .listProfiles(getDeviceId())
      .then(({ profiles }) => setProfiles(profiles))
      .catch(() => setError('לא הצלחנו להתחבר לשרת'))
      .finally(() => setLoading(false))
  }, [])

  async function create() {
    setError('')
    try {
      const profile = await api.createProfile(name.trim(), avatar, getDeviceId())
      onSelect(profile)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    }
  }

  async function link() {
    setError('')
    try {
      const profile = await api.linkProfile(linkCode.trim(), getDeviceId())
      onSelect(profile)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontFamily: 'inherit',
    fontSize: 18,
    fontWeight: 600,
    padding: '12px 16px',
    borderRadius: 14,
    border: '2px solid rgba(30,42,74,0.15)',
    outline: 'none',
    marginBottom: 14,
  }

  return (
    <div className="app-shell">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginTop: 24 }}>
        <div style={{ fontSize: 64 }}>🕵️</div>
        <h1 className="screen-title" style={{ fontSize: 34 }}>בלשי השפה</h1>
        <p className="screen-subtitle">מי חוקר היום?</p>
      </motion.div>

      {loading && <div style={{ textAlign: 'center', fontSize: 32 }}>🔍</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
        {profiles.map((p, i) => (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            whileTap={{ scale: 0.94 }}
            className="card"
            style={{ textAlign: 'center', cursor: 'pointer' }}
            onClick={() => onSelect(p)}
          >
            <div style={{ fontSize: 44 }}>{p.avatar}</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>{p.name}</div>
          </motion.button>
        ))}

        {mode === 'list' && !loading && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: profiles.length * 0.06 }}
            whileTap={{ scale: 0.94 }}
            className="card"
            style={{ textAlign: 'center', cursor: 'pointer', border: '3px dashed rgba(30,42,74,0.25)', boxShadow: 'none', background: 'transparent' }}
            onClick={() => setMode('create')}
          >
            <div style={{ fontSize: 44 }}>➕</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 6, opacity: 0.7 }}>בלש חדש</div>
          </motion.button>
        )}
      </div>

      {mode === 'create' && (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>בלש חדש מצטרף לצוות! 🎉</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="איך קוראים לך?"
            maxLength={30}
            style={inputStyle}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                style={{
                  fontSize: 28,
                  padding: 8,
                  borderRadius: 12,
                  background: a === avatar ? 'rgba(245,166,35,0.25)' : 'transparent',
                  border: a === avatar ? '2px solid var(--gold)' : '2px solid transparent',
                }}
              >
                {a}
              </button>
            ))}
          </div>
          {error && <div style={{ color: 'var(--red-bad)', fontWeight: 600, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" disabled={!name.trim()} onClick={create} style={{ opacity: name.trim() ? 1 : 0.5 }}>
              יוצאים לדרך!
            </button>
            <button className="btn-ghost" onClick={() => { setMode('list'); setError('') }}>ביטול</button>
          </div>
        </motion.div>
      )}

      {mode === 'link' && (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>צירוף בלש ממכשיר אחר 🔑</div>
          <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 12 }}>
            במכשיר שבו הבלש כבר קיים: נכנסים ל"ההתקדמות שלי" ומעתיקים את קוד הסוכן (6 ספרות).
          </p>
          <input
            value={linkCode}
            onChange={(e) => setLinkCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="קוד סוכן — 6 ספרות"
            inputMode="numeric"
            maxLength={6}
            style={{ ...inputStyle, textAlign: 'center', letterSpacing: 6, fontSize: 24, direction: 'ltr' }}
          />
          {error && <div style={{ color: 'var(--red-bad)', fontWeight: 600, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" disabled={linkCode.length !== 6} onClick={link} style={{ opacity: linkCode.length === 6 ? 1 : 0.5 }}>
              צרף אותי!
            </button>
            <button className="btn-ghost" onClick={() => { setMode('list'); setError('') }}>ביטול</button>
          </div>
        </motion.div>
      )}

      {mode === 'list' && !loading && (
        <button
          className="btn-ghost"
          style={{ margin: '18px auto 0', display: 'block', fontSize: 14 }}
          onClick={() => setMode('link')}
        >
          🔑 יש לי כבר בלש במכשיר אחר
        </button>
      )}

      {error && mode === 'list' && (
        <div style={{ color: 'var(--red-bad)', fontWeight: 600, textAlign: 'center', marginTop: 16 }}>{error}</div>
      )}
    </div>
  )
}
