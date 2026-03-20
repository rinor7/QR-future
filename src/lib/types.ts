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

  // Links / Files (up to 4)
  links: ContactLink[];

  // vCard
  address: string;

  // Display
  primaryColor: string;
  notes: string;
}

export type CreateQRContact = Omit<QRContact, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;

// Plans
export type Plan = 'free' | 'star' | 'premium' | 'platinum';

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 2,
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

export interface UserProfile {
  userId: string;
  email: string;
  plan: Plan;
  createdAt: string;
}
