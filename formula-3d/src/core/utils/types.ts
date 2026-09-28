/** Tipos utilitarios compartidos. */

/** Versión de sólo lectura en profundidad de un objeto de datos. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
