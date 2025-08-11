import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface MusicTrack {
  id: string
  title: string
  src: string
}

interface MusicState {
  enabled: boolean
  playing: boolean
  muted: boolean
  volume: number
  shuffle: boolean
  loop: boolean
  playlist: MusicTrack[]
  currentTrackIndex: number

  // derived getters
  currentTrack: () => MusicTrack | null

  // actions
  setEnabled: (enabled: boolean) => void
  toggleEnabled: () => void
  setMuted: (muted: boolean) => void
  toggleMuted: () => void
  setVolume: (volume: number) => void
  setPlaying: (playing: boolean) => void
  togglePlay: () => void

  setPlaylist: (tracks: MusicTrack[]) => void
  setTrackByIndex: (index: number) => void
  nextTrack: () => void
  prevTrack: () => void
  setShuffle: (shuffle: boolean) => void
  setLoop: (loop: boolean) => void
}

const DEFAULT_PLAYLIST: MusicTrack[] = []

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      enabled: true,
      playing: false,
      muted: false,
      volume: 0.6,
      shuffle: false,
      loop: false,
      playlist: DEFAULT_PLAYLIST,
      currentTrackIndex: 0,

      currentTrack: () => {
        const state = get()
        if (!state.playlist.length) return null
        const index = Math.max(0, Math.min(state.currentTrackIndex, state.playlist.length - 1))
        return state.playlist[index]
      },

      setEnabled: (enabled: boolean) => {
        set({ enabled })
        if (!enabled) set({ playing: false })
      },
      toggleEnabled: () => set((s) => ({ enabled: !s.enabled, playing: s.enabled ? false : s.playing })),

      setMuted: (muted: boolean) => set({ muted }),
      toggleMuted: () => set((s) => ({ muted: !s.muted })),

      setVolume: (volume: number) => {
        const clamped = Math.max(0, Math.min(1, volume))
        set({ volume: clamped })
      },

      setPlaying: (playing: boolean) => set({ playing }),
      togglePlay: () => set((s) => ({ playing: !s.playing })),

      setPlaylist: (tracks: MusicTrack[]) => {
        set({ playlist: tracks || [], currentTrackIndex: 0 })
      },

      setTrackByIndex: (index: number) => {
        const { playlist } = get()
        if (!playlist.length) return
        const safeIndex = ((index % playlist.length) + playlist.length) % playlist.length
        set({ currentTrackIndex: safeIndex })
      },

      nextTrack: () => {
        const { playlist, currentTrackIndex, shuffle } = get()
        if (!playlist.length) return
        if (shuffle) {
          let next = Math.floor(Math.random() * playlist.length)
          if (playlist.length > 1 && next === currentTrackIndex) {
            next = (next + 1) % playlist.length
          }
          set({ currentTrackIndex: next })
          return
        }
        set({ currentTrackIndex: (currentTrackIndex + 1) % playlist.length })
      },

      prevTrack: () => {
        const { playlist, currentTrackIndex } = get()
        if (!playlist.length) return
        set({ currentTrackIndex: (currentTrackIndex - 1 + playlist.length) % playlist.length })
      },

      setShuffle: (shuffle: boolean) => set({ shuffle }),
      setLoop: (loop: boolean) => set({ loop })
    }),
    {
      name: 'music-settings-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        muted: state.muted,
        volume: state.volume,
        shuffle: state.shuffle,
        loop: state.loop,
        currentTrackIndex: state.currentTrackIndex,
        // сохраняем только устойчивые URL (не blob:)
        playlist: (state.playlist || []).filter(t => typeof t.src === 'string' && !t.src.startsWith('blob:'))
      }),
      onRehydrateStorage: () => (state, error) => {
        // На всякий случай очищаем blob-ссылки после гидратации
        if (!state) return
        const clean = (state.playlist || []).filter(t => typeof t.src === 'string' && !t.src.startsWith('blob:'))
        if (clean.length !== (state.playlist || []).length) {
          // Используем глобальный setter из useMusicStore напрямую
          useMusicStore.setState({ playlist: clean, currentTrackIndex: 0 })
        }
      }
    }
  )
)