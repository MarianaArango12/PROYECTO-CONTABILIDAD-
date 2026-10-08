import { useEffect, useState } from "react";

const URL_TURNOS = "http://localhost:3000/api/turnos";

function horasDelTurno(entrada, salida) {
  const [eh, em] = entrada.split(":").map(Number);
  const [sh, sm] = salida.split(":").map(Number);
  let minutos = sh * 60 + sm - (eh * 60 + em);
  if (minutos <= 0) minutos += 24 * 60;
  return minutos / 60;
}

function tokenGuardado() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
}

export function CrearHorario() {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("Noche 21 a 05");
  const [horaEntrada, setHoraEntrada] = useState("21:00");
  const [horaSalida, setHoraSalida] = useState("05:00");
  const [aviso, setAviso] = useState("");
  const [modelo, setModelo] = useState(null);

  useEffect(() => {
    const headers = { "Content-Type": "application/json" };
    const token = tokenGuardado();
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch(URL_TURNOS, { headers })
      .then((respuesta) => respuesta.json())
      .then((turnos) => {
        const lista = Array.isArray(turnos) ? turnos : [];
        const noche = lista.find((turno) => String(turno.nombre).toLowerCase().includes("noche")) ?? lista[0];
        setModelo(noche ?? null);
      })
      .catch(() => setAviso("No pude leer los turnos. Revisa el puerto del servidor."));
  }, []);

  async function guardar(evento) {
    evento.preventDefault();
    setAviso("");
    const horas = horasDelTurno(horaEntrada, horaSalida);
    const headers = { "Content-Type": "application/json" };
    const token = tokenGuardado();
    if (token) headers.Authorization = `Bearer ${token}`;

    const respuesta = await fetch(URL_TURNOS, {
      method: "POST",
      headers,
      body: JSON.stringify({
        nombre,
        horaEntrada,
        horaSalida,
        horasProgramadas: horas,
        jornada: modelo?.jornada ?? "NOCHE",
        tipo: modelo?.tipo ?? "NOCHE",
      }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      setAviso(datos.error ?? "No se pudo crear el horario");
      return;
    }
    window.location.reload();
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}>
        Crear horario
      </button>
    );
  }

  return (
    <form onSubmit={guardar} style={{ display: "grid", gap: 8, marginBottom: 16 }}>
      <strong>Nuevo horario</strong>
      <label>
        Nombre
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label>
        Entrada
        <input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} />
      </label>
      <label>
        Salida
        <input type="time" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} />
      </label>
      <p>{horasDelTurno(horaEntrada, horaSalida)} horas</p>
      <button type="submit">Guardar horario</button>
      {aviso ? <p>{aviso}</p> : null}
    </form>
  );
}