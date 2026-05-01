import type { CardRepository } from "~/server/util/repository/CardRepository";

declare module "nitropack" {
  interface NitroApp {
    cardRepository: CardRepository;
  }
}
