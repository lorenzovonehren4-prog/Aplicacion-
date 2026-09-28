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
