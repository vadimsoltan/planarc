# Planarc — Technical Specification

## 1. Overview

### 1.1 Purpose
Build Planarc, a private web application for tracking body recomposition over time, with persistent storage, simple authentication, target planning, dashboards, charts, body-fat estimation, and projected next milestones.

Planarc is optimized for a single user and seeded with the current plan and targets defined in this conversation.

### 1.2 Primary Goals
- Track daily weight, calories, macros, steps, cardio, sleep, and notes.
- Track body measurements and body-fat estimates.
- Track workouts, sets, reps, weight, and strength regain versus past PRs.
- Compare actual performance against weekly, monthly, quarterly, and phase-based targets.
- Display progress via charts and dashboards.
- Infer next targets and suggest plan adjustments based on trend rules.
- Persist data locally using SQLite.
- Protect access with simple authentication.

### 1.3 Non-Goals (MVP)
- Multi-user social product.
- Public profiles or data sharing.
- Wearable integrations.
- Barcode food scanning.
- Extensive meal database.
- AI chatbot inside the app.
- Native mobile app.

---

## 2. Product Scope

### 2.1 User Type
Single private user.

### 2.2 Usage Mode
- Personal daily use.
- Desktop-first responsive web app.
- Optional local/self-hosted deployment via Docker.

### 2.3 Core Modules
- Authentication
- Profile and plan settings
- Daily logging
- Measurement logging
- Workout tracking
- Goals and phases
- Dashboard and analytics
- Projection and rules engine
- Photo progress storage

---

## 3. Seeded Business Context

### 3.1 Starting User Profile
- Age: 29
- Sex: Male
- Height: 195 cm
- Current Weight: 95 kg
- Target Weight: 87 kg
- Estimated Starting Body Fat (planning estimate): 22%

### 3.2 Starting Measurements
- Neck: 36.5 cm
- Waist at navel: 94 cm
- Waist at narrowest: 86 cm
- Chest: 102 cm
- Hips: 92 cm
- Glutes widest: 104.6 cm
- Calf: 38.5 cm
- Arm relaxed: 31 cm
- Arm flexed: 35 cm
- Mid-thigh: 54 cm
- Upper thigh: 59 cm

### 3.3 Initial Nutrition Targets
#### Phase 1 — Aggressive Recomposition
- Training day calories: 2200 kcal
- Rest day calories: 2000 kcal
- Protein: 200–210 g/day
- Fat: ~60 g/day
- Carbs: remainder
- Target rate of loss: 0.5–0.9 kg/week initially
- Target bodyweight: 87–88 kg in ~10–12 weeks

### 3.4 Initial Training Context
Historic reference PRs stored as performance anchors:
- Incline Smith Bench: 225 lb x 4
- Tricep Pushdown: 120 lb x 12
- DB Shoulder Press: 55 lb x 8
- Cable Lateral Raise: 30 lb x 10 per arm
- Leg Press: sled 185 lb + 3 plates each side x 8
- Smith Deadlift: 225 lb x 8
- Ham Curl: 100 lb x 10 per leg
- Leg Extension: 100 lb x 10 per leg
- Lat Pulldown: 160 lb x 8
- Seated Row: 140 lb x 8
- Face Pull: 110 lb x 15
- Bayesian Curl: 50 lb x 10 per arm
- Ab Machine: 135 lb x 15

### 3.5 Strength Recovery Context
- Current strength estimated ~40% below previous baseline.
- This creates a strong muscle-memory/recomposition window.

---

## 4. Functional Requirements

## 4.1 Authentication
### Requirements
- User must log in before accessing any tracking data.
- MVP supports one local user account.
- No public signup page.
- First user created via seed script or admin CLI command.
- Passwords stored only as secure hashes.
- Session persists across page reloads.
- Logout invalidates active session.

### Acceptance Criteria
- Unauthenticated users are redirected to login.
- Valid credentials create a session.
- Invalid credentials return safe error message.
- Protected routes are inaccessible without auth.

---

## 4.2 Profile and Settings
### Requirements
- Store personal stats and preferences.
- Allow editing core profile fields.
- Allow updating estimated body fat override.
- Store preferred units if needed later.
- Store current active plan phase.

### Editable Fields
- Height
- Age
- Sex
- Starting weight
- Current goal weight
- Adjusted body fat estimate
- Default training days per week
- Default step target

### Acceptance Criteria
- Profile updates persist in DB.
- Dashboard immediately reflects changes to profile-driven computations.

---

## 4.3 Daily Logging
### Requirements
User can create daily logs with:
- Date
- Morning bodyweight
- Calories consumed
- Protein
- Carbs
- Fat
- Steps
- Cardio minutes
- Cardio type
- Sleep hours
- Notes
- Training day boolean

### Behavior
- One daily log per date.
- Editing a day updates the existing log.
- Missing fields allowed except date.
- Weight and calories displayed in trend analytics.

### Acceptance Criteria
- User can add/edit/delete daily logs.
- Dashboard trends update based on daily logs.
- 7-day average weight is computed from recent logs.

---

## 4.4 Measurement Logging
### Requirements
User can add measurement check-ins on any date.

### Measurement Fields
- Neck
- Waist at navel
- Waist at narrowest
- Chest
- Hips
- Glutes
- Arm relaxed
- Arm flexed
- Mid-thigh
- Upper thigh
- Calf
- Notes

### Derived Fields
- Navy body-fat estimate
- Adjusted body-fat estimate
- Lean body mass estimate
- Fat mass estimate
- Waist-to-height ratio
- Chest-to-waist ratio

### Behavior
- Measurements are typically weekly or biweekly.
- Derived fields calculated automatically on save.
- Adjusted body fat can be manually overridden.

### Acceptance Criteria
- A measurement entry can be created and edited.
- Derived metrics are stored or reproducible deterministically.
- Charts update from measurement history.

---

## 4.5 Workout Tracking
### Requirements
User can log workout sessions and set-level data.

### Workout Data Model
- Workout session
- Exercise within session
- Sets within exercise

### Workout Session Fields
- Date
- Workout type (Push/Pull/Legs/Upper/Lower/Custom)
- Duration
- Notes

### Exercise Fields
- Exercise name
- Order
- Category (compound/isolation/cardio/core)

### Set Fields
- Set number
- Weight
- Reps
- RIR (optional)
- Notes

### Required Analytics
- Exercise history
- Best set by exercise
- Estimated 1RM trend
- Recovery percentage vs stored historical PR
- Volume trend

### Acceptance Criteria
- User can log full workouts.
- Exercise progress is queryable over time.
- Dashboard can show key lift trends.

---

## 4.6 Goal and Phase Tracking
### Requirements
App must track multiple time horizons:
- Biweekly goals
- Monthly goals
- Quarterly goals
- Long-form plan phases

### Goal Types
- Weight
- Waist
- Body fat
- Calories adherence
- Protein adherence
- Step adherence
- Strength targets
- Measurement targets

### Phase Examples
#### Phase 1
- Aggressive recomp
- Weight target: 87–88 kg
- Calories: 2200 training / 2000 rest
- Protein: 200–210 g

#### Phase 2
- Maintenance/recomp
- Calories: 2500–2700
- Goal: strength regain + lean mass gain

#### Phase 3
- Lean gain/refinement
- Maintenance or slight surplus
- Goal: improved muscle fullness with waist control

### Acceptance Criteria
- Goals can be seeded and stored.
- Dashboard displays current status versus target.
- Goal states: on track, ahead, caution, off track.

---

## 4.7 Dashboard and Analytics
### Requirements
Dashboard must display:
- Current bodyweight
- 7-day average bodyweight
- Current waist
- Current estimated body fat
- Current calories target
- Current protein target
- Current phase
- Progress toward next milestone

### Required Charts
- Daily weight
- 7-day average weight
- Waist over time
- Body-fat estimate over time
- Calories actual vs target
- Protein actual vs target
- Steps actual vs target
- Strength trend per selected lift
- Projected date-to-goal chart

### Required Status Cards
- Current phase
- Current target calories
- Actual weekly average calories
- Weekly average protein
- Estimated weekly weight-loss rate
- Projected date to 87 kg
- Strength recovery percentage

### Acceptance Criteria
- Dashboard loads in under acceptable local development performance targets.
- Charts render accurately from stored data.
- Current status is understandable at a glance.

---

## 4.8 Photo Progress
### Requirements
- User can upload progress photos.
- Photos tagged by date and pose.
- Files stored locally on disk.
- DB stores metadata and file path.

### Supported Photo Types
- Front
- Side
- Back
- Optional flexed variants later

### Acceptance Criteria
- Photos can be uploaded and retrieved.
- Photo history can be browsed by date.

---

## 4.9 Projection and Rules Engine
### Requirements
App should infer next targets based on recent data.

### Inputs
- Recent bodyweight trend
- Recent calorie adherence
- Recent protein adherence
- Recent step counts
- Recent measurements
- Strength trend for key lifts
- Current phase

### Outputs
- Projected date to target weight
- Suggested calorie adjustment
- Suggested phase transition timing
- Weekly target bodyweight range
- Expected next measurement milestone
- Warning if weight loss is too fast/slow
- Warning if strength is falling too fast

### Initial Rule Set
#### Weight-loss pace rule
- If 14-day average loss < 0.35 kg/week: suggest -150 kcal/day
- If 14-day average loss > 0.8 kg/week: suggest +100 kcal/day

#### Performance protection rule
- If weight is falling quickly and key lifts decline over 2 check-ins: suggest increasing carbs around training

#### Good recomposition rule
- If waist decreases while strength stable/up: continue current plan

### Acceptance Criteria
- Engine returns deterministic suggestions from recent data.
- Suggestions are visible but not auto-applied without user action.

---

## 5. Non-Functional Requirements

### 5.1 Security
- Password hashing required.
- Auth-protected API routes.
- No plaintext passwords.
- Local file upload validation.
- Reasonable file-size limits.
- CSRF-safe auth approach if cookie sessions are used.

### 5.2 Reliability
- SQLite transactions used for writes.
- Migrations required for schema changes.
- Basic input validation on all forms and endpoints.

### 5.3 Maintainability
- Strict schema and DTO typing.
- Backend separated into modules.
- Frontend organized by feature.
- Migrations tracked in version control.

### 5.4 Performance
- App optimized for single-user local scale.
- Dashboard queries should remain efficient for several years of logs.
- Use indexed date columns for trends.

### 5.5 Portability
- Run locally with Docker Compose.
- DB file persisted in mounted volume.
- Upload directory persisted in mounted volume.

---

## 6. Recommended Technical Stack

## 6.1 Frontend
- React
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS
- shadcn/ui
- Recharts
- date-fns

## 6.2 Backend
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic
- passlib/bcrypt
- python-jose or secure session middleware

## 6.3 Database
- SQLite

## 6.4 File Storage
- Local filesystem for photo uploads

## 6.5 Deployment
- Docker + Docker Compose

---

## 7. System Architecture

## 7.1 High-Level Architecture
- React frontend communicates with FastAPI backend over REST.
- FastAPI handles auth, validation, business logic, computations, and persistence.
- SQLite stores structured data.
- Local uploads directory stores progress images.

## 7.2 Architecture Diagram (logical)
- Client UI
- API layer
- Service layer
- Repository/ORM layer
- SQLite database
- Uploads filesystem

## 7.3 Backend Layering
### API Layer
- Request parsing
- Auth checks
- Response shaping

### Service Layer
- Body-fat computations
- Trend calculations
- Projection rules
- Goal state evaluation

### Persistence Layer
- ORM models
- DB session management
- CRUD repositories

---

## 8. Data Model

## 8.1 Entities

### users
- id
- username
- password_hash
- created_at
- updated_at

### profiles
- id
- user_id
- age
- sex
- height_cm
- start_weight_kg
- current_goal_weight_kg
- estimated_body_fat_start
- adjusted_body_fat_current
- default_step_target
- default_training_days_per_week
- created_at
- updated_at

### phases
- id
- user_id
- name
- description
- start_date
- end_date
- calorie_training
- calorie_rest
- protein_target_min
- protein_target_max
- fat_target
- carb_target_training
- carb_target_rest
- target_weight_min
- target_weight_max
- target_body_fat_min
- target_body_fat_max
- target_weekly_loss_min
- target_weekly_loss_max
- is_active
- created_at
- updated_at

### daily_logs
- id
- user_id
- date
- weight_kg
- calories
- protein_g
- carbs_g
- fat_g
- steps
- cardio_minutes
- cardio_type
- sleep_hours
- is_training_day
- notes
- created_at
- updated_at

Unique: (user_id, date)

### measurements
- id
- user_id
- date
- neck_cm
- waist_navel_cm
- waist_narrow_cm
- chest_cm
- hips_cm
- glutes_cm
- arm_relaxed_cm
- arm_flexed_cm
- thigh_mid_cm
- thigh_upper_cm
- calf_cm
- navy_body_fat_pct
- adjusted_body_fat_pct
- lean_mass_kg
- fat_mass_kg
- waist_height_ratio
- chest_waist_ratio
- notes
- created_at
- updated_at

### workouts
- id
- user_id
- date
- workout_type
- duration_minutes
- notes
- created_at
- updated_at

### workout_exercises
- id
- workout_id
- exercise_name
- order_index
- category
- created_at
- updated_at

### workout_sets
- id
- workout_exercise_id
- set_number
- reps
- weight
- rir
- notes
- created_at
- updated_at

### goals
- id
- user_id
- period_type
- metric_name
- start_date
- end_date
- target_value
- min_value
- max_value
- unit
- status
- created_at
- updated_at

### progress_photos
- id
- user_id
- date
- pose_type
- file_path
- notes
- created_at

### exercise_reference_prs
- id
- user_id
- exercise_name
- reference_weight
- reference_reps
- estimated_1rm
- notes
- created_at
- updated_at

---

## 9. Data Constraints and Validation

### 9.1 General Validation
- Date fields must be valid ISO dates.
- Numeric values must be non-negative.
- Protein/carbs/fats/calories must be within reasonable ranges.
- Uploaded files restricted to supported image types.

### 9.2 Measurement Validation
- Neck: 20–60 cm
- Waist: 40–200 cm
- Arm: 15–70 cm
- Thigh: 20–100 cm
- Calf: 20–70 cm

### 9.3 Workout Validation
- Reps >= 0
- Weight >= 0
- Set numbers positive integers

---

## 10. Derived Computations

## 10.1 7-Day Average Weight
Average the last 7 available daily weights including current period.

## 10.2 Navy Body-Fat Formula (Men)
BodyFat% = 86.010 × log10(waist_navel - neck) - 70.041 × log10(height) + 36.76

Units must be consistent.

## 10.3 Lean Mass
lean_mass_kg = weight_kg × (1 - body_fat_pct / 100)

## 10.4 Fat Mass
fat_mass_kg = weight_kg × (body_fat_pct / 100)

## 10.5 Estimated 1RM
Use Epley formula for trend graphing:
1RM = weight × (1 + reps / 30)

## 10.6 Strength Recovery Percentage
strength_recovery_pct = current_best_estimated_1rm / reference_estimated_1rm × 100

## 10.7 Weekly Weight-Loss Rate
Use 14-day trend or rolling linear estimate.

---

## 11. API Specification

## 11.1 Auth Endpoints
### POST /auth/login
Request:
- username
- password

Response:
- auth status
- current user summary

### POST /auth/logout
Response:
- success boolean

### GET /auth/me
Response:
- current user info

---

## 11.2 Profile Endpoints
### GET /profile
Returns full current profile.

### PUT /profile
Updates editable profile fields.

---

## 11.3 Daily Log Endpoints
### GET /daily-logs
Query params:
- start_date
- end_date

### POST /daily-logs
Create new daily log.

### PUT /daily-logs/{id}
Update existing daily log.

### DELETE /daily-logs/{id}
Delete daily log.

---

## 11.4 Measurement Endpoints
### GET /measurements
### POST /measurements
### PUT /measurements/{id}
### DELETE /measurements/{id}

---

## 11.5 Workout Endpoints
### GET /workouts
### GET /workouts/{id}
### POST /workouts
### PUT /workouts/{id}
### DELETE /workouts/{id}

---

## 11.6 Goals and Phases Endpoints
### GET /goals
### GET /phases
### POST /seed-plan
Seeds app with conversation-derived profile, plan, and goals.

---

## 11.7 Photo Endpoints
### POST /photos
Multipart upload.

### GET /photos
List photo metadata.

### DELETE /photos/{id}
Delete photo and metadata.

---

## 11.8 Analytics Endpoints
### GET /analytics/dashboard
Returns dashboard cards and summary graphs.

### GET /analytics/projections
Returns:
- projected goal date
- suggested calorie adjustment
- pace assessment
- next target ranges

### GET /analytics/strength
Returns lift trends and recovery percentages.

---

## 12. Frontend Specification

## 12.1 Routes
- /login
- /
- /dashboard
- /daily-logs
- /measurements
- /workouts
- /goals
- /plan
- /photos
- /settings

## 12.2 Page Definitions

### Login Page
- Username input
- Password input
- Login action
- Error state

### Dashboard Page
- Summary cards
- Weight trend chart
- Waist trend chart
- Body-fat chart
- Macro adherence chart
- Strength recovery card/chart
- Next milestones card

### Daily Logs Page
- Calendar/date-based entry
- Table of recent logs
- Inline editing or modal editing

### Measurements Page
- Measurement entry form
- Historical measurement table
- Derived metrics shown per row
- Body-fat trend chart

### Workouts Page
- List workout sessions
- Create workout form
- Session detail page with exercises/sets
- Exercise history drilldown

### Goals Page
- Current biweekly/monthly/quarterly goals
- Phase progress
- Goal status pills

### Plan Page
Static/reference view of seeded program:
- calories
- macros
- weight milestones
- measurement targets
- cardio guidance
- progression rules

### Photos Page
- Upload control
- Pose filter
- Image grid grouped by date

### Settings Page
- Profile values
- body-fat override setting
- step target
- plan phase controls

---

## 13. Component Specification

### Shared Components
- AppShell
- SidebarNav
- TopBar
- ProtectedRoute
- StatusBadge
- MetricCard
- TrendCard
- EmptyState
- ConfirmDialog

### Dashboard Components
- CurrentStatsRow
- WeightTrendChart
- WaistTrendChart
- BodyFatTrendChart
- MacroAdherenceChart
- StrengthRecoveryCard
- ProjectionCard
- CurrentPhaseCard

### Form Components
- DailyLogForm
- MeasurementForm
- WorkoutForm
- ExerciseSetTable
- PhotoUploadForm

---

## 14. UX Requirements

### 14.1 Core UX Principles
- Low-friction entry.
- Most frequent actions accessible in 1–2 clicks.
- Dense but readable dashboard.
- Metrics should be understandable without explanation.

### 14.2 Logging UX
- Daily logging should take under 1 minute.
- Measurement logging should take under 3 minutes.
- Workout logging should allow fast repeated entries.

### 14.3 Status Visibility
Each major metric must show:
- actual value
- target value/range
- trend direction
- status state

---

## 15. Analytics and Business Logic Details

## 15.1 Goal Status Algorithm
For any metric with target range:
- ahead: better than expected and still healthy
- on track: within range
- caution: slightly outside range
- off track: clearly outside range

## 15.2 Weight Projection
Use recent rolling average trend from bodyweight logs.
Estimate date to target_weight_kg based on average weekly loss.

## 15.3 Calorie Suggestion Logic
Inputs:
- average calories by last 14 days
- weekly rate of loss
- training recovery signals

Outputs:
- maintain
- reduce by 150 kcal/day
- increase by 100 kcal/day
- increase training-day carbs only

## 15.4 Measurement Projection
Estimate next expected waist and body-fat checkpoints using recent slope and current phase targets.

## 15.5 Strength Projection
Compare key exercise estimated 1RM recovery against expected baseline regain curve.

---

## 16. Seed Data Specification

## 16.1 Profile Seed
Insert a default profile based on the provided stats.

## 16.2 Phase Seed
Create initial phases:
1. Aggressive Recomp
2. Maintenance/Recomp
3. Lean Gain/Refinement

## 16.3 Goal Seed Examples
### Biweekly
- Average weight loss >= 0.35 kg/week
- Protein average >= 200 g/day
- Steps average >= 8000/day

### Monthly
- Waist down 1–2 cm
- Strength recovery +10–15% on selected lifts

### Quarterly
- Phase target weight range reached
- body-fat range improved

## 16.4 Reference PR Seed
Seed historical bests for key exercises for recovery tracking.

---

## 17. Security Design

### 17.1 Auth Model
Recommended MVP: signed HTTP-only cookie session.
Alternative: JWT stored securely.

### 17.2 Password Handling
- Hash with bcrypt.
- Never log passwords.

### 17.3 File Upload Security
- Restrict to image MIME types.
- Limit file sizes.
- Sanitize file names.
- Store outside static root if desired.

### 17.4 API Protection
- All non-auth endpoints require authenticated user.
- Ownership enforced at query layer.

---

## 18. Error Handling

### Requirements
- Validation errors returned clearly.
- Auth failures return safe generic message.
- DB failures logged server-side.
- Frontend shows recoverable error states.

### UX Error States
- Failed save
- Missing required date
- Invalid measurement values
- Upload failure
- Session expired

---

## 19. Testing Strategy

## 19.1 Backend Tests
- Auth tests
- CRUD tests for logs/measurements/workouts
- body-fat computation tests
- projection engine tests
- seeded plan tests

## 19.2 Frontend Tests
- route protection
- form validation
- chart data mapping
- dashboard rendering

## 19.3 Manual QA Checklist
- login flow
- add/edit daily log
- add measurement and verify derived BF
- log workout and verify trend chart
- upload progress photo
- verify seeded targets appear correctly

---

## 20. Development Milestones

## Milestone 1 — Foundation
- Repo setup
- Docker setup
- DB schema
- migrations
- auth
- profile seed

## Milestone 2 — Logging
- daily logs CRUD
- measurements CRUD
- derived calculations

## Milestone 3 — Dashboard
- summary cards
- core charts
- analytics endpoints

## Milestone 4 — Workouts
- workout/session/set tracking
- PR baseline comparison

## Milestone 5 — Projections
- rules engine
- goal statusing
- projected milestone cards

## Milestone 6 — Photos and polish
- upload flow
- progress browsing
- UI refinements

---

## 21. Open Design Decisions

### Decision 1
Cookie session auth vs JWT.
Recommendation: cookie session for simpler secure private app UX.

### Decision 2
Store derived metrics in DB vs compute on read.
Recommendation: compute on write and persist for dashboard speed, while keeping logic deterministic.

### Decision 3
Workout library fixed vs freeform.
Recommendation: freeform with optional predefined exercise suggestions.

### Decision 4
Photo storage local vs object storage.
Recommendation: local for MVP.

---

## 22. Future Enhancements
- CSV export/import
- Deload tracking
- program templates
- notes journaling with tags
- multi-profile support
- mobile-optimized quick-entry mode
- body-part progress analytics
- reminder notifications
- maintenance calorie auto-estimation

---

## 23. Definition of Done for MVP
The app is MVP-complete when:
- user can authenticate
- profile and seeded plan are stored
- daily logs and measurements can be created and edited
- dashboard shows target vs actual progress
- body-fat and trend calculations work
- workouts can be tracked and compared against baseline PRs
- projections generate useful next-step guidance
- data persists across restarts in SQLite

---

## 24. Recommended Immediate Next Deliverables
1. Database schema and ERD
2. Backend API contract file
3. Frontend wireframes
4. Starter repository scaffold
5. Seed script using this conversation’s numbers
