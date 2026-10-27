/** Types des motifs de césure (paquet « hyphen », sans déclarations fournies). */
declare module "hyphen/fr" {
  export function hyphenateSync(text: string, options?: { hyphenChar?: string; minWordLength?: number; debug?: boolean }): string;
}
declare module "hyphen/en-gb" {
  export function hyphenateSync(text: string, options?: { hyphenChar?: string; minWordLength?: number; debug?: boolean }): string;
}
