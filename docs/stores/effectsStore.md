# effectsStore

Файл: `lib/stores/effectsStore.ts`

Состояние:
- `isLevelUpActive, currentLevel`
- `currentFocusSphere, globalTheme`
- `soundEnabled, soundVolume, particlesEnabled`
- `isFireworksActive`
- `scheduledRewards: { id, triggerLevel, rewardType, rewardContent, isTriggered }[]`

Действия:
- `triggerLevelUp(newLevel), completeLevelUp()`
- `triggerFireworks(), completeFireworks()`
- `setFocusSphere(sphereId|null), setGlobalTheme(theme)`
- `toggleSound(), setSoundVolume(volume)`
- `toggleParticles()`
- `addScheduledReward(reward), removeScheduledReward(id), checkAndTriggerRewards(currentLevel)`

Хук темы:
- `useThemeStyles()` → возвращает цвета для текущей темы