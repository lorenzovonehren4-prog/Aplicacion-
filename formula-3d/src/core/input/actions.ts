/** Acciones de interfaz, independientes del dispositivo que las produce. */
export type UiAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'tabPrev' | 'tabNext';

/** Dispositivos de entrada (para adaptar las ayudas de controles en pantalla). */
export type InputDevice = 'keyboard' | 'mouse' | 'gamepad';
