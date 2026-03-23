const TAB_ITEMS = [
  { id: 'quest', label: '일일 미션' },
  { id: 'history', label: '히스토리' },
]

export default function LocalSegmentTabs({ active, onChange }) {
  return (
    <div className="local-segment-wrap">
      <div className="local-segment-tabs">
        {TAB_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`local-segment-btn ${active === item.id ? 'active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
