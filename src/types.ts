export type Language = 'KR' | 'SC' | 'EN';

export type Page = 
  | 'home' 
  | 'philosophy' 
  | 'art' 
  | 'poetryCollection' 
  | 'tea' 
  | 'journey' 
  | 'contact' 
  | 'admin';

export interface ArchiveItem {
  id: string;
  title: string;
  content: string;
  summary: string;
  image_url: string;
  category: 'poetry' | 'philosophy' | 'art' | 'tea' | 'journey' | string;
  created_at?: any; // Timestamp or date string
  poetry_collection_name?: string | null;
  language?: Language;
}

export interface SiteSettings {
  id: string;
  logo_url: string;
  hero_bg_url: string;
  tea_detail_url: string;
  tea_slider_images?: string[];
  tea_slider_speed?: number;
  artists?: Artist[];
  created_at?: any;
}

export interface Work {
  title: string;
  image: string;
  size?: string;
  introduction?: string;
  criticism?: string;
}

export interface Artist {
  id?: string;
  name: string;
  title: string;
  bio: string;
  image?: string;
  works?: Work[];
  language?: Language;
}
