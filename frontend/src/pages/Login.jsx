import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { iniciarSesion } from '../services/auth.service'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
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
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand-icon" aria-hidden="true">
          S
        </div>

        <h1>SIGOAR</h1>
        <p className="login-subtitle">
          Sistema de integracion y gestion de obras 
        </p>

        <div className="login-divider" />

        <h2>Iniciar sesión</h2>
        <p className="login-description">
          Ingresa tus credenciales para continuar.
        </p>

        <form onSubmit={manejarLogin}>
          <div className="login-form-group">
            <label htmlFor="login-email">
              Correo electrónico
            </label>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              placeholder="correo@empresa.com"
              autoComplete="username"
              required
              disabled={cargando}
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="login-password">
              Contraseña
            </label>

            <div className="login-password-wrapper">
              <input
                id="login-password"
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                required
                disabled={cargando}
              />

              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setMostrarPassword((actual) => !actual)}
                aria-label={
                  mostrarPassword
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
                aria-pressed={mostrarPassword}
                disabled={cargando}
              >
                {mostrarPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.1-2.3 3.2" />
                    <path d="M6.2 6.2C3.9 7.6 2.8 9.5 2.5 12c1 2.5 4.5 7 9.5 7 1.1 0 2.1-.2 3-.6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error" role="alert">
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

        <p className="login-footer">
          SIGOAR· Acceso seguro al sistema
        </p>
      </section>
    </main>
  )
}

export default Login
