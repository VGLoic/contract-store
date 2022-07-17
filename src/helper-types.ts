import { JsonFragment } from "./ethers-type";

export type LiteralUnion<T extends U, U = string> = T | (U & {});
export type NumericUnion<T extends U, U = number> = T | (U & {});

export type ABI = string | readonly (string | JsonFragment)[];

export type Deployment<ABIKey = string> = {
  address: string;
  abiKey: ABIKey;
};

export type Contract = {
  address: string;
  abi: ABI;
};
