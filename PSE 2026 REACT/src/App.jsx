import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Register from './pages/Register'
import CheckResults from './pages/CheckResults'
import Complaints from './pages/Complaints'

/* Orb mesh — shown on all pages except /complaints (which has its own) */
function GreenMesh() {
  const { pathname } = useLocation()
  if (pathname === '/complaints') return null
  return (
    <>
      <div className="bg-mesh" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>
      <div className="page-grain" aria-hidden="true" />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <GreenMesh />
      <Navbar />
      <Routes>
        <Route path="/"           element={<CheckResults />} />
        <Route path="/register"   element={<Register />} />
        <Route path="/complaints" element={<Complaints />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}
