import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Layout from './components/Layout'

import Dashboard from './pages/Dashboard'
import Empleados from './pages/Empleados'
import Turnos from './pages/Turnos'
import Programaciones from './pages/Programaciones'
import Novedades from './pages/Novedades'
import Nomina from './pages/Nomina'
import Reportes from './pages/Reportes'
import Obras from './pages/Obras'
import Login from './pages/Login'

function RutaProtegida({ children }) {
  const token = localStorage.getItem('token')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          element={
            <RutaProtegida>
              <Layout />
            </RutaProtegida>
          }
        >
          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/empleados"
            element={<Empleados />}
          />

          <Route
            path="/obras"
            element={<Obras />}
          />

          <Route
            path="/turnos"
            element={<Turnos />}
          />

          <Route
            path="/programaciones"
            element={<Programaciones />}
          />

          <Route
            path="/novedades"
            element={<Novedades />}
          />

          <Route
            path="/nomina"
            element={<Nomina />}
          />

          <Route
            path="/reportes"
            element={<Reportes />}
          />
        </Route>

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App
