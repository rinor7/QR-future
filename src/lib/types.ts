export interface ContactLink {
  url: string;
  label: string;
  type: 'file' | 'link';
}

export interface QRContact {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  // Internal label (shown in dashboard)
  qrLabel: string;

  // Identity
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  logoUrl: string;

  // Contact
  phone: string;
  email: string;
  website: string;

  // Social
  linkedinUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  snapchatUrl: string;
  xUrl: string;
  otherSocialUrl: string;

  // Links / Files (up to 4)
  links: ContactLink[];

  // Address
  street: string;
  streetNr: string;
  plz: string;
  city: string;

  // Display
  primaryColor: string;
  bgImageUrl: string;
  notes: string;
  showLogoInQr: boolean;
  isActive: boolean;
}

export type CreateQRContact = Omit<QRContact, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;

// Plans
export type Plan = 'free' | 'star' | 'premium' | 'platinum';

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 1,
  star: 10,
  premium: 100,
  platinum: -1, // unlimited
};

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free',
  star: 'Star',
  premium: 'Premium',
  platinum: 'Platinum',
};

export type Role = 'admin' | 'writer' | 'reader';

export interface UserProfile {
  userId: string;
  email: string;
  plan: Plan;
  role: Role;
  ownerId: string;
  createdAt: string;
  isPlatformAdmin: boolean;
  canManageUsers: boolean; // true if user belongs to the platform owner's org
}

export interface ClientAccount {
  userId: string;
  email: string;
  plan: Plan;
  createdAt: string;
  qrCount: number;
  lastActivityAt?: string;
}

export interface TeamMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: string;
}
