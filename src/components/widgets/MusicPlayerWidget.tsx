'use client'

import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMusicStore } from '../../../lib/stores/musicStore'

export default function MusicPlayerWidget() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [canAutoplay, setCanAutoplay] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<boolean>(false)

  const enabled = useMusicStore(s => s.enabled)
  const playing = useMusicStore(s => s.playing)
  const muted = useMusicStore(s => s.muted)
  const volume = useMusicStore(s => s.volume)
  const loop = useMusicStore(s => s.loop)
  const shuffle = useMusicStore(s => s.shuffle)
  const playlist = useMusicStore(s => s.playlist)
  const currentTrack = useMusicStore(s => s.currentTrack)()

  const setEnabled = useMusicStore(s => s.setEnabled)
  const setMuted = useMusicStore(s => s.setMuted)
  const setVolume = useMusicStore(s => s.setVolume)
  const setPlaying = useMusicStore(s => s.setPlaying)
  const togglePlay = useMusicStore(s => s.togglePlay)
  const nextTrack = useMusicStore(s => s.nextTrack)
  const prevTrack = useMusicStore(s => s.prevTrack)
  const setTrackByIndex = useMusicStore(s => s.setTrackByIndex)
  const setLoop = useMusicStore(s => s.setLoop)
  const setShuffle = useMusicStore(s => s.setShuffle)
  const setPlaylist = useMusicStore(s => s.setPlaylist)

  // Attempt to auto-detect files under /public/audio on first mount (static list)
  useEffect(() => {
    // If playlist is empty, try a default static manifest
    if (playlist.length) return
    const defaults = [
      { id: 't1', title: 'Track 1', src: '/audio/track1.mp3' },
      { id: 't2', title: 'Track 2', src: '/audio/track2.mp3' },
      { id: 't3', title: 'Track 3', src: '/audio/track3.mp3' }
    ]
    setPlaylist(defaults as any)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ensure audio element exists only on client
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }
    const audio = audioRef.current

    const onEnded = () => {
      if (useMusicStore.getState().loop) {
        audio.currentTime = 0
        void audio.play().catch(() => {})
        return
      }
      useMusicStore.getState().nextTrack()
    }

    const onError = () => {
      setErrorMessage('Ошибка воспроизведения. Проверьте наличие файла в /public/audio')
      useMusicStore.getState().nextTrack()
    }

    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.muted = muted || !enabled
    audio.volume = volume
    audio.loop = false
  }, [muted, volume, enabled])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!currentTrack) {
      setPlaying(false)
      return
    }

    setErrorMessage(null)
    audio.src = currentTrack.src
    audio.currentTime = 0

    if (enabled && playing) {
      void audio.play().then(() => setCanAutoplay(true)).catch(() => {
        setCanAutoplay(false)
      })
    }
  }, [currentTrack?.src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!enabled) {
      audio.pause()
      return
    }
    if (!currentTrack) return
    if (playing) {
      void audio.play().then(() => setCanAutoplay(true)).catch(() => setCanAutoplay(false))
    } else {
      audio.pause()
    }
  }, [playing, enabled])

  const title = useMemo(() => currentTrack?.title ?? '—', [currentTrack?.title])

  // File input handler to add custom tracks
  const onAddTracks: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      const files = Array.from(e.target.files || [])
      if (!files.length) return
      const newTracks = files.map((f, idx) => ({
        id: `u_${Date.now()}_${idx}`,
        title: f.name.replace(/\.[^/.]+$/, ''),
        src: URL.createObjectURL(f)
      }))
      setPlaylist([...(playlist || []), ...newTracks] as any)
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[10000] select-none">
      <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-lg p-3 flex items-center gap-3">
        <button
          className={`px-2 py-2 rounded-md ${enabled ? 'bg-purple-600 hover:bg-purple-500' : 'bg-gray-600 hover:bg-gray-500'} transition`}
          onClick={() => setEnabled(!enabled)}
          title={enabled ? 'Отключить музыку' : 'Включить музыку'}
        >
          {enabled ? '🔊' : '🔇'}
        </button>

        <button
          className="px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 transition"
          onClick={() => prevTrack()}
          title="Предыдущий трек"
          disabled={!enabled || !playlist.length}
        >⏮</button>

        <button
          className="px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-500 transition"
          onClick={() => togglePlay()}
          title={playing ? 'Пауза' : 'Играть'}
          disabled={!enabled || !playlist.length}
        >{playing ? '⏸' : '▶️'}</button>

        <button
          className="px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 transition"
          onClick={() => nextTrack()}
          title="Следующий трек"
          disabled={!enabled || !playlist.length}
        >⏭</button>

        <div className="flex items-center gap-2 w-40">
          <span className="text-xs text-gray-300">{Math.round(volume * 100)}%</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full accent-purple-500"
            disabled={!enabled}
          />
        </div>

        <button
          className={`px-2 py-2 rounded-md ${muted ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'} transition`}
          onClick={() => setMuted(!muted)}
          title={muted ? 'Включить звук' : 'Выключить звук'}
          disabled={!enabled}
        >{muted ? '🔈' : '🔕'}</button>

        <div className="hidden sm:flex flex-col ml-2">
          <div className="text-sm font-semibold text-white truncate max-w-[180px]">{title}</div>
          <div className="text-[10px] text-gray-400">
            {shuffle ? 'Shuffle' : 'Order'} {loop ? '• Loop' : ''}
          </div>
        </div>

        <button
          className="ml-2 px-2 py-2 rounded-md bg-gray-700 hover:bg-gray-600 transition"
          onClick={() => setExpanded(!expanded)}
          title="Настройки"
        >⚙️</button>
      </div>

      {expanded && (
        <div className="mt-2 bg-gray-800/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-lg p-3 w-[360px]">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
              Shuffle
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
              Loop
            </label>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
            {playlist.map((t, idx) => (
              <button
                key={t.id}
                className={`w-full text-left px-2 py-1 rounded hover:bg-gray-700 transition truncate ${currentTrack?.id === t.id ? 'bg-purple-600/30 text-white' : 'text-gray-200'}`}
                onClick={() => setTrackByIndex(idx)}
              >
                {t.title}
              </button>
            ))}
            {!playlist.length && (
              <div className="text-sm text-gray-400">Добавьте mp3/wav/ogg файлы в папку public/audio и обновите страницу.</div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-gray-300 px-2 py-1 bg-gray-700 rounded cursor-pointer">
              + Добавить треки (mp3, wav, ogg)
              <input type="file" accept="audio/mpeg,audio/wav,audio/ogg" multiple className="hidden" onChange={onAddTracks} />
            </label>
            {errorMessage && (
              <div className="text-xs text-red-400" title={errorMessage}>Ошибка воспроизведения</div>
            )}
            {!canAutoplay && playing && enabled && (
              <div className="text-xs text-yellow-300">Нажмите ▶️ для запуска</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}