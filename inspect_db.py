import os, sqlite3

BASE = os.path.join("election-form", "backend")
for rel in ("voters.db", os.path.join("instance", "voters.db")):
    path = os.path.join(BASE, rel)
    if not os.path.exists(path):
        print(f"{rel}: MISSING")
        continue
    conn = sqlite3.connect(path)
    try:
        total = conn.execute("SELECT COUNT(*) FROM voters").fetchone()[0]
        seeds = conn.execute("SELECT COUNT(*) FROM voters WHERE id LIKE 'seed-%'").fetchone()[0]
        others = conn.execute(
            "SELECT id, idNumber, name, surname FROM voters WHERE id NOT LIKE 'seed-%' LIMIT 20"
        ).fetchall()
        tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        print(f"{rel}: total={total} seed={seeds} non-seed={len(others)} tables={tables}")
        for o in others:
            print(f"    {o}")
    except Exception as e:
        print(f"{rel}: ERROR {e}")
    finally:
        conn.close()
