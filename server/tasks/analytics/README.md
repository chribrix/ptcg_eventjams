# Analytics-Aufbewahrung

`retention.ts` startet täglich über Nitro `scheduledTasks` und ruft den einzigen Löschvertrag `deleteExpiredAnalytics()` des Analytics-Service auf. Der Task besitzt keine eigenen Daten und benötigt keinen Endnutzerkontext. Er löscht Einzeldatensätze älter als 30 Tage in 5.000er-Batches; die Adminsummen werden aus den verbleibenden Datensätzen berechnet und zeigen daher höchstens 30 Tage verlässliche Historie.

Im kombinierten Node-Deployment startet der Zeitplan mit dem App-Container beim Release. Auf `root@chrispyjams` ist kein zusätzlicher OS-Cron-Eintrag nötig. Bei mehreren Instanzen können mehrere idempotente Löschläufe stattfinden; für einen getrennten Analytics-Dienst ist ein einzelner Scheduler mit demselben Servicevertrag vorzusehen. Betrieb: Nach Release Migration ausführen, einmaligen Tasklauf und Datenbankgrenze prüfen. Keine IPs, Hashes oder Ereignisdetails in Tasklogs ausgeben.
