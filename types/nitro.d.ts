import type { CardRepository } from '~/server/plugins/CardRepository'

declare module 'nitropack' {
    interface NitroApp {
        cardRepository: CardRepository
    }
}