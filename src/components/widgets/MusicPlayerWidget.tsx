'use client'

import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMusicStore } from '../../../lib/stores/musicStore'

export default function MusicPlayerWidget() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [canAutoplay, setCanAutoplay] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<boolean>(false)
  const [minimized, setMinimized] = useState<boolean>(false)
  const [pos, setPos] = useState<{x:number;y:number}>({ x: 24, y: 24 })
  const dragRef = useRef<{dx:number;dy:number;drag:boolean}>({ dx: 0, dy: 0, drag: false })

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

  useEffect(() => { if (!playlist.length) setPlaying(false) }, [playlist.length, setPlaying])

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio()
    const audio = audioRef.current
    const onEnded = () => { if (useMusicStore.getState().loop) { audio.currentTime = 0; void audio.play().catch(()=>{}); return } useMusicStore.getState().nextTrack() }
    const onError = () => { setErrorMessage('Ошибка воспроизведения'); useMusicStore.getState().nextTrack() }
    audio.addEventListener('ended', onEnded); audio.addEventListener('error', onError)
    return () => { audio.removeEventListener('ended', onEnded); audio.removeEventListener('error', onError) }
  }, [])

  useEffect(() => {
    const audio = audioRef.current; if (!audio) return
    audio.muted = muted || !enabled; audio.volume = volume; audio.loop = false
  }, [muted, volume, enabled])

  useEffect(() => {
    const audio = audioRef.current; if (!audio) return
    if (!currentTrack) { setPlaying(false); return }
    const src = currentTrack.src
    // Игнорируем устаревшие blob: ссылки (они не переживают перезагрузку)
    if (!src || src.startsWith('blob:')) { setPlaying(false); return }
    setErrorMessage(null); audio.src = src; audio.currentTime = 0
    if (enabled && playing) { void audio.play().then(()=>setCanAutoplay(true)).catch(()=>setCanAutoplay(false)) }
  }, [currentTrack?.src])

  useEffect(() => {
    const audio = audioRef.current; if (!audio) return
    if (!enabled || !playlist.length) { audio.pause(); return }
    if (!currentTrack) return
    if (playing) void audio.play().then(()=>setCanAutoplay(true)).catch(()=>setCanAutoplay(false)); else audio.pause()
  }, [playing, enabled, playlist.length])

  const title = useMemo(() => currentTrack?.title ?? '—', [currentTrack?.title])

  const onAddTracks: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      const files = Array.from(e.target.files || [])
      if (!files.length) return
      const newTracks = files.map((f, idx) => ({ id: `u_${Date.now()}_${idx}`, title: f.name.replace(/\.[^/.]+$/, ''), src: URL.createObjectURL(f) }))
      setPlaylist([...(playlist || []), ...newTracks] as any)
    } finally { e.target.value = '' }
  }

  const onDragStart = (e: React.PointerEvent) => {
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, drag: true }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onDragMove = (e: React.PointerEvent) => { if (!dragRef.current.drag) return; setPos({ x: e.clientX - dragRef.current.dx, y: e.clientY - dragRef.current.dy }) }
  const onDragEnd = () => { dragRef.current.drag = false }

  const Grip = () => (
    <div
      className="px-1 py-1 rounded bg-gray-900/60 border border-gray-700 text-gray-400 text-xs cursor-move select-none"
      onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}
      title="Перетащи панель"
    >⠿</div>
  )

  return (
    <div className="fixed" style={{ left: pos.x, top: pos.y, zIndex: 10000 }}>
      {!minimized ? (
        <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-lg p-2 flex items-center gap-2 text-sm">
          <Grip />
          <button className={`px-2 py-1 rounded ${enabled ? 'bg-purple-600 hover:bg-purple-500' : 'bg-gray-600 hover:bg-gray-500'} transition`} onClick={(e)=>{e.stopPropagation(); setEnabled(!enabled)}} title={enabled ? 'Отключить музыку' : 'Включить музыку'}>{enabled ? '🔊' : '🔇'}</button>
          <button className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600" onClick={(e)=>{e.stopPropagation(); prevTrack()}} title="Предыдущий" disabled={!enabled || !playlist.length}>⏮</button>
          <button className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-500" onClick={(e)=>{e.stopPropagation(); togglePlay()}} title={playing ? 'Пауза' : 'Играть'} disabled={!enabled || !playlist.length}>{playing ? '⏸' : '▶️'}</button>
          <button className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600" onClick={(e)=>{e.stopPropagation(); nextTrack()}} title="Следующий" disabled={!enabled || !playlist.length}>⏭</button>
          <span className="text-xs text-gray-300 w-10 text-right select-none" onPointerDown={(e)=>e.stopPropagation()}>{Math.round(volume*100)}%</span>
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e)=>setVolume(parseFloat(e.target.value))} className="w-24 accent-purple-500" disabled={!enabled} onPointerDown={(e)=>e.stopPropagation()} />
          <div className="hidden sm:flex flex-col ml-1 select-none" onPointerDown={(e)=>e.stopPropagation()}>
            <div className="text-xs text-white truncate max-w-[120px]">{title}</div>
            <div className="text-[10px] text-gray-400">{shuffle ? 'Shuffle' : 'Order'}</div>
          </div>
          <button className={`px-2 py-1 rounded ${muted ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'}`} onClick={(e)=>{e.stopPropagation(); setMuted(!muted)}} title={muted ? 'Включить звук' : 'Выключить звук'} disabled={!enabled}>{muted ? '🔈' : '🔕'}</button>
          <button className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600" onClick={(e)=>{e.stopPropagation(); setExpanded(!expanded)}} title="Настройки">⚙️</button>
          <button className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600" onClick={(e)=>{e.stopPropagation(); setMinimized(true)}} title="Свернуть панель">🗕</button>
        </div>
      ) : (
        <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-lg p-2 flex flex-col items-center gap-2 text-sm">
          <Grip />
          <button className={`w-8 h-8 rounded ${enabled ? 'bg-purple-600 hover:bg-purple-500' : 'bg-gray-600 hover:bg-gray-500'} transition flex items-center justify-center`} onClick={(e)=>{e.stopPropagation(); setEnabled(!enabled)}} title={enabled ? 'Отключить' : 'Включить'}>{enabled ? '🔊' : '🔇'}</button>
          <button className="w-8 h-8 rounded bg-purple-600 hover:bg-purple-500 flex items-center justify-center" onClick={(e)=>{e.stopPropagation(); togglePlay()}} title={playing ? 'Пауза' : 'Играть'} disabled={!enabled || !playlist.length}>{playing ? '⏸' : '▶️'}</button>
          <button className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center" onClick={(e)=>{e.stopPropagation(); nextTrack()}} title="Следующий" disabled={!enabled || !playlist.length}>⏭</button>
          <button className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center" onClick={(e)=>{e.stopPropagation(); setExpanded(!expanded)}} title="Настройки">⚙️</button>
          <button className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center" onClick={(e)=>{e.stopPropagation(); setMinimized(false)}} title="Развернуть">◻️</button>
        </div>
      )}

      {expanded && (
        <div className="mt-2 bg-gray-800/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-lg p-3 w-[300px] text-sm" onPointerDown={(e)=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-gray-200 text-xs"><input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />Shuffle</label>
            <label className="flex items-center gap-2 text-gray-200 text-xs"><input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />Loop</label>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 mb-2">
            {playlist.map((t, idx) => (
              <button key={t.id} className={`w-full text-left px-2 py-1 rounded hover:bg-gray-700 transition truncate ${currentTrack?.id === t.id ? 'bg-purple-600/30 text-white' : 'text-gray-200'}`} onClick={() => setTrackByIndex(idx)}>{t.title}</button>
            ))}
            {!playlist.length && (<div className="text-xs text-gray-400">Добавьте mp3/wav/ogg файлы.</div>)}
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-gray-300 px-2 py-1 bg-gray-700 rounded cursor-pointer">+ Добавить треки (mp3, wav, ogg)
              <input type="file" accept="audio/mpeg,audio/wav,audio/ogg" multiple className="hidden" onChange={onAddTracks} />
            </label>
            {errorMessage && (<div className="text-xs text-red-400" title={errorMessage}>Ошибка</div>)}
            {!canAutoplay && playing && enabled && (<div className="text-xs text-yellow-300">Нажмите ▶️</div>)}
          </div>
        </div>
      )}
    </div>
  )
}