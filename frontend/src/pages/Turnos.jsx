import { useEffect, useState } from 'react';

import {
  obtenerTurnos,
  crearTurno,
  actualizarTurno,
  cambiarEstadoTurno,
} from '../services/turnos.service';

function Turnos() {
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [turnoEditando, setTurnoEditando] = useState(null);

  const [formulario, setFormulario] = useState({
    nombre: '',
    descripcion: '',
    horaEntrada: '',
    horaSalida: '',
    horasProgramadas: '',
    jornada: '',
    tipo: 'DIA',
  });

  async function cargarTurnos() {
    try {
      setCargando(true);
      setError('');

      const datos = await obtenerTurnos();
      setTurnos(datos);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarTurnos();
  }, []);

  function limpiarFormulario() {
    setFormulario({
      nombre: '',
      descripcion: '',
      horaEntrada: '',
      horaSalida: '',
      horasProgramadas: '',
      jornada: '',
      tipo: 'DIA',
    });

    setTurnoEditando(null);
  }

  function abrirCrear() {
    limpiarFormulario();
    setMostrarFormulario(true);
    setMensaje('');
    setError('');
  }

  function abrirEditar(turno) {
    setTurnoEditando(turno);

    setFormulario({
      nombre: turno.nombre || '',
      descripcion: turno.descripcion || '',
      horaEntrada: turno.horaEntrada || '',
      horaSalida: turno.horaSalida || '',
      horasProgramadas: turno.horasProgramadas ?? '',
      jornada: turno.jornada ?? '',
      tipo: turno.tipo || 'DIA',
    });

    setMostrarFormulario(true);
    setMensaje('');
    setError('');
  }

  function cerrarFormulario() {
    setMostrarFormulario(false);
    limpiarFormulario();
  }

  function manejarCambio(evento) {
    const { name, value } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  }

  async function manejarSubmit(evento) {
    evento.preventDefault();

    try {
      setError('');
      setMensaje('');

      const datos = {
        nombre: formulario.nombre.trim(),
        descripcion: formulario.descripcion.trim() || null,
        horaEntrada: formulario.horaEntrada || null,
        horaSalida: formulario.horaSalida || null,
        horasProgramadas:
          formulario.horasProgramadas === ''
            ? null
            : Number(formulario.horasProgramadas),
        jornada:
          formulario.jornada === ''
            ? null
            : Number(formulario.jornada),
        tipo: formulario.tipo,
      };

      if (turnoEditando) {
        await actualizarTurno(turnoEditando.id, datos);
        setMensaje('Turno actualizado correctamente');
      } else {
        await crearTurno(datos);
        setMensaje('Turno creado correctamente');
      }

      cerrarFormulario();
      await cargarTurnos();
    } catch (error) {
      console.error(error);
      setError(error.message);
    }
  }

  async function manejarEstado(turno) {
    const nuevoEstado = !turno.activo;

    try {
      setError('');
      setMensaje('');

      await cambiarEstadoTurno(turno.id, nuevoEstado);

      setMensaje(
        nuevoEstado
          ? 'Turno activado correctamente'
          : 'Turno desactivado correctamente'
      );

      await cargarTurnos();
    } catch (error) {
      console.error(error);
      setError(error.message);
    }
  }

  if (cargando) {
    return (
      <div className="pagina">
        <h1>Turnos</h1>
        <p>Cargando turnos...</p>
      </div>
    );
  }

  return (
    <div className="pagina">

      <div className="encabezado-pagina">
        <div>
          <h1>Turnos</h1>
          <p>Administración de turnos de trabajo</p>
        </div>

        <button onClick={abrirCrear}>
          + Nuevo turno
        </button>
      </div>

      {error && (
        <div className="mensaje error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mensaje exito">
          {mensaje}
        </div>
      )}

      {mostrarFormulario && (
        <div className="tarjeta formulario-turno">

          <h2>
            {turnoEditando ? 'Editar turno' : 'Crear turno'}
          </h2>

          <form onSubmit={manejarSubmit}>

            <div className="grupo-formulario">
              <label>Nombre</label>

              <input
                type="text"
                name="nombre"
                value={formulario.nombre}
                onChange={manejarCambio}
                placeholder="Ej. Vigilancia 12 horas día"
                required
              />
            </div>

            <div className="grupo-formulario">
              <label>Descripción</label>

              <textarea
                name="descripcion"
                value={formulario.descripcion}
                onChange={manejarCambio}
                placeholder="Descripción del turno"
              />
            </div>

            <div className="fila-formulario">

              <div className="grupo-formulario">
                <label>Hora de entrada</label>

                <input
                  type="time"
                  name="horaEntrada"
                  value={formulario.horaEntrada}
                  onChange={manejarCambio}
                />
              </div>

              <div className="grupo-formulario">
                <label>Hora de salida</label>

                <input
                  type="time"
                  name="horaSalida"
                  value={formulario.horaSalida}
                  onChange={manejarCambio}
                />
              </div>

            </div>

            <div className="fila-formulario">

              <div className="grupo-formulario">
                <label>Horas programadas</label>

                <input
                  type="number"
                  name="horasProgramadas"
                  value={formulario.horasProgramadas}
                  onChange={manejarCambio}
                  min="0"
                  step="0.5"
                  placeholder="Ej. 12"
                />
              </div>

              <div className="grupo-formulario">
                <label>Jornada</label>

                <input
                  type="number"
                  name="jornada"
                  value={formulario.jornada}
                  onChange={manejarCambio}
                  min="0"
                  step="0.5"
                  placeholder="Ej. 12"
                />
              </div>

            </div>

            <div className="grupo-formulario">
              <label>Tipo de turno</label>

              <select
                name="tipo"
                value={formulario.tipo}
                onChange={manejarCambio}
                required
              >
                <option value="DIA">Día</option>
                <option value="NOCHE">Noche</option>
                <option value="MIXTO">Mixto</option>
                <option value="FIJO">Fijo</option>
                <option value="ROTATIVO">Rotativo</option>
              </select>
            </div>

            <div className="acciones-formulario">

              <button type="submit">
                {turnoEditando ? 'Guardar cambios' : 'Crear turno'}
              </button>

              <button
                type="button"
                onClick={cerrarFormulario}
              >
                Cancelar
              </button>

            </div>

          </form>
        </div>
      )}

      <div className="tarjeta">

        <h2>Turnos registrados</h2>

        {turnos.length === 0 ? (
          <p>No hay turnos registrados.</p>
        ) : (
          <div className="tabla-contenedor">

            <table>

              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Horas</th>
                  <th>Jornada</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>

                {turnos.map((turno) => (
                  <tr key={turno.id}>

                    <td>{turno.nombre}</td>

                    <td>
                      {turno.horaEntrada || '-'}
                    </td>

                    <td>
                      {turno.horaSalida || '-'}
                    </td>

                    <td>
                      {turno.horasProgramadas ?? '-'}
                    </td>

                    <td>
                      {turno.jornada ?? '-'}
                    </td>

                    <td>
                      {turno.tipo}
                    </td>

                    <td>
                      {turno.activo ? 'Activo' : 'Inactivo'}
                    </td>

                     <td>
                    <div className="acciones-turno">

                      <button
                        type="button"
                        onClick={() => abrirEditar(turno)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => manejarEstado(turno)}
                      >
                        {turno.activo
                          ? 'Desactivar'
                          : 'Activar'}
                      </button>

                    </div>
                  </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}

export default Turnos;
