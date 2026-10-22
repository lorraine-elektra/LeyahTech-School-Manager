CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"actor_name" text NOT NULL,
	"area" text NOT NULL,
	"action" text NOT NULL,
	"link" text
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"username" text NOT NULL,
	"ip_address" text,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_school_id_at_index" ON "activity_log" USING btree ("school_id","at");--> statement-breakpoint
CREATE INDEX "activity_log_school_id_area_at_index" ON "activity_log" USING btree ("school_id","area","at");--> statement-breakpoint
CREATE INDEX "login_attempts_school_id_username_attempted_at_index" ON "login_attempts" USING btree ("school_id","username","attempted_at");--> statement-breakpoint
CREATE INDEX "login_attempts_attempted_at_index" ON "login_attempts" USING btree ("attempted_at");--> statement-breakpoint
CREATE INDEX "attendance_entries_student_id_index" ON "attendance_entries" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrolments_school_id_academic_year_index" ON "enrolments" USING btree ("school_id","academic_year");--> statement-breakpoint
CREATE INDEX "fee_items_school_id_term_id_index" ON "fee_items" USING btree ("school_id","term_id");--> statement-breakpoint
CREATE INDEX "fee_payments_school_id_term_id_index" ON "fee_payments" USING btree ("school_id","term_id");--> statement-breakpoint
CREATE INDEX "scholarships_school_id_index" ON "scholarships" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "scholarships_student_id_index" ON "scholarships" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_index" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_index" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "students_school_id_status_index" ON "students" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "students_guardian_id_index" ON "students" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "subject_scores_school_id_term_id_subject_id_index" ON "subject_scores" USING btree ("school_id","term_id","subject_id");--> statement-breakpoint
CREATE INDEX "users_guardian_id_index" ON "users" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "users_staff_id_index" ON "users" USING btree ("staff_id");