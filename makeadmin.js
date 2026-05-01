console.error(
  "Deprecated: makeadmin.js used the old users.admin_users authority model. Use `node scripts/add-admin.js add <supabase-user-id>` to grant admin access in Supabase metadata.",
);
process.exit(1);
