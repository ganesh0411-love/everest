import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sstgqfdnjylouxhqtvut.supabase.co';
const supabaseAnonKey = 'sb_publishable_hhOZ9EbYeSBTFW-PMczbBA_ydyyF8Ad';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
