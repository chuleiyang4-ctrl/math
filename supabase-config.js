// Get these from your Supabase Project Settings > API
const SUPABASE_URL = 'https://ggeldamquoaovfxkdlu.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key-here';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);