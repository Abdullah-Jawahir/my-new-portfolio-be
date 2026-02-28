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
  icon?: string;
  number: string;
  label: string;
  description?: string;
  order: number;
  featured?: boolean;
  isDynamic?: boolean;
  dynamicSource?: 'projects' | 'certifications' | 'technologies' | 'skills' | 'experience' | 'yearsExperience';
}

export interface SkillCategory {
  id: string;
  category: 'frontend' | 'backend' | 'database' | 'devops' | 'mobile' | 'ai_ml' | 'security' | 'tools';
  title: string;
  icon: string;
  description: string;
  order: number;
  skills: SkillItem[];
  featured?: boolean;
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

// Permission types for Role-Based Access Control
export type Permission = 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE';

export type AdminPage = 
  | 'dashboard'
  | 'profile'
  | 'about'
  | 'skills'
  | 'projects'
  | 'education'
  | 'experience'
  | 'faqs'
  | 'messages';

export interface PagePermission {
  page: AdminPage;
  permissions: Permission[];
}

export interface SubAdminInvitation {
  id: string;
  email: string;
  invitedBy: string;
  invitedByEmail: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  token: string;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
  pagePermissions: PagePermission[];
}

export interface SubAdmin {
  id: string;
  uid: string;
  email: string;
  name: string | null;
  photoUrl: string | null;
  invitedBy: string;
  invitedByEmail: string;
  isActive: boolean;
  pagePermissions: PagePermission[];
  createdAt: Date;
  lastLoginAt: Date;
  disabledAt?: Date;
  disabledReason?: string;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type RequestAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface PendingRequest {
  id: string;
  subAdminId: string;
  subAdminEmail: string;
  subAdminName: string | null;
  action: RequestAction;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  page: AdminPage;
  data: Record<string, unknown>;
  previousData?: Record<string, unknown>;
  status: RequestStatus;
  reason?: string;
  createdAt: Date;
  processedAt?: Date;
  processedBy?: string;
  rejectionReason?: string;
}

export interface AuthenticatedRequestWithPermissions extends AuthenticatedRequest {
  isCoreAdmin?: boolean;
  isSubAdmin?: boolean;
  subAdmin?: SubAdmin;
  permissions?: PagePermission[];
}
