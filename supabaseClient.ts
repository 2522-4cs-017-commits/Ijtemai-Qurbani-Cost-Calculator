import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Validate that environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase configuration. ' +
        'Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
    );
}

// Initialize and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Fetch all profiles from the 'profiles' table
 * @returns Promise with profiles data or null if error occurs
 */
export async function fetchAllProfiles() {
    try {
        console.log('Fetching profiles from Supabase...');
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) {
            console.error('Error fetching profiles:', error.message);
            console.error('Error details:', error);
            return null;
        }

        console.log('Profiles fetched successfully:', data);
        console.log(`Total profiles: ${data ? data.length : 0}`);
        
        return data;
    } catch (exception) {
        console.error('Unexpected error fetching profiles:', exception);
        return null;
    }
}

export default supabase;
