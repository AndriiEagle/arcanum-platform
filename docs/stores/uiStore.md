# uiStore

Файл: `lib/stores/uiStore.ts`

Состояние:
- `isLeftPanelOpen, isRightPanelOpen`
- `activeView: 'dashboard' | 'resonance'`
- `isDialogueOpen`
- `middleMousePanEnabled, autoGenerateHeaderImage`

Действия:
- `toggleLeftPanel, toggleRightPanel`
- `setLeftPanel(isOpen), setRightPanel(isOpen)`
- `setActiveView(view), toggleView()`
- `toggleDialogue(), setDialogue(isOpen)`
- `toggleMiddleMousePan(), toggleAutoGenerateHeaderImage()`