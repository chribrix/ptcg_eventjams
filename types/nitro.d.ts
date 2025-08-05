import type { CardRepository } from "~/server/plugins/CardRepositoryPlugin";

declare module "nitropack" {
  interface NitroApp {
    cardRepository: CardRepository;
  }
}
