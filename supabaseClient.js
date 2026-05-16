import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig.js';
import supabaseStub from './supabaseClientStub.js';

function createSupabaseClient() {
    if (typeof window === 'undefined') {
        console.warn('Supabase client can only be created in the browser. Using offline stub.');
        return supabaseStub;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.warn('Supabase UMD bundle is not loaded correctly. Using offline stub.');
        return supabaseStub;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_') || SUPABASE_ANON_KEY.includes('YOUR_')) {
        console.warn('Supabase config is invalid or placeholder values are present. Using offline stub.');
        return supabaseStub;
    }

    try {
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client created from local UMD bundle');
        return client;
    } catch (error) {
        console.error('Failed to create Supabase client from local UMD bundle:', error);
        return supabaseStub;
    }
}

const supabaseClient = createSupabaseClient();
export default supabaseClient;


