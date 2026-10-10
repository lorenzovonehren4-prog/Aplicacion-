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
  | 'pointsFinish'
  | 'jumpStart'
  | 'trackLimitsWarning'
  | 'trackLimitsFlag'
  | 'trackLimitsPenalty'
  | 'penaltyAtFinish'
  | 'boxBox'
  | 'boxCancel'
  | 'tyresWorn'
  | 'wingDamage'
  | 'pitDone'
  | 'pitPerfect'
  | 'pitSlow';

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
    'Esa vuelta no cuenta para el récord: cuidado con los límites de pista.',
    'Mantén al menos dos ruedas en la pista y la próxima cuenta.',
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
  jumpStart: [
    'Salida en falso: nos dieron cinco segundos. Hay que abrir hueco.',
    'Te moviste antes de tiempo. Cinco segundos de sanción, a recuperarlos.',
  ],
  trackLimitsWarning: [
    'Advertencia por límites de pista. Cuidado con las salidas.',
    'Dirección de carrera nos avisa: límites de pista. Las cuatro ruedas adentro.',
  ],
  trackLimitsFlag: ['Bandera blanca y negra. Una salida más y es sanción.', 'Última advertencia: la próxima son cinco segundos.'],
  trackLimitsPenalty: ['Cinco segundos de sanción por límites de pista.', 'Nos sancionaron: cinco segundos. Mantenla en la pista.'],
  boxBox: ['Box, box. Entra a boxes en esta vuelta.', 'Recibido: box en esta vuelta, te estamos esperando.'],
  boxCancel: ['Entendido, nos quedamos afuera.', 'Ok, seguimos en pista.'],
  tyresWorn: [
    'Las gomas se están terminando. Cuando quieras, box (tecla B).',
    'Neumáticos muy gastados: una parada te devuelve el ritmo.',
  ],
  wingDamage: ['Tenemos daño en el alerón delantero. Si quieres, entra a boxes y lo cambiamos.'],
  pitDone: ['¡Buena parada! Gomas nuevas, a empujar.', 'Parada limpia. Ahora a recuperar posiciones.'],
  pitPerfect: ['¡Parada perfecta! El equipo voló, a empujar.', '¡Qué parada! Récord del equipo, ahora te toca a ti.'],
  pitSlow: ['Parada un poco lenta, perdimos unas décimas. Las recuperamos en pista.', 'Se trabó una tuerca, perdón. Gomas nuevas igual: a empujar.'],
  penaltyAtFinish: [
    'Cruzamos la meta, pero falta descontar la sanción. Veamos dónde quedamos.',
    'Bandera a cuadros. Ahora se suma la sanción al tiempo final.',
  ],
};
