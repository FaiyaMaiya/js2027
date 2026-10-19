"""
Bulk data generator — inserts 50,000 records into the voters database.
Run this with the backend stopped (or while running, but uses a separate DB connection).

Usage:
    cd election-form/backend
    ..\..\venv\Scripts\python.exe ..\..\bulk_generate_50k.py

Or from project root:
    .\election-form\backend\venv\Scripts\python.exe bulk_generate_50k.py
"""

import os
import sys
import sqlite3
import time
import random

# Paths relative to this script's location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "election-form", "backend", "voters.db")
if not os.path.exists(DB_PATH):
    # Try alternate path (running from backend dir)
    DB_PATH = os.path.join(SCRIPT_DIR, "voters.db")

print(f"Database path: {DB_PATH}")
print(f"Database exists: {os.path.exists(DB_PATH)}")

# ─── Sample data pools ──────────────────────────────────────────
FIRST_NAMES = [
    "John", "Mary", "Peter", "Rose", "Daniel", "Grace", "Michael", "Rachael", "Simon", "Nancy",
    "Thomas", "Lydia", "James", "Martha", "Robert", "Sarah", "David", "Esther", "Joseph", "Hannah",
    "Paul", "Rebecca", "Andrew", "Cynthia", "Philip", "Joyce", "Kevin", "Diana", "Charles", "Patricia",
    "Matthew", "Helen", "Samuel", "Lucy", "Benjamin", "Anna", "George", "Miriam", "Isaac", "Naomi",
    "Vincent", "Monica", "Alfred", "Elena", "Bernard", "Catherine", "Dennis", "Florence", "Edward", "Gloria",
    "Frank", "Isabel", "Gregory", "Janet", "Henry", "Karen", "Ian", "Laura", "Jack", "Margaret"
]
SURNAMES = [
    "Soso", "Toka", "Arua", "Mane", "Kila", "Peni", "Kapi", "Wari", "Moro", "Bai",
    "Naru", "Gima", "Gure", "Dau", "Yapu", "Leka", "Malu", "Buna", "Hela", "Iapo",
    "Kumai", "Nebil", "Taro", "Wuram", "Buka", "Mondo", "Kari", "Pulu", "Sari", "Tome"
]
DISTRICTS = ["Port Moresby", "Lae", "Madang", "Goroka", "Mount Hagen", "Wabag", "Rabaul", "Mendi",
             "Kavieng", "Kimbe", "Alotau", "Daru", "Vanimo", "Kundiawa", "Wewak", "Lorengau"]
RESIDENCES = [
    "Section 1, East Road", "Block 4, Main Street", "Near Market", "Along River Road",
    "At the Junction", "Upper Village", "Lower Village", "Near Clinic", "Behind School",
    "Church Compound", "Hilltop Area", "Coastal Strip", "Town Center", "Airport Road",
    "Hospital Zone", "Market Square", "Police Station Area", "Community Hall"
]
VILLAGES = ["Koki", "Eriku", "Wampar", "Kondiu", "Simbu", "Kundiawa", "Aitape", "Dreikikir",
            "Lufa", "Kainantu", "Bialla", "Namatanai", "Esperance", "Kiunga", "Tabubil", "Okapa"]

LLGS = [f"LLG {i}" for i in range(1, 21)]
WDS = [f"WD {i}" for i in range(1, 21)]
POLLING_PLACES = [f"Polling Place {i}" for i in range(1, 21)]

# ─── Generate records in batches ─────────────────────────────────
def generate_batch(start_idx, batch_size):
    """Generate a batch of voter records"""
    records = []
    for offset in range(batch_size):
        idx = start_idx + offset
        first_name = random.choice(FIRST_NAMES)
        surname = random.choice(SURNAMES)
        district = random.choice(DISTRICTS)
        residence = random.choice(RESIDENCES)
        village = random.choice(VILLAGES)
        llg = random.choice(LLGS)
        wd = random.choice(WDS)
        is_male = random.choice([True, False])
        year = random.randint(1960, 2005)
        month = random.randint(1, 12)
        day = random.randint(1, 28)

        records.append((
            f"bulk-{idx}",                          # id
            f"B{100000 + idx}",                      # idNumber
            first_name,                              # name
            surname,                                 # surname
            f"{year}-{month:02d}-{day:02d}",         # dob
            "Male" if is_male else "Female",         # sex
            f"+675{7000000 + (idx % 1000000)}",      # contact
            residence,                               # residence
            village,                                 # village
            wd,                                      # wd
            llg,                                     # llg
            district,                                # district
            random.choice(["Single", "Married", "Divorced"]),  # maritalStatus
            f"{random.choice(['Mary', 'Jane', 'Ann'])} {surname}" if is_male else f"{random.choice(['John', 'Peter', 'Tom'])} {surname}",  # spouseName
            "Female" if is_male else "Male",         # spouseSex
            str(random.randint(0, 10)),              # siblings
            village,                                 # spouseVillage
            district,                                # spouseDistrict
            llg,                                     # spouseLLG
            f"+675{8000000 + (idx % 1000000)}",      # spouseContact
            random.choice(POLLING_PLACES),            # pollingPlace
            str(random.randint(100, 500)),            # ballotPapers
            str(random.randint(50, 200)),             # capacityVotes1
            str(random.randint(50, 200)),             # capacityVotes2
            str(random.randint(50, 150)),             # expectedVotes1
            str(random.randint(50, 150)),             # expectedVotes2
            str(random.randint(40, 120)),             # estimatedVotes1
            str(random.randint(40, 120)),             # estimatedVotes2
            f"Officer {random.randint(1, 20)}",       # verifiedBy
            f"Community Leader {random.randint(1, 20)}",  # referredBy
            wd,                                      # officialWd
            village,                                 # officialVillage
            llg,                                     # officialLLG
            district,                                # officialDistrict
            f"{first_name} {surname}",               # signed
            f"Witness {random.randint(1, 20)}",       # witness
            "2026-07-28",                            # declarationDate
            None,                                    # photo_filename
        ))
    return records

# ─── Main insertion logic ────────────────────────────────────────
def insert_bulk(total_records=50000, batch_size=1000):
    """Insert total_records into the database in batches"""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")  # Faster for bulk insert
    conn.execute("PRAGMA cache_size=-80000")  # ~80MB cache
    cursor = conn.cursor()

    # Ensure table exists
    cursor.execute("""
        SELECT name FROM sqlite_master WHERE type='table' AND name='voters'
    """)
    if not cursor.fetchone():
        print("[FAIL] Table 'voters' does not exist. Start the backend once to create the schema.")
        conn.close()
        return False

    # Get current count
    cursor.execute("SELECT COUNT(*) FROM voters")
    before = cursor.fetchone()[0]
    print(f"Records before: {before}")

    # Decide how many to actually insert (skip if already >= total_records)
    if before >= total_records:
        print(f"[OK] Database already has {before} records (>= {total_records}). No insertion needed.")
        conn.close()
        return True

    to_insert = total_records - before
    batches = (to_insert + batch_size - 1) // batch_size
    start_idx = before + 1

    print(f"Need to insert: {to_insert} records in {batches} batches of {batch_size}")
    print("Starting bulk insertion...")

    overall_start = time.time()
    for batch_num in range(batches):
        batch_start = time.time()
        current_batch_size = min(batch_size, to_insert - (batch_num * batch_size))
        batch_idx_start = start_idx + (batch_num * batch_size)

        records = generate_batch(batch_idx_start, current_batch_size)

        cursor.executemany("""
            INSERT OR IGNORE INTO voters (
                id, idNumber, name, surname, dob, sex, contact,
                residence, village, wd, llg, district,
                maritalStatus, spouseName, spouseSex, siblings,
                spouseVillage, spouseDistrict, spouseLLG, spouseContact,
                pollingPlace, ballotPapers,
                capacityVotes1, capacityVotes2,
                expectedVotes1, expectedVotes2,
                estimatedVotes1, estimatedVotes2,
                verifiedBy, referredBy,
                officialWd, officialVillage, officialLLG, officialDistrict,
                signed, witness, declarationDate, photo_filename
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, records)

        conn.commit()
        elapsed = time.time() - batch_start
        rate = current_batch_size / elapsed if elapsed > 0 else 0

        pct = min(100, (batch_num + 1) * 100 // batches)
        print(f"  Batch {batch_num + 1}/{batches} ({pct}%): {current_batch_size} records in {elapsed:.2f}s ({rate:.0f} rec/s)")

    overall_elapsed = time.time() - overall_start

    # Verify count
    cursor.execute("SELECT COUNT(*) FROM voters")
    after = cursor.fetchone()[0]
    conn.close()

    print(f"\n[OK] Insertion complete!")
    print(f"  Records before: {before}")
    print(f"  Records after:  {after}")
    print(f"  Added:          {after - before}")
    print(f"  Total time:     {overall_elapsed:.2f}s")
    print(f"  Avg rate:       {(after - before) / overall_elapsed:.0f} records/sec")
    return True

if __name__ == "__main__":
    # Check if we should run full 50k or smaller test
    import argparse
    parser = argparse.ArgumentParser(description="Generate bulk voter records")
    parser.add_argument("--count", type=int, default=50000, help="Number of records to generate (default: 50000)")
    parser.add_argument("--test", action="store_true", help="Run a quick test with 1000 records")
    args = parser.parse_args()

    if not os.path.exists(DB_PATH):
        print(f"[FAIL] Database not found at: {DB_PATH}")
        print("Start the backend server once to create the database, then run this script.")
        sys.exit(1)

    record_count = 1000 if args.test else args.count
    print(f"Generating {record_count:,} voter records...")
    print("=" * 60)
    success = insert_bulk(total_records=record_count)
    if success:
        print("=" * 60)
        print("  Ready for performance testing!")
        print("=" * 60)
