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
  originalCreatorDeleted?: boolean;

  // Internal label (shown in dashboard)
  qrLabel: string;

  // Identity
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  description?: string;
  logoUrl: string;

  // Contact
  phone: string;
  phones: { number: string; label: string }[];
  email: string;
  emails: { email: string; label: string }[];
  website: string;
  websites: { url: string; label: string }[];

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
  country: string;
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
  leadCaptureEnabled: boolean;
  theme: 'classic' | 'dark' | 'minimal';

  // QR Code styling
  qrDotStyle: 'square' | 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'extra-rounded';
  qrCornerStyle: 'square' | 'dot' | 'extra-rounded';
  qrDotColor: string;
  qrBgColor: string;
  qrGradient: boolean;
  qrGradientColor: string;
}

export type CreateQRContact = Omit<QRContact, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'originalCreatorDeleted'>;

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

export type Role = 'admin' | 'writer' | 'owner';

export interface UserProfile {
  userId: string;
  email: string;
  plan: Plan;
  role: Role;
  ownerId: string;
  createdAt: string;
  isPlatformAdmin: boolean;
  canManageUsers: boolean; // true if user belongs to the platform owner's org
  supportEmail?: string;
}

export interface ClientAccount {
  userId: string;
  email: string;
  plan: Plan;
  createdAt: string;
  qrCount: number;
  lastActivityAt?: string;
  hasStripe?: boolean;
}

export interface TeamMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: string;
  confirmed?: boolean;
}
