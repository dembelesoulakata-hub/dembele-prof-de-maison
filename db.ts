export type Statut = "Élève" | "Étudiant en Licence";

export interface Profile {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  statut: Statut;
  classe: string | null;
  serie: string | null;
  niveau: string | null;
  filiere: string | null;
  pays: string;
  identity_updated_at: string;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  chapter_number: number;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  image_path: string | null;
  created_at: string;
}

export interface Country {
  code: string;
  name_fr: string;
  timezone: string;
}

export interface ScheduleSlot {
  day: number;
  start_hour: number;
  end_hour: number;
  subject: string;
}

export interface BlockStatus {
  blocked: boolean;
  until_hour: number | null;
}
