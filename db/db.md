# Learnonauts Database Schema (Wide Relational Model)

This document outlines a relational database schema where each user has exactly **one row** in the `settings`, `progress`, and `grades` tables. Data for individual modules or activities is stored in distinct columns within that single row.

---

### 1. `users` Table (Core User Information)

Core user data for the application, managed by the authentication system.

| Column | Type | Description |
| :--- | :--- | :--- |
| **id** | `text` | **Primary Key** - User ID (UUID-like format). |
| `email` | `text` | **Unique** - User's email address. |
| `hashed_password` | `text` | Bcrypt hashed password. |
| `display_name` | `text` | User's display name. |
| `username` | `text` | **Unique** - User's chosen username/handle. |
| `age` | `integer` | (Nullable) User's age. |
| `reset_key` | `text` | (Nullable) Password reset key. |
| `reset_key_expires` | `text` | (Nullable) Timestamp when reset key expires. |
| `is_banned` | `boolean` | `true` if account is banned. Default: `false`. |
| `last_password_reset` | `text` | (Nullable) Timestamp of last password reset. |
| `profile_picture_url` | `text` | (Nullable) URL to user's profile picture in storage. |
| `created_at` | `text` | Creation timestamp. Default: `CURRENT_TIMESTAMP`. |
| `updated_at` | `text` | Update timestamp. Default: `CURRENT_TIMESTAMP`. |

---

### 2. `settings` Table

Stores all accessibility and UI preferences for a user in a single record. This table has a **one-to-one relationship** with the `users` table.

| Column | Type | Description |
| :--- | :--- | :--- |
| **user_email** | `text` | **Primary Key** and Foreign Key to `users.email`. |
| `font_size` | `text` | User's preferred font size (e.g., 'small', 'normal', 'large', 'xlarge'). Default: 'normal'. |
| `color_theme` | `text` | The selected color theme (e.g., 'normal', 'high-contrast', 'warm', 'cool'). Default: 'normal'. |
| `dark_mode` | `boolean` | `true` if dark mode is enabled. |
| `reduced_motion` | `boolean` | `true` if animations should be minimized. |
| `speech_enabled` | `boolean` | `true` if text-to-speech is active. |
| `speech_speed` | `decimal` | Narration speed for TTS (e.g., `1.0`, `1.5`). Default: `1.0`. |
| `speech_volume` | `decimal` | Volume level for TTS (0.0 to 1.0). Default: `1.0`. |
| `speech_instructions` | `boolean` | `true` if speech instructions are enabled. |
| `reading_guide` | `boolean` | `true` if the reading line highlight is on. |
| `text_spacing` | `text` | Preference for letter/word/line spacing (e.g., 'normal', 'wide'). |
| `color_overlay` | `text` | The selected color overlay for reading (e.g., 'none', 'yellow', 'blue'). |
| `break_reminders` | `boolean` | `true` to enable ADHD-friendly break reminders. |
| `sensory_breaks` | `boolean` | `true` to enable sensory break reminders. |
| `simplified_ui` | `boolean` | `true` to reduce visual clutter. |
| `minimal_mode` | `boolean` | `true` to enable minimal UI mode. |
| `visible_timers` | `boolean` | `true` if timers are visible. |
| `sound_enabled` | `boolean` | `true` if sound effects are enabled. |
| `cognitive_load` | `text` | Preferred information density (e.g., 'full', 'minimal'). |
| `error_handling_style` | `text` | The style of error messages shown (e.g., 'standard', 'gentle'). |
| `learning_style` | `text` | Preferred learning modality (e.g., 'visual', 'kinesthetic'). |

---

### 3. `progress` Table

Tracks a user's completion status for all learning modules in a single row. Each module has its own set of columns.

| Column | Type | Description |
| :--- | :--- | :--- |
| **user_email** | `text` | **Primary Key** and Foreign Key to `users.email`. |
| `current_streak` | `integer` | Number of consecutive days of learning. Default: `0`. |
| `xp_today` | `integer` | Experience points earned today. Default: `0`. |
| `daily_goal` | `integer` | User's daily XP goal. Default: `150`. |
| `hearts` | `integer` | Number of hearts/lives remaining. Default: `3`. |
| `coins` | `integer` | Currency earned by user. Default: `0`. |
| `total_xp_earned` | `integer` | Total experience points earned. Default: `0`. |
| `total_time_spent` | `integer` | Total time spent learning in seconds. Default: `0`. |
| `progress_placement_status` | `text` | Status for the 'Placement Test' module (e.g., 'not-started', 'in-progress', 'completed'). |
| `progress_placement_completed_at` | `timestamp` | (Nullable) Completion timestamp for the 'Placement Test' module. |
| `progress_placement_attempts` | `integer` | Number of attempts on placement test. Default: `0`. |
| `progress_placement_time_spent` | `integer` | Time spent on placement test in seconds. Default: `0`. |
| `progress_introduction_status` | `text` | Status for the 'AI Fundamentals' module. |
| `progress_introduction_completed_at` | `timestamp` | (Nullable) Completion timestamp for the 'AI Fundamentals' module. |
| `progress_introduction_attempts` | `integer` | Number of attempts on introduction module. Default: `0`. |
| `progress_introduction_time_spent` | `integer` | Time spent on introduction module in seconds. Default: `0`. |
| `progress_regression_status` | `text` | Status for the 'Prediction Explorer' module. |
| `progress_regression_completed_at` | `timestamp` | (Nullable) Completion timestamp for the 'Prediction Explorer' module. |
| `progress_regression_attempts` | `integer` | Number of attempts on regression module. Default: `0`. |
| `progress_regression_time_spent` | `integer` | Time spent on regression module in seconds. Default: `0`. |
| `progress_clustering_status` | `text` | Status for the 'Pattern Detective' module. |
| `progress_clustering_completed_at` | `timestamp` | (Nullable) Completion timestamp for the 'Pattern Detective' module. |
| `progress_clustering_attempts` | `integer` | Number of attempts on clustering module. Default: `0`. |
| `progress_clustering_time_spent` | `integer` | Time spent on clustering module in seconds. Default: `0`. |
| `progress_neural_network_status` | `text` | Status for the 'Neural Network Lab' module. |
| `progress_neural_network_completed_at` | `timestamp` | (Nullable) Completion timestamp for the 'Neural Network Lab' module. |
| `progress_neural_network_attempts` | `integer` | Number of attempts on neural network module. Default: `0`. |
| `progress_neural_network_time_spent` | `integer` | Time spent on neural network module in seconds. Default: `0`. |
| `progress_training_lab_status` | `text` | Status for the 'AI Training Lab' module. |
| `progress_training_lab_completed_at` | `timestamp` | (Nullable) Completion timestamp for the 'AI Training Lab' module. |
| `progress_training_lab_attempts` | `integer` | Number of attempts on training lab module. Default: `0`. |
| `progress_training_lab_time_spent` | `integer` | Time spent on training lab module in seconds. Default: `0`. |
| `progress_practice_status` | `text` | Status for the 'Practice Mode' module. |
| `progress_practice_completed_at` | `timestamp` | (Nullable) Completion timestamp for the 'Practice Mode' module. |
| `progress_practice_attempts` | `integer` | Number of attempts on practice module. Default: `0`. |
| `progress_practice_time_spent` | `integer` | Time spent on practice module in seconds. Default: `0`. |
| `progress_accessibility_demo_status` | `text` | Status for the 'Accessibility Demo' module. |
| `progress_accessibility_demo_completed_at` | `timestamp` | (Nullable) Completion timestamp for the 'Accessibility Demo' module. |
| `progress_accessibility_demo_attempts` | `integer` | Number of attempts on accessibility demo module. Default: `0`. |
| `progress_accessibility_demo_time_spent` | `integer` | Time spent on accessibility demo module in seconds. Default: `0`. |
| `...` | `...` | *Additional columns would be added here for new modules.* |

---

### 4. `grades` Table

Stores scores for all specific, quantifiable activities in a single row per user. Each graded activity has its own column.

| Column | Type | Description |
| :--- | :--- | :--- |
| **user_email** | `text` | **Primary Key** and Foreign Key to `users.email`. |
| `grade_placement_test_score` | `decimal` | (Nullable) Score for the initial placement test. |
| `grade_placement_test_recorded_at` | `timestamp` | (Nullable) Timestamp when the placement test was taken. |
| `grade_placement_test_attempts` | `integer` | Number of attempts on placement test. Default: `0`. |
| `grade_introduction_quiz_score` | `decimal` | (Nullable) Score for the quiz in the 'AI Fundamentals' module. |
| `grade_introduction_quiz_recorded_at` | `timestamp` | (Nullable) Timestamp for the AI Fundamentals quiz. |
| `grade_regression_game_score` | `decimal` | (Nullable) High score for the 'Prediction Explorer' game. |
| `grade_regression_game_recorded_at` | `timestamp` | (Nullable) Timestamp for the regression game high score. |
| `grade_regression_game_attempts` | `integer` | Number of attempts on regression game. Default: `0`. |
| `grade_regression_game_time_spent` | `integer` | Time spent on regression game in seconds. Default: `0`. |
| `grade_clustering_game_score` | `decimal` | (Nullable) High score for the 'Pattern Detective' game. |
| `grade_clustering_game_recorded_at` | `timestamp` | (Nullable) Timestamp for the clustering game high score. |
| `grade_clustering_game_attempts` | `integer` | Number of attempts on clustering game. Default: `0`. |
| `grade_clustering_game_time_spent` | `integer` | Time spent on clustering game in seconds. Default: `0`. |
| `grade_neural_network_accuracy` | `decimal` | (Nullable) Best model accuracy achieved in the 'Neural Network Lab'. |
| `grade_neural_network_recorded_at` | `timestamp` | (Nullable) Timestamp for the neural network best accuracy. |
| `grade_training_lab_accuracy` | `decimal` | (Nullable) Best model accuracy achieved in the 'AI Training Lab'. |
| `grade_training_lab_recorded_at` | `timestamp` | (Nullable) Timestamp for the AI training lab best accuracy. |
| `grade_training_lab_attempts` | `integer` | Number of attempts on training lab. Default: `0`. |
| `grade_practice_mode_score` | `decimal` | (Nullable) Score for the 'Practice Mode'. |
| `grade_practice_mode_recorded_at` | `timestamp` | (Nullable) Timestamp when practice mode was completed. |
| `grade_practice_mode_attempts` | `integer` | Number of attempts on practice mode. Default: `0`. |
| `grade_practice_mode_time_spent` | `integer` | Time spent on practice mode in seconds. Default: `0`. |
| `...` | `...` | *Additional columns would be added here for new graded activities.* |

---

### 5. `achievements` Table

Tracks user achievements and badges in a single row per user.

| Column | Type | Description |
| :--- | :--- | :--- |
| **user_email** | `text` | **Primary Key** and Foreign Key to `users.email`. |
| `achievement_first_steps_unlocked` | `boolean` | `true` if 'First Steps' achievement is unlocked. |
| `achievement_first_steps_unlocked_at` | `timestamp` | (Nullable) Timestamp when 'First Steps' was unlocked. |
| `achievement_high_score_unlocked` | `boolean` | `true` if 'High Score' achievement is unlocked. |
| `achievement_high_score_unlocked_at` | `timestamp` | (Nullable) Timestamp when 'High Score' was unlocked. |
| `achievement_7_day_streak_unlocked` | `boolean` | `true` if '7-Day Streak' achievement is unlocked. |
| `achievement_7_day_streak_unlocked_at` | `timestamp` | (Nullable) Timestamp when '7-Day Streak' was unlocked. |
| `achievement_all_modules_completed_unlocked` | `boolean` | `true` if 'All Modules Completed' achievement is unlocked. |
| `achievement_all_modules_completed_unlocked_at` | `timestamp` | (Nullable) Timestamp when 'All Modules Completed' was unlocked. |
| `achievement_practice_master_unlocked` | `boolean` | `true` if 'Practice Master' achievement is unlocked. |
| `achievement_practice_master_unlocked_at` | `timestamp` | (Nullable) Timestamp when 'Practice Master' was unlocked. |
| `total_achievements_unlocked` | `integer` | Total number of achievements unlocked. Default: `0`. |
| `...` | `...` | *Additional columns would be added here for new achievements.* |

---


### Relationship Overview

- `users` is the core table containing user identity information
- `settings` has a 1:1 relationship with `users` via email
- `progress` has a 1:1 relationship with `users` via email
- `grades` has a 1:1 relationship with `users` via email
- `achievements` has a 1:1 relationship with `users` via email

