import { createContext, useContext, useMemo, type PropsWithChildren } from 'react'
import { useSearchParams } from 'react-router-dom'
import { defaultTrackFilter, type TrackFilter } from '../types/domain'

const trackFilters: readonly TrackFilter[] = ['weiwu_b2b', 'coaching_c2c', 'all']

function isTrackFilter(value: string | null): value is TrackFilter {
  return value !== null && trackFilters.includes(value as TrackFilter)
}

export interface TrackContextValue {
  trackFilter: TrackFilter
  setTrackFilter: (trackFilter: TrackFilter) => void
}

const TrackContext = createContext<TrackContextValue | undefined>(undefined)

export function TrackProvider({ children }: PropsWithChildren) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTrack = searchParams.get('track')
  const trackFilter = isTrackFilter(requestedTrack) ? requestedTrack : defaultTrackFilter()

  const value = useMemo<TrackContextValue>(() => ({
    trackFilter,
    setTrackFilter(nextTrack) {
      const next = new URLSearchParams(searchParams)
      next.set('track', nextTrack)
      setSearchParams(next, { replace: true })
    }
  }), [searchParams, setSearchParams, trackFilter])

  return <TrackContext.Provider value={value}>{children}</TrackContext.Provider>
}

export function useTrack() {
  const context = useContext(TrackContext)
  if (!context) throw new Error('useTrack must be used inside TrackProvider')
  return context
}
