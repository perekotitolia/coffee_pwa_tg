export type Profile = {
  id: string
  created_at: string
  device_id: string | null
  tg_id: number | null
  link_token: string | null
  points: number
}

export type PointsEvent = {
  id: number
  created_at: string
  profile_id: string
  delta: number
  reason: string | null
  granted_by: string | null
}