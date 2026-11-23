/* ===== Utilidades ===== */

// Buscar elementos por su ID
const $ = id => document.getElementById(id);

// Evitar problemas con caracteres especiales
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
}[c]));

// Guardar y consultar datos
const LS = (k, v) => {
    try {
        if (v === undefined) {
            return JSON.parse(localStorage.getItem(k));
        }

        localStorage.setItem(k, JSON.stringify(v));

    } catch {
        return null;
    }
};

// Obtener la fecha
const fk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const hoy = new Date();
const HOY = fk(hoy);

// Sumar días a la fecha actual
const mas = n => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return fk(d);
};

// Calcular diferencia entre fechas
const dif = f => Math.round(
    (new Date(f + "T00:00") - new Date(HOY + "T00:00")) / 864e5
);

// Días de la semana
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Meses del año
const MESES = [
    "Enero", "Febrero", "Marzo", "Abril",
    "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Convertir horas a minutos
const mn = h => {
    const [a, b] = h.split(":");
    return a * 60 + +b;
};

// Colores de las actividades
const TC = {
    Tarea: "#2f86ff",
    Entrega: "#22b45a",
    "Evaluación": "#e5484d",
    "Reunión": "#7059e0",
    Personal: "#f59e0b",
    Clase: "#2f86ff",
    Trabajo: "#f59e0b"
};

// Crear etiquetas
const chip = t => `<span class="chip" style="--c:${TC[t] || "#888"}">${t}</span>`;

// Crear opciones
const opts = a => a.map(x => `<option>${x}</option>`).join("");

// Recorrer listas
const L = (a, f) => a.map(f).join("");

// Mostrar mensajes
let tt;

const toast = m => {
    const t = $("toast");

    t.textContent = m;
    t.classList.add("show");

    clearTimeout(tt);

    tt = setTimeout(() => {
        t.classList.remove("show");
    }, 2200);
};


/* ===== Variables principales ===== */

let U, S;

let vista = "inicio";
let modo = "in";
let filtro = "todas";

let selD = HOY;
let mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);


/* ===== Datos de una cuenta nueva (vacía) ===== */

const vacio = () => ({
    cfg: {
        dark: false,
        color: "#7059e0",
        limite: 3,
        nombre: ""
    },

    tareas: [],
    act: [],
    hor: [],
    grupos: []
});


// Guardar información del usuario
const sv = () => LS("ou_data_" + U, S);

// Guardar, actualizar y mostrar mensajes
const fin = m => {
    sv();
    render();

    if (m) {
        toast(m);
    }
};


/* ===== Cálculos ===== */

// Consultar actividades de una fecha
const items = f => [
    ...S.tareas
        .filter(x => x.f === f && !x.ok)
        .map(x => ({
            t: x.t,
            tipo: "Tarea"
        })),

    ...S.act
        .map((a, i) => ({
            ...a,
            i
        }))
        .filter(a => a.f === f)
];

// Revisar si existen choques de horario
const conflictos = () => {
    const r = [];

    S.hor.forEach((a, i) => {
        S.hor.forEach((b, j) => {

            if (
                j > i &&
                a.dia === b.dia &&
                mn(a.i) < mn(b.f) &&
                mn(b.i) < mn(a.f)
            ) {
                r.push([a, b]);
            }

        });
    });

    return r;
};

// Calcular horas de cada día
const horas = d => S.hor
    .filter(x => x.dia === d)
    .reduce((s, x) => s + (mn(x.f) - mn(x.i)) / 60, 0);

// Obtener el lunes de la semana
const lunesSem = () => {
    const d = new Date();

    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));

    return d;
};

// Mostrar fecha en formato largo
const bonita = f => new Date(f + "T00:00").toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long"
});


/* ===== Vistas de la página ===== */

const V = {};


/* ===== Inicio ===== */

V.inicio = () => {

    const prox = [];

    for (let n = 0; n <= 14; n++) {
        items(mas(n)).forEach(i => {
            prox.push({
                ...i,
                f: mas(n),
                n
            });
        });
    }

    const sem = prox.filter(x => x.n <= 7).length;
    const cf = conflictos();
    const lim = S.cfg.limite;

    const nivel = sem >= lim * 2
        ? ["Alta", "#e5484d"]
        : sem >= lim
            ? ["Media", "#f59e0b"]
            : ["Ligera", "#22b45a"];

    const alertas = [];

    for (let n = 0; n <= 14; n++) {
        const k = items(mas(n)).length;

        if (k >= lim) {
            alertas.push(`⚠️ El ${bonita(mas(n))} tienes ${k} actividades juntas.`);
        }
    }

    cf.forEach(([a, b]) => {
        alertas.push(`⚠️ Choque el ${DIAS[a.dia]}: ${a.t} (${a.i}-${a.f}) y ${b.t} (${b.i}-${b.f}).`);
    });

    const l0 = lunesSem();

    return `
        <div class="stats">

            <button class="card stat" onclick="A.ir('tareas')">
                <small>Tareas pendientes</small>
                <strong>${S.tareas.filter(x => !x.ok).length}</strong>
            </button>

            <button class="card stat" onclick="A.ir('calendario')">
                <small>Entregas y evaluaciones (7 días)</small>
                <strong>${sem}</strong>
            </button>

            <button class="card stat" onclick="A.ir('horarios')">
                <small>Choques de horario</small>
                <strong style="color:${cf.length ? "#e5484d" : "#22b45a"}">${cf.length}</strong>
            </button>

            <div class="card stat">
                <small>Carga de la semana</small>
                <strong style="color:${nivel[1]}">${nivel[0]}</strong>
            </div>

        </div>

        <div class="grid2">

            <section class="card">
                <h3>📌 Próximas entregas y evaluaciones</h3>

                <ul class="lista">
                    ${L(prox.slice(0, 7), x => `
                        <li>
                            ${chip(x.tipo)}

                            <div class="t">
                                <b>${esc(x.t)}</b>

                                <small>
                                    ${x.n === 0 ? "Hoy" : x.n === 1 ? "Mañana" : "En " + x.n + " días"}
                                    · ${bonita(x.f)}
                                </small>
                            </div>
                        </li>
                    `) || '<li class="vacio">Nada pendiente. 🎉</li>'}
                </ul>
            </section>

            <section class="card">
                <h3>📊 Resumen de la semana</h3>

                ${L(DIAS, (d, i) => {
                    const dd = new Date(l0);

                    dd.setDate(l0.getDate() + i);

                    const k = items(fk(dd)).length;

                    return `
                        <div class="fila">
                            <b>${d}</b>

                            <div class="bar">
                                <i style="width:${Math.min(100, k / lim * 100)}%;${k >= lim ? "background:#e5484d" : ""}"></i>
                            </div>

                            <small>${k} act. · ${horas(i)}h</small>
                        </div>
                    `;
                })}
            </section>

            <section class="card">
                <h3>🔔 Alertas</h3>

                ${L(alertas, a => `<div class="aviso">${esc(a)}</div>`) ||
                '<div class="aviso ok">Todo en orden ✅ No hay acumulación ni choques.</div>'}
            </section>

        </div>
    `;
};


/* ===== Calendario ===== */

V.calendario = () => {

    const y = mes.getFullYear();
    const mo = mes.getMonth();

    const ini = (new Date(y, mo, 1).getDay() + 6) % 7;
    const n = new Date(y, mo + 1, 0).getDate();

    let c = L(DIAS, d => `<b class="cd">${d}</b>`) + "<i></i>".repeat(ini);

    for (let d = 1; d <= n; d++) {

        const f = fk(new Date(y, mo, d));
        const k = items(f).length;

        c += `
            <button class="dia ${f === HOY ? "hoy" : ""} ${f === selD ? "sel" : ""} ${k >= S.cfg.limite ? "carga" : ""}" onclick="A.dia('${f}')">
                ${d}
                ${k ? `<small>${k}</small>` : ""}
            </button>
        `;
    }

    return `
        <div class="grid2">

            <section class="card">

                <div class="head">
                    <button class="mini" onclick="A.mes(-1)" aria-label="Mes anterior">‹</button>

                    <h3>${MESES[mo]} ${y}</h3>

                    <button class="mini" onclick="A.mes(1)" aria-label="Mes siguiente">›</button>
                </div>

                <div class="cal">
                    ${c}
                </div>

                <p class="muted" style="margin-top:10px">
                    Rojo = carga alta (${S.cfg.limite} o más actividades).

                    <button class="chb" onclick="A.hoyb()">Ir a hoy</button>
                </p>

            </section>

            <section class="card">

                <h3>${esc(bonita(selD))}</h3>

                <ul class="lista">
                    ${L(items(selD), x => `
                        <li>
                            ${chip(x.tipo)}

                            <div class="t">
                                <b>${esc(x.t)}</b>
                            </div>

                            ${x.i !== undefined
                                ? `<button class="x" onclick="A.ad(${x.i})" aria-label="Eliminar">✕</button>`
                                : ""}
                        </li>
                    `) || '<li class="vacio">Sin actividades este día.</li>'}
                </ul>

                <h3 style="margin-top:18px">➕ Agregar actividad</h3>

                <form class="fm" onsubmit="return A.act(event)">

                    <input name="t" placeholder="Ej: Entrega de base de datos" required>

                    <select name="tipo">
                        ${opts(["Entrega", "Evaluación", "Reunión", "Personal"])}
                    </select>

                    <input name="f" type="date" value="${selD}" required>

                    <button class="btn">Guardar</button>

                </form>

            </section>

        </div>
    `;
};


/* ===== Horarios ===== */

V.horarios = () => {

    const bad = new Set(conflictos().flat());

    // Horas por tipo de bloque y tiempo libre total de la semana
    const r1 = n => +n.toFixed(1);
    const tot = tp => r1(S.hor.filter(x => x.tipo === tp).reduce((a, x) => a + (mn(x.f) - mn(x.i)) / 60, 0));
    const libreSem = r1(DIAS.reduce((a, d, i) => a + Math.max(0, 16 - horas(i)), 0));

    return `
        <div class="grid2">

            <section class="card">

                <h3>➕ Agregar bloque de horario</h3>

                <form class="fm" onsubmit="return A.hor(event)">

                    <input name="t" placeholder="Ej: Trabajo, Cálculo, Gimnasio" required>

                    <select name="tipo">
                        ${opts(["Clase", "Trabajo", "Personal"])}
                    </select>

                    <select name="dia">
                        ${L(DIAS, (d, i) => `<option value="${i}">${d}</option>`)}
                    </select>

                    <label>
                        Inicio
                        <input name="i" type="time" value="08:00" required>
                    </label>

                    <label>
                        Fin
                        <input name="f" type="time" value="10:00" required>
                    </label>

                    <button class="btn">Agregar</button>

                </form>

            </section>

            <section class="card">

                <h3>🕒 Mi semana</h3>

                <p class="muted">
                    Los bloques con borde rojo se cruzan.
                    El tiempo libre cuenta de 6:00 a 22:00.
                </p>

                ${S.hor.length ? `

                    <p style="margin:14px 0 8px">
                        ${chip("Clase")} ${tot("Clase")}h &nbsp;
                        ${chip("Trabajo")} ${tot("Trabajo")}h &nbsp;
                        ${chip("Personal")} ${tot("Personal")}h
                    </p>

                    ${L(DIAS, (d, i) => `
                        <div class="fila">
                            <b>${d}</b>

                            <div class="bar">
                                <i style="width:${Math.min(100, horas(i) / 16 * 100)}%;${S.hor.some(x => x.dia === i && bad.has(x)) ? "background:#e5484d" : ""}"></i>
                            </div>

                            <small>${r1(horas(i))}h ocupadas</small>
                        </div>
                    `)}

                    <p class="muted" style="margin:8px 0">
                        Tiempo libre de la semana: <b>${libreSem}h</b>
                    </p>

                    ${conflictos().length
                        ? L(conflictos(), ([a, b]) => `
                            <div class="aviso">
                                ⚠️ ${DIAS[a.dia]}: ${esc(a.t)} (${a.i}-${a.f}) se cruza con ${esc(b.t)} (${b.i}-${b.f})
                            </div>
                        `)
                        : '<div class="aviso ok">Sin choques de horario ✅</div>'}

                ` : '<p class="vacio" style="margin-top:14px">Agrega tu primer bloque para ver aquí el resumen de tu semana.</p>'}

            </section>

        </div>

        <div class="semh">

            ${L(DIAS, (d, di) => `
                <div class="col">

                    <h4>
                        ${d}

                        <small class="muted">
                            Libre ${Math.max(0, 16 - horas(di))}h
                        </small>
                    </h4>

                    ${L(
                        S.hor
                            .map((x, i) => ({ x, i }))
                            .filter(o => o.x.dia === di)
                            .sort((a, b) => a.x.i.localeCompare(b.x.i)),

                        ({ x, i }) => `
                            <div class="bl ${bad.has(x) ? "conf" : ""}" style="--c:${TC[x.tipo]}">

                                <span>
                                    <b>${esc(x.t)}</b>
                                    <br>
                                    ${x.i}-${x.f}
                                </span>

                                ${bad.has(x) ? "⚠️" : ""}

                                <button class="x" onclick="A.hd(${i})" aria-label="Eliminar">✕</button>

                            </div>
                        `
                    ) || '<small class="muted">Libre</small>'}

                </div>
            `)}

        </div>
    `;
};


/* ===== Tareas ===== */

V.tareas = () => {

    const l = S.tareas
        .map((x, i) => ({ x, i }))
        .filter(({ x }) => filtro === "todas" || (filtro === "hechas") === x.ok)
        .sort((a, b) => a.x.f.localeCompare(b.x.f));

    return `
        <div class="grid2">

            <section class="card">

                <h3>➕ Nueva tarea</h3>

                <form class="fm" onsubmit="return A.tarea(event)">

                    <input name="t" placeholder="Título" required>

                    <input name="d" placeholder="Descripción (opcional)">

                    <label>
                        Fecha de entrega
                        <input name="f" type="date" value="${mas(1)}" required>
                    </label>

                    <label>
                        Prioridad

                        <select name="p">
                            <option>Alta</option>
                            <option selected>Media</option>
                            <option>Baja</option>
                        </select>
                    </label>

                    <button class="btn">Agregar tarea</button>

                </form>

            </section>

            <section class="card">

                <h3>✅ Mis tareas</h3>

                <div class="chips">
                    ${L(["todas", "pendientes", "hechas"], v => `
                        <button class="chb ${filtro === v ? "on" : ""}" onclick="A.fil('${v}')">
                            ${v[0].toUpperCase() + v.slice(1)}
                        </button>
                    `)}
                </div>

                <ul class="lista">

                    ${L(l, ({ x, i }) => {

                        const v = !x.ok && x.f < HOY;

                        return `
                            <li class="${x.ok ? "hecha" : ""}">

                                <input type="checkbox" ${x.ok ? "checked" : ""} onchange="A.tg(${i})" aria-label="Completar">

                                <div class="t">

                                    <b>${esc(x.t)}</b>

                                    ${x.d ? `<small>${esc(x.d)}</small>` : ""}

                                    <small class="${v ? "rojo" : ""}">
                                        📅 ${x.f}${v ? " · vencida" : ""}
                                    </small>

                                </div>

                                <span class="pr ${x.p}">${x.p}</span>

                                <button class="x" onclick="A.td(${i})" aria-label="Eliminar">🗑️</button>

                            </li>
                        `;
                    }) || '<li class="vacio">No hay tareas aquí.</li>'}

                </ul>

            </section>

        </div>
    `;
};


/* ===== Grupos de trabajo ===== */

V.grupos = () => `

    <div class="grid2">

        <section class="card">

            <h3>➕ Nuevo trabajo grupal</h3>

            <form class="fm" onsubmit="return A.grupo(event)">

                <input name="n" placeholder="Nombre del trabajo" required>

                <input name="m" placeholder="Integrantes separados por coma">

                <button class="btn">Crear grupo</button>

            </form>

        </section>

    </div>

    <div class="grid2">

        ${L(S.grupos, (g, i) => {

            const h = g.ts.filter(t => t.ok).length;
            const p = g.ts.length ? Math.round(h / g.ts.length * 100) : 0;

            return `

                <section class="card">

                    <div class="head">

                        <h3>👥 ${esc(g.n)}</h3>

                        <button class="x" onclick="A.gd(${i})" aria-label="Eliminar grupo">🗑️</button>

                    </div>

                    <p>
                        ${L(g.m, m => `<span class="chip" style="--c:#7059e0">${esc(m)}</span> `)}
                    </p>

                    <div class="bar" style="margin:10px 0">
                        <i style="width:${p}%"></i>
                    </div>

                    <small class="muted">${p}% completado</small>

                    <ul class="lista">

                        ${L(g.ts, (t, j) => `

                            <li class="${t.ok ? "hecha" : ""}">

                                <input type="checkbox" ${t.ok ? "checked" : ""} onchange="A.gk(${i},${j})" aria-label="Completar">

                                <div class="t">

                                    <b>${esc(t.t)}</b>

                                    <small>👤 ${esc(t.r)} · 📅 ${t.f}</small>

                                </div>

                                <button class="x" onclick="A.gx(${i},${j})" aria-label="Eliminar">✕</button>

                            </li>

                        `) || '<li class="vacio">Sin tareas todavía.</li>'}

                    </ul>

                    <form class="fm" style="margin-top:10px" onsubmit="return A.gt(event,${i})">

                        <input name="t" placeholder="Nueva tarea del grupo" required>

                        <select name="r">
                            ${opts(g.m)}
                        </select>

                        <input name="f" type="date" value="${mas(3)}" required>

                        <button class="btn ghost">Asignar tarea</button>

                    </form>

                </section>

            `;
        })}

    </div>
`;


/* ===== Configuración ===== */

V.config = () => `

    <section class="card">

        <h3>⚙️ Configuración</h3>

        <div class="cfg">

            <form class="r" onsubmit="return A.nombre(event)">

                <input name="n" value="${esc(S.cfg.nombre || U)}" aria-label="Tu nombre" required>

                <button class="btn">Guardar nombre</button>

            </form>

            <div class="r">

                <button class="btn ghost" onclick="A.dark()">
                    ${S.cfg.dark ? "☀️ Desactivar" : "🌙 Activar"} modo oscuro
                </button>

            </div>

            <div>

                <p class="muted" style="margin-bottom:6px">
                    Color principal
                </p>

                <div class="sw">

                    ${L(["#7059e0", "#2f86ff", "#22b45a", "#e5484d", "#f59e0b"], c => `
                        <button class="${S.cfg.color === c ? "on" : ""}" style="background:${c}" onclick="A.color('${c}')" aria-label="Color ${c}"></button>
                    `)}

                </div>

            </div>

            <label class="muted">

                Alerta de carga: actividades por día

                <input type="number" min="1" max="8" value="${S.cfg.limite}" onchange="A.limite(this.value)">

            </label>

            <div class="r">

                <button class="btn ghost" onclick="A.exportar()">
                    ⬇️ Exportar mis datos
                </button>

                <button class="btn red" onclick="A.borrar()">
                    Borrar todos mis datos
                </button>

                <button class="btn ghost" onclick="A.salir()">
                    🚪 Cerrar sesión
                </button>

            </div>

        </div>

    </section>
`;


/* ===== Acciones de la página ===== */

const A = {

    // Cambiar entre iniciar sesión y registrarse
    modo(x) {

        modo = x;

        $("tIn").classList.toggle("on", x === "in");
        $("tReg").classList.toggle("on", x === "reg");

        $("lbtn").textContent = x === "in" ? "Entrar" : "Crear cuenta";
    },


    // Iniciar sesión o crear cuenta
    entrar(e) {

        e.preventDefault();

        const f = e.target;

        const u = f.u.value.trim();
        const p = f.p.value;

        const us = LS("ou_users") || {};

        if (modo === "reg") {

            if (us[u]) {
                toast("Ese usuario ya existe");
                return false;
            }

            us[u] = p;

            LS("ou_users", us);

            // La cuenta nueva empieza vacía
            LS("ou_data_" + u, vacio());

            toast("Cuenta creada 🎉");

        } else if (us[u] !== p) {

            toast("Usuario o contraseña incorrectos");
            return false;
        }

        LS("ou_session", u);

        f.reset();

        iniciar(u);

        return false;
    },


    // Cerrar sesión
    salir() {

        LS("ou_session", null);

        $("app").hidden = true;
        $("login").hidden = false;
    },


    // Cambiar de sección
    ir(v) {

        vista = v;

        render();

        scrollTo({
            top: 0
        });
    },


    // Seleccionar día
    dia(f) {

        selD = f;

        render();
    },


    // Cambiar de mes
    mes(n) {

        mes = new Date(mes.getFullYear(), mes.getMonth() + n, 1);

        render();
    },


    // Ir a la fecha actual
    hoyb() {

        selD = HOY;

        mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        render();
    },


    // Agregar actividad
    act(e) {

        e.preventDefault();

        const f = e.target;

        S.act.push({
            t: f.t.value.trim(),
            tipo: f.tipo.value,
            f: f.f.value
        });

        selD = f.f.value;

        fin("Actividad agregada");
    },


    // Eliminar actividad
    ad(i) {

        S.act.splice(i, 1);

        fin("Actividad eliminada");
    },


    // Agregar horario
    hor(e) {

        e.preventDefault();

        const f = e.target;

        if (mn(f.i.value) >= mn(f.f.value)) {

            toast("La hora de fin debe ser mayor que la de inicio");

            return false;
        }

        S.hor.push({
            t: f.t.value.trim(),
            tipo: f.tipo.value,
            dia: +f.dia.value,
            i: f.i.value,
            f: f.f.value
        });

        fin(
            conflictos().length
                ? "Agregado ⚠️ ¡Hay un choque de horario!"
                : "Bloque agregado"
        );
    },


    // Eliminar horario
    hd(i) {

        S.hor.splice(i, 1);

        fin("Bloque eliminado");
    },


    // Agregar tarea
    tarea(e) {

        e.preventDefault();

        const f = e.target;

        S.tareas.push({
            t: f.t.value.trim(),
            d: f.d.value.trim(),
            f: f.f.value,
            p: f.p.value,
            ok: false
        });

        fin("Tarea agregada");
    },


    // Marcar tarea como completada
    tg(i) {

        S.tareas[i].ok = !S.tareas[i].ok;

        fin(
            S.tareas[i].ok
                ? "¡Tarea completada! 🎉"
                : ""
        );
    },


    // Eliminar tarea
    td(i) {

        S.tareas.splice(i, 1);

        fin("Tarea eliminada");
    },


    // Filtrar tareas
    fil(v) {

        filtro = v;

        render();
    },


    // Crear grupo
    grupo(e) {

        e.preventDefault();

        const f = e.target;

        const m = f.m.value
            .split(",")
            .map(s => s.trim())
            .filter(Boolean);

        S.grupos.push({
            n: f.n.value.trim(),
            m: m.length ? m : ["Tú"],
            ts: []
        });

        fin("Grupo creado");
    },


    // Eliminar grupo
    gd(i) {

        if (confirm("¿Eliminar este grupo?")) {

            S.grupos.splice(i, 1);

            fin("Grupo eliminado");
        }
    },


    // Asignar tarea a un grupo
    gt(e, i) {

        e.preventDefault();

        const f = e.target;

        S.grupos[i].ts.push({
            t: f.t.value.trim(),
            r: f.r.value,
            f: f.f.value,
            ok: false
        });

        fin("Tarea asignada");
    },


    // Marcar tarea grupal como completada
    gk(i, j) {

        const t = S.grupos[i].ts[j];

        t.ok = !t.ok;

        fin();
    },


    // Eliminar tarea grupal
    gx(i, j) {

        S.grupos[i].ts.splice(j, 1);

        fin();
    },


    // Guardar nombre
    nombre(e) {

        e.preventDefault();

        S.cfg.nombre = e.target.n.value.trim();

        fin("Nombre actualizado");
    },


    // Activar o desactivar modo oscuro
    dark() {

        S.cfg.dark = !S.cfg.dark;

        tema();

        fin();
    },


    // Cambiar color principal
    color(c) {

        S.cfg.color = c;

        tema();

        fin("Color cambiado");
    },


    // Cambiar límite de actividades
    limite(v) {

        S.cfg.limite = Math.max(1, Math.min(8, +v || 3));

        fin("Límite actualizado");
    },


    // Exportar información
    exportar() {

        const a = document.createElement("a");

        a.href = URL.createObjectURL(
            new Blob(
                [JSON.stringify(S, null, 2)],
                { type: "application/json" }
            )
        );

        a.download = "organizau-datos.json";

        a.click();
    },


    // Borrar todos los datos del usuario (queda como cuenta nueva)
    borrar() {

        if (confirm("¿Seguro que quieres borrar todos tus datos? No se puede deshacer.")) {

            S = vacio();

            tema();

            fin("Datos borrados");
        }
    }

};


/* ===== Inicio de la aplicación ===== */

// Aplicar colores y modo oscuro
function tema() {

    document.body.classList.toggle("dark", S.cfg.dark);

    document.documentElement.style.setProperty(
        "--primary",
        S.cfg.color
    );
}


// Mostrar la información de cada sección
function render() {

    const n = S.cfg.nombre || U;

    $("saludo").textContent = `¡Hola, ${n}! 👋`;

    $("av").textContent = n[0].toUpperCase();

    document.querySelectorAll(".nav[data-v]").forEach(b => {

        b.classList.toggle("active", b.dataset.v === vista);

    });

    $("vista").innerHTML = V[vista]();
}


// Iniciar la aplicación
function iniciar(u) {

    U = u;

    S = LS("ou_data_" + u) || vacio();

    if (!S.cfg) {
        S = vacio();
    }

    vista = "inicio";
    selD = HOY;

    $("login").hidden = true;
    $("app").hidden = false;

    tema();

    render();
}


// Revisar si hay una sesión guardada
const ses = LS("ou_session");

if (ses && (LS("ou_users") || {})[ses] !== undefined) {

    iniciar(ses);

}