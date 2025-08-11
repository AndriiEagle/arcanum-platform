import React from 'react'

export default function InventoryWidget() {
  const items = [
    { id: 'i1', name: 'Health Potion', qty: 3 },
    { id: 'i2', name: 'Mana Potion', qty: 2 },
    { id: 'i3', name: 'Iron Sword', qty: 1 },
  ]

  return (
    <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700 shadow-xl min-w-[220px]">
      <h4 className="text-gray-200 font-medium mb-2">🎒 Инвентарь</h4>
      <ul className="space-y-1 text-sm text-gray-300">
        {items.map(it => (
          <li key={it.id} className="flex items-center justify-between">
            <span>{it.name}</span>
            <span className="text-gray-400">×{it.qty}</span>
          </li>
        ))}
      </ul>
    </div>
  )
} 