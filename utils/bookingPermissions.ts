const GENERAL_MODIFICATION_DEADLINE_HOURS = 2;

export function getBookingPermissions(
  eventDateInput: Date | string,
  nowInput: Date | string = new Date(),
) {
  const eventDate = new Date(eventDateInput);
  const now = new Date(nowInput);
  const modificationDeadline = new Date(
    eventDate.getTime() - GENERAL_MODIFICATION_DEADLINE_HOURS * 60 * 60 * 1000,
  );

  const canModify = now < modificationDeadline && eventDate > now;
  const canEditDecklist = eventDate > now;

  return {
    canModify,
    canAddTickets: canModify,
    canCancelTickets: canModify,
    canEditDecklist,
  };
}
