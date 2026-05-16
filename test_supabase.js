import { createClient } from './node_modules/@supabase/supabase-js/dist/index.mjs';
const SUPABASE_URL = 'https://qlseuefnvlofiobmjoec.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsc2V1ZWZudmxvZmlvYm1qb2VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1ODEzNTgsImV4cCI6MjA5NDE1NzM1OH0.phxnDHzljOwznn7Mwwt8VAm-9W5QUUy7iO69whLIgE0';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const animals = await supabase.from('animals').select('*').limit(1);
  console.log('animals', animals);
  const trucks = await supabase.from('trucks').select('*').limit(1);
  console.log('trucks', trucks);
  const expenses = await supabase.from('expenses').select('*').limit(1);
  console.log('expenses', expenses);
}

test().catch(console.error);
