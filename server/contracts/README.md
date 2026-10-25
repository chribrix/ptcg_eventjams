# Gemeinsame Modulverträge

`moduleContracts.ts` enthält JSON-fähige Referenzen und Kontexte für lokale Modulaufrufe und künftige Transportadapter. `EventRef` unterscheidet eigene und externe Event-IDs ausdrücklich; `ActorContext` und `TenantContext` tragen serverseitig geprüfte Identität und Berechtigung. `ModuleErrorCode` ist die gemeinsame Fehlerklasse, noch kein aktivierter HTTP-/RPC-Adapter.

**Eigentum und Interaktion:** Dieser Ordner besitzt keine Datenbanktabellen und löst keine Identität selbst auf. `authService.ts` liefert die Identität, `tenantService.ts` prüft Mitgliedschaften, Fachmodule verwenden `EventRef` statt bloßer IDs, sobald Quelle oder Besitzer für eine Aktion relevant sind. `eventRefFromLegacy` passt vorhandene Buchungszeilen mit zwei optionalen Fremdschlüsseln an; bei fehlerhaften Zeilen mit beiden Schlüsseln bleibt zunächst die bisherige Priorität für eigene Events bestehen.

**Betrieb und Nachweis:** Reine Typen und deterministische Funktionen funktionieren im gemeinsamen Deployment und über serialisierte Aufrufe. Kein Remote-Adapter ist bereits aktiv. Vertragstests prüfen die Legacy-Abbildung und die quellgebundene Wartelistenauflösung; vor separatem Betrieb folgen Versionierung, authentisierter Transport und Fehlerabbildung.
