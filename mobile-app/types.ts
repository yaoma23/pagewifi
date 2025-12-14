export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            bookings: {
                Row: {
                    id: string
                    renter_id: string
                    property_id: string
                    check_in: string
                    check_out: string
                    status: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    renter_id: string
                    property_id: string
                    check_in: string
                    check_out: string
                    status?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    renter_id?: string
                    property_id?: string
                    check_in?: string
                    check_out?: string
                    status?: string
                    created_at?: string
                }
            }
            key_returns: {
                Row: {
                    id: string
                    booking_id: string
                    returned_at: string
                    condition: string | null
                    notes: string | null
                }
                Insert: {
                    id?: string
                    booking_id: string
                    returned_at?: string
                    condition?: string | null
                    notes?: string | null
                }
                Update: {
                    id?: string
                    booking_id?: string
                    returned_at?: string
                    condition?: string | null
                    notes?: string | null
                }
            }
            nfc_keys: {
                Row: {
                    id: string
                    booking_id: string
                    key_code: string
                    status: string
                    issued_at: string
                    expires_at: string | null
                }
                Insert: {
                    id?: string
                    booking_id: string
                    key_code: string
                    status?: string
                    issued_at?: string
                    expires_at?: string | null
                }
                Update: {
                    id?: string
                    booking_id?: string
                    key_code?: string
                    status?: string
                    issued_at?: string
                    expires_at?: string | null
                }
            }
            properties: {
                Row: {
                    id: string
                    owner_id: string
                    name: string
                    address: string | null
                    city: string | null
                    country: string | null
                    created_at: string
                    cover_image_url: string | null
                    photo_urls: string[] | null
                }
                Insert: {
                    id?: string
                    owner_id: string
                    name: string
                    address?: string | null
                    city?: string | null
                    country?: string | null
                    created_at?: string
                    cover_image_url?: string | null
                    photo_urls?: string[] | null
                }
                Update: {
                    id?: string
                    owner_id?: string
                    name?: string
                    address?: string | null
                    city?: string | null
                    country?: string | null
                    created_at?: string
                    cover_image_url?: string | null
                    photo_urls?: string[] | null
                }
            }
            users: {
                Row: {
                    id: string
                    full_name: string | null
                    email: string
                    phone: string | null
                    avatar_url: string | null
                    role: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    email: string
                    phone?: string | null
                    avatar_url?: string | null
                    role?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    email?: string
                    phone?: string | null
                    avatar_url?: string | null
                    role?: string | null
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
