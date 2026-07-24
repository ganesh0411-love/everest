import os
import time
import json
import sqlite3
import random
import requests
import argparse
import urllib.parse
from pathlib import Path

API_BASE = 'http://localhost:5000'
MAX_RETRIES = 3

def setup_db(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS villages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            district TEXT,
            taluk TEXT,
            village TEXT,
            status TEXT DEFAULT 'PENDING',
            UNIQUE(district, taluk, village)
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS surveys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            village_id INTEGER,
            survey_no TEXT,
            geojson TEXT,
            UNIQUE(village_id, survey_no),
            FOREIGN KEY(village_id) REFERENCES villages(id)
        )
    ''')
    conn.commit()
    return conn

def fetch_json(url, retries=MAX_RETRIES):
    for attempt in range(retries):
        try:
            # Polite rate limiting
            time.sleep(random.uniform(1.0, 2.5))
            response = requests.get(url, timeout=120)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"  [!] Error fetching {url}: {e}. Retrying {attempt + 1}/{retries}...")
            time.sleep(2 ** attempt)  # Exponential backoff
    print(f"  [X] Failed to fetch {url} after {retries} attempts.")
    return None

def sync_districts(dry_run_district=None):
    print("[*] Fetching Districts...")
    url = f"{API_BASE}/api/tngis/districts"
    data = fetch_json(url)
    if not data or 'data' not in data:
        return []
    
    districts = data['data']
    if dry_run_district:
        districts = [d for d in districts if d.lower() == dry_run_district.lower()]
    return districts

def sync_taluks(district):
    print(f"[*] Fetching Taluks for {district}...")
    url = f"{API_BASE}/api/tngis/taluks?district={urllib.parse.quote(district)}"
    data = fetch_json(url)
    return data.get('data', []) if data else []

def sync_villages(district, taluk):
    print(f"[*] Fetching Villages for {taluk}, {district}...")
    url = f"{API_BASE}/api/tngis/villages?district={urllib.parse.quote(district)}&taluk={urllib.parse.quote(taluk)}"
    data = fetch_json(url)
    return data.get('data', []) if data else []

def sync_surveys(district, taluk, village):
    url = f"{API_BASE}/api/tngis/survey?district={urllib.parse.quote(district)}&taluk={urllib.parse.quote(taluk)}&village={urllib.parse.quote(village)}"
    data = fetch_json(url)
    return data.get('data', []) if data else []

def fetch_survey_feature(district, taluk, village, survey):
    url = f"{API_BASE}/api/tngis/feature?district={urllib.parse.quote(district)}&taluk={urllib.parse.quote(taluk)}&village={urllib.parse.quote(village)}&survey={urllib.parse.quote(survey)}"
    data = fetch_json(url)
    return data

def main():
    parser = argparse.ArgumentParser(description="GIS Data Batch Fetcher")
    parser.add_argument('--dry-run-district', type=str, help="Specify a single district to fetch (Dry Run Mode)")
    parser.add_argument('--taluk', type=str, help="Specify a single taluk")
    parser.add_argument('--village', type=str, help="Specify a single village")
    parser.add_argument('--full-state-run', action='store_true', help="Fetch all districts across Tamil Nadu")
    args = parser.parse_args()

    if not args.full_state_run and not args.dry_run_district:
        print("Please specify either --dry-run-district <NAME> or --full-state-run")
        return

    # Setup directories and DB
    Path("../everest-backend/data").mkdir(exist_ok=True)
    db_path = "../everest-backend/data/completed_villages.db"
    conn = setup_db(db_path)
    c = conn.cursor()

    districts = sync_districts(args.dry_run_district)
    print(f"[*] Found {len(districts)} district(s) to process.")

    # Populate hierarchy into DB first
    for district in districts:
        taluks = sync_taluks(district)
        if args.taluk:
            taluks = [t for t in taluks if t.lower() == args.taluk.lower()]
        for taluk in taluks:
            villages = sync_villages(district, taluk)
            if args.village:
                villages = [v for v in villages if v.lower() == args.village.lower()]
            for village in villages:
                c.execute('''
                    INSERT OR IGNORE INTO villages (district, taluk, village, status)
                    VALUES (?, ?, ?, 'PENDING')
                ''', (district, taluk, village))
    conn.commit()

    # Process PENDING villages
    c.execute("SELECT id, district, taluk, village FROM villages WHERE status = 'PENDING'")
    pending_villages = c.fetchall()
    
    print(f"[*] Found {len(pending_villages)} pending villages to process.")

    for v_id, district, taluk, village in pending_villages:
        print(f"  -> Processing Village: {village} ({taluk}, {district})")
        surveys = sync_surveys(district, taluk, village)
        
        if not surveys:
            print(f"     [!] No surveys found for {village}. Marking as DONE.")
            c.execute("UPDATE villages SET status = 'DONE' WHERE id = ?", (v_id,))
            conn.commit()
            continue

        success = True
        for survey in surveys:
            # Check if survey already exists (in case of partial village completion)
            c.execute("SELECT id FROM surveys WHERE village_id = ? AND survey_no = ?", (v_id, survey))
            if c.fetchone():
                continue

            print(f"     -> Fetching Survey {survey}...")
            feature_data = fetch_survey_feature(district, taluk, village, survey)
            
            if feature_data:
                # Store in SQLite
                c.execute('''
                    INSERT INTO surveys (village_id, survey_no, geojson)
                    VALUES (?, ?, ?)
                ''', (v_id, survey, json.dumps(feature_data)))
                
                # Optionally write to GeoJSON file structure
                dir_path = Path(f"../everest-backend/data/geojson/{district}/{taluk}/{village}")
                dir_path.mkdir(parents=True, exist_ok=True)
                with open(dir_path / f"{survey}.geojson", "w") as f:
                    json.dump(feature_data, f)
            else:
                success = False
                break
        
        if success:
            c.execute("UPDATE villages SET status = 'DONE' WHERE id = ?", (v_id,))
            conn.commit()
            print(f"  [OK] Completed Village: {village}")
        else:
            conn.commit()
            print(f"  [!] Pausing on Village: {village} due to errors. Can resume later.")
            break

if __name__ == "__main__":
    main()
