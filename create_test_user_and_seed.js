// create_test_user_and_seed.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const email = 'testuser@example.com';
  const password = 'TestPass123!';
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError && signUpError.message !== 'User already registered') {
    console.error('Sign‑up error:', signUpError.message);
    process.exit(1);
  }
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error('Sign‑in error:', signInError.message);
    process.exit(1);
  }
  const userId = signInData.user.id;
  console.log('Test user ID:', userId);

  const sessions = [
    { title: 'Session One', session_type: 'Workshop', description: 'First session', session_date: new Date('2024-01-10T10:00:00Z').toISOString() },
    { title: 'Session Two', session_type: 'Webinar', description: 'Second session', session_date: new Date('2024-02-15T14:00:00Z').toISOString() },
    { title: 'Session Three', session_type: 'Lecture', description: 'Third session', session_date: new Date('2024-03-20T09:00:00Z').toISOString() },
  ];

  const { data: sessionData, error: sessionError } = await supabase.from('sessions').upsert(sessions, { returning: 'representation' });
  if (sessionError) {
    console.error('Insert sessions error:', sessionError.message);
    process.exit(1);
  }
  const sessionIds = sessionData.map(s => s.id);

  const attendance = sessionIds.map(sid => ({ user_id: userId, session_id: sid, attendance_status: 'attended', attended_at: new Date().toISOString() }));
  const { error: attendError } = await supabase.from('session_attendance').upsert(attendance);
  if (attendError) {
    console.error('Insert attendance error:', attendError.message);
    process.exit(1);
  }

  const certificates = sessionIds.slice(0, 2).map((sid, idx) => ({
    title: `Certificate for ${sessions[idx].title}`,
    recipient_name: 'Test Student',
    issued_at: new Date().toISOString(),
    user_id: userId,
    session_id: sid,
    pdf_url: ''
  }));
  const { error: certError } = await supabase.from('certificates').upsert(certificates);
  if (certError) {
    console.error('Insert certificates error:', certError.message);
    process.exit(1);
  }

  const cred = `email=${email}\npassword=${password}\n`;
  fs.writeFileSync('test_credentials.txt', cred);
  console.log('Credentials written to test_credentials.txt');
}

main();
