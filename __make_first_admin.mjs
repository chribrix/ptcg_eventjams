console.error(
  "Deprecated: __make_first_admin.mjs inspects the legacy users.admin_users model. Use `node scripts/add-admin.js list` for current Supabase admins and `node scripts/add-admin.js migrate-legacy` to migrate old admin rows.",
);
process.exit(1);
