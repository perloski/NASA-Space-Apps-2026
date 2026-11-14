import { useNavigate } from 'react-router-dom'
import AnimatedTitle from '../components/AnimatedTitle.jsx'

export default function Home() {
  const navigate = useNavigate()
  return (
    <section id="screen-home" className="screen active">
      <button className="btn btn-corner btn-right" onClick={() => console.log('TODO: cambiar idioma')}>Language</button>

      <p className="kicker anim" style={{ '--i': 0 }}>NASA Space App Challenge 2026- Team Athenas IV</p>
      <div className="title-wrap">
        <AnimatedTitle text="OpenSPHEREx" />
        <span className="tagline">Bringing the cosmos to everyone</span>
      </div>

      <button className="btn btn-start" onClick={() => navigate('/explore')}>START</button>

      <nav className="footer-links">
        <button className="link anim" style={{ '--i': 14 }} onClick={() => navigate('/about')}>About SPHEREx</button>
        <button className="link anim" style={{ '--i': 15 }} onClick={() => console.log('TODO: abrir "About the challenge"')}>About The Challenge</button>
        <button className="link anim" style={{ '--i': 16 }} onClick={() => navigate('/team')}>About The Team</button>
      </nav>
    </section>
  )
}
