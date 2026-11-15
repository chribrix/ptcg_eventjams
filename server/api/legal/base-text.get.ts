import { defaultLegalState } from "~/server/services/legal/legalPageService";

export default defineEventHandler(() => {
  if (!import.meta.dev) throw createError({ statusCode: 404 });
  const state = defaultLegalState();
  return { impressum: state.impressum.body, datenschutz: state.datenschutz.body };
});
