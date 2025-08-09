### MusicPlayerWidget

- Расположение: `src/components/widgets/MusicPlayerWidget.tsx`
- Стор: `lib/stores/musicStore.ts`

#### Добавление треков
- Положите ваши mp3/ogg файлы в папку `public/audio`.
- По умолчанию ожидаются файлы: `track1.mp3`, `track2.mp3`, `track3.mp3`.
- Названия и плейлист можно изменить программно через `useMusicStore.getState().setPlaylist([...])`.

#### Возможности
- Включение/выключение фоновой музыки
- Play/Pause, Предыдущий/Следующий трек
- Громкость, Mute
- Loop, Shuffle
- Сохранение настроек в `localStorage`

#### Примечание
- Браузеры могут блокировать автозапуск. В таком случае нажмите кнопку воспроизведения.