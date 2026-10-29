
$ErrorActionPreference = 'Stop'

$ruta = 'frontend/src/pages/Dashboard.jsx'
$contenido = Get-Content $ruta -Raw

function Reemplazar-Texto([string]$anterior, [string]$nuevo, [string]$descripcion) {
    if (-not $script:contenido.Contains($anterior)) {
        throw "No se encontró el bloque: $descripcion. No se guardaron cambios."
    }

    $script:contenido = $script:contenido.Replace($anterior, $nuevo)
    Write-Host "Preparado: $descripcion"
}

Reemplazar-Texto @'
function obtenerPeriodoActual() {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth()
  const dia = hoy.getDate()
  const inicio = new Date(anio, mes, dia <= 15 ? 1 : 16)
  const fin = dia <= 15 ? new Date(anio, mes, 15) : new Date(anio, mes + 1, 0)
  return { inicio, fin }
}
'@ @'
function obtenerPeriodoSeleccionado(mesSeleccionado, quincenaSeleccionada) {
  const [anio, mes] = mesSeleccionado.split('-').map(Number)
  const inicio = new Date(anio, mes - 1, quincenaSeleccionada === '1' ? 1 : 16)
  const fin = quincenaSeleccionada === '1'
    ? new Date(anio, mes - 1, 15)
    : new Date(anio, mes, 0)
  return { inicio, fin }
}
'@ 'función del período'

Reemplazar-Texto @'
  const usuario = obtenerUsuario()
  const [datos, setDatos] = useState({
'@ @'
  const usuario = obtenerUsuario()
  const [mesSeleccionado, setMesSeleccionado] = useState('2026-10')
  const [quincenaSeleccionada, setQuincenaSeleccionada] = useState('2')

  const [datos, setDatos] = useState({
'@ 'selectores de período'

Reemplazar-Texto @'
  const periodo = obtenerPeriodoActual()
  const inicioClave = fechaLocalClave(periodo.inicio)
  const finClave = fechaLocalClave(periodo.fin)

  const nominasPeriodo = (datos.nominas || []).filter((nomina) => {
    const inicio = fechaClave(nomina.periodoInicio)
    const fin = fechaClave(nomina.periodoFin)
    return inicio >= inicioClave && inicio <= finClave && fin >= inicio
  })
'@ @'
  const periodo = obtenerPeriodoSeleccionado(
    mesSeleccionado,
    quincenaSeleccionada
  )
  const inicioClave = fechaLocalClave(periodo.inicio)
  const finClave = fechaLocalClave(periodo.fin)

  const nominasPeriodo = (datos.nominas || []).filter((nomina) => {
    const inicio = fechaClave(nomina.periodoInicio)
    const fin = fechaClave(nomina.periodoFin)
    return inicio === inicioClave && fin >= inicio && fin <= finClave
  })
'@ 'filtro de nómina por quincena'

Reemplazar-Texto @'
              <p className="text-secondary mb-1">
                Consulta los indicadores de Conta-Pro a partir de
                los registros disponibles.
              </p>
              <small className="text-secondary">
                Período actual: {periodoTexto}
              </small>
'@ @'
              <p className="text-secondary mb-3">
                Consulta los indicadores de SIGOAR a partir de
                los registros disponibles.
              </p>

              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-6">
                  <label htmlFor="mesNomina" className="form-label">
                    Mes de nómina
                  </label>
                  <input
                    id="mesNomina"
                    type="month"
                    className="form-control"
                    value={mesSeleccionado}
                    onChange={(evento) => setMesSeleccionado(evento.target.value)}
                  />
                </div>

                <div className="col-12 col-sm-6">
                  <label htmlFor="quincenaNomina" className="form-label">
                    Quincena
                  </label>
                  <select
                    id="quincenaNomina"
                    className="form-select"
                    value={quincenaSeleccionada}
                    onChange={(evento) => setQuincenaSeleccionada(evento.target.value)}
                  >
                    <option value="1">Primera: del 1 al 15</option>
                    <option value="2">Segunda: del 16 al último día</option>
                  </select>
                </div>
              </div>

              <small className="text-secondary">
                Período consultado: {periodoTexto}
              </small>
'@ 'selector de mes y quincena'

Reemplazar-Texto @'
  const actividad = obtenerActividad(datos.nominas || [], datos.novedades || [])
'@ @'
  const actividad = obtenerActividad(nominasPeriodo, datos.novedades || [])
'@ 'actividad de nómina por período'

$temporal = "$ruta.temporal"
Set-Content -Path $temporal -Value $script:contenido -Encoding UTF8
Move-Item -Path $temporal -Destination $ruta -Force

Write-Host ''
Write-Host 'Dashboard actualizado correctamente.' -ForegroundColor Green
