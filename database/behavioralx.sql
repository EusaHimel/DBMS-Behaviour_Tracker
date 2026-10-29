-- ============================================================================
--  BehavioralX  -  MySQL 8 database
--  Tables, relations, catalog (shop) seed data and demo data for one account.
--  Rules and calculations live in PHP; this file only stores the results.
--  Demo login:  email maryum@example.com  /  username Maryum  /  password 123456
--  Import:      mysql -u root -p < behavioralx.sql
-- ============================================================================

DROP DATABASE IF EXISTS behavioralx;
CREATE DATABASE behavioralx CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE behavioralx;

SET FOREIGN_KEY_CHECKS = 0;
SET time_zone = '+00:00';

-- ============================================================================
--  1. CATALOG / LOOKUP TABLES  (shop items and cosmetics, editable data)
-- ============================================================================

-- Preset profile pictures ("cute avatars")
CREATE TABLE avatars (
  avatar_id  VARCHAR(20) NOT NULL,
  bg_color   CHAR(7)     NOT NULL,
  PRIMARY KEY (avatar_id)
) ENGINE=InnoDB;

-- Garden seasons (classic is free, others are unlocked with diamonds)
CREATE TABLE seasons (
  season_id       VARCHAR(10)  NOT NULL,
  name            VARCHAR(40)  NOT NULL,
  blurb           VARCHAR(120) NOT NULL,
  price_diamonds  INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (season_id)
) ENGINE=InnoDB;

-- Pets you can adopt
CREATE TABLE pet_kinds (
  kind_id      VARCHAR(10)  NOT NULL,
  name         VARCHAR(30)  NOT NULL,
  price_coins  INT UNSIGNED NOT NULL,
  sound        VARCHAR(10)  NOT NULL,
  blurb        VARCHAR(120) NOT NULL,
  PRIMARY KEY (kind_id)
) ENGINE=InnoDB;

-- Colour variants of each pet kind (variant_index matches pets.variant_index)
CREATE TABLE pet_variants (
  kind_id        VARCHAR(10) NOT NULL,
  variant_index  TINYINT UNSIGNED NOT NULL,
  name           VARCHAR(30) NOT NULL,
  color_a        CHAR(7)     NOT NULL,
  color_b        CHAR(7)     NOT NULL,
  PRIMARY KEY (kind_id, variant_index),
  CONSTRAINT fk_pv_kind FOREIGN KEY (kind_id) REFERENCES pet_kinds (kind_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Dress-up items (hat / face / neck slots)
CREATE TABLE accessories (
  accessory_id  VARCHAR(20) NOT NULL,
  slot          ENUM('hat','face','neck') NOT NULL,
  name          VARCHAR(40) NOT NULL,
  price_coins   INT UNSIGNED NOT NULL,
  PRIMARY KEY (accessory_id)
) ENGINE=InnoDB;

-- Pet food; loves_kind = the pet kind that loves it (NULL = any pet)
CREATE TABLE foods (
  food_id      VARCHAR(20)  NOT NULL,
  name         VARCHAR(40)  NOT NULL,
  price_coins  INT UNSIGNED NOT NULL,
  fill_amount  TINYINT UNSIGNED NOT NULL,
  loves_kind   VARCHAR(10)  NULL,
  blurb        VARCHAR(120) NOT NULL,
  PRIMARY KEY (food_id),
  CONSTRAINT fk_food_kind FOREIGN KEY (loves_kind) REFERENCES pet_kinds (kind_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Garden home items and toys (bed, house, ball, bowl)
CREATE TABLE home_items (
  home_id      VARCHAR(20)  NOT NULL,
  name         VARCHAR(40)  NOT NULL,
  price_coins  INT UNSIGNED NOT NULL,
  blurb        VARCHAR(120) NOT NULL,
  garden_x     DECIMAL(5,2) NOT NULL,   -- fixed spot in the garden (% of width)
  garden_y     DECIMAL(5,2) NOT NULL,   -- (% of height)
  width_pct    DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (home_id)
) ENGINE=InnoDB;

-- ============================================================================
--  2. USERS
-- ============================================================================

CREATE TABLE users (
  user_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(40)  NOT NULL,                    -- full name
  email           VARCHAR(120) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,                    -- bcrypt hash, never plain text
  age_group       ENUM('Under 18','18 to 24','25 to 34','35 to 44','45 and over') NULL,
  occupation      VARCHAR(40)  NULL,
  nickname        VARCHAR(20)  NULL,
  username        VARCHAR(20)  NULL,
  avatar_type     ENUM('preset','photo') NOT NULL DEFAULT 'preset',
  avatar_id       VARCHAR(20)  NULL DEFAULT 'sprout',
  avatar_path     VARCHAR(100) NULL,                        -- file name in /uploads/avatars when avatar_type = 'photo'
  active_season   VARCHAR(10)  NOT NULL DEFAULT 'classic',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at   DATETIME     NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_username (username),
  CONSTRAINT chk_users_username CHECK (username IS NULL OR username REGEXP '^[A-Za-z0-9_]{3,20}$'),
  CONSTRAINT chk_users_photo CHECK (avatar_type <> 'photo' OR avatar_path IS NOT NULL),
  CONSTRAINT fk_users_avatar FOREIGN KEY (avatar_id) REFERENCES avatars (avatar_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_users_season FOREIGN KEY (active_season) REFERENCES seasons (season_id)
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Sound / music / theme preferences (1 row per user)
CREATE TABLE user_settings (
  user_id      INT UNSIGNED NOT NULL,
  sfx_on       TINYINT(1)   NOT NULL DEFAULT 1,
  volume       DECIMAL(3,2) NOT NULL DEFAULT 0.55,
  focus_track  ENUM('lofi','box','rain','ocean','forest','pad') NULL,
  theme        ENUM('system','light','dark') NOT NULL DEFAULT 'system',
  PRIMARY KEY (user_id),
  CONSTRAINT chk_settings_volume CHECK (volume BETWEEN 0 AND 1),
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seasons a user has unlocked ('classic' is always present)
CREATE TABLE user_seasons (
  user_id      INT UNSIGNED NOT NULL,
  season_id    VARCHAR(10)  NOT NULL,
  unlocked_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, season_id),
  CONSTRAINT fk_us_user   FOREIGN KEY (user_id)   REFERENCES users (user_id)     ON DELETE CASCADE,
  CONSTRAINT fk_us_season FOREIGN KEY (season_id) REFERENCES seasons (season_id) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
--  3. TASKS  (finished tasks grow plants in the garden)
-- ============================================================================

CREATE TABLE tasks (
  task_id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED NOT NULL,
  title             VARCHAR(90)  NOT NULL,
  task_type         ENUM('academic','health','habit','occasion','growth') NOT NULL,
  effort            ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  skip_rating       TINYINT(1)   NOT NULL DEFAULT 0,        -- 1 = "no difficulty rating" (grass, 1 coin)
  difficulty        ENUM('Easy','Medium','Hard','N/A') NOT NULL,
  difficulty_score  DECIMAL(5,3) NULL,                      -- 0.4*time pressure + 0.6*effort (+ history)
  status            ENUM('pending','completed') NOT NULL DEFAULT 'pending',
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deadline          DATETIME     NOT NULL,
  completed_at      DATETIME     NULL,
  timing            ENUM('early','ontime','late') NULL,     -- set on completion
  coins_earned      INT          NULL,                      -- set on completion
  notified          TINYINT(1)   NOT NULL DEFAULT 0,        -- "due soon" alert already sent
  garden_x          DECIMAL(5,2) NULL,                      -- plant position in the garden (%)
  garden_y          DECIMAL(5,2) NULL,
  plant_variant     TINYINT UNSIGNED NULL,                  -- colour variant 0-4, set on completion
  plant_wilted      TINYINT(1)   NOT NULL DEFAULT 0,        -- 1 = finished late
  PRIMARY KEY (task_id),
  KEY idx_tasks_user_status (user_id, status, deadline),
  KEY idx_tasks_user_completed (user_id, completed_at),
  CONSTRAINT chk_tasks_dates CHECK (deadline > created_at),
  CONSTRAINT chk_tasks_done CHECK (
    (status = 'pending'   AND completed_at IS NULL) OR
    (status = 'completed' AND completed_at IS NOT NULL AND timing IS NOT NULL)),
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
--  4. GOALS  (behaviour you want to change)
-- ============================================================================

CREATE TABLE goals (
  goal_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  title          VARCHAR(90)  NOT NULL,
  goal_type      ENUM('avoid','procrast','impulse','escape','skip') NOT NULL,   -- Deadline avoidance, Late starts, Impulsive choices, Screen escape, Dropped routines
  baseline       DECIMAL(4,3) NOT NULL,                      -- strength when the goal was set (0-1)
  target         DECIMAL(4,3) NOT NULL,                      -- strength you want to reach
  current_score  DECIMAL(4,3) NOT NULL,                      -- live 30-day pattern strength (automatic)
  manual_progress DECIMAL(4,3) NULL,                         -- optional manual override of progress (0-1)
  manual_set_at  DATETIME     NULL,                          -- override stays until the next relevant log after this time
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deadline       DATETIME     NOT NULL,
  status         ENUM('active','done') NOT NULL DEFAULT 'active',
  closed_at      DATETIME     NULL,
  completion     DECIMAL(5,3) NULL,                          -- final progress (1.0 = target reached)
  result         ENUM('bird','butterfly','none') NULL,       -- garden visitor earned on closing
  coin_points    INT          NULL,
  diamond_points INT          NULL,
  closed_on_time TINYINT(1)   NULL,
  bee_awarded    TINYINT(1)   NOT NULL DEFAULT 0,            -- passed 50% before the deadline
  notified       TINYINT(1)   NOT NULL DEFAULT 0,            -- "ends soon" alert already sent
  PRIMARY KEY (goal_id),
  KEY idx_goals_user_status (user_id, status, deadline),
  KEY idx_goals_type (user_id, goal_type),
  CONSTRAINT chk_goals_range  CHECK (baseline BETWEEN 0 AND 1 AND target BETWEEN 0 AND 1 AND current_score BETWEEN 0 AND 1),
  CONSTRAINT chk_goals_target CHECK (target <= baseline - 0.05),
  CONSTRAINT chk_goals_manual CHECK ((manual_progress IS NULL AND manual_set_at IS NULL) OR (manual_progress BETWEEN 0 AND 1 AND manual_set_at IS NOT NULL)),
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Score history written automatically each week ('auto') or entered by hand ('manual'); first row = baseline
CREATE TABLE goal_checkins (
  checkin_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  goal_id     INT UNSIGNED NOT NULL,
  score       DECIMAL(4,3) NOT NULL,
  source      ENUM('auto','manual') NOT NULL DEFAULT 'auto',
  logged_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (checkin_id),
  KEY idx_checkins_goal (goal_id, logged_at),
  CONSTRAINT chk_checkin_score CHECK (score BETWEEN 0 AND 1),
  CONSTRAINT fk_checkin_goal FOREIGN KEY (goal_id) REFERENCES goals (goal_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Nested checklist under a goal (parent_id points to another subtask = sub-item)
CREATE TABLE goal_subtasks (
  subtask_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  goal_id     INT UNSIGNED NOT NULL,
  parent_id   INT UNSIGNED NULL,
  title       VARCHAR(80)  NOT NULL,
  is_done     TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (subtask_id),
  KEY idx_subtasks_goal (goal_id, parent_id, sort_order),
  CONSTRAINT fk_subtask_goal   FOREIGN KEY (goal_id)   REFERENCES goals (goal_id)          ON DELETE CASCADE,
  CONSTRAINT fk_subtask_parent FOREIGN KEY (parent_id) REFERENCES goal_subtasks (subtask_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
--  5. EVENTS  (context -> trigger -> behaviour -> decision -> outcome)
-- ============================================================================

CREATE TABLE events (
  event_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  occurred_at  DATETIME     NOT NULL,
  context      ENUM('Due Task','Stress','Team work','Late night hours','Feeling low on energy',
                    'Hanging out with friends','Family time','Alone at home','Busy') NOT NULL,
  trigger_cue  ENUM('Deadline is close (within a day)','Got a phone notification','Feeling overwhelmed',
                    'Feeling bored','A friend invited me somewhere','Not sure what to do next',
                    'Feeling anxious','Saw something on social media','Someone criticized me',
                    'Feeling lonely') NOT NULL,
  behavior     ENUM('Started the task','Asked for help','Silenced my phone',
                    'Read a book','Opened social media','Watched videos','Cleaned instead',
                    'Stayed in bed','Talked to a friend about it','Took a short break') NOT NULL,
  duration_min SMALLINT UNSIGNED NULL,
  decision     ENUM('Chose to start now','Chose to break it into steps','Chose to ask for help',
                    'Chose to wind down','Chose to delay','Chose to skip','Chose the quick reward') NOT NULL,
  result       ENUM('Finished on time','Made progress','Felt calmer','Rushed finish',
                    'Lost time','Missed the deadline') NOT NULL,
  success      ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  mood         TINYINT UNSIGNED NULL,                        -- 0 = sad, 100 = happy
  stress       TINYINT UNSIGNED NULL,                        -- 0 = relaxed, 100 = stressed
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id),
  KEY idx_events_user_time (user_id, occurred_at),
  CONSTRAINT chk_events_mood   CHECK (mood   IS NULL OR mood   BETWEEN 0 AND 100),
  CONSTRAINT chk_events_stress CHECK (stress IS NULL OR stress BETWEEN 0 AND 100),
  CONSTRAINT chk_events_dur    CHECK (duration_min IS NULL OR duration_min BETWEEN 1 AND 1440),
  CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- "Alternatives you considered but did not choose"
CREATE TABLE event_alternatives (
  alternative_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id        INT UNSIGNED NOT NULL,
  text            VARCHAR(80)  NOT NULL,
  PRIMARY KEY (alternative_id),
  KEY idx_alt_event (event_id),
  CONSTRAINT fk_alt_event FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- (the decision column is a fixed list: no free-text decisions)
-- Reflection notes added to an event
CREATE TABLE event_notes (
  note_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id    INT UNSIGNED NOT NULL,
  text        TEXT         NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (note_id),
  KEY idx_notes_event (event_id, created_at),
  CONSTRAINT fk_notes_event FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
--  Which patterns each log was counted under (written by PHP when an event is saved).
--  One match = 1 row, two = 2 rows, three or more = the strongest 2 (rank_no 1 and 2).
--  Matches take priority; an event with no match is logged under healthy conditions.
-- ----------------------------------------------------------------------------
CREATE TABLE event_patterns (
  event_id         INT UNSIGNED NOT NULL,
  pattern          ENUM('avoid','procrast','impulse','escape','skip') NOT NULL,
  outcome          ENUM('match','healthy') NOT NULL,
  condition_count  TINYINT UNSIGNED NOT NULL,       -- how many match (or healthy) conditions were met
  rank_no          TINYINT UNSIGNED NOT NULL,       -- 1 = strongest, 2 = second
  PRIMARY KEY (event_id, pattern),
  KEY idx_ep_pattern (pattern, outcome),
  CONSTRAINT chk_ep_rank CHECK (rank_no IN (1,2)),
  CONSTRAINT fk_ep_event FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Habit and health tasks count toward Dropped routines (late = match, early/on time = healthy)
CREATE TABLE task_patterns (
  task_id  INT UNSIGNED NOT NULL,
  pattern  ENUM('avoid','procrast','impulse','escape','skip') NOT NULL DEFAULT 'skip',
  outcome  ENUM('match','healthy') NOT NULL,
  PRIMARY KEY (task_id, pattern),
  CONSTRAINT fk_tp_task FOREIGN KEY (task_id) REFERENCES tasks (task_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
--  6. WALLET  (coins and diamonds are ledgers; balance = SUM(amount))
-- ============================================================================

CREATE TABLE coin_transactions (
  tx_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  amount      INT          NOT NULL,                         -- negative = spent
  reason      VARCHAR(160) NOT NULL,
  source      ENUM('task','goal','adoption','purchase','other') NOT NULL DEFAULT 'other',
  task_id     INT UNSIGNED NULL,
  goal_id     INT UNSIGNED NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tx_id),
  KEY idx_coin_user_time (user_id, created_at),
  CONSTRAINT fk_coin_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_coin_task FOREIGN KEY (task_id) REFERENCES tasks (task_id) ON DELETE SET NULL,
  CONSTRAINT fk_coin_goal FOREIGN KEY (goal_id) REFERENCES goals (goal_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE diamond_transactions (
  tx_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  amount      INT          NOT NULL,
  reason      VARCHAR(160) NOT NULL,
  goal_id     INT UNSIGNED NULL,
  season_id   VARCHAR(10)  NULL,                             -- set when diamonds buy a season
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tx_id),
  KEY idx_dia_user_time (user_id, created_at),
  CONSTRAINT fk_dia_user   FOREIGN KEY (user_id)   REFERENCES users (user_id)     ON DELETE CASCADE,
  CONSTRAINT fk_dia_goal   FOREIGN KEY (goal_id)   REFERENCES goals (goal_id)     ON DELETE SET NULL,
  CONSTRAINT fk_dia_season FOREIGN KEY (season_id) REFERENCES seasons (season_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
--  7. GARDEN VISITORS  (bee = 50% on time, butterfly = 70%+, bird = 100%)
-- ============================================================================

CREATE TABLE garden_decorations (
  deco_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  goal_id     INT UNSIGNED NOT NULL,
  kind        ENUM('bee','butterfly','bird') NOT NULL,
  x           DECIMAL(5,2) NOT NULL,
  y           DECIMAL(5,2) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (deco_id),
  KEY idx_deco_user (user_id, created_at),
  CONSTRAINT fk_deco_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_deco_goal FOREIGN KEY (goal_id) REFERENCES goals (goal_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
--  8. PETS, INVENTORY  (bought with coins)
-- ============================================================================

CREATE TABLE pets (
  pet_id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED NOT NULL,
  kind_id           VARCHAR(10)  NOT NULL,
  variant_index     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  name              VARCHAR(16)  NOT NULL,
  fullness          TINYINT UNSIGNED NOT NULL DEFAULT 70,    -- value at stats_updated_at; decays over time
  joy               TINYINT UNSIGNED NOT NULL DEFAULT 80,
  stats_updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  adopted_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  garden_x          DECIMAL(5,2) NOT NULL,
  garden_y          DECIMAL(5,2) NOT NULL,
  hat_id            VARCHAR(20)  NULL,
  face_id           VARCHAR(20)  NULL,
  neck_id           VARCHAR(20)  NULL,
  PRIMARY KEY (pet_id),
  KEY idx_pets_user (user_id),
  CONSTRAINT chk_pets_stats CHECK (fullness <= 100 AND joy <= 100),
  CONSTRAINT fk_pets_user    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_pets_variant FOREIGN KEY (kind_id, variant_index) REFERENCES pet_variants (kind_id, variant_index),
  CONSTRAINT fk_pets_hat  FOREIGN KEY (hat_id)  REFERENCES accessories (accessory_id) ON DELETE SET NULL,
  CONSTRAINT fk_pets_face FOREIGN KEY (face_id) REFERENCES accessories (accessory_id) ON DELETE SET NULL,
  CONSTRAINT fk_pets_neck FOREIGN KEY (neck_id) REFERENCES accessories (accessory_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE user_accessories (
  user_id       INT UNSIGNED NOT NULL,
  accessory_id  VARCHAR(20)  NOT NULL,
  purchased_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, accessory_id),
  CONSTRAINT fk_ua_user FOREIGN KEY (user_id)      REFERENCES users (user_id)            ON DELETE CASCADE,
  CONSTRAINT fk_ua_acc  FOREIGN KEY (accessory_id) REFERENCES accessories (accessory_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_food (
  user_id   INT UNSIGNED NOT NULL,
  food_id   VARCHAR(20)  NOT NULL,
  quantity  INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, food_id),
  CONSTRAINT fk_uf_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_uf_food FOREIGN KEY (food_id) REFERENCES foods (food_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_home_items (
  user_id       INT UNSIGNED NOT NULL,
  home_id       VARCHAR(20)  NOT NULL,
  purchased_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, home_id),
  CONSTRAINT fk_uh_user FOREIGN KEY (user_id) REFERENCES users (user_id)       ON DELETE CASCADE,
  CONSTRAINT fk_uh_home FOREIGN KEY (home_id) REFERENCES home_items (home_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
--  9. NOTIFICATIONS  (bell menu and Alerts panel)
-- ============================================================================

CREATE TABLE notifications (
  notification_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL,
  text             VARCHAR(300) NOT NULL,
  is_read          TINYINT(1)   NOT NULL DEFAULT 0,
  target_page      ENUM('tasks','events','garden','goals','insights','pets','profile') NULL,
  pattern          ENUM('avoid','procrast','impulse','escape','skip') NULL,   -- for insights links
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  KEY idx_notif_user (user_id, is_read, created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
--  10. VIEWS
-- ============================================================================

-- Coin and diamond balance per user
CREATE VIEW v_user_balances AS
SELECT u.user_id,
       u.name,
       COALESCE((SELECT SUM(c.amount) FROM coin_transactions    c WHERE c.user_id = u.user_id), 0) AS coins,
       COALESCE((SELECT SUM(d.amount) FROM diamond_transactions d WHERE d.user_id = u.user_id), 0) AS diamonds
FROM users u;

-- Events from the last 30 days (the window used by the pattern rules in Insights)
CREATE VIEW v_events_last_30_days AS
SELECT e.*
FROM events e
WHERE e.occurred_at >= (NOW() - INTERVAL 30 DAY);

-- Pattern strength over the last 30 days: matches / (matches + healthy). Detected = 3+ matches.
CREATE VIEW v_pattern_strength_30d AS
SELECT x.user_id, x.pattern,
       SUM(x.outcome = 'match')   AS matches,
       SUM(x.outcome = 'healthy') AS healthy,
       ROUND(SUM(x.outcome = 'match') / COUNT(*), 3) AS strength,
       (SUM(x.outcome = 'match') >= 3) AS detected
FROM (
  SELECT e.user_id, ep.pattern, ep.outcome
  FROM event_patterns ep JOIN events e ON e.event_id = ep.event_id
  WHERE e.occurred_at >= (NOW() - INTERVAL 30 DAY)
  UNION ALL
  SELECT t.user_id, tp.pattern, tp.outcome
  FROM task_patterns tp JOIN tasks t ON t.task_id = tp.task_id
  WHERE COALESCE(t.completed_at, t.deadline) >= (NOW() - INTERVAL 30 DAY)
) x
GROUP BY x.user_id, x.pattern;

-- Goal progress: (baseline - current) / (baseline - target), or share of subtasks done
CREATE VIEW v_goal_progress AS
SELECT g.goal_id, g.user_id, g.title, g.goal_type, g.status,
       ROUND(LEAST(GREATEST(
         (g.baseline - g.current_score) / (g.baseline - g.target), 0), 1), 3) AS score_progress,
       (SELECT ROUND(AVG(s.is_done), 3) FROM goal_subtasks s
         WHERE s.goal_id = g.goal_id AND s.parent_id IS NULL) AS top_level_subtasks_done
FROM goals g;

-- ============================================================================
--  11. CATALOG SEED DATA
-- ============================================================================

INSERT INTO avatars (avatar_id, bg_color) VALUES
 ('sprout','#DDF3E4'),('cat','#FFE4C7'),('cat2','#E4E7F5'),('dog','#FFEBD0'),('dog2','#F2E2D2'),
 ('bunny','#FFE1EA'),('bunny2','#FDE7DC'),('frog','#DDF3D3'),('frog2','#D5F4EE'),
 ('bear','#F7E3CF'),('panda','#E3EEF7'),('fox','#FFE8D2'),('chick','#FFF3C4'),('sunflower','#DDEFFB');

INSERT INTO seasons (season_id, name, blurb, price_diamonds) VALUES
 ('classic','Classic meadow','Fresh green and calm.',0),
 ('summer','Sunny summer','Bright skies and bubbles.',50),
 ('spring','Spring blossom','Pink petals in the breeze.',100),
 ('fall','Cozy fall','Golden leaves drifting down.',150),
 ('winter','Snowy winter','Soft snow and frosty trees.',200);

INSERT INTO pet_kinds (kind_id, name, price_coins, sound, blurb) VALUES
 ('cat','Cat',300,'meow','Curious, cuddly, and loves fish.'),
 ('dog','Dog',300,'woof','Loyal, bouncy, and loves treats.'),
 ('bunny','Bunny',350,'squeak','Soft, hoppy, and loves carrots.'),
 ('frog','Frog',250,'ribbit','Calm, bouncy, and loves crunchy bugs.');

INSERT INTO pet_variants (kind_id, variant_index, name, color_a, color_b) VALUES
 ('cat',0,'Ginger','#F4B268','#D98F3F'),('cat',1,'Cloud','#F4F1EC','#CFC8BD'),
 ('cat',2,'Shadow','#5B5866','#3F3D49'),('cat',3,'Mist','#B7BDCB','#8F97AB'),
 ('dog',0,'Biscuit','#E3B27A','#B9803F'),('dog',1,'Cocoa','#9C6B45','#6F4629'),
 ('dog',2,'Snow','#F6F1EA','#C9A57E'),('dog',3,'Ash','#B9BCC4','#6E7180'),
 ('bunny',0,'Marshmallow','#FBF7F5','#E9DFDA'),('bunny',1,'Peach','#F8CFB8','#E7A98A'),
 ('bunny',2,'Cocoa','#B48A6A','#8C6446'),('bunny',3,'Blush','#F7C6D6','#EAA0B8'),
 ('frog',0,'Lily','#7DCB74','#D9F2C4'),('frog',1,'Mint','#66D1B8','#D5F7EE'),
 ('frog',2,'Sunny','#C6D84F','#F4F8C8'),('frog',3,'Berry','#8FA5F0','#E0E7FF');

INSERT INTO accessories (accessory_id, slot, name, price_coins) VALUES
 ('party','hat','Party hat',25),('flowers','hat','Flower crown',35),
 ('straw','hat','Straw hat',40),('crown','hat','Tiny crown',80),
 ('glasses','face','Round glasses',30),('shades','face','Cool shades',40),
 ('bow','neck','Red bow',20),('bell','neck','Bell collar',25),('scarf','neck','Cozy scarf',35);

INSERT INTO foods (food_id, name, price_coins, fill_amount, loves_kind, blurb) VALUES
 ('kibble','Kibble',4,25,NULL,'A tasty snack for any pet.'),
 ('fish','Tasty fish',8,40,'cat','Cats go wild for this.'),
 ('bone','Bone biscuit',6,35,'dog','Dogs wag for this.'),
 ('carrot','Crunchy carrot',5,35,'bunny','Bunnies adore it.'),
 ('cricket','Cricket cookie',5,35,'frog','A frog favorite.');

INSERT INTO home_items (home_id, name, price_coins, blurb, garden_x, garden_y, width_pct) VALUES
 ('bed','Cozy bed',35,'A soft spot for naps.',13,91,11),
 ('house','Little house',60,'A snug home in the garden.',89,76,13),
 ('ball','Bouncy ball',12,'Endless fun.',35,94,5),
 ('bowl','Water bowl',15,'Always fresh.',66,93,7);

-- ============================================================================
--  12. DEMO DATA  -  account: Maryum  (password 123456)
--  All dates are relative to the moment you import this file.
-- ============================================================================
SET @now = NOW();
SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO users (user_id, name, email, password_hash, age_group, occupation, nickname, username, avatar_type, avatar_id, avatar_path, active_season, created_at, last_login_at) VALUES
(1, 'Maryum', 'maryum@example.com', '$2b$10$CiKqLbRhgm1HBuxOGTG36.fpiqITFt5foq0Ka4Z5Ke.6Ma2Lnh8NO', '18 to 24', 'Student', 'Maryum', 'Maryum', 'preset', 'bunny', NULL, 'classic', (@now - INTERVAL 100800 MINUTE), (@now - INTERVAL 20 MINUTE));

INSERT INTO user_settings (user_id, sfx_on, volume, focus_track, theme) VALUES (1, 1, 0.55, 'lofi', 'system');
INSERT INTO user_seasons (user_id, season_id, unlocked_at) VALUES (1, 'classic', (@now - INTERVAL 100800 MINUTE));

INSERT INTO tasks (task_id, user_id, title, task_type, effort, skip_rating, difficulty, difficulty_score, status, created_at, deadline, completed_at, timing, coins_earned, notified, garden_x, garden_y, plant_variant, plant_wilted) VALUES
(1, 1, 'Finish chemistry lab report', 'academic', 'High', 0, 'Hard', 0.67, 'completed', (@now - INTERVAL 97590 MINUTE), (@now - INTERVAL 93160 MINUTE), (@now - INTERVAL 93952 MINUTE), 'ontime', 20, 0, 19.62, 70.66, 0, 0),
(2, 1, 'Make bed every morning', 'habit', 'Low', 0, 'Medium', 0.52, 'completed', (@now - INTERVAL 94510 MINUTE), (@now - INTERVAL 93134 MINUTE), (@now - INTERVAL 93317 MINUTE), 'ontime', 10, 0, 89.92, 89.87, 2, 0),
(3, 1, 'Morning run 3 km', 'health', 'Medium', 0, 'Hard', 0.682, 'completed', (@now - INTERVAL 88939 MINUTE), (@now - INTERVAL 87432 MINUTE), (@now - INTERVAL 88042 MINUTE), 'early', 30, 0, 68.9, 63.43, 4, 0),
(4, 1, 'Read chapter 4 of sociology', 'academic', 'Medium', 0, 'Medium', 0.396, 'completed', (@now - INTERVAL 92033 MINUTE), (@now - INTERVAL 86061 MINUTE), (@now - INTERVAL 87047 MINUTE), 'ontime', 10, 0, 40.2, 93.19, 2, 0),
(5, 1, 'Journal for 10 minutes', 'habit', 'Low', 0, 'Medium', 0.494, 'completed', (@now - INTERVAL 82750 MINUTE), (@now - INTERVAL 81210 MINUTE), (@now - INTERVAL 82057 MINUTE), 'early', 15, 0, 41.31, 60.74, 2, 0),
(6, 1, 'Submit statistics assignment', 'academic', 'High', 0, 'Hard', 0.612, 'completed', (@now - INTERVAL 85320 MINUTE), (@now - INTERVAL 77370 MINUTE), (@now - INTERVAL 78739 MINUTE), 'ontime', 20, 0, 48.21, 76.6, 3, 0),
(7, 1, 'Water the plants', 'habit', 'Low', 1, 'N/A', NULL, 'completed', (@now - INTERVAL 76471 MINUTE), (@now - INTERVAL 75148 MINUTE), (@now - INTERVAL 75713 MINUTE), 'early', 2, 0, 8.68, 93.01, 4, 0),
(8, 1, 'Book dentist appointment', 'health', 'Low', 0, 'Easy', 0.238, 'completed', (@now - INTERVAL 79939 MINUTE), (@now - INTERVAL 75048 MINUTE), (@now - INTERVAL 73093 MINUTE), 'late', 2, 0, 25.23, 84.83, 4, 1),
(9, 1, 'Prepare group presentation slides', 'academic', 'High', 0, 'Hard', 0.639, 'completed', (@now - INTERVAL 73213 MINUTE), (@now - INTERVAL 67371 MINUTE), (@now - INTERVAL 65640 MINUTE), 'late', 10, 0, 92.33, 79.27, 0, 1),
(10, 1, 'Buy birthday gift for Ayesha', 'occasion', 'Medium', 0, 'Medium', 0.388, 'completed', (@now - INTERVAL 70394 MINUTE), (@now - INTERVAL 63870 MINUTE), (@now - INTERVAL 64551 MINUTE), 'ontime', 10, 0, 68.71, 85.84, 4, 0),
(11, 1, 'Study for calculus quiz', 'academic', 'High', 0, 'Hard', 0.673, 'completed', (@now - INTERVAL 67194 MINUTE), (@now - INTERVAL 62876 MINUTE), (@now - INTERVAL 63414 MINUTE), 'ontime', 20, 0, 92.4, 63.98, 1, 0),
(12, 1, 'Yoga session', 'health', 'Low', 0, 'Medium', 0.315, 'completed', (@now - INTERVAL 63864 MINUTE), (@now - INTERVAL 60908 MINUTE), (@now - INTERVAL 61321 MINUTE), 'ontime', 10, 0, 9.0, 80.73, 4, 0),
(13, 1, 'Tidy desk', 'habit', 'Low', 0, 'Medium', 0.512, 'completed', (@now - INTERVAL 58432 MINUTE), (@now - INTERVAL 56964 MINUTE), (@now - INTERVAL 57042 MINUTE), 'ontime', 10, 0, 18.93, 60.03, 2, 0),
(14, 1, 'Update CV', 'growth', 'Medium', 0, 'Medium', 0.359, 'completed', (@now - INTERVAL 61122 MINUTE), (@now - INTERVAL 51366 MINUTE), (@now - INTERVAL 56069 MINUTE), 'early', 15, 0, 75.27, 74.74, 1, 0),
(15, 1, 'Meal prep for the week', 'health', 'Medium', 0, 'Medium', 0.516, 'completed', (@now - INTERVAL 52267 MINUTE), (@now - INTERVAL 49602 MINUTE), (@now - INTERVAL 49923 MINUTE), 'ontime', 10, 0, 33.08, 74.65, 1, 0),
(16, 1, 'Write literature review draft', 'academic', 'High', 0, 'Hard', 0.612, 'completed', (@now - INTERVAL 54760 MINUTE), (@now - INTERVAL 46706 MINUTE), (@now - INTERVAL 49671 MINUTE), 'early', 30, 0, 52.56, 86.14, 1, 0),
(17, 1, 'Email professor about extension', 'academic', 'Low', 0, 'Medium', 0.52, 'completed', (@now - INTERVAL 48851 MINUTE), (@now - INTERVAL 47473 MINUTE), (@now - INTERVAL 47102 MINUTE), 'late', 5, 0, 54.83, 60.37, 0, 1),
(18, 1, 'Read 20 pages', 'habit', 'Low', 0, 'Medium', 0.513, 'completed', (@now - INTERVAL 45763 MINUTE), (@now - INTERVAL 44299 MINUTE), (@now - INTERVAL 43720 MINUTE), 'late', 5, 0, 6.15, 63.7, 2, 1),
(19, 1, 'Plan Eid gathering menu', 'occasion', 'Medium', 0, 'Medium', 0.396, 'completed', (@now - INTERVAL 42774 MINUTE), (@now - INTERVAL 36784 MINUTE), (@now - INTERVAL 37359 MINUTE), 'ontime', 10, 0, 77.08, 93.52, 3, 0),
(20, 1, 'Evening walk', 'health', 'Low', 0, 'Medium', 0.52, 'completed', (@now - INTERVAL 36546 MINUTE), (@now - INTERVAL 35145 MINUTE), (@now - INTERVAL 36038 MINUTE), 'early', 15, 0, 24.99, 93.81, 2, 0),
(21, 1, 'Practice past exam paper', 'academic', 'High', 0, 'Hard', 0.638, 'completed', (@now - INTERVAL 39928 MINUTE), (@now - INTERVAL 34022 MINUTE), (@now - INTERVAL 35100 MINUTE), 'ontime', 20, 0, 83.28, 69.29, 1, 0),
(22, 1, 'Call grandma', 'occasion', 'Low', 1, 'N/A', NULL, 'completed', (@now - INTERVAL 33672 MINUTE), (@now - INTERVAL 30650 MINUTE), (@now - INTERVAL 31038 MINUTE), 'ontime', 1, 0, 32.3, 67.52, 2, 0),
(23, 1, 'Revise essay introduction', 'academic', 'Medium', 0, 'Medium', 0.418, 'completed', (@now - INTERVAL 30463 MINUTE), (@now - INTERVAL 25580 MINUTE), (@now - INTERVAL 27806 MINUTE), 'early', 15, 0, 61.84, 74.39, 3, 0),
(24, 1, 'Learn 10 new vocabulary words', 'growth', 'Low', 0, 'Medium', 0.301, 'completed', (@now - INTERVAL 27416 MINUTE), (@now - INTERVAL 24230 MINUTE), (@now - INTERVAL 23449 MINUTE), 'late', 5, 0, 84.23, 83.83, 4, 1),
(25, 1, 'Complete database homework', 'academic', 'High', 0, 'Hard', 0.63, 'completed', (@now - INTERVAL 24692 MINUTE), (@now - INTERVAL 18311 MINUTE), (@now - INTERVAL 20119 MINUTE), 'early', 30, 0, 45.4, 68.56, 4, 0),
(26, 1, 'Plan tomorrow before bed', 'habit', 'Low', 0, 'Medium', 0.493, 'completed', (@now - INTERVAL 20927 MINUTE), (@now - INTERVAL 19383 MINUTE), (@now - INTERVAL 19028 MINUTE), 'late', 5, 0, 7.73, 71.76, 2, 1),
(27, 1, 'Summarise lecture notes', 'academic', 'Medium', 0, 'Medium', 0.518, 'completed', (@now - INTERVAL 15125 MINUTE), (@now - INTERVAL 12487 MINUTE), (@now - INTERVAL 13676 MINUTE), 'early', 15, 0, 40.86, 81.97, 2, 0),
(28, 1, 'Watch a public speaking tutorial', 'growth', 'Medium', 0, 'Medium', 0.417, 'completed', (@now - INTERVAL 18168 MINUTE), (@now - INTERVAL 13238 MINUTE), (@now - INTERVAL 11538 MINUTE), 'late', 5, 0, 58.33, 91.91, 2, 1),
(29, 1, 'Drink 8 glasses of water', 'health', 'Low', 0, 'Medium', 0.488, 'completed', (@now - INTERVAL 11728 MINUTE), (@now - INTERVAL 10163 MINUTE), (@now - INTERVAL 10346 MINUTE), 'ontime', 10, 0, 58.53, 67.08, 4, 0),
(30, 1, 'Send thank-you card', 'occasion', 'Low', 0, 'Medium', 0.342, 'completed', (@now - INTERVAL 8591 MINUTE), (@now - INTERVAL 5999 MINUTE), (@now - INTERVAL 6491 MINUTE), 'ontime', 10, 0, 79.38, 63.61, 1, 0),
(31, 1, 'Phone off by 11pm', 'habit', 'Medium', 0, 'Hard', 0.651, 'completed', (@now - INTERVAL 4320 MINUTE), (@now - INTERVAL 2680 MINUTE), (@now - INTERVAL 2918 MINUTE), 'ontime', 20, 0, 73.99, 67.96, 4, 0),
(32, 1, 'Proofread project proposal', 'academic', 'Medium', 0, 'Medium', 0.421, 'completed', (@now - INTERVAL 5585 MINUTE), (@now - INTERVAL 840 MINUTE), (@now - INTERVAL 2746 MINUTE), 'early', 15, 0, 14.87, 86.57, 2, 0),
(33, 1, 'Finish sociology term paper', 'academic', 'High', 0, 'Hard', 0.604, 'pending', (@now - INTERVAL 5760 MINUTE), (@now + INTERVAL 3180 MINUTE), NULL, NULL, NULL, 0, 30.11, 60.08, NULL, 0),
(34, 1, 'Prepare for viva presentation', 'academic', 'High', 0, 'Hard', 0.607, 'pending', (@now - INTERVAL 1440 MINUTE), (@now + INTERVAL 7200 MINUTE), NULL, NULL, NULL, 0, 61.34, 81.15, NULL, 0),
(35, 1, 'Weekly meal prep', 'health', 'Medium', 0, 'Hard', 0.6, 'pending', (@now - INTERVAL 720 MINUTE), (@now + INTERVAL 1200 MINUTE), NULL, NULL, NULL, 1, 75.66, 82.0, NULL, 0),
(36, 1, 'Read 20 pages', 'habit', 'Low', 0, 'Medium', 0.52, 'pending', (@now - INTERVAL 240 MINUTE), (@now + INTERVAL 360 MINUTE), NULL, NULL, NULL, 0, 42.3, 87.59, NULL, 0),
(37, 1, 'Buy gift for cousin''s wedding', 'occasion', 'Medium', 0, 'Medium', 0.336, 'pending', (@now - INTERVAL 2880 MINUTE), (@now + INTERVAL 12960 MINUTE), NULL, NULL, NULL, 0, 13.15, 66.35, NULL, 0);

-- Habit and health tasks counted under Dropped routines
INSERT INTO task_patterns (task_id, pattern, outcome) VALUES
(2, 'skip', 'healthy'),
(3, 'skip', 'healthy'),
(5, 'skip', 'healthy'),
(7, 'skip', 'healthy'),
(8, 'skip', 'match'),
(12, 'skip', 'healthy'),
(13, 'skip', 'healthy'),
(15, 'skip', 'healthy'),
(18, 'skip', 'match'),
(20, 'skip', 'healthy'),
(26, 'skip', 'match'),
(29, 'skip', 'healthy'),
(31, 'skip', 'healthy');

INSERT INTO goals (goal_id, user_id, title, goal_type, baseline, target, current_score, created_at, deadline, status, closed_at, completion, result, coin_points, diamond_points, closed_on_time, bee_awarded, notified) VALUES
(1, 1, 'Start assignments the day they are given', 'procrast', 1.0, 0.667, 0.667, (@now - INTERVAL 80640 MINUTE), (@now - INTERVAL 43200 MINUTE), 'done', (@now - INTERVAL 44640 MINUTE), 1.0, 'bird', 40, 10, 1, 1, 1),
(2, 1, 'Pause before picking a quick reward', 'impulse', 0.556, 0.36, 0.4, (@now - INTERVAL 69120 MINUTE), (@now - INTERVAL 24480 MINUTE), 'done', (@now - INTERVAL 25920 MINUTE), 0.796, 'butterfly', 32, 8, 1, 1, 1),
(3, 1, 'Keep my routines going', 'skip', 0.538, 0.19, 0.364, (@now - INTERVAL 57600 MINUTE), (@now - INTERVAL 12960 MINUTE), 'done', (@now - INTERVAL 14400 MINUTE), 0.5, 'none', 20, 5, 1, 1, 1),
(4, 1, 'Stop putting off assignments', 'avoid', 0.889, 0.39, 0.429, (@now - INTERVAL 40320 MINUTE), (@now + INTERVAL 25920 MINUTE), 'active', NULL, NULL, NULL, NULL, NULL, NULL, 1, 0),
(5, 1, 'Cut down late-night scrolling', 'escape', 0.5, 0.15, 0.375, (@now - INTERVAL 20160 MINUTE), (@now + INTERVAL 36000 MINUTE), 'active', NULL, NULL, NULL, NULL, NULL, NULL, 1, 0);

-- Weekly scores are the pattern strength over the 30 days before each date (written automatically)
INSERT INTO goal_checkins (goal_id, score, source, logged_at) VALUES
(1, 1.0, 'auto', (@now - INTERVAL 80640 MINUTE)),
(1, 0.5, 'auto', (@now - INTERVAL 70560 MINUTE)),
(1, 0.5, 'auto', (@now - INTERVAL 60480 MINUTE)),
(1, 0.667, 'auto', (@now - INTERVAL 50400 MINUTE)),
(1, 0.667, 'auto', (@now - INTERVAL 46080 MINUTE)),
(2, 0.556, 'auto', (@now - INTERVAL 69120 MINUTE)),
(2, 0.538, 'auto', (@now - INTERVAL 59040 MINUTE)),
(2, 0.417, 'auto', (@now - INTERVAL 48960 MINUTE)),
(2, 0.462, 'auto', (@now - INTERVAL 38880 MINUTE)),
(2, 0.4, 'auto', (@now - INTERVAL 28800 MINUTE)),
(3, 0.538, 'auto', (@now - INTERVAL 57600 MINUTE)),
(3, 0.462, 'auto', (@now - INTERVAL 47520 MINUTE)),
(3, 0.4, 'auto', (@now - INTERVAL 37440 MINUTE)),
(3, 0.3, 'auto', (@now - INTERVAL 27360 MINUTE)),
(3, 0.364, 'auto', (@now - INTERVAL 17280 MINUTE)),
(4, 0.889, 'auto', (@now - INTERVAL 40320 MINUTE)),
(4, 0.857, 'auto', (@now - INTERVAL 30240 MINUTE)),
(4, 0.778, 'auto', (@now - INTERVAL 20160 MINUTE)),
(4, 0.625, 'auto', (@now - INTERVAL 10080 MINUTE)),
(4, 0.429, 'auto', (@now - INTERVAL 0 MINUTE)),
(5, 0.5, 'auto', (@now - INTERVAL 20160 MINUTE)),
(5, 0.4, 'auto', (@now - INTERVAL 10080 MINUTE)),
(5, 0.375, 'auto', (@now - INTERVAL 0 MINUTE));

-- Subtasks for goal 5 (3 has two sub-items). 2 of 3 top-level done + half of #3 = 83%
INSERT INTO goal_subtasks (subtask_id, goal_id, parent_id, title, is_done, sort_order) VALUES
(1, 5, NULL, 'Charge my phone outside the bedroom', 1, 0),
(2, 5, NULL, 'Set a 30-minute app timer after 9pm', 1, 1),
(3, 5, NULL, 'Read 10 pages before bed', 0, 2),
(4, 5, 3, 'Pick a book I actually want to read', 1, 0),
(5, 5, 3, 'Read for the first three nights in a row', 0, 1);

INSERT INTO events (event_id, user_id, occurred_at, context, trigger_cue, behavior, duration_min, decision, result, success, mood, stress, created_at) VALUES
(1, 1, (@now - INTERVAL 97682 MINUTE), 'Hanging out with friends', 'A friend invited me somewhere', 'Opened social media', 120, 'Chose to skip', 'Lost time', 'Low', 25, 69, (@now - INTERVAL 97680 MINUTE)),
(2, 1, (@now - INTERVAL 96560 MINUTE), 'Late night hours', 'Feeling bored', 'Watched videos', 25, 'Chose the quick reward', 'Lost time', 'Medium', 34, 69, (@now - INTERVAL 96558 MINUTE)),
(3, 1, (@now - INTERVAL 93810 MINUTE), 'Alone at home', 'Feeling lonely', 'Talked to a friend about it', 60, 'Chose to wind down', 'Felt calmer', 'Medium', 58, 22, (@now - INTERVAL 93808 MINUTE)),
(4, 1, (@now - INTERVAL 93077 MINUTE), 'Hanging out with friends', 'A friend invited me somewhere', 'Talked to a friend about it', 90, 'Chose to start now', 'Made progress', 'High', 84, 41, (@now - INTERVAL 93075 MINUTE)),
(5, 1, (@now - INTERVAL 92969 MINUTE), 'Feeling low on energy', 'Not sure what to do next', 'Stayed in bed', 20, 'Chose to skip', 'Lost time', 'Low', 45, 85, (@now - INTERVAL 92967 MINUTE)),
(6, 1, (@now - INTERVAL 92358 MINUTE), 'Late night hours', 'Saw something on social media', 'Opened social media', 45, 'Chose the quick reward', 'Lost time', 'Low', 46, 75, (@now - INTERVAL 92356 MINUTE)),
(7, 1, (@now - INTERVAL 92099 MINUTE), 'Feeling low on energy', 'Feeling lonely', 'Stayed in bed', 35, 'Chose to skip', 'Lost time', 'Low', 50, 86, (@now - INTERVAL 92097 MINUTE)),
(8, 1, (@now - INTERVAL 87415 MINUTE), 'Due Task', 'Deadline is close (within a day)', 'Opened social media', 110, 'Chose the quick reward', 'Lost time', 'Medium', 44, 75, (@now - INTERVAL 87413 MINUTE)),
(9, 1, (@now - INTERVAL 84089 MINUTE), 'Busy', 'Feeling overwhelmed', 'Stayed in bed', 50, 'Chose to skip', 'Lost time', 'Low', 40, 69, (@now - INTERVAL 84087 MINUTE)),
(10, 1, (@now - INTERVAL 83332 MINUTE), 'Due Task', 'Deadline is close (within a day)', 'Cleaned instead', 110, 'Chose to delay', 'Rushed finish', 'Medium', 28, 70, (@now - INTERVAL 83330 MINUTE)),
(11, 1, (@now - INTERVAL 82954 MINUTE), 'Feeling low on energy', 'Not sure what to do next', 'Stayed in bed', 35, 'Chose to skip', 'Lost time', 'Medium', 34, 67, (@now - INTERVAL 82952 MINUTE)),
(12, 1, (@now - INTERVAL 81385 MINUTE), 'Due Task', 'Deadline is close (within a day)', 'Stayed in bed', 80, 'Chose to skip', 'Lost time', 'Medium', 46, 72, (@now - INTERVAL 81383 MINUTE)),
(13, 1, (@now - INTERVAL 81098 MINUTE), 'Family time', 'Feeling lonely', 'Talked to a friend about it', 45, 'Chose to wind down', 'Felt calmer', 'High', 80, 34, (@now - INTERVAL 81096 MINUTE)),
(14, 1, (@now - INTERVAL 80855 MINUTE), 'Feeling low on energy', 'Not sure what to do next', 'Stayed in bed', 40, 'Chose to skip', 'Lost time', 'Medium', 42, 84, (@now - INTERVAL 80853 MINUTE)),
(15, 1, (@now - INTERVAL 78697 MINUTE), 'Family time', 'Feeling lonely', 'Watched videos', 45, 'Chose the quick reward', 'Lost time', 'Low', 46, 85, (@now - INTERVAL 78695 MINUTE)),
(16, 1, (@now - INTERVAL 74791 MINUTE), 'Busy', 'Feeling overwhelmed', 'Started the task', 50, 'Chose to break it into steps', 'Made progress', 'High', 74, 39, (@now - INTERVAL 74789 MINUTE)),
(17, 1, (@now - INTERVAL 73731 MINUTE), 'Team work', 'Got a phone notification', 'Opened social media', 40, 'Chose the quick reward', 'Rushed finish', 'Medium', 28, 83, (@now - INTERVAL 73729 MINUTE)),
(18, 1, (@now - INTERVAL 73191 MINUTE), 'Late night hours', 'Saw something on social media', 'Read a book', 25, 'Chose to wind down', 'Felt calmer', 'High', 71, 34, (@now - INTERVAL 73189 MINUTE)),
(19, 1, (@now - INTERVAL 72957 MINUTE), 'Team work', 'Got a phone notification', 'Silenced my phone', 25, 'Chose to start now', 'Finished on time', 'High', 88, 18, (@now - INTERVAL 72955 MINUTE)),
(20, 1, (@now - INTERVAL 71428 MINUTE), 'Late night hours', 'Saw something on social media', 'Silenced my phone', 45, 'Chose to wind down', 'Felt calmer', 'High', 77, 25, (@now - INTERVAL 71426 MINUTE)),
(21, 1, (@now - INTERVAL 70757 MINUTE), 'Hanging out with friends', 'A friend invited me somewhere', 'Opened social media', 60, 'Chose to skip', 'Lost time', 'Low', 23, 87, (@now - INTERVAL 70755 MINUTE)),
(22, 1, (@now - INTERVAL 69079 MINUTE), 'Family time', 'Feeling lonely', 'Read a book', 60, 'Chose to wind down', 'Felt calmer', 'Medium', 73, 28, (@now - INTERVAL 69077 MINUTE)),
(23, 1, (@now - INTERVAL 68189 MINUTE), 'Hanging out with friends', 'A friend invited me somewhere', 'Talked to a friend about it', 120, 'Chose to start now', 'Made progress', 'Medium', 56, 20, (@now - INTERVAL 68187 MINUTE)),
(24, 1, (@now - INTERVAL 68030 MINUTE), 'Family time', 'Feeling bored', 'Watched videos', 30, 'Chose the quick reward', 'Lost time', 'Medium', 48, 72, (@now - INTERVAL 68028 MINUTE)),
(25, 1, (@now - INTERVAL 65517 MINUTE), 'Stress', 'Feeling overwhelmed', 'Cleaned instead', 30, 'Chose to delay', 'Lost time', 'Low', 47, 77, (@now - INTERVAL 65515 MINUTE)),
(26, 1, (@now - INTERVAL 65386 MINUTE), 'Stress', 'Feeling overwhelmed', 'Took a short break', 45, 'Chose to wind down', 'Felt calmer', 'High', 58, 22, (@now - INTERVAL 65384 MINUTE)),
(27, 1, (@now - INTERVAL 62167 MINUTE), 'Due Task', 'Deadline is close (within a day)', 'Opened social media', 60, 'Chose the quick reward', 'Lost time', 'Low', 24, 67, (@now - INTERVAL 62165 MINUTE)),
(28, 1, (@now - INTERVAL 61994 MINUTE), 'Late night hours', 'Saw something on social media', 'Read a book', 25, 'Chose to wind down', 'Felt calmer', 'Medium', 80, 39, (@now - INTERVAL 61992 MINUTE)),
(29, 1, (@now - INTERVAL 59483 MINUTE), 'Family time', 'Feeling bored', 'Watched videos', 45, 'Chose the quick reward', 'Lost time', 'Low', 45, 64, (@now - INTERVAL 59481 MINUTE)),
(30, 1, (@now - INTERVAL 57896 MINUTE), 'Feeling low on energy', 'Feeling lonely', 'Opened social media', 20, 'Chose to skip', 'Lost time', 'Low', 47, 86, (@now - INTERVAL 57894 MINUTE)),
(31, 1, (@now - INTERVAL 57495 MINUTE), 'Team work', 'Got a phone notification', 'Opened social media', 25, 'Chose to delay', 'Rushed finish', 'Low', 22, 88, (@now - INTERVAL 57493 MINUTE)),
(32, 1, (@now - INTERVAL 57226 MINUTE), 'Family time', 'Feeling bored', 'Watched videos', 45, 'Chose the quick reward', 'Lost time', 'Low', 35, 79, (@now - INTERVAL 57224 MINUTE)),
(33, 1, (@now - INTERVAL 54580 MINUTE), 'Due Task', 'Deadline is close (within a day)', 'Stayed in bed', 80, 'Chose to skip', 'Lost time', 'Low', 24, 82, (@now - INTERVAL 54578 MINUTE)),
(34, 1, (@now - INTERVAL 53230 MINUTE), 'Due Task', 'Deadline is close (within a day)', 'Cleaned instead', 35, 'Chose to delay', 'Rushed finish', 'Medium', 37, 82, (@now - INTERVAL 53228 MINUTE)),
(35, 1, (@now - INTERVAL 52490 MINUTE), 'Hanging out with friends', 'A friend invited me somewhere', 'Talked to a friend about it', 90, 'Chose to start now', 'Made progress', 'Medium', 88, 44, (@now - INTERVAL 52488 MINUTE)),
(36, 1, (@now - INTERVAL 49431 MINUTE), 'Stress', 'Feeling overwhelmed', 'Watched videos', 60, 'Chose to skip', 'Lost time', 'Low', 30, 88, (@now - INTERVAL 49429 MINUTE)),
(37, 1, (@now - INTERVAL 49228 MINUTE), 'Hanging out with friends', 'A friend invited me somewhere', 'Talked to a friend about it', 90, 'Chose to start now', 'Made progress', 'High', 55, 42, (@now - INTERVAL 49226 MINUTE)),
(38, 1, (@now - INTERVAL 47658 MINUTE), 'Busy', 'Not sure what to do next', 'Stayed in bed', 20, 'Chose to skip', 'Lost time', 'Low', 46, 65, (@now - INTERVAL 47656 MINUTE)),
(39, 1, (@now - INTERVAL 46669 MINUTE), 'Feeling low on energy', 'Feeling lonely', 'Took a short break', 40, 'Chose to start now', 'Felt calmer', 'Medium', 78, 44, (@now - INTERVAL 46667 MINUTE)),
(40, 1, (@now - INTERVAL 45440 MINUTE), 'Alone at home', 'Feeling bored', 'Watched videos', 45, 'Chose the quick reward', 'Lost time', 'Medium', 24, 68, (@now - INTERVAL 45438 MINUTE)),
(41, 1, (@now - INTERVAL 42644 MINUTE), 'Stress', 'Feeling overwhelmed', 'Talked to a friend about it', 30, 'Chose to ask for help', 'Felt calmer', 'Medium', 56, 20, (@now - INTERVAL 42642 MINUTE)),
(42, 1, (@now - INTERVAL 40733 MINUTE), 'Stress', 'Feeling overwhelmed', 'Watched videos', 60, 'Chose to skip', 'Lost time', 'Medium', 22, 76, (@now - INTERVAL 40731 MINUTE)),
(43, 1, (@now - INTERVAL 35992 MINUTE), 'Hanging out with friends', 'A friend invited me somewhere', 'Talked to a friend about it', 90, 'Chose to start now', 'Made progress', 'High', 61, 42, (@now - INTERVAL 35990 MINUTE)),
(44, 1, (@now - INTERVAL 35311 MINUTE), 'Team work', 'Got a phone notification', 'Started the task', 40, 'Chose to start now', 'Finished on time', 'Medium', 81, 48, (@now - INTERVAL 35309 MINUTE)),
(45, 1, (@now - INTERVAL 34550 MINUTE), 'Team work', 'Got a phone notification', 'Opened social media', 25, 'Chose the quick reward', 'Rushed finish', 'Low', 42, 64, (@now - INTERVAL 34548 MINUTE)),
(46, 1, (@now - INTERVAL 33026 MINUTE), 'Team work', 'Got a phone notification', 'Silenced my phone', 25, 'Chose to start now', 'Finished on time', 'High', 84, 26, (@now - INTERVAL 33024 MINUTE)),
(47, 1, (@now - INTERVAL 32582 MINUTE), 'Family time', 'Feeling lonely', 'Read a book', 30, 'Chose to wind down', 'Felt calmer', 'High', 67, 40, (@now - INTERVAL 32580 MINUTE)),
(48, 1, (@now - INTERVAL 31908 MINUTE), 'Late night hours', 'Feeling bored', 'Silenced my phone', 90, 'Chose to wind down', 'Felt calmer', 'Medium', 60, 33, (@now - INTERVAL 31906 MINUTE)),
(49, 1, (@now - INTERVAL 30472 MINUTE), 'Feeling low on energy', 'Feeling lonely', 'Started the task', 20, 'Chose to start now', 'Made progress', 'High', 76, 47, (@now - INTERVAL 30470 MINUTE)),
(50, 1, (@now - INTERVAL 25976 MINUTE), 'Hanging out with friends', 'A friend invited me somewhere', 'Talked to a friend about it', 90, 'Chose to start now', 'Made progress', 'Medium', 60, 30, (@now - INTERVAL 25974 MINUTE)),
(51, 1, (@now - INTERVAL 25293 MINUTE), 'Due Task', 'Deadline is close (within a day)', 'Opened social media', 35, 'Chose to delay', 'Lost time', 'Low', 33, 61, (@now - INTERVAL 25291 MINUTE)),
(52, 1, (@now - INTERVAL 23008 MINUTE), 'Due Task', 'Deadline is close (within a day)', 'Started the task', 110, 'Chose to break it into steps', 'Made progress', 'High', 60, 31, (@now - INTERVAL 23006 MINUTE)),
(53, 1, (@now - INTERVAL 22408 MINUTE), 'Late night hours', 'Feeling bored', 'Read a book', 45, 'Chose to wind down', 'Felt calmer', 'High', 84, 47, (@now - INTERVAL 22406 MINUTE)),
(54, 1, (@now - INTERVAL 22061 MINUTE), 'Family time', 'Feeling bored', 'Watched videos', 45, 'Chose the quick reward', 'Lost time', 'Low', 29, 73, (@now - INTERVAL 22059 MINUTE)),
(55, 1, (@now - INTERVAL 21243 MINUTE), 'Feeling low on energy', 'Feeling lonely', 'Took a short break', 40, 'Chose to start now', 'Felt calmer', 'High', 69, 24, (@now - INTERVAL 21241 MINUTE)),
(56, 1, (@now - INTERVAL 20587 MINUTE), 'Due Task', 'Deadline is close (within a day)', 'Stayed in bed', 110, 'Chose to skip', 'Lost time', 'Low', 50, 77, (@now - INTERVAL 20585 MINUTE)),
(57, 1, (@now - INTERVAL 19434 MINUTE), 'Feeling low on energy', 'Not sure what to do next', 'Started the task', 20, 'Chose to start now', 'Made progress', 'High', 60, 19, (@now - INTERVAL 19432 MINUTE)),
(58, 1, (@now - INTERVAL 16745 MINUTE), 'Feeling low on energy', 'Feeling lonely', 'Took a short break', 40, 'Chose to start now', 'Felt calmer', 'High', 79, 44, (@now - INTERVAL 16743 MINUTE)),
(59, 1, (@now - INTERVAL 16148 MINUTE), 'Due Task', 'Deadline is close (within a day)', 'Started the task', 80, 'Chose to break it into steps', 'Made progress', 'High', 66, 43, (@now - INTERVAL 16146 MINUTE)),
(60, 1, (@now - INTERVAL 14519 MINUTE), 'Late night hours', 'Feeling bored', 'Watched videos', 45, 'Chose the quick reward', 'Lost time', 'Low', 31, 81, (@now - INTERVAL 14517 MINUTE)),
(61, 1, (@now - INTERVAL 14188 MINUTE), 'Feeling low on energy', 'Feeling lonely', 'Took a short break', 20, 'Chose to start now', 'Felt calmer', 'High', 62, 15, (@now - INTERVAL 14186 MINUTE)),
(62, 1, (@now - INTERVAL 13498 MINUTE), 'Stress', 'Feeling overwhelmed', 'Took a short break', 45, 'Chose to wind down', 'Felt calmer', 'Medium', 63, 43, (@now - INTERVAL 13496 MINUTE)),
(63, 1, (@now - INTERVAL 13088 MINUTE), 'Late night hours', 'Feeling bored', 'Opened social media', 45, 'Chose the quick reward', 'Lost time', 'Low', 43, 60, (@now - INTERVAL 13086 MINUTE)),
(64, 1, (@now - INTERVAL 6120 MINUTE), 'Late night hours', 'Saw something on social media', 'Opened social media', 25, 'Chose to delay', 'Lost time', 'Low', 43, 66, (@now - INTERVAL 6118 MINUTE)),
(65, 1, (@now - INTERVAL 5808 MINUTE), 'Feeling low on energy', 'Not sure what to do next', 'Started the task', 40, 'Chose to start now', 'Made progress', 'High', 72, 20, (@now - INTERVAL 5806 MINUTE)),
(66, 1, (@now - INTERVAL 4488 MINUTE), 'Late night hours', 'Saw something on social media', 'Watched videos', 90, 'Chose the quick reward', 'Lost time', 'Low', 48, 63, (@now - INTERVAL 4486 MINUTE)),
(67, 1, (@now - INTERVAL 4261 MINUTE), 'Alone at home', 'Feeling bored', 'Read a book', 30, 'Chose to wind down', 'Felt calmer', 'Medium', 79, 41, (@now - INTERVAL 4259 MINUTE)),
(68, 1, (@now - INTERVAL 3627 MINUTE), 'Late night hours', 'Saw something on social media', 'Silenced my phone', 45, 'Chose to wind down', 'Felt calmer', 'High', 85, 33, (@now - INTERVAL 3625 MINUTE)),
(69, 1, (@now - INTERVAL 3538 MINUTE), 'Hanging out with friends', 'A friend invited me somewhere', 'Talked to a friend about it', 90, 'Chose to start now', 'Made progress', 'High', 80, 33, (@now - INTERVAL 3536 MINUTE)),
(70, 1, (@now - INTERVAL 559 MINUTE), 'Due Task', 'Deadline is close (within a day)', 'Started the task', 35, 'Chose to break it into steps', 'Made progress', 'High', 69, 23, (@now - INTERVAL 557 MINUTE));

INSERT INTO event_alternatives (event_id, text) VALUES
(1, 'Suggest meeting after studying'),
(2, 'Go to bed'),
(3, 'Scroll for a while'),
(4, 'Go out right away'),
(5, 'Lay out gym clothes last night'),
(6, 'Go to bed'),
(6, 'Read a chapter'),
(7, 'Ten minutes of stretching'),
(8, 'Ask a classmate'),
(8, 'Write a two-line plan'),
(9, 'Do the smallest task first'),
(10, 'Ask a classmate'),
(10, 'Start for just 10 minutes'),
(11, 'Ten minutes of stretching'),
(11, 'Lay out gym clothes last night'),
(12, 'Start for just 10 minutes'),
(12, 'Write a two-line plan'),
(13, 'Scroll for a while'),
(14, 'Ten minutes of stretching'),
(15, 'Go for a walk'),
(16, 'Do it tomorrow'),
(17, 'Silence the phone'),
(18, 'Watch one more episode'),
(19, 'Check the notification first'),
(20, 'Watch one more episode'),
(21, 'Suggest meeting after studying'),
(21, 'Say no this time'),
(22, 'Scroll for a while'),
(23, 'Go out right away'),
(24, 'Call a friend'),
(25, 'Write a two-line plan'),
(26, 'Wait until I feel ready'),
(27, 'Start for just 10 minutes'),
(27, 'Write a two-line plan'),
(28, 'Watch one more episode'),
(29, 'Call a friend'),
(30, 'Ten minutes of stretching'),
(30, 'Lay out gym clothes last night'),
(31, 'Silence the phone'),
(31, 'Answer after the session'),
(32, 'Go for a walk'),
(32, 'Call a friend'),
(33, 'Ask a classmate'),
(33, 'Start for just 10 minutes'),
(34, 'Ask a classmate'),
(34, 'Write a two-line plan'),
(35, 'Go out right away'),
(36, 'Ask a friend to study together'),
(37, 'Go out right away'),
(38, 'Do the smallest task first'),
(39, 'Sleep in'),
(40, 'Call a friend'),
(40, 'Go for a walk'),
(41, 'Wait until I feel ready'),
(42, 'Write a two-line plan'),
(42, 'Ask a friend to study together'),
(43, 'Go out right away'),
(44, 'Check the notification first'),
(45, 'Silence the phone'),
(45, 'Answer after the session'),
(46, 'Check the notification first'),
(47, 'Scroll for a while'),
(48, 'Watch one more episode'),
(49, 'Sleep in'),
(50, 'Go out right away'),
(51, 'Start for just 10 minutes'),
(51, 'Ask a classmate'),
(52, 'Scroll for a while first'),
(53, 'Watch one more episode'),
(54, 'Go for a walk'),
(54, 'Call a friend'),
(55, 'Sleep in'),
(56, 'Ask a classmate'),
(56, 'Start for just 10 minutes'),
(57, 'Sleep in'),
(58, 'Sleep in'),
(59, 'Scroll for a while first'),
(60, 'Read a chapter'),
(61, 'Sleep in'),
(62, 'Wait until I feel ready'),
(63, 'Go to bed'),
(63, 'Put the phone in another room'),
(64, 'Go to bed'),
(65, 'Sleep in'),
(66, 'Put the phone in another room'),
(66, 'Go to bed'),
(67, 'Scroll for a while'),
(68, 'Watch one more episode'),
(69, 'Go out right away'),
(70, 'Scroll for a while first');

INSERT INTO event_notes (event_id, text, created_at) VALUES
(2, 'In hindsight, I was just exhausted.', (@now - INTERVAL 96380 MINUTE)),
(8, 'The task felt bigger than it was.', (@now - INTERVAL 87235 MINUTE)),
(14, 'Turning off notifications made this much easier.', (@now - INTERVAL 80675 MINUTE)),
(24, 'Starting was the hardest part. After five minutes it flowed.', (@now - INTERVAL 67850 MINUTE)),
(33, 'Starting was the hardest part. After five minutes it flowed.', (@now - INTERVAL 54400 MINUTE)),
(36, 'The task felt bigger than it was.', (@now - INTERVAL 49251 MINUTE)),
(42, 'I noticed I reach for my phone the second something feels hard.', (@now - INTERVAL 40553 MINUTE)),
(44, 'Starting was the hardest part. After five minutes it flowed.', (@now - INTERVAL 35131 MINUTE)),
(62, 'Starting was the hardest part. After five minutes it flowed.', (@now - INTERVAL 13318 MINUTE));

-- Patterns each event was counted under (top 2 rule)
INSERT INTO event_patterns (event_id, pattern, outcome, condition_count, rank_no) VALUES
(1, 'impulse', 'match', 1, 1),
(2, 'impulse', 'match', 1, 1),
(2, 'escape', 'match', 1, 2),
(3, 'escape', 'healthy', 2, 1),
(4, 'impulse', 'healthy', 1, 1),
(5, 'skip', 'match', 2, 1),
(6, 'impulse', 'match', 1, 1),
(6, 'escape', 'match', 1, 2),
(7, 'skip', 'match', 2, 1),
(8, 'avoid', 'match', 2, 1),
(9, 'skip', 'match', 2, 1),
(10, 'procrast', 'match', 2, 1),
(10, 'avoid', 'match', 1, 2),
(11, 'skip', 'match', 2, 1),
(12, 'avoid', 'match', 2, 1),
(13, 'escape', 'healthy', 2, 1),
(14, 'skip', 'match', 2, 1),
(15, 'escape', 'match', 1, 1),
(16, 'procrast', 'healthy', 1, 1),
(17, 'procrast', 'match', 1, 1),
(17, 'impulse', 'match', 1, 2),
(18, 'impulse', 'healthy', 2, 1),
(18, 'escape', 'healthy', 2, 2),
(19, 'procrast', 'healthy', 2, 1),
(19, 'impulse', 'healthy', 2, 2),
(20, 'impulse', 'healthy', 2, 1),
(20, 'escape', 'healthy', 2, 2),
(21, 'impulse', 'match', 1, 1),
(22, 'escape', 'healthy', 2, 1),
(23, 'impulse', 'healthy', 1, 1),
(24, 'impulse', 'match', 1, 1),
(24, 'escape', 'match', 1, 2),
(25, 'avoid', 'match', 1, 1),
(26, 'skip', 'healthy', 3, 1),
(26, 'escape', 'healthy', 2, 2),
(27, 'avoid', 'match', 2, 1),
(28, 'impulse', 'healthy', 2, 1),
(28, 'escape', 'healthy', 2, 2),
(29, 'impulse', 'match', 1, 1),
(29, 'escape', 'match', 1, 2),
(30, 'escape', 'match', 1, 1),
(30, 'skip', 'match', 1, 2),
(31, 'procrast', 'match', 2, 1),
(32, 'impulse', 'match', 1, 1),
(32, 'escape', 'match', 1, 2),
(33, 'avoid', 'match', 2, 1),
(34, 'procrast', 'match', 2, 1),
(34, 'avoid', 'match', 1, 2),
(35, 'impulse', 'healthy', 1, 1),
(36, 'avoid', 'match', 2, 1),
(36, 'escape', 'match', 1, 2),
(37, 'impulse', 'healthy', 1, 1),
(38, 'skip', 'match', 2, 1),
(39, 'skip', 'healthy', 3, 1),
(39, 'escape', 'healthy', 1, 2),
(40, 'impulse', 'match', 1, 1),
(40, 'escape', 'match', 1, 2),
(41, 'avoid', 'healthy', 2, 1),
(41, 'escape', 'healthy', 1, 2),
(42, 'avoid', 'match', 2, 1),
(42, 'escape', 'match', 1, 2),
(43, 'impulse', 'healthy', 1, 1),
(44, 'procrast', 'healthy', 2, 1),
(44, 'impulse', 'healthy', 1, 2),
(45, 'procrast', 'match', 1, 1),
(45, 'impulse', 'match', 1, 2),
(46, 'procrast', 'healthy', 2, 1),
(46, 'impulse', 'healthy', 2, 2),
(47, 'escape', 'healthy', 2, 1),
(48, 'impulse', 'healthy', 2, 1),
(48, 'escape', 'healthy', 2, 2),
(49, 'skip', 'healthy', 1, 1),
(50, 'impulse', 'healthy', 1, 1),
(51, 'avoid', 'match', 1, 1),
(51, 'procrast', 'match', 1, 2),
(52, 'avoid', 'healthy', 2, 1),
(52, 'procrast', 'healthy', 1, 2),
(53, 'impulse', 'healthy', 2, 1),
(53, 'escape', 'healthy', 2, 2),
(54, 'impulse', 'match', 1, 1),
(54, 'escape', 'match', 1, 2),
(55, 'skip', 'healthy', 3, 1),
(55, 'escape', 'healthy', 1, 2),
(56, 'avoid', 'match', 2, 1),
(57, 'skip', 'healthy', 1, 1),
(58, 'skip', 'healthy', 3, 1),
(58, 'escape', 'healthy', 1, 2),
(59, 'avoid', 'healthy', 2, 1),
(59, 'procrast', 'healthy', 1, 2),
(60, 'impulse', 'match', 1, 1),
(60, 'escape', 'match', 1, 2),
(61, 'skip', 'healthy', 3, 1),
(61, 'escape', 'healthy', 1, 2),
(62, 'skip', 'healthy', 3, 1),
(62, 'escape', 'healthy', 2, 2),
(63, 'impulse', 'match', 1, 1),
(63, 'escape', 'match', 1, 2),
(64, 'escape', 'match', 1, 1),
(65, 'skip', 'healthy', 1, 1),
(66, 'impulse', 'match', 1, 1),
(66, 'escape', 'match', 1, 2),
(67, 'impulse', 'healthy', 2, 1),
(67, 'escape', 'healthy', 2, 2),
(68, 'impulse', 'healthy', 2, 1),
(68, 'escape', 'healthy', 2, 2),
(69, 'impulse', 'healthy', 1, 1),
(70, 'avoid', 'healthy', 2, 1),
(70, 'procrast', 'healthy', 1, 2);

INSERT INTO coin_transactions (user_id, amount, reason, source, task_id, goal_id, created_at) VALUES
(1, 20, 'Completed "Finish chemistry lab report"', 'task', 1, NULL, (@now - INTERVAL 93952 MINUTE)),
(1, 10, 'Completed "Make bed every morning"', 'task', 2, NULL, (@now - INTERVAL 93317 MINUTE)),
(1, 30, 'Completed "Morning run 3 km"', 'task', 3, NULL, (@now - INTERVAL 88042 MINUTE)),
(1, 10, 'Completed "Read chapter 4 of sociology"', 'task', 4, NULL, (@now - INTERVAL 87047 MINUTE)),
(1, 15, 'Completed "Journal for 10 minutes"', 'task', 5, NULL, (@now - INTERVAL 82057 MINUTE)),
(1, 20, 'Completed "Submit statistics assignment"', 'task', 6, NULL, (@now - INTERVAL 78739 MINUTE)),
(1, 2, 'Completed "Water the plants"', 'task', 7, NULL, (@now - INTERVAL 75713 MINUTE)),
(1, 2, 'Completed "Book dentist appointment"', 'task', 8, NULL, (@now - INTERVAL 73093 MINUTE)),
(1, 10, 'Completed "Prepare group presentation slides"', 'task', 9, NULL, (@now - INTERVAL 65640 MINUTE)),
(1, 10, 'Completed "Buy birthday gift for Ayesha"', 'task', 10, NULL, (@now - INTERVAL 64551 MINUTE)),
(1, 20, 'Completed "Study for calculus quiz"', 'task', 11, NULL, (@now - INTERVAL 63414 MINUTE)),
(1, 10, 'Completed "Yoga session"', 'task', 12, NULL, (@now - INTERVAL 61321 MINUTE)),
(1, 10, 'Completed "Tidy desk"', 'task', 13, NULL, (@now - INTERVAL 57042 MINUTE)),
(1, 15, 'Completed "Update CV"', 'task', 14, NULL, (@now - INTERVAL 56069 MINUTE)),
(1, 10, 'Completed "Meal prep for the week"', 'task', 15, NULL, (@now - INTERVAL 49923 MINUTE)),
(1, 30, 'Completed "Write literature review draft"', 'task', 16, NULL, (@now - INTERVAL 49671 MINUTE)),
(1, 5, 'Completed "Email professor about extension"', 'task', 17, NULL, (@now - INTERVAL 47102 MINUTE)),
(1, 40, 'Goal closed: "Start assignments the day they are given"', 'goal', NULL, 1, (@now - INTERVAL 44640 MINUTE)),
(1, 5, 'Completed "Read 20 pages"', 'task', 18, NULL, (@now - INTERVAL 43720 MINUTE)),
(1, 10, 'Completed "Plan Eid gathering menu"', 'task', 19, NULL, (@now - INTERVAL 37359 MINUTE)),
(1, 15, 'Completed "Evening walk"', 'task', 20, NULL, (@now - INTERVAL 36038 MINUTE)),
(1, 20, 'Completed "Practice past exam paper"', 'task', 21, NULL, (@now - INTERVAL 35100 MINUTE)),
(1, -300, 'Adopted Mochi the cat', 'adoption', NULL, NULL, (@now - INTERVAL 35040 MINUTE)),
(1, 1, 'Completed "Call grandma"', 'task', 22, NULL, (@now - INTERVAL 31038 MINUTE)),
(1, -8, 'Bought Tasty fish', 'purchase', NULL, NULL, (@now - INTERVAL 30978 MINUTE)),
(1, 15, 'Completed "Revise essay introduction"', 'task', 23, NULL, (@now - INTERVAL 27806 MINUTE)),
(1, -8, 'Bought Tasty fish', 'purchase', NULL, NULL, (@now - INTERVAL 27746 MINUTE)),
(1, 32, 'Goal closed: "Pause before picking a quick reward"', 'goal', NULL, 2, (@now - INTERVAL 25920 MINUTE)),
(1, -8, 'Bought Tasty fish', 'purchase', NULL, NULL, (@now - INTERVAL 25860 MINUTE)),
(1, 5, 'Completed "Learn 10 new vocabulary words"', 'task', 24, NULL, (@now - INTERVAL 23449 MINUTE)),
(1, -4, 'Bought Kibble', 'purchase', NULL, NULL, (@now - INTERVAL 23389 MINUTE)),
(1, 30, 'Completed "Complete database homework"', 'task', 25, NULL, (@now - INTERVAL 20119 MINUTE)),
(1, -4, 'Bought Kibble', 'purchase', NULL, NULL, (@now - INTERVAL 20059 MINUTE)),
(1, 5, 'Completed "Plan tomorrow before bed"', 'task', 26, NULL, (@now - INTERVAL 19028 MINUTE)),
(1, -20, 'Bought Red bow', 'purchase', NULL, NULL, (@now - INTERVAL 18968 MINUTE)),
(1, 20, 'Goal closed: "Keep my routines going"', 'goal', NULL, 3, (@now - INTERVAL 14400 MINUTE)),
(1, -35, 'Bought Cozy bed', 'purchase', NULL, NULL, (@now - INTERVAL 14340 MINUTE)),
(1, 15, 'Completed "Summarise lecture notes"', 'task', 27, NULL, (@now - INTERVAL 13676 MINUTE)),
(1, -25, 'Bought Bell collar', 'purchase', NULL, NULL, (@now - INTERVAL 13616 MINUTE)),
(1, 5, 'Completed "Watch a public speaking tutorial"', 'task', 28, NULL, (@now - INTERVAL 11538 MINUTE)),
(1, 10, 'Completed "Drink 8 glasses of water"', 'task', 29, NULL, (@now - INTERVAL 10346 MINUTE)),
(1, 10, 'Completed "Send thank-you card"', 'task', 30, NULL, (@now - INTERVAL 6491 MINUTE)),
(1, 20, 'Completed "Phone off by 11pm"', 'task', 31, NULL, (@now - INTERVAL 2918 MINUTE)),
(1, 15, 'Completed "Proofread project proposal"', 'task', 32, NULL, (@now - INTERVAL 2746 MINUTE));

INSERT INTO diamond_transactions (user_id, amount, reason, goal_id, season_id, created_at) VALUES
(1, 10, 'Goal closed on time: "Start assignments the day they are given"', 1, NULL, (@now - INTERVAL 44640 MINUTE)),
(1, 8, 'Goal closed on time: "Pause before picking a quick reward"', 2, NULL, (@now - INTERVAL 25920 MINUTE)),
(1, 5, 'Goal closed on time: "Keep my routines going"', 3, NULL, (@now - INTERVAL 14400 MINUTE));

INSERT INTO garden_decorations (deco_id, user_id, goal_id, kind, x, y, created_at) VALUES
(1, 1, 1, 'bee', 64.43, 15.49, (@now - INTERVAL 70560 MINUTE)),
(2, 1, 2, 'bee', 12.15, 33.83, (@now - INTERVAL 48960 MINUTE)),
(3, 1, 1, 'bird', 84.26, 34.63, (@now - INTERVAL 44640 MINUTE)),
(4, 1, 3, 'bee', 41.56, 38.49, (@now - INTERVAL 27360 MINUTE)),
(5, 1, 2, 'butterfly', 32.6, 14.76, (@now - INTERVAL 25920 MINUTE)),
(6, 1, 4, 'bee', 60.87, 35.8, (@now - INTERVAL 4320 MINUTE)),
(7, 1, 5, 'bee', 88.07, 14.84, (@now - INTERVAL 4320 MINUTE));

INSERT INTO pets (pet_id, user_id, kind_id, variant_index, name, fullness, joy, stats_updated_at, adopted_at, garden_x, garden_y, hat_id, face_id, neck_id) VALUES
(1, 1, 'cat', 0, 'Mochi', 72, 84, (@now - INTERVAL 150 MINUTE), (@now - INTERVAL 35040 MINUTE), 62.40, 82.10, NULL, NULL, 'bow');

INSERT INTO user_accessories (user_id, accessory_id, purchased_at) VALUES
(1, 'bow', (@now - INTERVAL 18968 MINUTE)),
(1, 'bell', (@now - INTERVAL 13616 MINUTE));

-- bought 3 fish and 2 kibble; Mochi ate 1 fish, so 2 fish + 2 kibble remain
INSERT INTO user_food (user_id, food_id, quantity) VALUES (1, 'fish', 2), (1, 'kibble', 2);
INSERT INTO user_home_items (user_id, home_id, purchased_at) VALUES (1, 'bed', (@now - INTERVAL 14340 MINUTE));

INSERT INTO notifications (user_id, text, is_read, target_page, pattern, created_at) VALUES
(1, 'Welcome to BehavioralX. Log an event to start seeing your patterns.', 1, 'events', NULL, (@now - INTERVAL 99360 MINUTE)),
(1, 'Task "Weekly meal prep" is due in 20h.', 0, 'tasks', NULL, (@now - INTERVAL 240 MINUTE)),
(1, 'Your goal "Stop putting off assignments" ends in 18 days.', 0, 'goals', NULL, (@now - INTERVAL 360 MINUTE)),
(1, 'Pattern detected: Deadline avoidance. Three or more avoidance choices (social media, videos, cleaning, staying in bed, skipping or taking the quick reward) while a deadline is close, within 30 days.', 0, 'insights', 'avoid', (@now - INTERVAL 120 MINUTE));

SET FOREIGN_KEY_CHECKS = 1;

-- Quick checks:  SELECT * FROM v_user_balances;   SELECT * FROM v_pattern_strength_30d;
