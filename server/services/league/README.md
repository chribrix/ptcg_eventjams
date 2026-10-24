# League-Service (heutige Codegrenze)

`leagueService.ts` verwaltet Saisons, Ligaspieler und Aliase, Punkteregeln, Turnierimporte, Teilnahmen, Tabellen und Exporte. `leagueTdfService.ts` interpretiert TDF-Importe; `leagueRanking.ts` berechnet Wertungen. Öffentliche und Admin-API-Routen liegen unter `server/api/league` bzw. `server/api/admin/league`.

**Daten und Interaktion:** Eigene `league_*`-Tabellen aus SQL-Migrationen, seit P0 auch im Prisma-Schema modelliert. Die Liga importiert Turnierdaten, besitzt aber nicht `TournamentTomState`. Adminrouten prüfen serverseitig Rollen; der künftige Tenant-Scope muss noch eingeführt werden.

**Betrieb und Nachweis:** Heute ein Nitro-Deployment mit den anderen Services. `prisma validate` und `prisma generate` sind nach P0 erfolgreich; reale DB-Abfrage und Tenant-Isolation stehen aus. `tests/unit/leagueManager.test.ts` und TDF-Fixtures sind bestehende Prüfbasis. Zielvertrag: [`modules/league/README.md`](../../../modules/league/README.md).
