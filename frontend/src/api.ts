import type { LeaderboardRow, Profile, Progress, RoundSummary } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!resp.ok) {
    let detail = 'שגיאה בשרת'
    try {
      const body = await resp.json()
      if (body.detail) detail = body.detail
    } catch {
      /* keep default */
    }
    throw new Error(detail)
  }
  return resp.json() as Promise<T>
}

export const api = {
  listProfiles: () => request<{ profiles: Profile[] }>('/api/profiles'),
  createProfile: (name: string, avatar: string) =>
    request<Profile>('/api/profiles', { method: 'POST', body: JSON.stringify({ name, avatar }) }),
  getProgress: (profileId: string) => request<Progress>(`/api/profiles/${profileId}/progress`),
  submitRound: (profileId: string, gameId: string, correct: number, total: number) =>
    request<{ summary: RoundSummary; progress: Progress }>(`/api/profiles/${profileId}/rounds`, {
      method: 'POST',
      body: JSON.stringify({ game_id: gameId, correct, total }),
    }),
  leaderboard: () => request<{ leaderboard: LeaderboardRow[] }>('/api/leaderboard'),
}
