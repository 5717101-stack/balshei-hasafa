import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import type { Profile, Progress } from './types'
import { ProfilePicker } from './screens/ProfilePicker'
import { CaseMap } from './screens/CaseMap'
import { GameScreen } from './screens/GameScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { LeaderboardScreen } from './screens/LeaderboardScreen'

const PROFILE_KEY = 'bhs_profile_id'

type Screen =
  | { name: 'picker' }
  | { name: 'home' }
  | { name: 'game'; gameId: string }
  | { name: 'progress' }
  | { name: 'board' }

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'picker' })
  const [profile, setProfile] = useState<Profile | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [booting, setBooting] = useState(true)

  const refreshProgress = useCallback(async (profileId: string) => {
    const p = await api.getProgress(profileId)
    setProgress(p)
    return p
  }, [])

  // Auto-resume the last profile used on this device
  useEffect(() => {
    const savedId = localStorage.getItem(PROFILE_KEY)
    if (!savedId) {
      setBooting(false)
      return
    }
    api
      .listProfiles()
      .then(async ({ profiles }) => {
        const saved = profiles.find((p) => p.id === savedId)
        if (saved) {
          setProfile(saved)
          await refreshProgress(saved.id)
          setScreen({ name: 'home' })
        }
      })
      .catch(() => {})
      .finally(() => setBooting(false))
  }, [refreshProgress])

  async function selectProfile(p: Profile) {
    setProfile(p)
    localStorage.setItem(PROFILE_KEY, p.id)
    await refreshProgress(p.id)
    setScreen({ name: 'home' })
  }

  function switchProfile() {
    localStorage.removeItem(PROFILE_KEY)
    setProfile(null)
    setProgress(null)
    setScreen({ name: 'picker' })
  }

  if (booting) {
    return (
      <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 48 }} className="pop">🔍</div>
      </div>
    )
  }

  if (screen.name === 'picker' || !profile) {
    return <ProfilePicker onSelect={selectProfile} />
  }

  if (screen.name === 'game') {
    return (
      <GameScreen
        profile={profile}
        gameId={screen.gameId}
        onProgressUpdate={setProgress}
        onExit={() => setScreen({ name: 'home' })}
      />
    )
  }

  if (screen.name === 'progress' && progress) {
    return <ProgressScreen profile={profile} progress={progress} onBack={() => setScreen({ name: 'home' })} />
  }

  if (screen.name === 'board') {
    return <LeaderboardScreen myId={profile.id} onBack={() => setScreen({ name: 'home' })} />
  }

  return (
    <CaseMap
      profile={profile}
      progress={progress}
      onPlay={(gameId) => setScreen({ name: 'game', gameId })}
      onProgress={() => setScreen({ name: 'progress' })}
      onBoard={() => setScreen({ name: 'board' })}
      onSwitchProfile={switchProfile}
    />
  )
}
