import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

function Dashboard() {
return ( <div className="container-fluid bg-light min-vh-100 p-4">

  {/* Encabezado */}
  <div className="d-flex justify-content-between align-items-center mb-4">

    <div>
      <h2 className="fw-bold mb-1">Inicio</h2>
      <p className="text-secondary mb-0">
        Resumen general del sistema
      </p>
    </div>

    <div className="d-flex align-items-center gap-3">

      <button className="btn btn-light border position-relative">
        <i className="bi bi-bell fs-5"></i>
        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
          0
        </span>
      </button>

      <div className="d-flex align-items-center gap-2">

        <div
          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
          style={{ width: "42px", height: "42px" }}
        >
          AD
        </div>

        <div className="d-none d-md-block">
          <strong className="d-block">Administrador</strong>
          <small className="text-secondary">
            Administrador
          </small>
        </div>

      </div>

    </div>
  </div>


  {/* Bienvenida */}
  <div className="card border-0 shadow-sm mb-4">
    <div className="card-body p-4">

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">

        <div>
          <h4 className="fw-bold mb-2">
            Bienvenido al sistema 
          </h4>

          <p className="text-secondary mb-0">
            Aquí tienes un resumen de la información más importante.
          </p>
        </div>

        <button className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>
          Nueva nómina
        </button>

      </div>

    </div>
  </div>


  {/* Tarjetas estadísticas */}
  <div className="row g-4 mb-4">

    {/* Empleados */}
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body">

          <div className="d-flex justify-content-between align-items-start">

            <div>
              <p className="text-secondary mb-2">
                Empleados activos
              </p>

              <h3 className="fw-bold mb-1">
                2
              </h3>

              <small className="text-secondary">
                Empleados registrados
              </small>
            </div>

            <div className="bg-primary bg-opacity-10 text-primary rounded p-3">
              <i className="bi bi-people fs-4"></i>
            </div>

          </div>

        </div>
      </div>
    </div>


    {/* Nómina */}
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body">

          <div className="d-flex justify-content-between align-items-start">

            <div>
              <p className="text-secondary mb-2">
                Nómina del período
              </p>

              <h3 className="fw-bold mb-1">
                $0
              </h3>

              <small className="text-secondary">
                Total calculado
              </small>
            </div>

            <div className="bg-success bg-opacity-10 text-success rounded p-3">
              <i className="bi bi-cash-stack fs-4"></i>
            </div>

          </div>

        </div>
      </div>
    </div>


    {/* Novedades */}
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body">

          <div className="d-flex justify-content-between align-items-start">

            <div>
              <p className="text-secondary mb-2">
                Novedades pendientes
              </p>

              <h3 className="fw-bold mb-1">
                0
              </h3>

              <small className="text-secondary">
                Requieren revisión
              </small>
            </div>

            <div className="bg-warning bg-opacity-10 text-warning rounded p-3">
              <i className="bi bi-exclamation-circle fs-4"></i>
            </div>

          </div>

        </div>
      </div>
    </div>


    {/* Programaciones */}
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body">

          <div className="d-flex justify-content-between align-items-start">

            <div>
              <p className="text-secondary mb-2">
                Programaciones
              </p>

              <h3 className="fw-bold mb-1">
                2
              </h3>

              <small className="text-secondary">
                Programaciones registradas
              </small>
            </div>

            <div className="bg-info bg-opacity-10 text-info rounded p-3">
              <i className="bi bi-calendar3 fs-4"></i>
            </div>

          </div>

        </div>
      </div>
    </div>

  </div>


  {/* Paneles inferiores */}
  <div className="row g-4">

    {/* Actividad */}
    <div className="col-12 col-xl-7">

      <div className="card border-0 shadow-sm h-100">

        <div className="card-body p-4">

          <div className="d-flex justify-content-between align-items-center mb-4">

            <div>
              <h5 className="fw-bold mb-1">
                Actividad reciente
              </h5>

              <p className="text-secondary mb-0">
                Últimos movimientos del sistema
              </p>
            </div>

            <button className="btn btn-sm btn-outline-primary">
              Ver todo
            </button>

          </div>


          <div className="text-center py-5">

            <i className="bi bi-inbox fs-1 text-secondary"></i>

            <h6 className="fw-bold mt-3">
              No hay actividad reciente
            </h6>

            <p className="text-secondary mb-0">
              Los movimientos que realices aparecerán aquí.
            </p>

          </div>

        </div>

      </div>

    </div>


    {/* Estado nómina */}
    <div className="col-12 col-xl-5">

      <div className="card border-0 shadow-sm h-100">

        <div className="card-body p-4">

          <div className="mb-4">
            <h5 className="fw-bold mb-1">
              Estado de nómina
            </h5>

            <p className="text-secondary mb-0">
              Período actual
            </p>
          </div>


          <div className="list-group list-group-flush">

            <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-clock text-warning me-2"></i>
                Pendientes
              </span>

              <span className="badge bg-warning text-dark rounded-pill">
                0
              </span>
            </div>


            <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-calculator text-primary me-2"></i>
                Calculadas
              </span>

              <span className="badge bg-primary rounded-pill">
                0
              </span>
            </div>


            <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-check-circle text-success me-2"></i>
                Aprobadas
              </span>

              <span className="badge bg-success rounded-pill">
                0
              </span>
            </div>


            <div className="list-group-item px-0 d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-cash-coin text-success me-2"></i>
                Pagadas
              </span>

              <span className="badge bg-success rounded-pill">
                0
              </span>
            </div>

          </div>

        </div>

      </div>

    </div>

  </div>

</div>

);
}

export default Dashboard;
