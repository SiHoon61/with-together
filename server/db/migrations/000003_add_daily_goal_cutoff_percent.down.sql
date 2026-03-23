ALTER TABLE rooms
DROP CONSTRAINT IF EXISTS rooms_daily_goal_cutoff_percent_check;

ALTER TABLE rooms
DROP COLUMN daily_goal_cutoff_percent;
