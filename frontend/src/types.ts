export interface Profile {
  id: string
  name: string
  avatar: string
  link_code?: string
  device_ids?: string[]
}

export interface Rank {
  id: string
  label: string
  emoji: string
  min_xp: number
  next_label: string | null
  next_min_xp: number | null
}

export interface Badge {
  id: string
  name: string
  emoji: string
  desc: string
}

export interface Progress {
  xp: number
  rank: Rank
  stars: Record<string, number>
  streak: number
  last_played: string | null
  played_today: boolean
  badges: Badge[]
  games_played: string[]
  total_rounds: number
  total_correct: number
  total_questions: number
}

export interface RoundSummary {
  xp_earned: number
  round_stars: number
  game_stars: number
  stars_improved: boolean
  rank: Rank
  streak: number
  new_badges: Badge[]
}

export interface LeaderboardRow {
  id: string | null
  is_me: boolean
  name: string
  avatar: string
  xp: number
  rank: Rank
  streak: number
  badges_count: number
  total_stars: number
}

export interface GameResult {
  correct: number
  total: number
}
