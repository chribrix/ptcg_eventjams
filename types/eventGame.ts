export type PokemonGameType = "tcg" | "vgc" | "go";

export const POKEMON_GAME_OPTIONS = [
  { value: "Pokemon", label: "Pokémon TCG", gameType: "tcg", marker: "T" },
  { value: "Pokemon VGC", label: "Pokémon VGC", gameType: "vgc", marker: "V" },
  { value: "Pokemon GO", label: "Pokémon GO", gameType: "go", marker: "G" },
] as const;

export type PokemonGameValue = (typeof POKEMON_GAME_OPTIONS)[number]["value"];

export function getPokemonGameType(game?: string): PokemonGameType | undefined {
  const normalizedGame = game?.trim().toLowerCase();
  if (!normalizedGame) return undefined;
  if (normalizedGame === "pokemon") return "tcg";
  if (normalizedGame.includes("vgc") || normalizedGame.endsWith(" vg")) return "vgc";
  if (normalizedGame.includes("pokemon go")) return "go";
  return undefined;
}

export function getPokemonGameTypeFromEventType(
  eventType?: string,
): PokemonGameType {
  const normalizedType = eventType?.trim().toLowerCase() || "";
  if (/\b(?:vg|vgc)\b/.test(normalizedType)) return "vgc";
  if (/\bgo\b/.test(normalizedType)) return "go";
  return "tcg";
}

export function getPokemonGameMarker(
  gameType?: PokemonGameType,
): "T" | "V" | "G" | undefined {
  if (gameType === "tcg") return "T";
  if (gameType === "vgc") return "V";
  if (gameType === "go") return "G";
  return undefined;
}