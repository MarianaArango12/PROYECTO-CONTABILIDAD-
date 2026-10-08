import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  obtenerUsuarioActual,
  cerrarSesion
} from '../services/auth.service'

function Layout() {
  const navigate = useNavigate()
  const usuario = obtenerUsuarioActual()

  function manejarCerrarSesion() {
    cerrarSesion()
    navigate('/login')
  }

  return (
    <div className="app">

      {/* =========================
          SIDEBAR
      ========================== */}

      <aside className="sidebar">

        {/* LOGO */}

        <div className="brand">

          <div className="brand-icon">
            C
          </div>

          <div>
            <h1>ContaPro</h1>
            <span>Sistema contable</span>
          </div>

        </div>


        {/* =========================
            MENÚ
        ========================== */}

        <nav className="menu">

          <p className="menu-title">
            PRINCIPAL
          </p>


          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `menu-item ${isActive ? 'active' : ''}`
            }
          >

            <span className="menu-icon">
              <i className="bi bi-house"></i>
            </span>

            <span className="menu-text">
              Inicio
            </span>

          </NavLink>


          <p className="menu-title">
            OPERACIÓN
          </p>


          <NavLink
            to="/empleados"
            className={({ isActive }) =>
              `menu-item ${isActive ? 'active' : ''}`
            }
          >

            <span className="menu-icon">
              <i className="bi bi-people"></i>
            </span>

            <span className="menu-text">
              Empleados
            </span>

          </NavLink>


          <NavLink
            to="/obras"
            className={({ isActive }) =>
              `menu-item ${isActive ? 'active' : ''}`
            }
          >

            <span className="menu-icon">
              <i className="bi bi-building"></i>
            </span>

            <span className="menu-text">
              Obras
            </span>

          </NavLink>


          <NavLink
            to="/turnos"
            className={({ isActive }) =>
              `menu-item ${isActive ? 'active' : ''}`
            }
          >

            <span className="menu-icon">
              <i className="bi bi-clock"></i>
            </span>

            <span className="menu-text">
              Turnos
            </span>

          </NavLink>


          <NavLink
            to="/programaciones"
            className={({ isActive }) =>
              `menu-item important-item ${isActive ? 'active' : ''}`
            }
          >

            <span className="menu-icon">
              <i className="bi bi-calendar3"></i>
            </span>

            <span className="menu-text">
              Programaciones
            </span>

          </NavLink>


          <NavLink
            to="/novedades"
            className={({ isActive }) =>
              `menu-item ${isActive ? 'active' : ''}`
            }
          >

            <span className="menu-icon">
              <i className="bi bi-journal-text"></i>
            </span>

            <span className="menu-text">
              Novedades
            </span>

          </NavLink>


          <p className="menu-title">
            NÓMINA
          </p>


          <NavLink
            to="/nomina"
            className={({ isActive }) =>
              `menu-item important-item ${isActive ? 'active' : ''}`
            }
          >

            <span className="menu-icon">
              <i className="bi bi-cash-stack"></i>
            </span>

            <span className="menu-text">
              Nómina
            </span>

          </NavLink>


          <NavLink
            to="/reportes"
            className={({ isActive }) =>
              `menu-item ${isActive ? 'active' : ''}`
            }
          >

            <span className="menu-icon">
              <i className="bi bi-bar-chart"></i>
            </span>

            <span className="menu-text">
              Reportes
            </span>

          </NavLink>

        </nav>


        {/* =========================
            USUARIO DEL SIDEBAR
        ========================== */}

        <div className="sidebar-footer">

          <div className="user-avatar">
            {usuario?.nombre?.substring(0, 2).toUpperCase() || 'AD'}
          </div>


          <div className="user-info">

            <strong>
              {usuario?.nombre || 'Administrador'}
            </strong>

            <span>
              {usuario?.rol || 'Administrador'}
            </span>

          </div>


          <button
            className="logout-button"
            onClick={manejarCerrarSesion}
            title="Cerrar sesión"
          >
            <i className="bi bi-box-arrow-right"></i>
          </button>

        </div>

      </aside>


      {/* =========================
          CONTENIDO PRINCIPAL
      ========================== */}

      <main className="main">

        {/* =========================
            BARRA SUPERIOR VACÍA
            El Dashboard maneja su
            propio encabezado.
        ========================== */}

        <header className="topbar">
        </header>


        {/* =========================
            PÁGINA ACTUAL
        ========================== */}

        <section className="content">

          <Outlet />

        </section>

      </main>

    </div>
  )
}

export default Layout
