const NAV_ITEMS = [
  {
    id: 'quest',
    label: '일일 미션',
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 8h8M6 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: '히스토리',
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 2v4M13 2v4M3 9h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: '설정',
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1L4.7 4.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`bnav-item ${active === item.id ? 'active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          <span className="bnav-icon">{item.icon}</span>
          <span className="bnav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
