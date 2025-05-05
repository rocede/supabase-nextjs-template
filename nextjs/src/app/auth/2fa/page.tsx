// src/app/auth/2fa/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createSPASassClient } from '@/lib/supabase/client';
import { MFAVerification } from '@/components/MFAVerification';

export default function TwoFactorAuthPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const checkMFAStatus = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = await createSPASassClient();
            const { data, error } = await supabase.getSupabaseClient().auth.mfa.listFactors();

            if (error) throw error;

            const hasEnabledTOTP = data.all.some(factor => 
                factor.factor_type === 'totp' && 
                factor.status === 'verified'
            );

            if (hasEnabledTOTP) {
                router.push('/app');
            }
        } catch (err) {
            console.error('Error checking MFA status:', err);
            setError(err instanceof Error ? err.message : 'Failed to check MFA status');
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        checkMFAStatus();
    }, [checkMFAStatus]);

    const handleVerified = () => {
        router.push('/app');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center">
                <div className="text-red-600">{error}</div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md">
            <MFAVerification onVerified={handleVerified} />
        </div>
    );
}