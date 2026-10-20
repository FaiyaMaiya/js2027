import os, shutil, sqlite3, requests, time

BASE = os.path.join("election-form", "backend")
DB = os.path.join(BASE, "voters.db")
API = "http://localhost:8000"

# 1. Backup
stamp = time.strftime("%Y%m%d_%H%M%S")
backup = os.path.join(BASE, f"voters.db.backup-{stamp}")
shutil.copy2(DB, backup)
print(f"Backup created: {backup}")

# 2. List current records
r = requests.get(f"{API}/api/getForms?page=1&perPage=100", timeout=10)
data = r.json()
print(f"Records before: {data['total']}")

# 3. Delete each record through the API (this also removes its photo file)
for rec in data.get("records", []):
    ident = rec.get("idNumber")
    d = requests.delete(f"{API}/api/deleteForm/{ident}", timeout=10)
    print(f"  DELETE {ident} -> {d.status_code} {d.json().get('message', '')}")

# 4. Verify
r = requests.get(f"{API}/api/getForms?page=1&perPage=100", timeout=10)
print(f"Records after: {r.json()['total']}")

conn = sqlite3.connect(DB)
print("Remaining rows in DB:",
      conn.execute("SELECT COUNT(*) FROM voters").fetchone()[0],
      "| users:", conn.execute("SELECT COUNT(*) FROM user").fetchone()[0])
conn.close()
