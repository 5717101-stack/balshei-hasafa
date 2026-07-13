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
  listProfiles: (deviceId: string) =>
    request<{ profiles: Profile[] }>(`/api/profiles?device_id=${encodeURIComponent(deviceId)}`),
  createProfile: (name: string, avatar: string, deviceId: string) =>
    request<Profile>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ name, avatar, device_id: deviceId }),
    }),
  linkProfile: (linkCode: string, deviceId: string) =>
    request<Profile>('/api/profiles/link', {
      method: 'POST',
      body: JSON.stringify({ link_code: linkCode, device_id: deviceId }),
    }),
  getProgress: (profileId: string) => request<Progress>(`/api/profiles/${profileId}/progress`),
  submitRound: (profileId: string, gameId: string, correct: number, total: number) =>
    request<{ summary: RoundSummary; progress: Progress }>(`/api/profiles/${profileId}/rounds`, {
      method: 'POST',
      body: JSON.stringify({ game_id: gameId, correct, total }),
    }),
  leaderboard: (viewerId?: string) =>
    request<{ leaderboard: LeaderboardRow[] }>(
      viewerId ? `/api/leaderboard?viewer=${encodeURIComponent(viewerId)}` : '/api/leaderboard',
    ),
}
