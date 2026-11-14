// Título con una <span> por letra (animación "letter" del prototipo).
export default function AnimatedTitle({ text, className = 'title', as: Tag = 'h1' }) {
  return (
    <Tag className={className} aria-label={text}>
      {[...text].map((c, i) => (
        <span key={i} className="ch" style={{ '--i': i }} aria-hidden="true">{c}</span>
      ))}
    </Tag>
  )
}
