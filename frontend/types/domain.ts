export type Chronotype =
  | "extreme_morning"
  | "moderate_morning"
  | "intermediate"
  | "moderate_evening"
  | "extreme_evening";

export type ObligationType = "work" | "class" | "family" | "health" | "other";

export type EventType = "exam" | "presentation" | "interview" | "travel" | "other";

export type ActivityType =
  | "sleep"
  | "wake"
  | "meal"
  | "exercise"
  | "caffeine"
  | "light_exposure"
  | "wind_down"
  | "obligation";

export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  language: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  is_new_user?: boolean;
}

export interface Obligation {
  id: string;
  user_id: string;
  name: string;
  type: ObligationType;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  is_recurring: boolean;
  valid_from: string;
  valid_until?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ScheduleItem {
  activity_type: ActivityType;
  scheduled_time: string;
  duration_minutes?: number | null;
  notes?: string | null;
  scientific_rationale?: string | null;
}

export interface DailySchedule {
  date: string;
  day_of_week: number;
  sleep_time: string;
  wake_time: string;
  items: ScheduleItem[];
}

export interface SleepPlan {
  id: string;
  user_id: string;
  name: string;
  valid_from: string;
  valid_until: string;
  target_sleep_time: string;
  target_wake_time: string;
  target_sleep_duration_minutes: number;
  is_transition_plan: boolean;
  optimization_score?: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Tracking {
  id: string;
  user_id: string;
  date: string;
  actual_sleep_time?: string | null;
  actual_wake_time?: string | null;
  sleep_quality?: number | null;
  adherence_percentage?: number | null;
  social_jet_lag_minutes?: number | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface Event {
  id: string;
  user_id: string;
  name: string;
  type: EventType;
  event_date: string;
  event_time?: string | null;
  importance: 1 | 2 | 3 | 4 | 5;
  preparation_days?: number;
  notes?: string | null;
  created_at?: string | null;
}

export interface EducationalContent {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  body: string;
  category: string;
  tags?: string[] | null;
  reading_time_minutes?: number | null;
  citations?: string[] | null;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}
