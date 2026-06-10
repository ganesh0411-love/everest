const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

let supabase = null;

const initDb = () => {
    if (!supabase) {
        // FORCE Hardcode to new production instance (ignores any old broken env vars on Render)
        const url = 'https://ksvkazxyovmqucgvvuuc.supabase.co';
        const key = 'sb_secret_6RzYfEFdtLYMo-4LQbsDvg_0bfrpfci';

        if (!url || !key) {
            console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_KEY is not set in environment.');
            return null;
        }

        // Pass ws to global so that RealtimeClient uses it
        if (!global.WebSocket) global.WebSocket = WebSocket;

        supabase = createClient(url, key, {
            auth: { persistSession: false },
        });
        console.log('✅ Supabase client initialized.');
    }
    return supabase;
};

// Insert a new FMB map record
const insertMap = async (name, surveyNumber, scale, svgData, sourceImageBase64) => {
    const db = initDb();
    if (!db) return null;
    const { data, error } = await db
        .from('fmb_maps')
        .insert([{ name, survey_number: surveyNumber, scale, svg_data: svgData, source_image_base64: sourceImageBase64 }])
        .select('id')
        .single();
    if (error) { console.error('insertMap error:', error); return null; }
    return data.id;
};

// Get all maps (summary, no svg_data for performance)
const getAllMaps = async () => {
    const db = initDb();
    if (!db) return [];
    const { data, error } = await db
        .from('fmb_maps')
        .select('id, name, survey_number, scale, source_image_base64, created_at')
        .order('created_at', { ascending: false });
    if (error) { console.error('getAllMaps error:', error); return []; }
    return data;
};

// Get a single map by ID (full data including svg_data)
const getMapById = async (id) => {
    const db = initDb();
    if (!db) return null;
    const { data, error } = await db
        .from('fmb_maps')
        .select('*')
        .eq('id', id)
        .single();
    if (error) { console.error('getMapById error:', error); return null; }
    return data;
};

// Rename a map
const renameMap = async (id, name) => {
    const db = initDb();
    if (!db) return false;
    const { error } = await db
        .from('fmb_maps')
        .update({ name })
        .eq('id', id);
    if (error) { console.error('renameMap error:', error); return false; }
    return true;
};

// Delete a map
const deleteMap = async (id) => {
    const db = initDb();
    if (!db) return false;
    const { error } = await db
        .from('fmb_maps')
        .delete()
        .eq('id', id);
    if (error) { console.error('deleteMap error:', error); return false; }
    return true;
};

// Update an existing map record
const updateMap = async (id, scale, svgData, sourceImageBase64) => {
    const db = initDb();
    if (!db) return false;

    // Fetch to check if name is default
    const { data: mapData } = await db.from('fmb_maps').select('name').eq('id', id).single();
    let newName = mapData?.name;
    if (newName && newName.startsWith('FMB Map ')) {
        newName = `FMB Map Draft`;
    }

    const { error } = await db
        .from('fmb_maps')
        .update({ name: newName, scale, svg_data: svgData, source_image_base64: sourceImageBase64, created_at: new Date().toISOString() })
        .eq('id', id);
    if (error) { console.error('updateMap error:', error); return false; }
    return true;
};

// Clean up old stale drafts
const cleanStaleDrafts = async (keepId) => {
    const db = initDb();
    if (!db) return false;
    
    let query = db.from('fmb_maps').delete().like('name', 'FMB Map %');
    if (keepId) {
        query = query.neq('id', keepId);
    }
    
    const { error } = await query;
    if (error) { console.error('cleanStaleDrafts error:', error); return false; }
    return true;
};

module.exports = { initDb, insertMap, getAllMaps, getMapById, renameMap, deleteMap, updateMap, cleanStaleDrafts };
