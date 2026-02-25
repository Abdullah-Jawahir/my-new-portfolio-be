import { Request } from 'express';

export interface Profile {
  id: string;
  name: string;
  title: string;
  greeting: string;
  description: string;
  avatarUrl: string;
  cvUrl: string;
  updatedAt: Date;
}

export interface Stat {
  id: string;
  icon: string;
  number: string;
  label: string;
  description: string;
  order: number;
}

export interface SkillCategory {
  id: string;
  category: 'frontend' | 'backend';
  title: string;
  icon: string;
  description: string;
  order: number;
  skills: SkillItem[];
}

export interface SkillItem {
  id: string;
  name: string;
  level: number;
  icon: string;
  color: string;
  order: number;
}

export interface AdditionalSkill {
  id: string;
  name: string;
  order: number;
}

export interface GithubRepo {
  label: string;
  url: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  technologies: string[];
  githubUrl: string;
  githubUrls?: GithubRepo[];
  liveUrl: string;
  featured: boolean;
  order: number;
  createdAt: Date;
}

export interface Education {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  description: string;
  order: number;
}

export interface ContactInfo {
  id: string;
  type: 'email' | 'phone' | 'location';
  value: string;
  href: string;
  icon: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
  order: number;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
