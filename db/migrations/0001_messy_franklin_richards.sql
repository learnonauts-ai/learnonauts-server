ALTER TABLE "settings" ADD COLUMN "focus_outlines" boolean;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "audio_feedback" boolean;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "sound_effects" boolean;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "line_height" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "word_spacing" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "focus_sessions" boolean;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "distraction_reduction" boolean;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "feedback_style" text;--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "sound_enabled";