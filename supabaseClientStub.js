// Minimal offline Supabase stub - for when CDN is unavailable
// This allows the app to work in offline mode while we test UI responsiveness

class MockSupabaseClient {
    from(table) {
        return {
            insert: async (data) => ({ data: null, error: { message: 'Offline: database unavailable' } }),
            upsert: async (data, opts) => ({ data: null, error: { message: 'Offline: database unavailable' } }),
            select: async () => ({ data: [], error: { message: 'Offline: database unavailable' } }),
            delete: async () => ({ data: null, error: { message: 'Offline: database unavailable' } })
        };
    }

    auth = {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    };
}

export default new MockSupabaseClient();
