import { getCachedChampionships } from "~/server/services/events/championshipScheduleService";

export default defineTask({
  meta: {
    name: "championships:refresh",
    description: "Refresh the official championship schedule once a week",
  },
  async run() {
    const events = await getCachedChampionships({ force: true });
    return { result: { count: events.length } };
  },
});
