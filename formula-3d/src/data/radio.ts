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
  | 'bigImpact';

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
  drsEnabled: ['DRS habilitado. Úsalo en las zonas verdes del mapa.'],
  lastLap: ['Última vuelta. ¡Dalo todo!', 'Última vuelta, sin errores ahora.'],
  finished: ['¡Bandera a cuadros! Gran trabajo hoy.', '¡Terminamos! Buena carrera, bien hecho.'],
  bigImpact: ['¿Estás bien? Seguimos si el auto responde.', 'Fuerte golpe. Revisamos los datos, sigue si puedes.'],
};
