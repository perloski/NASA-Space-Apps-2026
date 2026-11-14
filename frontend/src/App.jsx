import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import StarField from './components/StarField.jsx'
import AboutSpherex from './pages/AboutSpherex.jsx'
import Coords from './pages/Coords.jsx'
import Home from './pages/Home.jsx'
import Team from './pages/Team.jsx'

// El visor trae Aladin Lite (~3 MB con su WASM): se carga recién al entrar a /view
const Viewer = lazy(() => import('./pages/Viewer.jsx'))

// Layout: fondo de estrellas fijo + pantallas. La key por ruta vuelve a montar la pantalla,
// así se repite la animación de entrada (screen-in / rise) al navegar.
export default function App() {
  const location = useLocation()
  return (
    <>
      <StarField />
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Coords />} />
        <Route path="/view" element={<Suspense fallback={null}><Viewer /></Suspense>} />
        <Route path="/about" element={<AboutSpherex />} />
        <Route path="/team" element={<Team />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
