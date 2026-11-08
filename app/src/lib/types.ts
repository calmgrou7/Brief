export type Profile = {
  id: string;
  display_name: string | null;
  agreed_terms_at: string | null;
  agreed_privacy_at: string | null;
  confirmed_age_14_at: string | null;
  marketing_opt_in: boolean;
};

export type Goal = {
  id: string;
  title: string;
  due_date: string | null;
  status: 'active' | 'done' | 'archived';
  created_at: string;
};

export type Task = {
  id: string;
  goal_id: string;
  title: string;
  minutes: number | null;
  position: number;
  done_at: string | null;
  focus_date: string | null;
};
