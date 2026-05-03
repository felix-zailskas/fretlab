const LEGEND_ITEMS = [
  { label: 'Root', color: 'var(--color-root)' },
  { label: '3rd', color: 'var(--color-third)' },
  { label: '5th', color: 'var(--color-fifth)' },
  { label: '7th', color: 'var(--color-seventh)' },
]

export function Legend() {
  return (
    <div className="flex gap-4 text-sm">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
