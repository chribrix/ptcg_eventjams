<template>
  <div v-if="gameType" class="event-game-watermark" aria-hidden="true">
    <img class="event-game-watermark__dark-ink" :src="logos[gameType].dark" alt="" />
    <img class="event-game-watermark__white-ink" :src="logos[gameType].white" alt="" />
  </div>
</template>

<script setup lang="ts">
import type { PokemonGameType } from "~/types/eventGame";
import tcgDark from "~/assets/images/TCG Schwarz.svg?url";
import tcgWhite from "~/assets/images/TCG Weiß.svg?url";
import vgcDark from "~/assets/images/VGC Schwarz.svg?url";
import vgcWhite from "~/assets/images/VGC Weiß.svg?url";
import goDark from "~/assets/images/GO Schwarz.svg?url";
import goWhite from "~/assets/images/GO Weiß.svg?url";

defineProps<{ gameType?: PokemonGameType }>();

const logos: Record<PokemonGameType, { dark: string; white: string }> = {
  tcg: { dark: tcgDark, white: tcgWhite },
  vgc: { dark: vgcDark, white: vgcWhite },
  go: { dark: goDark, white: goWhite },
};
</script>
