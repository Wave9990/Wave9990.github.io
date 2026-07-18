import { useTrack } from '../../providers/TrackProvider'
import type { TrackFilter } from '../../types/domain'

const tracks: Array<{ id: TrackFilter; label: string }> = [
  { id: 'weiwu_b2b', label: '唯吾 · B端获客' },
  { id: 'coaching_c2c', label: '陪跑 · C端获客' },
  { id: 'all', label: '全部内容' }
]

export function trackLabel(track: TrackFilter) {
  return tracks.find((item) => item.id === track)?.label ?? tracks[0].label
}

export function TrackSwitch() {
  const { trackFilter, setTrackFilter } = useTrack()

  return (
    <div className="track-switch" aria-label="内容线筛选">
      {tracks.map((track) => (
        <button
          key={track.id}
          type="button"
          aria-pressed={trackFilter === track.id}
          className={trackFilter === track.id ? 'is-active' : ''}
          onClick={() => setTrackFilter(track.id)}
        >
          {track.label}
        </button>
      ))}
    </div>
  )
}
