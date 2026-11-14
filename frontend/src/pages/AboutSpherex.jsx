import { useNavigate } from 'react-router-dom'

export default function AboutSpherex() {
  const navigate = useNavigate()
  return (
    <section id="screen-about" className="screen screen-scroll active">
      <button className="btn btn-corner btn-left" onClick={() => navigate('/')}>← BACK</button>
      <span className="brand-small">OpenSPHEREx</span>

      <article className="about-content">
        <h1 className="page-title anim" style={{ '--i': 0 }}>About SPHEREx</h1>

        <section className="info-card anim" style={{ '--i': 1 }}>
          <h2>What it is</h2>
          <p>
            <strong>SPHEREx</strong> (Spectro-Photometer for the History of the Universe, Epoch of
            Reionization and Ices Explorer) is a NASA space observatory designed to map the entire sky
            in spectrophotometric detail.
          </p>
        </section>

        <section className="info-card anim" style={{ '--i': 2 }}>
          <h2>How it captures images</h2>
          <p>
            Unlike traditional imaging telescopes, SPHEREx captures infrared light across
            <strong> 102 distinct wavelengths</strong>. Using linear variable filters, it splits incoming
            light to obtain high-resolution optical spectrum data for every point on the celestial
            sphere, creating a comprehensive 3D map of the cosmos.
          </p>
        </section>

        <section className="info-card anim" style={{ '--i': 3 }}>
          <h2>Why it does it</h2>
          <ul className="reason-list">
            <li><b>Cosmic Origins:</b> Investigates the physics of cosmic inflation seconds after the Big Bang.</li>
            <li><b>Galactic Evolution:</b> Measures light from distant galaxies to trace the history of cosmic star formation.</li>
            <li><b>Ingredients for Life:</b> Searches for water ice and organic molecules in interstellar clouds and disk systems across the Milky Way.</li>
          </ul>
        </section>
      </article>
    </section>
  )
}
