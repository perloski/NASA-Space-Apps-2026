// Play/pausa, anterior/siguiente y la época (o frame) que se está mostrando.
export default function PlayerControls({ playing, onToggle, onPrev, onNext, onSelect, index, count, label, sublabel }) {
  const disabled = count < 2
  return (
    <div style={{ width: 'min(100%, 62vh, 560px)' }}>
      <div className="player">
        <button className="btn" onClick={onPrev} disabled={disabled} aria-label="Previous">◀</button>
        <button className="btn" onClick={onToggle} disabled={disabled} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        <button className="btn" onClick={onNext} disabled={disabled} aria-label="Next">▶</button>
        <span className="player-label">
          {count ? <><b>{label}</b>{sublabel ? <> · {sublabel}</> : null} <span>({index + 1}/{count})</span></> : '–'}
        </span>
      </div>
      {count > 1 && count <= 24 && (
        <div className="epoch-dots">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i} className={`epoch-dot${i === index ? ' on' : ''}`}
              onClick={() => onSelect(i)} aria-label={`Show ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
