import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { iniciarSesion } from '../services/auth.service'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function manejarLogin(evento) {
    evento.preventDefault()

    try {
      setCargando(true)
      setError('')

      await iniciarSesion(email, password)

      navigate('/')
    } catch (error) {
      console.error(error)
      setError(error.message || 'No se pudo iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-icon">C</div>

        <h1>ContaPro</h1>
        <p className="login-subtitle">
          Sistema contable
        </p>

        <form onSubmit={manejarLogin}>
          <div className="form-group">
            <label>Correo electrónico</label>

            <input
              type="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              placeholder="correo@empresa.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>

            <input
              type="password"
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              placeholder="Contraseña"
              required
            />
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary-button login-button"
            disabled={cargando}
          >
            {cargando ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
