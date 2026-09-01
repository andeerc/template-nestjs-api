CREATE TABLE "users" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"name" varchar(255) NOT NULL,
	"google_id" varchar(255),
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"organization_id" varchar(24) NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"role" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UQ_organization_memberships_organization_user" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organization_membership_roles" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"membership_id" varchar(24) NOT NULL,
	"role_id" varchar(24) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UQ_organization_membership_roles_membership_role" UNIQUE("membership_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "organization_user_permissions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"organization_id" varchar(24) NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"permission_id" varchar(24) NOT NULL,
	"effect" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UQ_organization_user_permissions_org_user_permission" UNIQUE("organization_id","user_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "permission_actions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permission_actions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "permission_features" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permission_features_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"feature_id" varchar(24) NOT NULL,
	"action_id" varchar(24) NOT NULL,
	"code" varchar(128) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_code_unique" UNIQUE("code"),
	CONSTRAINT "UQ_permissions_feature_action" UNIQUE("feature_id","action_id")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"role_id" varchar(24) NOT NULL,
	"permission_id" varchar(24) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UQ_role_permissions_role_permission" UNIQUE("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "organization_report_settings" (
	"organization_id" varchar(24) PRIMARY KEY NOT NULL,
	"display_name" varchar(255),
	"header_text" text,
	"footer_text" text,
	"legal_text" text,
	"primary_color" varchar(32),
	"secondary_color" varchar(32),
	"logo_file_name" varchar(255),
	"logo_content_type" varchar(128),
	"logo_size_bytes" integer,
	"logo_blob" "bytea",
	"updated_by" varchar(24),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership_roles" ADD CONSTRAINT "organization_membership_roles_membership_id_organization_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."organization_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership_roles" ADD CONSTRAINT "organization_membership_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_user_permissions" ADD CONSTRAINT "organization_user_permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_user_permissions" ADD CONSTRAINT "organization_user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_user_permissions" ADD CONSTRAINT "organization_user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_feature_id_permission_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."permission_features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_action_id_permission_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."permission_actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_report_settings" ADD CONSTRAINT "organization_report_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_report_settings" ADD CONSTRAINT "organization_report_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "IDX_users_google_id" ON "users" USING btree ("google_id");--> statement-breakpoint
CREATE INDEX "UQ_users_google_id" ON "users" USING btree ("google_id");--> statement-breakpoint
CREATE INDEX "IDX_organizations_name" ON "organizations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "IDX_organization_memberships_organization" ON "organization_memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_organization_memberships_user" ON "organization_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_organization_membership_roles_membership" ON "organization_membership_roles" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "IDX_organization_membership_roles_role" ON "organization_membership_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "IDX_organization_user_permissions_org" ON "organization_user_permissions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_organization_user_permissions_user" ON "organization_user_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_organization_user_permissions_permission" ON "organization_user_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "IDX_permission_actions_code" ON "permission_actions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "IDX_permission_features_code" ON "permission_features" USING btree ("code");--> statement-breakpoint
CREATE INDEX "IDX_permissions_feature" ON "permissions" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "IDX_permissions_action" ON "permissions" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX "IDX_permissions_code" ON "permissions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "IDX_role_permissions_role" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "IDX_role_permissions_permission" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "IDX_roles_code" ON "roles" USING btree ("code");--> statement-breakpoint
CREATE INDEX "IDX_organization_report_settings_updated_by" ON "organization_report_settings" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "IDX_password_reset_tokens_user_id" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_password_reset_tokens_expires_at" ON "password_reset_tokens" USING btree ("expires_at");