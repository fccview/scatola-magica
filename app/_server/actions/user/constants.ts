export const MIN_PASSWORD_LENGTH = 6;
export const BCRYPT_ROUNDS = 12;

export const POKEMON_THEMES = [
  "pikachu",
  "bulbasaur",
  "charmander",
  "squirtle",
  "gengar",
];

export const COLOR_MODES = ["light", "dark"] as const;

export type ColorMode = (typeof COLOR_MODES)[number];

export interface ActionResult {
  success: boolean;
  error?: string;
}
