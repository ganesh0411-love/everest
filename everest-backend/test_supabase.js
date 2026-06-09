// CRUD Verification Script for Supabase Connection
// Run: node test_supabase.js
require('dotenv').config();

const { insertMap, getAllMaps, getMapById, renameMap, deleteMap } = require('./db');

const run = async () => {
    console.log('\n========================================');
    console.log('  Supabase CRUD Verification Test');
    console.log('========================================\n');

    console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL}`);
    console.log(`SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '[SET ✅]' : '[MISSING ❌]'}`);
    console.log('');

    let testId = null;

    // ── 1. INSERT ──────────────────────────────────────────────────────────
    console.log('1️⃣  INSERT: Creating test FMB map...');
    try {
        testId = await insertMap(
            'Test FMB Map - CRUD Check',
            'SRV-001',
            '1000',
            '<svg><rect width="100" height="100"/></svg>',
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        );
        if (testId) {
            console.log(`   ✅ INSERT SUCCESS — New map ID: ${testId}`);
        } else {
            console.log('   ❌ INSERT FAILED — null returned');
            process.exit(1);
        }
    } catch (e) {
        console.error('   ❌ INSERT ERROR:', e.message);
        process.exit(1);
    }

    // ── 2. GET ALL ─────────────────────────────────────────────────────────
    console.log('\n2️⃣  GET ALL: Fetching all maps...');
    try {
        const maps = await getAllMaps();
        console.log(`   ✅ GET ALL SUCCESS — ${maps.length} map(s) found`);
        const found = maps.find(m => m.id == testId);
        if (found) {
            console.log(`   ✅ Test map confirmed in list: "${found.name}"`);
        } else {
            console.log('   ⚠️  Test map not found in list');
        }
    } catch (e) {
        console.error('   ❌ GET ALL ERROR:', e.message);
    }

    // ── 3. GET BY ID ───────────────────────────────────────────────────────
    console.log('\n3️⃣  GET BY ID: Fetching map by ID...');
    try {
        const map = await getMapById(testId);
        if (map && map.id == testId) {
            console.log(`   ✅ GET BY ID SUCCESS — Name: "${map.name}", Scale: "${map.scale}"`);
        } else {
            console.log('   ❌ GET BY ID FAILED — map not found');
        }
    } catch (e) {
        console.error('   ❌ GET BY ID ERROR:', e.message);
    }

    // ── 4. RENAME ──────────────────────────────────────────────────────────
    console.log('\n4️⃣  RENAME: Updating map name...');
    try {
        const ok = await renameMap(testId, 'Renamed - CRUD Verified ✅');
        if (ok) {
            console.log('   ✅ RENAME SUCCESS');
            const map = await getMapById(testId);
            console.log(`   ✅ Confirmed new name: "${map.name}"`);
        } else {
            console.log('   ❌ RENAME FAILED');
        }
    } catch (e) {
        console.error('   ❌ RENAME ERROR:', e.message);
    }

    // ── 5. DELETE ──────────────────────────────────────────────────────────
    console.log('\n5️⃣  DELETE: Removing test map...');
    try {
        const ok = await deleteMap(testId);
        if (ok) {
            console.log('   ✅ DELETE SUCCESS');
            const map = await getMapById(testId);
            if (!map) {
                console.log('   ✅ Confirmed: map no longer exists in database');
            } else {
                console.log('   ⚠️  Map still exists after delete — check RLS policies');
            }
        } else {
            console.log('   ❌ DELETE FAILED');
        }
    } catch (e) {
        console.error('   ❌ DELETE ERROR:', e.message);
    }

    console.log('\n========================================');
    console.log('  CRUD Verification Complete ✅');
    console.log('========================================\n');
    process.exit(0);
};

run().catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});
