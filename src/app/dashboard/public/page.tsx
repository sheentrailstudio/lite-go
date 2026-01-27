'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedPublicPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/public');
    }, [router]);
    
    // You can optionally return a loading spinner or null
    return null; 
}
