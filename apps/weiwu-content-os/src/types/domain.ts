export const TRACK_IDS = ['weiwu_b2b', 'coaching_c2c'] as const
export type TrackId = (typeof TRACK_IDS)[number]
export type TrackFilter = TrackId | 'all'

export const TOPIC_STATUSES = ['inbox', 'validate', 'approved', 'paused', 'archived'] as const
export type TopicStatus = (typeof TOPIC_STATUSES)[number]

export const PRODUCTION_STAGES = [
  'no_script',
  'scripting',
  'ready_to_shoot',
  'shooting',
  'shot_waiting_edit',
  'ready_to_publish',
  'published',
  'reviewed'
] as const
export type ProductionStage = (typeof PRODUCTION_STAGES)[number]

export const defaultTrackFilter = (): TrackFilter => 'weiwu_b2b'

export const isTopicStatus = (value: string): value is TopicStatus =>
  (TOPIC_STATUSES as readonly string[]).includes(value)

export const isProductionStage = (value: string): value is ProductionStage =>
  (PRODUCTION_STAGES as readonly string[]).includes(value)
