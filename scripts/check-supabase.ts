/**
 * Quick script to check what's actually in Supabase
 */

import { getSupabaseClient } from '../packages/shared/utils/supabaseClient';

async function checkSupabase() {
  const supabase = getSupabaseClient();
  
  console.log('🔍 Querying Supabase for latest snapshots...\n');
  
  const { data, error } = await supabase
    .from('availability_snapshots')
    .select('id, created_at, checked_at, total_available_slots, source, user_id')
    .eq('user_id', 1)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`Found ${data.length} snapshots:\n`);
  data.forEach((row, i) => {
    console.log(`${i + 1}. ID: ${row.id.substring(0, 13)}...`);
    console.log(`   Created: ${row.created_at}`);
    console.log(`   Checked: ${row.checked_at}`);
    console.log(`   Slots: ${row.total_available_slots}`);
    console.log(`   Source: ${row.source}`);
    console.log('');
  });
}

checkSupabase();
