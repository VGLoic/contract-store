export type LiteralUnion<T extends U, U = string> = T | (U & {});
export type NumericUnion<T extends U, U = number> = T | (U & {});
