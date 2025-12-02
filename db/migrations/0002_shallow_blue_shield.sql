ALTER TABLE "settings" ALTER COLUMN "font_size" SET DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "color_theme" SET DEFAULT 'default';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "dark_mode" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "reduced_motion" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "focus_outlines" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "speech_enabled" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "speech_speed" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "speech_speed" SET DEFAULT '1';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "speech_volume" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "speech_volume" SET DEFAULT '0.8';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "speech_instructions" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "audio_feedback" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "sound_effects" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "reading_guide" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "text_spacing" SET DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "line_height" SET DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "word_spacing" SET DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "color_overlay" SET DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "break_reminders" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "sensory_breaks" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "visible_timers" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "focus_sessions" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "distraction_reduction" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "simplified_ui" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "minimal_mode" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "cognitive_load" SET DEFAULT 'full';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "error_handling_style" SET DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "feedback_style" SET DEFAULT 'mixed';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "learning_style" SET DEFAULT 'visual';