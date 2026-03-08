export interface ResumeHeader {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
}

export interface ExperienceRole {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  location: string;
  roles: ExperienceRole[];
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface SkillGroup {
  id: string;
  name: string; // e.g., "Languages", "Tech Stack"
  items: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  link: string;
  description: string;
}

export interface ResumeData {
  id: string;
  title: string;
  header: ResumeHeader;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillGroup[];
  projects: ProjectItem[];
  customColor?: string;
}

export type SectionType = 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'projects';

export interface TemplateConfig {
  id: string;
  name: string;
  thumbnail: string;
  isATS: boolean;
  tags: string[];
  layout: 'single-column' | 'two-column-left' | 'two-column-right' | 'modern-sidebar';
  fontHeadings: string;
  fontBody: string;
  colors: {
    primary: string;
    secondary: string;
    text: string;
    bg: string;
  };
}

export interface AppState {
  resume: ResumeData;
  templateId: string;
  atsMode: boolean;
  scale: number;
}

declare module 'html2pdf.js';
