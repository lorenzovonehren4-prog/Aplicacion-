/**
 * Radio del equipo: frases cortas del ingeniero según lo que pasa en pista.
 * El ingeniero es ficticio, como todo el equipo.
 */

export const ENGINEER_NAME = 'Marcos, tu ingeniero';

export type RadioMoment =
  | 'practiceStart'
  | 'raceStart'
  | 'personalBest'
  | 'goodLap'
  | 'slowerLap'
  | 'invalidLap'
  | 'drsEnabled'
  | 'lastLap'
  | 'finished'
  | 'bigImpact'
  | 'positionGained'
  | 'positionLost'
  | 'leading'
  | 'fastestLap'
  | 'drsArmed'
  | 'raceWin'
  | 'podium'
  | 'pointsFinish';

export const RADIO_LINES: Readonly<Record<RadioMoment, readonly string[]>> = {
  practiceStart: [
    'Radio check. Vuelta de salida: calienta los neumáticos y frenos.',
    'Pista libre para ti. Busca los puntos de frenada con calma.',
  ],
  raceStart: [
    '¡Luces apagadas, vamos! Cuidado en la curva 1.',
    'Buena largada. Mantén la calma en la primera frenada.',
  ],
  personalBest: ['¡Récord personal! Buen trabajo, sigue así.', '¡Vuelta enorme! Es tu mejor tiempo aquí.'],
  goodLap: ['Buena vuelta. Mantén ese ritmo.', 'Tiempos consistentes, buen trabajo.', 'Muy bien, el ritmo es bueno.'],
  slowerLap: [
    'Un poco más lento. Revisa las frenadas, tú puedes.',
    'Perdimos algo de tiempo en esa vuelta. Sigue concentrado.',
  ],
  invalidLap: [
    'Esa vuelta no cuenta: cuidado con los límites de pista.',
    'Vuelta anulada. Mantén al menos dos ruedas en la pista.',
  ],
  drsEnabled: ['DRS habilitado: a menos de un segundo del de adelante, ábrelo en las zonas verdes.'],
  lastLap: ['Última vuelta. ¡Dalo todo!', 'Última vuelta, sin errores ahora.'],
  finished: ['¡Bandera a cuadros! Gran trabajo hoy.', '¡Terminamos! Buena carrera, bien hecho.'],
  bigImpact: ['¿Estás bien? Seguimos si el auto responde.', 'Fuerte golpe. Revisamos los datos, sigue si puedes.'],
  positionGained: ['¡Buena maniobra! Ganaste una posición.', 'Posición ganada, bien hecho. Ahora a defenderla.', '¡Eso es! Uno menos.'],
  positionLost: ['Te pasaron. Tranquilo, sigue en el rebufo.', 'Perdimos una posición. Tenemos ritmo para recuperarla.'],
  leading: ['¡Estás líder! Controla el ritmo y no cometas errores.', 'P1. Mantén la calma, lo estás haciendo genial.'],
  fastestLap: ['¡Vuelta rápida de la carrera! Excelente.', 'Púrpura en todo: tienes la vuelta rápida.'],
  drsArmed: ['Estás a menos de un segundo: DRS disponible en la próxima zona.'],
  raceWin: ['¡GANAMOS! ¡Increíble carrera, felicitaciones!', '¡Victoria! ¡Qué carrera, campeón!'],
  podium: ['¡Podio! Gran resultado para el equipo.', '¡Al podio! Excelente trabajo hoy.'],
  pointsFinish: ['Terminamos en los puntos. Buen trabajo.', 'Carrera sólida, sumamos puntos.'],
};
