'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-client';
import { ensureCustomerProfile, type CustomerProfile } from '@/lib/auth/customer';

export function useCustomerAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setCustomer(null);
      return;
    }
    const supabase = createClient();
    const profile = await ensureCustomerProfile(supabase, authUser);
    setCustomer(profile);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser);
      await loadProfile(authUser);
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      await loadProfile(authUser);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
    setUser(null);
    setCustomer(null);
  }, []);

  return {
    user,
    customer,
    loading,
    isAuthenticated: !!user,
    signOut,
    refreshProfile: () => loadProfile(user),
  };
}
