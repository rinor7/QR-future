export interface QRContact {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Identity
  name: string;
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

  // File
  pdfUrl: string;
  pdfLabel: string;

  // vCard
  address: string;

  // Display
  primaryColor: string;
  notes: string;
}

export type CreateQRContact = Omit<QRContact, 'id' | 'createdAt' | 'updatedAt'>;
