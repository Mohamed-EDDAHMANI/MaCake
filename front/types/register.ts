import { DEFAULT_COUNTRY_MOROCCO, type CountryOption } from "@/lib/countries";

// Align with auth-service: User + Client | Patissiere | Livreur
export type RegisterRole = "CLIENT" | "PATISSIERE" | "LIVREUR";

export type RegisterStep = 1 | 2;

export interface RegisterFormData {
  // User (base)
  name: string;
  email: string;
  password: string;
  /** National number only (no country code). Full phone = phoneCountry.dialCode + phone */
  phone: string;
  /** Selected country for phone (flag + dial code) */
  phoneCountry: CountryOption | null;
  photo: string | null;
  city: string;
  address: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  // Role-specific (Patissiere)
  bio?: string;
  // Role-specific (Livreur)
  vehicleType?: string;
}

export const DEFAULT_FORM_DATA: RegisterFormData = {
  name: "",
  email: "",
  password: "",
  phone: "",
  phoneCountry: DEFAULT_COUNTRY_MOROCCO,
  photo: null,
  city: "",
  address: "",
  country: "",
  latitude: null,
  longitude: null,
  description: "",
  bio: "",
  vehicleType: "",
};
