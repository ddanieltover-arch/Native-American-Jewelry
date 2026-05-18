'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser } from '@/types';

interface AdminStore {
  admin:           AdminUser | null;
  sidebarOpen:     boolean;
  sidebarCollapsed:boolean;

  setAdmin:        (admin: AdminUser | null) => void;
  toggleSidebar:   () => void;
  collapseSidebar: (v: boolean) => void;
  logout:          () => void;
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      admin:            null,
      sidebarOpen:      true,
      sidebarCollapsed: false,

      setAdmin:        (admin) => set({ admin }),
      toggleSidebar:   ()     => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      collapseSidebar: (v)    => set({ sidebarCollapsed: v }),
      logout:          ()     => set({ admin: null }),
    }),
    { name: 'naj-admin', partialize: (s) => ({ admin: s.admin, sidebarCollapsed: s.sidebarCollapsed }) }
  )
);

// ─── Mock session (replace with real Supabase auth in prod) ──
export const MOCK_ADMIN: AdminUser = {
  id:            'admin-1',
  email:         'admin@nativeamericanjewelry.com',
  role:          'super_admin',
  totp_enabled:  false,
  last_login_at: new Date(Date.now() - 3600_000).toISOString(),
  last_login_ip: '192.168.1.1',
  created_at:    '2024-01-01T00:00:00Z',
};
