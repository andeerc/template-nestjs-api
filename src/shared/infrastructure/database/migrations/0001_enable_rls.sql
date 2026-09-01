-- Custom SQL migration for RLS policies

ALTER TABLE "organization_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_membership_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_user_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_report_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_organization_memberships" ON "organization_memberships"
  USING (
    current_setting('app.current_organization_id', true) = ''
    OR organization_id::text = current_setting('app.current_organization_id', true)
  )
  WITH CHECK (
    current_setting('app.current_organization_id', true) = ''
    OR organization_id::text = current_setting('app.current_organization_id', true)
  );

CREATE POLICY "tenant_isolation_organizations" ON "organizations"
  USING (
    current_setting('app.current_organization_id', true) = ''
    OR id::text = current_setting('app.current_organization_id', true)
    OR EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.organization_id = organizations.id
        AND om.user_id::text = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "tenant_isolation_membership_roles" ON "organization_membership_roles"
  USING (
    current_setting('app.current_organization_id', true) = ''
    OR EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.id = organization_membership_roles.membership_id
        AND om.organization_id::text = current_setting('app.current_organization_id', true)
    )
  );

CREATE POLICY "tenant_isolation_user_permissions" ON "organization_user_permissions"
  USING (
    current_setting('app.current_organization_id', true) = ''
    OR organization_id::text = current_setting('app.current_organization_id', true)
  )
  WITH CHECK (
    current_setting('app.current_organization_id', true) = ''
    OR organization_id::text = current_setting('app.current_organization_id', true)
  );

CREATE POLICY "tenant_isolation_report_settings" ON "organization_report_settings"
  USING (
    current_setting('app.current_organization_id', true) = ''
    OR organization_id::text = current_setting('app.current_organization_id', true)
  )
  WITH CHECK (
    current_setting('app.current_organization_id', true) = ''
    OR organization_id::text = current_setting('app.current_organization_id', true)
  );

ALTER TABLE "organization_memberships" FORCE ROW LEVEL SECURITY;
ALTER TABLE "organization_membership_roles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "organization_user_permissions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "organization_report_settings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;
