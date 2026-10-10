'use strict';
/* ================== UTILIDADES ================== */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function money(n) { const a = Math.abs(n), s = n < 0 ? '-' : ''; if (a >= 1e6) return s + 'US$ ' + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + ' M'; if (a >= 1e4) return s + 'US$ ' + Math.round(a / 1e3) + ' mil'; return s + 'US$ ' + Math.round(a).toLocaleString('es-PE'); }
function poisson(l) { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }

/* ================== LIGAS Y CLUBES (inventados, pero reconocibles) ================== */
// str: nivel medio de la liga. wage: multiplicador de sueldos. cont: torneo continental.
const LEAGUES = [
  { id: 'per', name: 'Liga 1 Perú', country: 'Perú', str: 56, wage: 1, cont: 'amer', clubs: ['Íntimos de La Victoria', 'Cremas del Estadio', 'Celestes del Rímac', 'Rojos del Callao', 'Leones de Arequipa', 'Andinos del Cusco', 'Tiburones de Chimbote', 'Norteños de Trujillo'] },
  { id: 'arg', name: 'Liga Argentina', country: 'Argentina', str: 67, wage: 3, cont: 'amer', clubs: ['Xeneizes del Puerto', 'Millonarios de Núñez', 'Diablos de Avellaneda', 'Academia de Avellaneda', 'Santos de Boedo', 'Leprosos de Rosario', 'Canallas de Rosario', 'Pinchas de La Plata'] },
  { id: 'bra', name: 'Liga Brasileña', country: 'Brasil', str: 70, wage: 4, cont: 'amer', clubs: ['Rubro-Negro de Río', 'Alviverde Paulista', 'Timão del Parque', 'Tricolor Paulista', 'Peixe de la Costa', 'Galo Minero', 'Colorado del Sur', 'Gremistas del Sur'] },
  { id: 'mex', name: 'Liga Mexicana', country: 'México', str: 64, wage: 6, cont: 'amer', clubs: ['Águilas de la Capital', 'Rebaño Sagrado', 'Rayados del Norte', 'Tigres Universitarios', 'Pumas de la Capital', 'Cementeros Azules', 'Diablos de Toluca', 'Tuzos de Pachuca'] },
  { id: 'usa', name: 'Liga de Estados Unidos', country: 'EE.UU.', str: 62, wage: 7, cont: null, clubs: ['Galaxia de Los Ángeles', 'Garzas de Miami', 'Toros de Nueva York', 'Fuego de Chicago', 'Sirenas de Seattle', 'Tormenta de Atlanta', 'Lobos de Austin', 'Cañones de Filadelfia'] },
  { id: 'por', name: 'Liga Portuguesa', country: 'Portugal', str: 71, wage: 6, cont: 'euro', clubs: ['Águilas de Lisboa', 'Dragones de Oporto', 'Leones de Lisboa', 'Guerreros de Braga', 'Vitorianos del Norte', 'Marítimos de la Isla', 'Académicos de Coímbra', 'Boavisteros'] },
  { id: 'esp', name: 'Liga Española', country: 'España', str: 81, wage: 40, cont: 'euro', clubs: ['Real Castilla', 'Blaugrana de Cataluña', 'Colchoneros de la Capital', 'Sevillistas del Sur', 'Verdiblancos Béticos', 'Txuri-urdin del Norte', 'Leones de Bilbao', 'Submarino Amarillo'] },
  { id: 'ing', name: 'Liga Inglesa', country: 'Inglaterra', str: 83, wage: 60, cont: 'euro', clubs: ['Mánchester Rojo', 'Mánchester Celeste', 'Rojos del Mersey', 'Gunners de Londres', 'Blues de Londres', 'Spurs del Norte', 'Urracas de Newcastle', 'Villanos de Birmingham'] },
  { id: 'ita', name: 'Liga Italiana', country: 'Italia', str: 80, wage: 35, cont: 'euro', clubs: ['La Vecchia de Turín', 'Rossoneri de Milán', 'Nerazzurri de Milán', 'Lobos de Roma', 'Partenopei de Nápoles', 'Águilas Celestes de Roma', 'Violetas de Florencia', 'Diosas de Bérgamo'] },
  { id: 'ara', name: 'Liga Árabe', country: 'Arabia', str: 66, wage: 90, cont: null, clubs: ['Halcones de Riad', 'Victoria de Riad', 'Unión de Yeda', 'Estrella de Riad', 'Leones del Desierto', 'Perlas del Golfo', 'Tigres de Dammam', 'Caballeros de Yeda'] },
];
const CONT_NAME = { amer: 'Copa de las Américas', euro: 'Liga de Campeones' };
const CLUB_COLORS = ['#E23B3B', '#2E6BFF', '#FFFFFF', '#19A35A', '#FFE14D', '#6FB3E0', '#7B3FF2', '#1B1523', '#FF7A1A', '#C0392B', '#9FD3F2', '#8B1E3F'];
function buildWorld() {
  const clubs = [];
  let id = 0;
  for (const L of LEAGUES) {
    const r = mulberry32(L.id.charCodeAt(0) * 97 + L.id.charCodeAt(1));
    L.clubs.forEach((name, i) => {
      const str = Math.round(L.str + 9 - i * 2.4 + (r() - 0.5) * 4);
      clubs.push({ id: id++, name, league: L.id, str, base: str, c1: CLUB_COLORS[Math.floor(r() * CLUB_COLORS.length)], c2: CLUB_COLORS[Math.floor(r() * CLUB_COLORS.length)] });
    });
  }
  return clubs;
}

/* ================== JUGADOR ================== */
const POSITIONS = {
  DEL: { name: 'Delantero', w: { pac: 0.22, sho: 0.34, pas: 0.1, dri: 0.2, def: 0.02, phy: 0.12 }, goal: 0.3, ast: 0.14, solo: 0.28 },
  EXT: { name: 'Extremo', w: { pac: 0.3, sho: 0.2, pas: 0.14, dri: 0.26, def: 0.02, phy: 0.08 }, goal: 0.18, ast: 0.26, solo: 0.16 },
  MED: { name: 'Mediocampista', w: { pac: 0.1, sho: 0.14, pas: 0.32, dri: 0.2, def: 0.12, phy: 0.12 }, goal: 0.1, ast: 0.3, solo: 0.08 },
  DEF: { name: 'Defensa', w: { pac: 0.14, sho: 0.03, pas: 0.13, dri: 0.06, def: 0.4, phy: 0.24 }, goal: 0.04, ast: 0.07, solo: 0.02 },
};
const ATTRS = [['pac', 'Velocidad'], ['sho', 'Tiro'], ['pas', 'Pase'], ['dri', 'Regate'], ['def', 'Defensa'], ['phy', 'Físico']];
const BARRIOS = ['Comas', 'San Juan de Lurigancho', 'El Callao', 'La Victoria', 'Villa El Salvador', 'Rímac', 'Chorrillos', 'Independencia', 'Chimbote', 'Trujillo', 'Arequipa', 'Iquitos'];
const FIRST = ['Kevin', 'Jhonatan', 'Luis', 'Paolo', 'Renato', 'Christian', 'Diego', 'Brayan', 'Jefferson', 'André', 'Piero', 'Yoshimar', 'Alex', 'Carlos', 'Gianluca', 'Sebastián'];
const LAST = ['Quispe', 'Flores', 'Ramírez', 'Huamán', 'Rodríguez', 'Mendoza', 'Cueva', 'Guerrero', 'Farfán', 'Carrillo', 'Advíncula', 'Tapia', 'Zambrano', 'Peña', 'Lapadula', 'Yotún'];
const PARTNER_NAMES = ['Valeria', 'Camila', 'Fiorella', 'Daniela', 'Alessandra', 'Milagros', 'Lucía', 'Andrea', 'Mía', 'Ximena'];

/* ================== VIDA ================== */
const HOUSES = [
  { name: 'Cuarto en casa de tu mamá', cost: 0, week: 0, happy: 0 },
  { name: 'Depa en Miraflores', cost: 180000, week: 600, happy: 6 },
  { name: 'Casa con jardín', cost: 1200000, week: 3000, happy: 12 },
  { name: 'Mansión con piscina', cost: 7000000, week: 15000, happy: 20 },
];
const CARS = [
  { id: 'moto', name: 'Moto', cost: 3000, fame: 0, col: '#E23B3B' },
  { id: 'usado', name: 'Auto usado', cost: 14000, fame: 1, col: '#9AA0A6' },
  { id: 'suv', name: 'Camioneta 4x4', cost: 70000, fame: 3, col: '#1B1523' },
  { id: 'deportivo', name: 'Deportivo italiano', cost: 320000, fame: 6, col: '#E23B3B' },
  { id: 'lujo', name: 'Sedán de lujo', cost: 180000, fame: 4, col: '#F4F4F2' },
  { id: 'hiper', name: 'Hiperdeportivo', cost: 2500000, fame: 10, col: '#FFE14D' },
];
const WEEK_PLANS = [
  { id: 'fuerte', name: 'Entrenar fuerte', desc: 'Mejoras más rápido, pero te cansas y puedes lesionarte.', fx: { train: 1.6, fatigue: 22, happy: -3, disc: 3, trust: 3 } },
  { id: 'normal', name: 'Entrenar normal', desc: 'Lo que manda el club. Equilibrado.', fx: { train: 1, fatigue: 10, happy: 0, disc: 1, trust: 1 } },
  { id: 'descanso', name: 'Descansar', desc: 'Llegas fresco al partido. Mejoras poco.', fx: { train: 0.35, fatigue: -28, happy: 3, disc: 0, trust: -1 } },
  { id: 'familia', name: 'Familia y pareja', desc: 'Sube tu felicidad y tu relación.', fx: { train: 0.5, fatigue: -12, happy: 8, disc: 1, trust: 0, rel: 8 } },
  { id: 'fiesta', name: 'Salir de fiesta', desc: 'Diversión y fama. Llegas cansado y al DT no le gusta.', fx: { train: 0.2, fatigue: 26, happy: 12, disc: -9, trust: -5, fame: 2 }, adult: true },
];

/* ================== EVENTOS DE VIDA ================== */
// when(p) decide si puede salir; cada opción tiene efectos (fx) y un resultado.
// Efectos posibles: money, happy, disc, fame, trust, fatigue, form, rel, mom, friends, ovr, injury, followers
const EVENTS = [
  { id: 'colegio', when: p => p.age < 18, title: 'El colegio', text: 'Tienes examen final y entrenamiento el mismo día.', opts: [{ t: 'Estudiar', fx: { mom: 10, trust: -4, disc: 3 }, res: 'Aprobaste. Tu mamá está orgullosa.' }, { t: 'Ir a entrenar', fx: { trust: 6, mom: -8, ovr: 0.5 }, res: 'El DT de menores lo notó.' }] },
  { id: 'patas', when: p => p.age < 21, title: 'Tu collera del barrio', text: 'Tus patas te invitan a jugar una pichanga por plata el domingo.', opts: [{ t: 'Ir con ellos', fx: { friends: 10, happy: 6, injury: 0.12, disc: -3 }, res: 'Ganaron y te trataron como rey del barrio.' }, { t: 'Quedarte descansando', fx: { friends: -6, fatigue: -10 }, res: 'Te dijeron que ya te subiste al carro.' }] },
  { id: 'agente', when: p => p.age >= 17 && !p.agent, title: 'Un representante te busca', text: 'Un agente con lentes oscuros te promete llevarte a Europa. Quiere el 20 % de todo.', opts: [{ t: 'Firmar con él', fx: { agent: 'turbio' }, res: 'Firmaste. Consigue ofertas, pero cobra caro.' }, { t: 'Buscar uno serio', fx: { agent: 'serio', money: -500 }, res: 'Contrataste una agencia seria. Menos promesas, más seguridad.' }, { t: 'Seguir sin agente', fx: {}, res: 'Por ahora te manejas solo.' }] },
  { id: 'banca', when: p => p.trust < 40 && p.age >= 17, title: 'Estás en la banca', text: 'Llevas semanas sin jugar. ¿Qué haces?', opts: [{ t: 'Hablar con el DT', fx: () => (chance(0.6) ? { trust: 12 } : { trust: -6, happy: -4 }), res: 'Tuvieron una conversación sincera.' }, { t: 'Entrenar el doble', fx: { ovr: 0.8, fatigue: 18, trust: 6 }, res: 'El DT te vio quedarte hasta tarde.' }, { t: 'Quejarte en redes', fx: { trust: -15, fame: 4, followers: 20000 }, res: 'Tu post se hizo viral. El DT no te habla.' }] },
  { id: 'novia', when: p => p.age >= 18 && p.rel === 'soltero', title: 'Alguien especial', text: 'Conociste a alguien en un cumpleaños. Te escribe seguido.', opts: [{ t: 'Invitarla a salir', fx: { rel: 'pareja', happy: 10 }, res: 'Empezaron a salir.' }, { t: 'Enfocarte en el fútbol', fx: { disc: 4 }, res: 'Le dijiste que ahora no es el momento.' }] },
  { id: 'boda', when: p => p.rel === 'pareja' && p.relLvl > 70 && p.age >= 22, title: 'Tu pareja quiere algo serio', text: 'Llevan tiempo juntos. Te pregunta hacia dónde va la relación.', opts: [{ t: 'Proponerle matrimonio', fx: { rel: 'casado', happy: 14, money: -40000, disc: 5 }, res: '¡Dijo que sí! Fue una boda preciosa.' }, { t: 'Todavía no', fx: { relLvl: -25, happy: -5 }, res: 'Se quedó pensativa.' }] },
  { id: 'hijo', when: p => p.rel === 'casado' && p.kids < 3 && chance(0.4), title: '¡Vas a ser papá!', text: 'Tu esposa te da la noticia.', opts: [{ t: '¡Qué felicidad!', fx: { kids: 1, happy: 18, disc: 6 }, res: 'Tu familia crece. Celebrarás los goles con la cuna.' }] },
  { id: 'ruptura', when: p => p.rel === 'pareja' && p.relLvl < 25, title: 'Problemas en la relación', text: 'Tu pareja siente que nunca estás. Te pide tiempo.', opts: [{ t: 'Esforzarte por ella', fx: { relLvl: 25, happy: -3 }, res: 'Tuvieron una buena conversación.' }, { t: 'Terminar', fx: { rel: 'soltero', happy: -12 }, res: 'Terminaron. Semanas difíciles.' }] },
  { id: 'disco', when: p => p.age >= 18, title: 'La noche antes del partido', text: 'Tus compañeros van a una discoteca a celebrar un cumpleaños.', opts: [{ t: 'Ir un rato', fx: { happy: 6, fatigue: 12, friends: 5, disc: -2 }, res: 'Te fuiste temprano. Nadie se enteró.' }, { t: 'Quedarte hasta el final', fx: { happy: 12, fatigue: 30, disc: -8, fame: 3, scandal: 0.35 }, res: 'Fue una noche épica.' }, { t: 'Dormir temprano', fx: { disc: 4, fatigue: -5 }, res: 'Profesional.' }] },
  { id: 'mama', when: p => p.money > 20000 && !p.momHouse, title: 'Tu mamá', text: 'Tu mamá sigue viviendo en el barrio, en la misma casita de siempre.', opts: [{ t: 'Comprarle una casa (US$ 60 mil)', fx: { money: -60000, momHouse: true, happy: 15, mom: 30, fame: 2 }, res: 'Lloró de felicidad. Le cumpliste el sueño.' }, { t: 'Más adelante', fx: {}, res: 'Ella dice que no necesita nada.' }] },
  { id: 'prestamo', when: p => p.money > 10000, title: 'Un amigo te pide plata', text: 'Tu pata de la infancia quiere abrir una pollería. Te pide US$ 8 mil.', opts: [{ t: 'Prestarle', fx: { money: -8000, friends: 15, loan: true }, res: 'Te abrazó. Dice que te pagará con intereses.' }, { t: 'No prestarle', fx: { friends: -12 }, res: 'Se fue molesto.' }] },
  { id: 'negocio', when: p => p.money > 200000, title: 'Oportunidad de negocio', text: 'Te proponen invertir en una cadena de gimnasios.', opts: [{ t: 'Invertir US$ 100 mil', fx: { money: -100000, invest: 100000 }, res: 'Ahora eres socio. Se verá si sale bien.' }, { t: 'No arriesgar', fx: {}, res: 'Prefieres guardar tu plata.' }] },
  { id: 'marca', when: p => p.fame > 30 && !p.sponsor, title: 'Una marca te quiere', text: 'Una marca deportiva quiere que seas su imagen.', opts: [{ t: 'Aceptar', fx: { sponsor: true, fame: 5 }, res: 'Firmaste tu primer auspicio. Cobrarás cada semana.' }, { t: 'Pedir más plata', fx: { sponsorBig: true }, res: 'Aceptaron... pero te exigen resultados.' }] },
  { id: 'prensa', when: p => p.fame > 15, title: 'Conferencia de prensa', text: 'Un periodista te pregunta por qué el equipo juega tan mal.', opts: [{ t: 'Defender al equipo', fx: { trust: 6, fame: 1 }, res: 'El vestuario valoró tu respuesta.' }, { t: 'Criticar al DT', fx: { trust: -18, fame: 6, followers: 30000 }, res: 'Fue titular en todos los diarios.' }, { t: 'Hacer un chiste', fx: { fame: 3, followers: 15000 }, res: 'Te volviste meme. De los buenos.' }] },
  { id: 'lesionrisk', when: p => p.fatigue > 70, title: 'Tu cuerpo avisa', text: 'Sientes una molestia en el muslo. El médico recomienda parar.', opts: [{ t: 'Parar una semana', fx: { fatigue: -40, trust: -3 }, res: 'Te recuperaste bien.' }, { t: 'Jugar igual', fx: { injury: 0.45, trust: 4 }, res: 'Apretaste los dientes.' }] },
  { id: 'redes', when: p => p.followers > 50000, title: 'Tus redes explotan', text: 'Tienes una propuesta para grabar publicidad en redes.', opts: [{ t: 'Aceptar', fx: p => ({ money: Math.round(3000 + p.fame * 400), followers: 40000, fatigue: 8 }), res: 'Ganaste plata extra y más seguidores.' }, { t: 'Rechazar', fx: { disc: 2 }, res: 'Prefieres hablar en la cancha.' }] },
  { id: 'capitan', when: p => p.age >= 27 && p.trust > 70, title: 'La cinta de capitán', text: 'El DT te ofrece ser el capitán del equipo.', opts: [{ t: 'Aceptar con orgullo', fx: { captain: true, trust: 8, happy: 6, fame: 4 }, res: 'Eres el nuevo capitán.' }, { t: 'Prefiero no', fx: {}, res: 'Sigues siendo un líder sin cinta.' }] },
  { id: 'veterano', when: p => p.age >= 33, title: 'El paso de los años', text: 'Te cuesta más recuperarte. Un preparador físico privado podría ayudarte.', opts: [{ t: 'Contratarlo (US$ 20 mil)', fx: { money: -20000, slowAging: true }, res: 'Te cuidas como nunca.' }, { t: 'Seguir igual', fx: {}, res: 'El cuerpo dirá.' }] },
  { id: 'escandalo', when: p => p.disc < 30 && p.age >= 18, title: '¡Escándalo!', text: 'Un video tuyo de fiesta circula en redes justo después de perder.', opts: [{ t: 'Pedir disculpas públicas', fx: { fame: -2, trust: 4, disc: 8 }, res: 'La gente valoró tu sinceridad.' }, { t: 'Ignorarlo', fx: { trust: -12, fame: 3, happy: -4 }, res: 'La hinchada no te lo perdona.' }] },
];

/* ================== GENTE DE TU VIDA ================== */
const DT_NAMES = ['Profe Gareca', 'Profe Chemo', 'Míster Ricardo', 'Profe Bengoechea', 'Míster Fossati', 'Profe Reynoso', 'Míster Ancelo', 'Profe Pochettón', 'Míster Klopper', 'Profe Simeón', 'Míster Guardiolo', 'Profe Bielsita'];
const AGENT_NAMES = { turbio: 'Tito "el Vivo" Salas', serio: 'Agencia Andina Sports' };
const PEOPLE_INFO = {
  dt: { t: 'Tu DT', d: 'Si te quiere, juegas más.' },
  amigo: { t: 'Tu mejor amigo del equipo', d: 'Te sube el ánimo y te cubre.' },
  rival: { t: 'Tu rival por el puesto', d: 'Si se llevan mal, habrá problemas.' },
  agente: { t: 'Tu representante', d: 'Si confía en ti, te consigue mejores ofertas.' },
};

/* ================== CLÁSICOS (índices de club dentro de su liga) ================== */
const DERBIES = { per: [[0, 1], [3, 2]], arg: [[0, 1], [2, 3], [5, 6]], bra: [[1, 2], [6, 7], [0, 4]], mex: [[0, 1], [2, 3], [0, 4]], usa: [[0, 1], [2, 7]], por: [[0, 2], [0, 1]], esp: [[0, 1], [3, 4], [0, 2]], ing: [[0, 1], [3, 5], [2, 0]], ita: [[1, 2], [3, 5], [0, 2]], ara: [[0, 1], [2, 7]] };

/* ================== MASCOTAS ================== */
const PETS = [
  { id: 'perro', name: 'Perro chusquito', cost: 400, happy: 6, col: '#C58A4A', desc: 'Leal, juguetón y ladra cuando pierdes.' },
  { id: 'labrador', name: 'Labrador', cost: 2500, happy: 8, col: '#E8C27A', desc: 'Te espera en la puerta después de cada partido.' },
  { id: 'gato', name: 'Gato', cost: 300, happy: 5, col: '#2B2B30', desc: 'Duerme en tu camiseta de la suerte.' },
  { id: 'gatonaranja', name: 'Gato naranja', cost: 600, happy: 6, col: '#F09A3E', desc: 'Tiene más seguidores que tú.' },
];

/* ================== RELATO Y APODOS ================== */
const PHRASES = {
  goal: ['¡GOOOL DE {k}! ¡La tribuna se viene abajo!', '¡GOLAZO de {k}! ¡Qué manera de definir!', '¡{k}, {k}, {k}! ¡Gol para {t}!', '¡Adentro! {k} la mandó a guardar donde duermen las arañas.', '¡GOOOL! {k} se sacó a dos y la cruzó al palo lejano.', '¡Qué zurdazo, qué derechazo, qué golazo de {k}!', '¡Gol de {k}! ¡Ese chico es de otro planeta!', '¡De cabeza! ¡{k} se elevó más alto que todos!'],
  assist: ['¡Gol de {t}! Pase de lujo de {k}, que la puso con la mano.', 'Asistencia de {k}: la vio antes que nadie y habilitó al compañero.', '¡Gol! Pero el aplauso es para {k}, qué pase filtrado.', '{k} desbordó, levantó la cabeza y la sirvió en bandeja. ¡Gol!'],
  chance: ['{k} remata... ¡se va apenitas desviado!', '¡Qué atajada! El arquero le negó el gol a {k}.', 'Cabezazo de {k} que sale por encima del travesaño.', '¡Palo! El remate de {k} hace temblar el arco.', '{k} se perfila, dispara... ¡la saca el defensa en la línea!', 'Tiro libre de {k} que pasa rozando el ángulo.'],
  defense: ['¡Cierre providencial de {k}! Salvó un gol cantado.', '¡Qué barrida! {k} le quitó la pelota limpia al delantero.', '{k} rechaza de cabeza en el área chica. ¡Seguridad!', '¡Muralla! {k} bloquea el remate con el pecho.'],
  yellow: ['Amarilla para {k} por una falta fuerte.', 'El árbitro le muestra la amarilla a {k}. A cuidarse.'],
  sub: ['Entra {k}. El DT confía en ti.', 'Cambio: ingresa {k} para refrescar el ataque.'],
  start: ['Sales de titular. ¡Vamos, {k}!', 'Once titular confirmado: {k} arranca desde el inicio.'],
  derby: ['¡Es el clásico! La ciudad está paralizada.', 'Clásico con estadio lleno. Aquí se juega el orgullo.'],
  win: ['¡Final! Ganaron y la hinchada canta tu nombre.', '¡Terminó! Tres puntos que valen oro.'],
  draw: ['Final. Reparten puntos.', 'Terminó empatado. Ni fu ni fa.'],
  loss: ['Final. Derrota dolorosa.', 'Se acabó. Hoy no fue el día.'],
};
const NICKS = {
  gol: ['El Killer de {o}', 'El Bombardero', 'La Pantera', 'El Matador', 'El Goleador de {o}'],
  pase: ['El Mago', 'El Arquitecto', 'El Profesor', 'Pies de Seda', 'El Cerebro'],
  muro: ['La Muralla', 'El Candado', 'El Muro de {o}', 'El Jefe de la Defensa'],
  rapido: ['La Bala', 'El Correcaminos', 'El Rayo de {o}', 'La Flecha'],
  fiesta: ['El Rey de la Noche', 'El Fiestero', 'El Bailarín'],
  joven: ['El Niño Maravilla', 'La Joya de {o}', 'El Chiquito'],
  veterano: ['El Eterno', 'El Capi', 'El Viejo Lobo'],
};
const FAN_USERS = ['@hinchaxsiempre', '@lacurva_sur', '@elprofedelbarrio', '@tiamarthaoficial', '@crack_del_pueblo', '@futbolperuano24', '@corazon_blanquiazul', '@patronamaster', '@elcholo_analista', '@mamadelcapi', '@jorgito_fifa', '@la_tribuna_norte', '@memesfutboleros', '@donpepe_hincha', '@chalaca_fina'];
const FAN_LINES = {
  great: ['{k} es de otro planeta 🔥', 'Que alguien le dé la Selección a {k} YA', 'Póster en mi cuarto, {k} 🐐', 'Te vi desde la tribuna y lloré, crack', 'Hoy {k} jugó solo contra 11', 'Mi abuelita dice que ni Cubillas jugaba así'],
  good: ['Buen partido de {k}, se nota el trabajo', 'Así se juega, {k}', 'Cumpliste, crack. A seguir', '{k} siempre metiendo pierna 💪'],
  bad: ['{k} hoy parecía de palo 😴', '¿{k} jugó o vino de paseo?', 'Mucha fiesta y poco fútbol', 'Hay que meter más, {k}', 'Devuelvan la entrada'],
  bench: ['¿Por qué no pone a {k}, profe?', 'Liberen a {k} de la banca', 'Queremos ver a {k} jugar'],
  party: ['Te vieron en la disco anoche, {k}... se notó 🍹', 'Menos Instagram y más gimnasio, {k}'],
  derbyWin: ['GANAMOS EL CLÁSICO Y {K} ES DIOS', 'La ciudad es nuestra 🏆', 'Que lloren los rivales, {k} los bailó'],
};

/* ================== DISCOTECA (desde los 18) ================== */
const DISCO_STEPS = [
  { t: 'Llegas a la discoteca', q: 'Hay cola larga para entrar y el portero te reconoce.', opts: [{ t: 'Hacer la cola como todos', fx: { disc: 2, fame: 1 }, res: 'La gente valoró que no te creas más.' }, { t: 'Entrar por la puerta VIP', fx: { fame: 2, happy: 3, followers: 3000 }, res: 'Entraste como estrella. Te grabaron entrando.' }] },
  { t: 'La pista está llena', q: 'Suena tu canción favorita. Tus amigos te llaman a bailar.', opts: [{ t: 'Salir a bailar', fx: { happy: 6, fatigue: 6, followers: 2000 }, res: 'Sacaste los pasos del barrio. Te volviste tendencia.' }, { t: 'Quedarte conversando', fx: { friends: 6, happy: 3 }, res: 'Buena conversa con la collera.' }] },
  { t: 'Te invitan a otra fiesta', q: 'Ya es tarde. Un grupo te invita a seguirla en una casa. Mañana hay entrenamiento.', opts: [{ t: 'Irte a dormir', fx: { disc: 5, fatigue: -8 }, res: 'Llegaste a casa a una hora decente. Bien ahí.' }, { t: 'Seguirla', fx: { happy: 6, fatigue: 16, disc: -8, scandal: 0.3 }, res: 'Amaneciste. El cuerpo te pasa factura.' }] },
  { t: 'Una foto comprometedora', q: 'Alguien te quiere tomar una foto con una botella en la mano.', opts: [{ t: 'Negarte con buena onda', fx: { disc: 3 }, res: 'Sonreíste y cambiaste la botella por un vaso de agua.' }, { t: 'Posar igual', fx: { fame: 2, trust: -4, scandal: 0.4 }, res: 'La foto ya está dando vueltas.' }] },
  { t: 'El DJ te nombra', q: 'El DJ te saluda por el micro y pide que subas a la cabina.', opts: [{ t: 'Subir y saludar', fx: { fame: 3, happy: 4, followers: 6000 }, res: '¡Toda la disco coreó tu nombre!' }, { t: 'Saludar desde abajo', fx: { fame: 1 }, res: 'Saludo tímido, pero sumó.' }] },
  { t: 'Tu compañero se pasa', q: 'Tu amigo del equipo tomó de más y se está peleando con alguien.', opts: [{ t: 'Sacarlo de ahí', fx: { rels: { amigo: 12 }, disc: 3, fatigue: 4 }, res: 'Lo llevaste a su casa. Te debe una.' }, { t: 'Hacerte el loco', fx: { rels: { amigo: -10 }, scandal: 0.2 }, res: 'Al día siguiente salió en las noticias.' }] },
];

/* ================== LOGROS PERMANENTES ================== */
const ACHIEVEMENTS = [
  { id: 'debut', name: 'Debut soñado', desc: 'Juega tu primer partido profesional.', test: (s, c) => c.career.apps >= 1 },
  { id: 'cien', name: 'Centenario', desc: 'Llega a 100 goles en tu carrera.', test: (s, c) => c.career.goals >= 100 },
  { id: 'trescientos', name: 'Hombre de club', desc: 'Juega 300 partidos.', test: (s, c) => c.career.apps >= 300 },
  { id: 'mundial', name: 'Campeón del mundo', desc: 'Gana el Mundial con Perú.', test: (s, c) => c.trophies.some(t => t.name === 'Mundial con Perú') },
  { id: 'copaamerica', name: 'Rey de América', desc: 'Gana la Copa América con Perú.', test: (s, c) => c.trophies.some(t => t.name === 'Copa América con Perú') },
  { id: 'balon', name: 'Balón de Oro', desc: 'Gana el Balón de Oro.', test: (s, c) => c.trophies.some(t => t.name === 'Balón de Oro') },
  { id: 'champions', name: 'Orejona', desc: 'Gana la Liga de Campeones.', test: (s, c) => c.trophies.some(t => t.name === 'Liga de Campeones') },
  { id: 'libertador', name: 'Libertador', desc: 'Gana la Copa de las Américas.', test: (s, c) => c.trophies.some(t => t.name === 'Copa de las Américas') },
  { id: 'trotamundos', name: 'Trotamundos', desc: 'Juega en 5 ligas distintas.', test: (s, c) => new Set(c.history.map(h => c.clubs[h.club].league)).size >= 5 },
  { id: 'diezligas', name: 'Juega en las 10 ligas', desc: 'Pasa por las 10 ligas del juego.', test: (s, c) => new Set(c.history.map(h => c.clubs[h.club].league)).size >= 10 },
  { id: 'casa', name: 'Vuelta a casa', desc: 'Retírate en el club donde empezaste.', test: (s, c) => c.history.length > 1 && c.history[0].club === c.clubId },
  { id: 'uncamiseta', name: 'Una sola camiseta', desc: 'Juega toda tu carrera en un solo club.', test: (s, c) => new Set(c.history.map(h => h.club)).size === 1 && c.age >= 34 },
  { id: 'mansion', name: 'De Comas a la mansión', desc: 'Cómprate la mansión con piscina.', test: (s, c) => c.house >= 3 },
  { id: 'familia', name: 'Familia grande', desc: 'Cásate y ten 3 hijos.', test: (s, c) => c.rel === 'casado' && c.kids >= 3 },
  { id: 'mama', name: 'Todo por mi vieja', desc: 'Cómprale una casa a tu mamá.', test: (s, c) => c.momHouse },
  { id: 'leyenda', name: 'Leyenda', desc: 'Saca 90 puntos o más en una carrera.', test: s => s.score >= 90 },
  { id: 'clasico', name: 'Rey de clásicos', desc: 'Gana 10 clásicos.', test: (s, c) => (c.derbyWins || 0) >= 10 },
  { id: 'goleador', name: 'Pichichi', desc: 'Sé goleador de una liga.', test: (s, c) => c.trophies.some(t => t.name.startsWith('Goleador')) },
  { id: 'hielo', name: 'Sangre fría', desc: 'Convierte 10 penales en una carrera.', test: (s, c) => (c.pens || {}).g >= 10 },
  { id: 'completo', name: 'Jugador completo', desc: 'Llega a 6 habilidades.', test: (s, c) => (c.perks || []).length >= 6 },
  { id: 'retos', name: 'Hombre de palabra', desc: 'Cumple 8 retos de temporada.', test: (s, c) => (c.goalsDone || 0) >= 8 },
  { id: 'decisivo', name: 'Señor decisivo', desc: 'Resuelve bien 60 jugadas decisivas.', test: (s, c) => (c.decisions || {}).ok >= 60 },
];

/* ================== EVENTOS NUEVOS (etapa 3) ==================
   Efectos extra: rels {dt, amigo, rival, agente}, chain {id, in: semanas}, suspend (semanas), pet.
   Los eventos con chainOnly solo salen como consecuencia de una decisión anterior. */
EVENTS.push(
  { id: 'vestuario', when: p => p.age >= 17, title: 'Pelea en el vestuario', text: p => p.people.rival.name + ' te echa la culpa de la derrota delante de todos.', opts: [{ t: 'Calmar las cosas', fx: { rels: { rival: 10, dt: 5 }, disc: 2 }, res: 'Se dieron la mano. El DT tomó nota.' }, { t: 'Responderle fuerte', fx: { rels: { rival: -18, amigo: 4 }, trust: -4, chain: { id: 'vestuario2', in: 2 } }, res: 'Casi se van a las manos. Esto no termina aquí.' }, { t: 'Ignorarlo', fx: { rels: { rival: -4 } }, res: 'Te pusiste los audífonos y te fuiste.' }] },
  { id: 'vestuario2', chainOnly: true, title: 'El DT se enteró', text: 'El DT sabe lo de la pelea con tu rival y los cita a los dos a su oficina.', opts: [{ t: 'Pedir disculpas', fx: { rels: { dt: 8, rival: 6 }, trust: 4 }, res: 'El DT valoró tu madurez.' }, { t: 'Decir que él empezó', fx: () => (chance(0.5) ? { rels: { dt: 4, rival: -10 }, trust: 3 } : { rels: { dt: -10 }, trust: -8, suspend: 1 }), res: 'El DT tomó una decisión.' }] },
  { id: 'rivalciudad', when: p => p.age >= 20 && !!rivalOf(p.clubId), title: 'Te llama el eterno rival', text: p => 'El presidente de ' + p.clubs[rivalOf(p.clubId)].name + ' quiere reunirse contigo. Si se entera la hinchada, arde Troya.', opts: [{ t: 'Ir a la reunión', fx: { fame: 3, followers: 20000, rels: { dt: -8 }, happy: -3, chain: { id: 'rivalciudad2', in: 1 } }, res: 'Alguien te tomó una foto entrando.' }, { t: 'Rechazarlo en público', fx: { fame: 4, trust: 8, rels: { dt: 6 }, followers: 15000 }, res: '"Mi corazón tiene un solo color". La hinchada te ama.' }] },
  { id: 'rivalciudad2', chainOnly: true, title: 'La foto se filtró', text: 'La foto de tu reunión con el rival está en todas las portadas.', opts: [{ t: 'Besar el escudo en el próximo partido', fx: { fame: 2, trust: 4, happy: 2 }, res: 'La hinchada te perdonó... a medias.' }, { t: 'Decir que fue un café nomás', fx: { trust: -6, fame: 3, happy: -4 }, res: 'Nadie te creyó.' }] },
  { id: 'mamaenferma', when: p => p.age >= 19, title: 'Tu mamá está mal', text: 'Te llaman del barrio: tu mamá se puso mal y está en la posta.', opts: [{ t: 'Viajar a verla', fx: { mom: 20, trust: -5, fatigue: -5, chain: { id: 'mamasana', in: 3 } }, res: 'Estuviste a su lado. Eso es lo que importa.' }, { t: 'Pagarle la mejor clínica', fx: p => ({ money: -Math.max(3000, Math.round(p.salary * 2)), mom: 12, chain: { id: 'mamasana', in: 3 } }), res: 'La atendieron los mejores doctores.' }, { t: 'Llamarla por teléfono', fx: { mom: -8, happy: -6 }, res: 'Te dijo que estaba bien, pero se le quebró la voz.' }] },
  { id: 'mamasana', chainOnly: true, title: 'Tu mamá se recuperó', text: 'Tu mamá ya está en casa y te manda un audio de 4 minutos.', opts: [{ t: 'Escucharlo entero', fx: { happy: 10, mom: 8 }, res: 'Te dijo que reza por ti en cada partido.' }] },
  { id: 'rumor', when: p => p.fame > 12, title: 'Un rumor falso', text: 'Un programa de chismes dice que peleaste con tu pareja en un chifa. Es mentira.', opts: [{ t: 'Desmentirlo con humor', fx: { fame: 2, followers: 8000, happy: 2 }, res: 'Tu video desmintiendo se volvió viral.' }, { t: 'Demandar al programa', fx: { money: -5000, chain: { id: 'rumor2', in: 4 } }, res: 'Tu abogado ya presentó la demanda.' }, { t: 'No decir nada', fx: () => (chance(0.5) ? { fame: -1, relLvl: -6 } : {}), res: 'El rumor se fue apagando... o no.' }] },
  { id: 'rumor2', chainOnly: true, title: 'Ganaste la demanda', text: 'El juez falló a tu favor. El programa tiene que rectificarse en vivo.', opts: [{ t: 'Donar la plata a tu barrio', fx: { money: 2000, fame: 4, mom: 6 }, res: 'Ahora hay luz nueva en la losa del barrio.' }, { t: 'Quedártela', fx: { money: 12000 }, res: 'Justicia y billete.' }] },
  { id: 'hijofutbol', when: p => p.kids > 0 && p.age >= 29, title: 'Tu hijo quiere ser futbolista', text: 'Tu hijo te dice que quiere ser como tú. Tiene talento, pero es chiquito.', opts: [{ t: 'Llevarlo a una academia', fx: { money: -3000, happy: 10 }, res: 'Hizo su primer gol y lo celebró como tú.' }, { t: 'Que primero estudie', fx: { happy: 3, disc: 2 }, res: 'Le dijiste que el fútbol puede esperar. Hizo puchero.' }] },
  { id: 'consejo', when: p => p.age >= 25, title: 'Un juvenil te pide consejo', text: 'Un chico de 17 años del plantel te pregunta cómo llegar a primera.', opts: [{ t: 'Darle tu tiempo', fx: { trust: 5, rels: { dt: 5 }, disc: 2, happy: 3 }, res: 'Le hablaste de disciplina. El DT los vio.' }, { t: '"Pregúntale a otro"', fx: { rels: { dt: -3 } }, res: 'El chico se fue cabizbajo.' }] },
  { id: 'apuesta', when: p => p.fame > 18 && p.age >= 18, title: 'Publicidad de apuestas', text: 'Una casa de apuestas te ofrece mucha plata por promocionarla en tus redes.', opts: [{ t: 'Aceptar la plata', fx: p => ({ money: Math.round(20000 + p.fame * 800), chain: { id: 'apuesta2', in: 2 } }), res: 'Grabaste el video. Algo no se siente bien.' }, { t: 'Rechazarla', fx: { disc: 5, fame: 2, rels: { dt: 4 } }, res: 'Dijiste que no promocionas eso. Te aplaudieron.' }] },
  { id: 'apuesta2', chainOnly: true, title: 'Escándalo por la apuesta', text: 'La federación abrió una investigación por tu publicidad de apuestas. Los hinchas están furiosos.', opts: [{ t: 'Pagar la multa y pedir perdón', fx: p => ({ money: -Math.round(25000 + p.fame * 900), fame: -8, trust: -10, sponsor: false, sponsorBig: false, suspend: 2 }), res: 'Te suspendieron 2 semanas y la marca te dejó. Mala decisión.' }, { t: 'Defenderte', fx: p => ({ money: -Math.round(30000 + p.fame * 1000), fame: -12, trust: -16, sponsor: false, sponsorBig: false, suspend: 3, rels: { dt: -10 } }), res: 'Empeoraste todo: 3 semanas de suspensión y sin auspicio.' }] },
  { id: 'fans', when: p => p.fame > 22, title: 'Te reconocen en la calle', text: 'Sales a comprar pan y te rodean veinte hinchas pidiendo foto.', opts: [{ t: 'Foto con todos', fx: { fame: 2, happy: 4, fatigue: 4, followers: 5000 }, res: 'Una hora de selfies. El pan ya estaba frío.' }, { t: 'Saludar y seguir', fx: { fame: 1 }, res: 'Saludito rápido y a la casa.' }, { t: 'Taparte con la capucha', fx: { fame: -1, followers: -2000 }, res: 'Un hincha dijo que te creías estrella.' }] },
  { id: 'mural', when: p => p.fame > 40, title: 'Un mural en tu barrio', text: p => 'Los vecinos de ' + p.origin + ' pintaron un mural gigante con tu cara.', opts: [{ t: 'Ir a verlo con tu mamá', fx: { mom: 12, happy: 10, fame: 2 }, res: 'Tu mamá le tomó 200 fotos.' }, { t: 'Mandar un video agradeciendo', fx: { happy: 4, followers: 10000 }, res: 'El barrio lo pasó en la parrillada.' }] },
  { id: 'academia', when: p => p.money > 150000 && p.age >= 24, title: 'Una escuelita en tu barrio', text: 'Te proponen financiar una escuela de fútbol gratis para niños de tu barrio.', opts: [{ t: 'Financiarla (US$ 50 mil)', fx: { money: -50000, fame: 6, mom: 10, happy: 8 }, res: 'Cien niños tienen dónde entrenar gracias a ti.' }, { t: 'Ahora no', fx: {}, res: 'Quizás más adelante.' }] },
  { id: 'lesionado', when: p => p.age >= 18, title: 'Tu amigo se lesionó', text: p => p.people.amigo.name + ' se rompió los ligamentos. Está en la clínica, bajoneado.', opts: [{ t: 'Visitarlo con comida', fx: { rels: { amigo: 15 }, happy: 2 }, res: 'Le llevaste pollo a la brasa. Se le iluminó la cara.' }, { t: 'Mandarle un mensaje', fx: { rels: { amigo: 2 } }, res: 'Te respondió con un pulgar.' }] },
  { id: 'tarde', when: p => p.disc < 55 && p.age >= 17, title: 'Llegaste tarde', text: 'Te quedaste dormido y llegaste 40 minutos tarde al entrenamiento.', opts: [{ t: 'Aceptar la multa', fx: { money: -800, disc: 5, rels: { dt: -2 } }, res: 'Pagaste y pusiste tres alarmas.' }, { t: 'Inventar que hubo tráfico', fx: () => (chance(0.5) ? {} : { rels: { dt: -10 }, trust: -6 }), res: 'El DT te miró raro.' }] },
  { id: 'nutri', when: p => p.age >= 20 && p.money > 15000, title: 'Nutricionista personal', text: 'Una nutricionista top te ofrece un plan: adiós a la salchipapa.', opts: [{ t: 'Contratarla (US$ 8 mil)', fx: { money: -8000, form: 8, fatigue: -10, disc: 4 }, res: 'Te sientes más liviano en la cancha.' }, { t: 'La salchipapa es sagrada', fx: { happy: 4 }, res: 'Tus decisiones, tus calorías.' }] },
  { id: 'psico', when: p => p.happy < 40, title: 'Estás bajoneado', text: 'Últimamente nada te sale. El club te ofrece un psicólogo deportivo.', opts: [{ t: 'Aceptar la ayuda', fx: { happy: 14, disc: 4, form: 4 }, res: 'Hablar te hizo muy bien. Pedir ayuda es de valientes.' }, { t: 'Yo solo puedo', fx: { happy: -3 }, res: 'Seguiste cargando todo solo.' }] },
  { id: 'consola', when: p => p.age < 26, title: 'El videojuego nuevo', text: 'Salió el juego de fútbol del año. Y sales tú en él, con 71 de media.', opts: [{ t: 'Jugar hasta las 4 a.m.', fx: { fatigue: 18, happy: 6, disc: -4 }, res: 'Te subiste la media en el modo carrera.' }, { t: 'Una partida y a dormir', fx: { happy: 3 }, res: 'Ganaste con tu propio equipo.' }] },
  { id: 'look', when: p => p.age >= 17, title: 'Cambio de look', text: 'Tu barbero del barrio te propone un corte con diseño y tinte platinado.', opts: [{ t: 'Hacerlo', fx: { fame: 2, followers: 9000, happy: 3 }, res: 'Pareces jugador de videojuego. Los memes no paran.' }, { t: 'El clásico de siempre', fx: {}, res: 'Corte tradicional, cero riesgos.' }] },
  { id: 'lujo', when: p => p.age >= 20 && p.cars.length === 0 && p.money > 20000, title: 'Presión del grupo', text: 'Todos tus compañeros llegan en carrazo. Te dicen que te compres uno.', opts: [{ t: 'Ignorar la presión', fx: { disc: 3 }, res: 'Sigues llegando en combi. Humildad ante todo.' }, { t: 'Ver carros en la tienda', fx: { happy: 2 }, res: 'Te quedaste mirando carros en el celular toda la noche.' }] },
  { id: 'cripto', when: p => p.money > 60000, title: 'Negocio "seguro"', text: 'Un conocido te ofrece duplicar tu plata en tres meses con una "moneda digital". Suena demasiado bueno.', opts: [{ t: 'Meter US$ 40 mil', fx: { money: -40000, chain: { id: 'cripto2', in: 3 } }, res: 'Te mandó un emoji de cohete.' }, { t: 'Desconfiar', fx: { disc: 3 }, res: 'Tu mamá siempre dijo: si es muy bueno, es cuento.' }] },
  { id: 'cripto2', chainOnly: true, title: 'La "moneda" desapareció', text: 'El conocido ya no contesta. La página web dice "error 404".', opts: [{ t: 'Aprender la lección', fx: () => (chance(0.15) ? { money: 90000, happy: 10 } : { happy: -10, disc: 4 }), res: 'Lo que pasó, pasó. Casi siempre se pierde todo.' }] },
  { id: 'primo', when: p => p.money > 25000, title: 'Tu primo busca chamba', text: 'Tu primo quiere ser tu chofer. No tiene brevete.', opts: [{ t: 'Pagarle el brevete y contratarlo', fx: { money: -3000, friends: 8, mom: 5 }, res: 'Ahora tienes chofer. Pone cumbia a todo volumen.' }, { t: 'Decirle que no', fx: { friends: -6, mom: -4 }, res: 'La familia comentó en el grupo de WhatsApp.' }] },
  { id: 'posicion', when: p => p.age >= 21 && p.trust < 55, title: 'El DT te cambia de posición', text: 'El DT quiere probarte en otra posición para que tengas minutos.', opts: [{ t: 'Aceptar el reto', fx: { trust: 8, rels: { dt: 8 }, form: -4 }, res: 'Te costó, pero el DT valoró tu actitud.' }, { t: 'Pedir jugar en tu puesto', fx: { rels: { dt: -5 } }, res: 'El DT dijo que lo iba a pensar.' }] },
  { id: 'sub20', when: p => p.age <= 19 && p.ovr >= 55, title: 'Convocatoria a la Sub-20', text: 'Te llaman para el Sudamericano Sub-20. Te perderías dos semanas de club.', opts: [{ t: 'Ir con la Sub-20', fx: { fame: 5, ovr: 0.6, trust: -3, followers: 10000 }, res: 'Hiciste un golazo contra Brasil Sub-20.' }, { t: 'Quedarte en el club', fx: { trust: 5 }, res: 'El DT te lo agradeció.' }] },
  { id: 'prueba', when: p => p.age >= 17 && p.age <= 20 && leagueOf(club()).id === 'per', title: 'Prueba en Europa', text: 'Un club portugués te invita a una semana de prueba.', opts: [{ t: 'Ir a la prueba', fx: { ovr: 0.8, fame: 3, fatigue: 10, happy: 4 }, res: 'Aprendiste un montón. Ya te conocen en Europa.' }, { t: 'No estoy listo', fx: {}, res: 'Será para otra oportunidad.' }] },
  { id: 'hinchanino', when: p => p.fame > 30, title: 'Un hincha especial', text: 'Un niño que está en el hospital sueña con conocerte.', opts: [{ t: 'Visitarlo con tu camiseta', fx: { happy: 12, fame: 3, followers: 20000 }, res: 'Le prometiste un gol. Y se lo vas a dedicar.' }] },
  { id: 'reality', when: p => p.fame > 35 && p.age >= 20, title: 'Te invitan a un reality', text: 'Un programa de concursos quiere que participes en vacaciones.', opts: [{ t: 'Participar', fx: { money: 15000, fame: 5, followers: 40000, disc: -4, rels: { dt: -5 } }, res: 'Ganaste la prueba del circuito. El DT no se ríe.' }, { t: 'Soy futbolista', fx: { disc: 3, rels: { dt: 3 } }, res: 'Sigues enfocado.' }] },
  { id: 'twitter', when: p => p.followers > 30000, title: 'Pelea en redes', text: 'Un delantero rival se burla de ti en un video.', opts: [{ t: 'Responder en la cancha', fx: { disc: 3, form: 3 }, res: 'Ya se verán el domingo.' }, { t: 'Responder con un meme', fx: { fame: 3, followers: 25000, rels: { dt: -2 } }, res: 'Ganaste la pelea de memes por goleada.' }] },
  { id: 'perrito', when: p => !(p.pets || []).length, title: 'Un perrito te sigue', text: 'Un perrito callejero te sigue desde el entrenamiento hasta tu casa.', opts: [{ t: 'Adoptarlo', fx: { pet: 'perro', happy: 8 }, res: 'Le pusiste de nombre "Chalaca". Ya es de la familia.' }, { t: 'Llevarlo a un albergue', fx: { happy: 2 }, res: 'Le encontraron una buena familia.' }] },
  { id: 'dtmenores', when: p => p.age >= 22, title: 'Tu DT de menores', text: 'El profe que te descubrió en el barrio te llama para saludarte.', opts: [{ t: 'Invitarlo al estadio', fx: { happy: 8, mom: 3 }, res: 'Lloró cuando te vio salir a la cancha.' }, { t: 'Contestar rápido', fx: { happy: 1 }, res: 'Te dijo que sigas así.' }] },
  { id: 'cumplemama', when: p => p.age >= 18, title: 'Cumpleaños de tu mamá', text: 'Es el cumpleaños de tu mamá, justo el día del partido.', opts: [{ t: 'Mandarle serenata con mariachis', fx: p => ({ money: -Math.min(2000, Math.max(300, p.salary)), mom: 15, happy: 5 }), res: 'Los vecinos grabaron todo. Tu mamá es tendencia.' }, { t: 'Dedicarle un gol', fx: { mom: 8, form: 3 }, res: 'Le prometiste un gol. A cumplir.' }] },
  { id: 'aniversario', when: p => p.rel !== 'soltero', title: 'Aniversario', text: p => 'Es tu aniversario con ' + p.partner + '. ¿Qué haces?', opts: [{ t: 'Cena especial', fx: p => ({ money: -Math.min(3000, Math.max(200, p.salary)), relLvl: 15, happy: 5 }), res: 'Noche perfecta.' }, { t: 'Olvidarlo', fx: { relLvl: -20, happy: -5 }, res: 'Te enteraste por el calendario... al día siguiente.' }] },
  { id: 'suegros', when: p => p.rel === 'casado', title: 'Llegan los suegros', text: 'Tus suegros vienen a quedarse "un par de semanas".', opts: [{ t: 'Recibirlos con cariño', fx: { relLvl: 12, happy: -3, fatigue: 5 }, res: 'Tu suegra cocina riquísimo, eso sí.' }, { t: 'Mandarlos a un hotel', fx: p => ({ money: -Math.min(4000, Math.max(300, p.salary)), relLvl: -10 }), res: 'Tu pareja no dijo nada. Y eso es peor.' }] },
  { id: 'colegiohijo', when: p => p.kids > 0, title: 'Día del padre en el colegio', text: 'Tu hijo tiene actuación por el Día del Padre. Es a la hora del entrenamiento.', opts: [{ t: 'Ir a verlo', fx: { happy: 12, trust: -4, rels: { dt: -2 } }, res: 'Bailó un huaylas y te buscó con la mirada.' }, { t: 'Ir a entrenar', fx: { happy: -8, trust: 3 }, res: 'Te mandaron el video. No es lo mismo.' }] },
  { id: 'libro', when: p => p.age >= 30 && p.fame > 45, title: 'Tu biografía', text: 'Una editorial quiere publicar tu historia: "Del barrio a la gloria".', opts: [{ t: 'Contarlo todo', fx: { money: 30000, fame: 4, happy: 5 }, res: 'El libro se vende en todas las ferias.' }, { t: 'Todavía falta historia', fx: {}, res: 'Lo mejor está por venir.' }] },
  { id: 'cursodt', when: p => p.age >= 32 && !p.coachCourse, title: 'Curso de entrenador', text: 'Te ofrecen hacer el curso de entrenador en tus días libres.', opts: [{ t: 'Inscribirte', fx: { money: -4000, coachCourse: true, rels: { dt: 8 }, fatigue: 6 }, res: 'Ya piensas como DT. Tu DT actual está encantado.' }, { t: 'Primero jugar', fx: {}, res: 'Te quedan años de cancha.' }] },
  { id: 'antidoping', when: p => p.age >= 18, title: 'Control sorpresa', text: 'Te toca control antidopaje sorpresa después del partido.', opts: [{ t: 'Ir tranquilo', fx: p => (p.disc > 35 ? { disc: 2, trust: 2 } : { trust: -4, fame: 1 }), res: 'Todo en orden. Nada que esconder.' }] },
  { id: 'aeropuerto', when: p => p.fame > 25, title: 'Hinchas rivales en el aeropuerto', text: 'Al llegar a la ciudad rival, hinchas te insultan en el aeropuerto.', opts: [{ t: 'Sonreír y saludar', fx: { disc: 3, fame: 2 }, res: 'Tu elegancia fue aplaudida hasta por los rivales.' }, { t: 'Hacerles un gesto', fx: { trust: -6, fame: 3, suspend: 1 }, res: 'La comisión de justicia te suspendió una fecha.' }] },
  { id: 'chisme', when: p => p.age >= 20, title: 'Alguien filtra chismes', text: 'Alguien del vestuario le cuenta todo a la prensa. Sospechas de tu rival.', opts: [{ t: 'Hablar con el capitán', fx: { rels: { dt: 3 }, trust: 3 }, res: 'El vestuario cerró filas.' }, { t: 'Enfrentar a tu rival', fx: { rels: { rival: -12 }, chain: { id: 'vestuario2', in: 2 } }, res: 'Tu rival lo negó todo, de mala manera.' }] },
  { id: 'turbio', when: p => p.agent === 'turbio' && p.age >= 20, title: 'Tu representante', text: p => AGENT_NAMES.turbio + ' te pide firmar unos papeles "sin leer, confía en mí".', opts: [{ t: 'Firmar sin leer', fx: { rels: { agente: 8 }, chain: { id: 'turbio2', in: 4 } }, res: 'Firmaste. Te guiñó el ojo.' }, { t: 'Leerlos primero', fx: { rels: { agente: -8 }, disc: 3 }, res: 'Había una cláusula rarísima. La tachaste.' }, { t: 'Despedirlo', fx: { agent: null, rels: { agente: -40 }, money: -3000 }, res: 'Te cobró una indemnización, pero ya eres libre.' }] },
  { id: 'turbio2', chainOnly: true, title: 'Problemas con la SUNAT', text: 'Los papeles que firmaste eran de una empresa fantasma. Te llegó una multa de impuestos.', opts: [{ t: 'Pagar y cambiar de agente', fx: p => ({ money: -Math.round(15000 + p.money * 0.1), agent: 'serio', happy: -6 }), res: 'Pagaste caro, pero aprendiste.' }, { t: 'Pagar y seguir con él', fx: p => ({ money: -Math.round(15000 + p.money * 0.1), happy: -4 }), res: 'Te juró que no volverá a pasar.' }] },
  { id: 'premiobarrio', when: p => p.age >= 30 && p.fame > 30, title: 'Homenaje en tu barrio', text: p => 'La municipalidad de ' + p.origin + ' te nombra "Hijo Ilustre".', opts: [{ t: 'Ir con toda la familia', fx: { mom: 15, happy: 10, fame: 3 }, res: 'Te dieron una medalla y una torta de tres pisos.' }] },
  { id: 'amigotransfer', when: p => p.age >= 21, title: 'Tu amigo se va', text: p => p.people.amigo.name + ' se va a otro club. Te pide que vayas a su despedida.', opts: [{ t: 'Ir a la despedida', fx: { happy: 4, fatigue: 6, newFriend: true }, res: 'Prometieron hablar siempre. Ya hiciste un nuevo amigo en el plantel.' }, { t: 'Mandarle un saludo', fx: { newFriend: true }, res: 'Te tocará hacer nuevos amigos.' }] },
  { id: 'rivalgana', when: p => p.people.rival.lvl < 35 && p.age >= 18, title: 'Tu rival te quita el puesto', text: p => p.people.rival.name + ' brilló en los entrenamientos y el DT lo tiene en cuenta.', opts: [{ t: 'Entrenar más duro', fx: { ovr: 0.5, fatigue: 12, trust: 3 }, res: 'La competencia te hace mejor.' }, { t: 'Hacer las paces con él', fx: { rels: { rival: 20 }, trust: 2 }, res: 'Ahora se empujan mutuamente.' }, { t: 'Quejarte con el DT', fx: { rels: { dt: -8 }, trust: -5 }, res: 'El DT te dijo que te lo ganes en la cancha.' }] },
  { id: 'gira', when: p => p.week <= 3, title: 'Gira de pretemporada', text: 'El club hace una gira por Estados Unidos. Hay tiempo libre en Nueva York.', opts: [{ t: 'Pasear con el grupo', fx: { happy: 6, rels: { amigo: 6 } }, res: 'Se tomaron fotos en Times Square.' }, { t: 'Quedarte en el gimnasio del hotel', fx: { ovr: 0.3, disc: 3 }, res: 'El preparador físico te felicitó.' }] },
  { id: 'dtnuevo', when: p => p.week >= 5 && p.week <= 10 && p.trust < 35, title: 'Cambian al DT', text: 'Despidieron al DT por malos resultados. Llega uno nuevo.', opts: [{ t: 'Presentarte con buena actitud', fx: { newDT: true, trust: 10 }, res: 'Nuevo DT, nueva oportunidad.' }] },
);

/* ================== NOMBRES DE OTROS JUGADORES (tabla de goleadores) ================== */
const INT_NAMES = {
  per: [FIRST, LAST],
  arg: [['Lautaro', 'Julián', 'Enzo', 'Thiago', 'Facundo', 'Nahuel', 'Gonzalo', 'Franco'], ['Gómez', 'Sosa', 'Benítez', 'Correa', 'Paredes', 'Acuña', 'Ledesma', 'Romero']],
  bra: [['Gabriel', 'Vinícius', 'Rafael', 'Lucas', 'Matheus', 'Thiago', 'Everton', 'Bruno'], ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Almeida', 'Barbosa']],
  mex: [['Santiago', 'Raúl', 'Hirving', 'Diego', 'Uriel', 'Érick', 'Alexis', 'César'], ['Hernández', 'Jiménez', 'Lozano', 'Vega', 'Montes', 'Pineda', 'Gutiérrez', 'Álvarez']],
  usa: [['Tyler', 'Jordan', 'Brandon', 'Chris', 'Kellyn', 'Josh', 'Weston', 'Ricardo'], ['Adams', 'Morris', 'Sargent', 'Reyna', 'Wright', 'Ferreira', 'Pepi', 'Brooks']],
  por: [['João', 'Diogo', 'Rúben', 'Gonçalo', 'Pedro', 'Rafael', 'Bernardo', 'Nuno'], ['Ferreira', 'Neves', 'Carvalho', 'Ramos', 'Leão', 'Mendes', 'Dias', 'Pinto']],
  esp: [['Álvaro', 'Pablo', 'Mikel', 'Dani', 'Ferran', 'Nico', 'Iago', 'Marcos'], ['García', 'Olmo', 'Morata', 'Torres', 'Oyarzabal', 'Merino', 'Pedri', 'Aspas']],
  ing: [['Harry', 'Jack', 'Bukayo', 'Phil', 'Jude', 'Declan', 'Marcus', 'Cole'], ['Kane', 'Saka', 'Foden', 'Palmer', 'Rice', 'Bowen', 'Watkins', 'Toney']],
  ita: [['Federico', 'Lorenzo', 'Nicolò', 'Gianluca', 'Ciro', 'Sandro', 'Mateo', 'Moise'], ['Chiesa', 'Insigne', 'Barella', 'Scamacca', 'Immobile', 'Tonali', 'Retegui', 'Kean']],
  ara: [['Salem', 'Firas', 'Saleh', 'Abdullah', 'Yasser', 'Fahad', 'Mohamed', 'Nasser'], ['Al-Dawsari', 'Al-Buraikan', 'Al-Shehri', 'Kanno', 'Al-Faraj', 'Al-Muwallad', 'Al-Hamdan', 'Otayf']],
};

/* ================== DECISIONES DE CARRERA (versión 2) ================== */
// Enfoque del entrenamiento: el atributo elegido sube más rápido.
const TRAIN_FOCUS = [['pac', 'Velocidad', 'Sprints en la pista'], ['sho', 'Tiro', 'Remates al arco'], ['pas', 'Pase', 'Rondos y pases largos'], ['dri', 'Regate', 'Conos y uno contra uno'], ['def', 'Defensa', 'Marca y anticipo'], ['phy', 'Físico', 'Gimnasio y resistencia']];

// Habilidades: se ganan puntos con buenas temporadas, retos cumplidos y al subir de nivel.
const PERKS = [
  { id: 'penales', name: 'Especialista en penales', desc: '+15 % de acierto en penales y te toca patearlos más seguido.', icon: '🎯' },
  { id: 'larga', name: 'Pegada de media distancia', desc: '+15 % en tiros libres directos y remates de lejos.', icon: '🚀' },
  { id: 'velocidad', name: 'Diablo en el mano a mano', desc: '+12 % al definir solo frente al arquero y en contragolpes.', icon: '⚡' },
  { id: 'vision', name: 'Visión de juego', desc: '+15 % en pases filtrados y centros. Más asistencias.', icon: '👁' },
  { id: 'muro', name: 'Muro', desc: '+15 % en cierres y barridas de último hombre.', icon: '🧱' },
  { id: 'cabeza', name: 'Cabezazo letal', desc: 'Los centros y tiros de esquina terminan más veces en gol.', icon: '🗣' },
  { id: 'pulmon', name: 'Pulmón de acero', desc: 'Te cansas 25 % menos en partidos y entrenamientos.', icon: '🫁' },
  { id: 'lider', name: 'Líder del camarín', desc: 'La confianza del DT sube 30 % más rápido.', icon: '©' },
  { id: 'clasico', name: 'Hombre de clásicos', desc: 'Juegas mejor los clásicos, las finales y las eliminatorias.', icon: '🔥' },
  { id: 'profesional', name: 'Profesional ejemplar', desc: '40 % menos lesiones y envejeces más lento.', icon: '🧘' },
  { id: 'figura', name: 'Figura mediática', desc: 'Ganas 30 % más fama y seguidores. Mejores auspicios.', icon: '📸' },
];

// Retos de temporada: eliges uno al empezar cada temporada.
const SEASON_GOALS = [
  { id: 'goles', name: p => 'Marcar ' + p.n + ' goles', gen: C => ({ n: Math.max(3, Math.round((C.pos === 'DEL' ? 10 : C.pos === 'EXT' ? 7 : C.pos === 'MED' ? 4 : 2) * clamp((C.ovr - club().str + 8) / 10, 0.5, 1.5))) }), val: C => C.ss.goals },
  { id: 'asist', name: p => 'Dar ' + p.n + ' asistencias', gen: C => ({ n: Math.max(2, Math.round((C.pos === 'MED' ? 7 : C.pos === 'EXT' ? 6 : C.pos === 'DEL' ? 4 : 2) * clamp((C.ovr - club().str + 8) / 10, 0.5, 1.5))) }), val: C => C.ss.assists },
  { id: 'pj', name: p => 'Jugar ' + p.n + ' partidos', gen: C => ({ n: clamp(Math.round(8 + (C.ovr - club().str) / 2), 5, 16) }), val: C => C.ss.apps },
  { id: 'nota', name: p => 'Nota media de ' + p.n.toFixed(1) + ' o más', gen: C => ({ n: C.ovr >= club().str ? 7 : 6.6 }), val: C => (C.ss.apps >= 5 ? C.ss.ratingSum / C.ss.apps : 0) },
  { id: 'titulo', name: () => 'Salir campeón de algo', gen: () => ({ n: 1 }), val: C => C.ss.titles || 0 },
  { id: 'clasicos', name: p => 'Ganar ' + p.n + ' clásico' + (p.n > 1 ? 's' : ''), gen: () => ({ n: 1 }), val: C => C.ss.derbyW || 0, when: C => !!rivalOf(C.clubId) },
];

// Mentalidad antes de un partido grande (clásicos, finales, eliminatorias).
const MINDSETS = [
  { id: 'ataque', name: 'A matar o morir', desc: 'Buscas el gol a toda costa. Más jugadas decisivas para ti, pero el equipo se descuida atrás.' },
  { id: 'equipo', name: 'Jugar para el equipo', desc: 'Orden y sacrificio. El equipo rinde más y el DT lo valora.' },
  { id: 'calma', name: 'Tranquilo, como siempre', desc: 'Sin cambiar nada. Menos presión.' },
];

// Jugadas decisivas dentro del partido: tú eliges cómo resolverlas.
const DECISIONS = {
  penal: { title: '¡Penal para tu equipo!', text: 'El capitán te da la pelota. El arquero se mueve en la línea. ¿Dónde la pones?', opts: [{ id: 'izq', t: 'Abajo a la izquierda' }, { id: 'centro', t: 'Fuerte al centro' }, { id: 'der', t: 'Arriba a la derecha' }, { id: 'panenka', t: 'Picarla (a lo Panenka)', risky: true }] },
  mano: { title: 'Te quedas solo frente al arquero', text: 'Pase largo, le ganas la espalda al central. El arquero sale a achicar.', opts: [{ id: 'fuerte', t: 'Definir fuerte y cruzado' }, { id: 'vaselina', t: 'Picarla por encima' }, { id: 'regate', t: 'Gambetear al arquero' }, { id: 'pase', t: 'Darle el gol al compañero' }] },
  libre: { title: 'Tiro libre en la puerta del área', text: 'Barrera de cinco. El estadio en silencio. Tú te paras frente a la pelota.', opts: [{ id: 'directo', t: 'Directo al ángulo' }, { id: 'centro', t: 'Centro al segundo palo' }, { id: 'corto', t: 'Toque corto y seguro' }] },
  contra: { title: '¡Contragolpe!', text: 'Recuperan la pelota y sales disparado. Tres contra dos.', opts: [{ id: 'solo', t: 'Encarar y rematar' }, { id: 'filtrar', t: 'Filtrar el pase' }, { id: 'pausa', t: 'Frenar y ordenar al equipo' }] },
  ultimo: { title: 'Eres el último hombre', text: 'El delantero rival se escapa hacia tu arco. Solo quedas tú.', opts: [{ id: 'barrer', t: 'Barrerse a la pelota' }, { id: 'aguantar', t: 'Aguantar y cerrar el ángulo' }, { id: 'falta', t: 'Falta táctica (te llevas la amarilla)' }] },
};
const CELEBRATIONS = [
  { id: 'baile', t: 'Bailar con tus compañeros', fx: { followers: 6000, fame: 1 } },
  { id: 'escudo', t: 'Besar el escudo', fx: { trust: 2, fame: 1 } },
  { id: 'mama', t: 'Dedicárselo a tu mamá', fx: { mom: 4, happy: 2 } },
  { id: 'callar', t: 'Callar a la tribuna rival', fx: { fame: 3, followers: 12000, trust: -2 } },
];

/* ================== MÁS EVENTOS DE CARRERA (versión 2) ================== */
EVENTS.push(
  { id: 'infiltrado', when: p => p.week >= 10 && p.age >= 19 && p.fatigue > 45, title: 'Molestia antes del partido clave', text: 'El médico dice que podrías jugar infiltrado. Si se complica, podrías perderte meses.', opts: [{ t: 'Jugar infiltrado', fx: { trust: 8, fame: 2, injury: 0.3 }, res: 'Te pusieron la inyección. A rezar.' }, { t: 'Cuidarte', fx: { fatigue: -25, trust: -4 }, res: 'El DT no dijo nada, pero lo sentiste frío.' }] },
  { id: 'amistoso', when: p => p.nation.caps > 0 && p.week > 2 && p.week < 12, title: 'Selección o club', text: 'La selección te llama para un amistoso en Asia. Tu club te necesita el fin de semana.', opts: [{ t: 'Ir con la selección', fx: { fame: 4, fatigue: 18, rels: { dt: -6 } }, res: 'Viajaste 30 horas para jugar 45 minutos. Pero con la blanquirroja.' }, { t: 'Pedir quedarte', fx: { rels: { dt: 6 }, fame: -1 }, res: 'El técnico de la selección tomó nota.' }] },
  { id: 'salir', when: p => p.age >= 19 && p.trust < 35 && p.happy < 50, title: '¿Pedir tu salida?', text: 'No juegas y no eres feliz. Tu representante dice que es momento de pedir que te vendan.', opts: [{ t: 'Pedir la transferencia', fx: { rels: { dt: -12 }, forceOffers: 2, happy: 4 }, res: 'El club aceptó escuchar ofertas. Vienen clubes en el próximo mercado.' }, { t: 'Pelear el puesto', fx: { ovr: 0.5, disc: 4, trust: 4 }, res: 'Nadie te va a regalar nada. Al gimnasio.' }] },
  { id: 'renovacion', when: p => p.contractEnd >= 2 && p.ss.apps >= 5 && p.ss.apps && p.ss.ratingSum / p.ss.apps >= 7, title: 'El club quiere renovarte ya', text: 'Estás rindiendo tanto que el presidente te ofrece renovar con aumento antes de que vengan otros clubes.', opts: [{ t: 'Firmar la renovación', fx: p => ({ salaryMul: 1.25, contractAdd: 2, trust: 6, rels: { dt: 5 } }), res: 'Renovaste con aumento del 25 %. El club te ve como pilar.' }, { t: 'Esperar al mercado', fx: { forceOffers: 1, rels: { dt: -3 } }, res: 'Arriesgado, pero quizás llega algo grande.' }] },
  { id: 'arabia', when: p => p.age >= 29 && p.ovr >= 70 && leagueOf(club()).id !== 'ara', title: 'Llamada desde Arabia', text: 'Un club árabe te ofrece un sueldo de locura. Pero la liga es menos competitiva y te alejas de la selección.', opts: [{ t: 'Escuchar la oferta', fx: { forceLeague: 'ara', happy: 3 }, res: 'La oferta estará sobre la mesa en el próximo mercado.' }, { t: 'Quiero seguir compitiendo', fx: { fame: 2, disc: 3, trust: 4 }, res: 'La gloria no se compra.' }] },
  { id: 'canterano', when: p => p.age >= 27, title: 'Un canterano pide pista', text: 'Un chico de 18 años juega en tu posición y la prensa pide que le den minutos.', opts: [{ t: 'Apadrinarlo', fx: { rels: { dt: 6 }, trust: 3, fame: 2, happy: 3 }, res: 'Le enseñas todo. Él te dice "profe" en broma.' }, { t: 'Marcarle territorio en los entrenamientos', fx: { ovr: 0.4, fatigue: 10, rels: { rival: -10 } }, res: 'Le recordaste quién manda. El vestuario lo notó.' }] },
  { id: 'sistema', when: p => p.age >= 20 && p.week <= 6, title: 'El DT cambia el sistema', text: 'El DT prueba un 3-5-2 y te quiere en un rol distinto, con más sacrificio defensivo.', opts: [{ t: 'Adaptarte', fx: { trust: 8, rels: { dt: 6 }, form: -3 }, res: 'Corres el doble, pero el DT te pone siempre.' }, { t: 'Pedir jugar en tu rol', fx: () => (chance(0.5) ? { trust: 2, form: 3 } : { trust: -8, rels: { dt: -6 } }), res: 'El DT lo pensó.' }] },
  { id: 'trolls', when: p => p.followers > 20000 && p.form < 45, title: 'Te destrozan en redes', text: 'Después de varios malos partidos, miles de comentarios te insultan.', opts: [{ t: 'Cerrar redes un mes', fx: { happy: 6, form: 4, followers: -4000 }, res: 'Paz mental. Te enfocas en jugar.' }, { t: 'Responderles', fx: { happy: -4, fame: 2, followers: 8000, rels: { dt: -3 } }, res: 'Se armó un escándalo más grande.' }, { t: 'Ignorar y trabajar', fx: { disc: 4, ovr: 0.3 }, res: 'La respuesta la darás en la cancha.' }] },
  { id: 'capitanlio', when: p => p.captain, title: 'Problema en el vestuario', text: 'Como capitán, te enteras de que dos compañeros llegan tarde y de fiesta. El DT no sabe.', opts: [{ t: 'Hablar con ellos en privado', fx: { rels: { amigo: 6, dt: 3 }, trust: 3 }, res: 'Se ordenaron. Liderazgo del bueno.' }, { t: 'Contarle al DT', fx: { rels: { dt: 8, amigo: -10 } }, res: 'El DT los multó. Algunos te miran feo.' }, { t: 'No meterte', fx: { rels: { dt: -4 } }, res: 'El equipo sigue perdiendo puntos tontos.' }] },
  { id: 'penalfallado', chainOnly: true, title: 'La prensa y tu penal', text: 'Todos los programas hablan del penal que fallaste. Te preguntan en la conferencia.', opts: [{ t: '"La próxima la meto"', fx: { disc: 3, form: 2 }, res: 'Frase de campeón. La hinchada te bancó.' }, { t: 'Echarle la culpa al césped', fx: { fame: 2, trust: -4, followers: 5000 }, res: 'Los memes duraron una semana.' }] },
  { id: 'golazo', chainOnly: true, title: 'Tu golazo da la vuelta al mundo', text: 'Tu gol decisivo tiene millones de vistas. Te llaman de un programa internacional.', opts: [{ t: 'Ir a la entrevista', fx: { fame: 5, followers: 50000, fatigue: 6 }, res: 'Hablaste en tres idiomas (dos mal). Te aman.' }, { t: 'Seguir humilde', fx: { disc: 3, trust: 3 }, res: 'Dejas que hablen los goles.' }] },
  { id: 'visoria', when: p => p.age >= 20 && p.age <= 26 && p.ovr >= 66 && p.fame > 20, title: 'Te vienen a ver de Europa', text: 'Un ojeador de un club grande estará en la tribuna el domingo.', opts: [{ t: 'Presión al máximo: a lucirte', fx: { form: 6, fatigue: 8, forceOffers: 1 }, res: 'Diste todo. El ojeador anotó tu nombre.' }, { t: 'Jugar como siempre', fx: { disc: 2 }, res: 'Si te quieren, que te quieran así.' }] },
);
