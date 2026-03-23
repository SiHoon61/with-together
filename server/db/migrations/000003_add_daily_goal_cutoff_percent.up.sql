ALTER TABLE rooms
ADD COLUMN daily_goal_cutoff_percent INTEGER NOT NULL DEFAULT 50;

ALTER TABLE rooms
ADD CONSTRAINT rooms_daily_goal_cutoff_percent_check
CHECK (daily_goal_cutoff_percent BETWEEN 1 AND 100);
