import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lrxhasxnybrrkzrlcksv.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyeGhhc3hueWJycmt6cmxja3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzE4NjEsImV4cCI6MjA4MTkwNzg2MX0.zb0pw0KGYVwpXJ-7s4Yw5uHR5iZfv11nNUadJn5Vw7A';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase credentials missing! App may not function correctly.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
