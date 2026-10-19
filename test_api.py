import requests, json, sys, time

API_BASE = "http://localhost:8000"

def safe_json(r, label=""):
    """Safely parse JSON response with fallback"""
    try:
        return r.json()
    except Exception as e:
        print(f"  [!] {label}: JSON parse error ({e}), status={r.status_code}, text={r.text[:200]}")
        return None

def check(label, condition, detail=""):
    """Print pass/fail check"""
    status = "[PASS]" if condition else "[FAIL]"
    print(f"  {status} {label} {detail}")

# ═══════════════════════════════════════════════════════════════════
print("=" * 60)
print("  PHASE 3 — TESTING & VERIFICATION")
print("=" * 60)

# ─── Check backend connectivity ───────────────────────────────────
print("\n=== Backend Connectivity ===")
try:
    r = requests.get(f"{API_BASE}/api/getForms?page=1&perPage=5", timeout=5)
    check("Backend reachable", r.status_code == 200, f"(Status: {r.status_code})")
except Exception as e:
    print(f"  [FAIL] Backend not reachable: {e}")
    print("\nStart the backend first: cd election-form/backend && venv\\Scripts\\python.exe server.py")
    sys.exit(1)

# ─── Test 1: Save form ───────────────────────────────────────────
print("\n=== Test 1: Save form with photo ===")
payload = {
    "name": "Test User",
    "surname": "Smith",
    "idNumber": "TEST001",
    "district": "Port Moresby",
    "contact": "+6757000001",
    "dob": "1990-01-15",
    "sex": "Male",
    "residence": "Section 1, East Road",
    "village": "Koki",
    "llg": "LLG 2",
    "photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}
r = requests.post(f"{API_BASE}/api/saveForm", json=payload)
data = safe_json(r, "saveForm")
if data:
    check("Save response OK", r.status_code == 200)
    check("Has success message", "success" in data.get("message", "").lower())
    saved_id = data.get("id", "")
    print(f"  Saved record ID: {saved_id}")
else:
    saved_id = ""
    check("Save endpoint works", False)

# ─── Test 2: Verify photo in records (paginated response) ──────
print("\n=== Test 2: Verify photo in records ===")
r = requests.get(f"{API_BASE}/api/getForms?search=TEST001&page=1&perPage=20")
data = safe_json(r, "getForms search")
if data:
    check("Response is dict", isinstance(data, dict))
    records = data.get("records", [])
    check("Has records key", "records" in data)
    check("Has total key", "total" in data)
    check("Has totalPages key", "totalPages" in data)

    test_record = None
    for rec in records:
        if rec.get("idNumber") == "TEST001":
            test_record = rec
            break

    if test_record:
        print(f"  Found record: {test_record.get('name', '?')} ({test_record.get('idNumber', '?')})")
        check("Has name field", bool(test_record.get("name")))
        check("Has surname field", bool(test_record.get("surname")))
        check("Has idNumber field", bool(test_record.get("idNumber")))
        check("Has photo_filename field", "photo_filename" in test_record)
        check("Has photo_url field", "photo_url" in test_record)
        if test_record.get("photo_url"):
            print(f"  Photo URL: {test_record['photo_url']}")
        record_id_for_update = test_record.get("id") or test_record.get("idNumber")
    else:
        print("  [!] Test record not found in search results - checking all records...")
        # If search didn't find it, try looking at all records
        r2 = requests.get(f"{API_BASE}/api/getForms?page=1&perPage=100")
        data2 = safe_json(r2, "getForms all")
        if data2:
            records2 = data2.get("records", [])
            for rec in records2:
                if rec.get("idNumber") == "TEST001":
                    test_record = rec
                    break
        if test_record:
            print(f"  Found record in full list: {test_record.get('name', '?')} ({test_record.get('idNumber', '?')})")
            record_id_for_update = test_record.get("id") or test_record.get("idNumber")
        else:
            print("  [FAIL] Test record not found anywhere!")
            record_id_for_update = "TEST001"
else:
    records = []
    record_id_for_update = "TEST001"

# ─── Test 3: Update record ──────────────────────────────────────
print("\n=== Test 3: Update record ===")
update_payload = {
    "name": "Updated User",
    "surname": "Johnson",
    "contact": "+6757000999"
}
print(f"  Updating ID: {record_id_for_update}")
r = requests.put(f"{API_BASE}/api/updateForm/{record_id_for_update}", json=update_payload)
data = safe_json(r, "updateForm")
if data:
    check("Update response OK", r.status_code == 200)
    check("Has success message", "success" in data.get("message", "").lower())
    if "record" in data:
        updated_rec = data["record"]
        check("Name updated", updated_rec.get("name") == "Updated User")
        check("Surname updated", updated_rec.get("surname") == "Johnson")
    print(f"  Response: {json.dumps(data, indent=2)[:300]}")
else:
    check("Update endpoint works", False)

    # Try with plain string id
    print("  Retrying with idNumber directly...")
    r2 = requests.put(f"{API_BASE}/api/updateForm/TEST001", json=update_payload)
    data2 = safe_json(r2, "updateForm retry")
    if data2:
        check("Update with idNumber works", r2.status_code == 200)

# ─── Test 4: Verify update persisted ───────────────────────────
print("\n=== Test 4: Verify update persisted ===")
r = requests.get(f"{API_BASE}/api/getForms?search=TEST001&page=1&perPage=20")
data = safe_json(r, "verify update")
if data:
    records = data.get("records", [])
    test_record = next((rec for rec in records if rec.get("idNumber") == "TEST001"), None)
    if test_record:
        check("Name is 'Updated User'", test_record.get("name") == "Updated User")
        check("Surname is 'Johnson'", test_record.get("surname") == "Johnson")
        check("Photo URL preserved", bool(test_record.get("photo_url")))
        print(f"  Current name: {test_record.get('name')} {test_record.get('surname')}")
    else:
        check("Record found after update", False)

# ─── Test 5: Delete record ──────────────────────────────────────
print("\n=== Test 5: Delete record ===")
r = requests.delete(f"{API_BASE}/api/deleteForm/TEST001")
data = safe_json(r, "deleteForm")
if data:
    check("Delete response OK", r.status_code == 200)
    check("Has success message", "success" in data.get("message", "").lower())
else:
    check("Delete endpoint works", False)

# ─── Test 6: Verify deletion ────────────────────────────────────
print("\n=== Test 6: Verify deletion ===")
r = requests.get(f"{API_BASE}/api/getForms?search=TEST001&page=1&perPage=20")
data = safe_json(r, "verify deletion")
if data:
    records = data.get("records", [])
    test_record = next((rec for rec in records if rec.get("idNumber") == "TEST001"), None)
    check("Record deleted", test_record is None)
    print(f"  Matching records found: {len(records)}")

# ─── Test 7: Pagination ─────────────────────────────────────────
print("\n=== Test 7: Pagination ===")
r = requests.get(f"{API_BASE}/api/getForms?page=1&perPage=10")
data = safe_json(r, "pagination page 1")
if data:
    records_page1 = data.get("records", [])
    total = data.get("total", 0)
    total_pages = data.get("totalPages", 0)
    print(f"  Page 1: {len(records_page1)} records, Total: {total}, Pages: {total_pages}")
    check("Page 1 has records", len(records_page1) > 0)
    check("Total > 0", total > 0)
    check("TotalPages > 0", total_pages > 0)

if total_pages > 1:
    r = requests.get(f"{API_BASE}/api/getForms?page=2&perPage=10")
    data = safe_json(r, "pagination page 2")
    if data:
        records_page2 = data.get("records", [])
        print(f"  Page 2: {len(records_page2)} records")
        check("Page 2 has records", len(records_page2) > 0)
        # Check that page 1 IDs != page 2 IDs (different records)
        ids_p1 = {r.get("id") for r in records_page1}
        ids_p2 = {r.get("id") for r in records_page2}
        check("Pages have different records", ids_p1.isdisjoint(ids_p2))

# ─── Test 8: Search functionality ───────────────────────────────
print("\n=== Test 8: Search ===")
for search_query in ["John", "Port Moresby", "Soso", "V1005"]:
    r = requests.get(f"{API_BASE}/api/getForms?search={search_query}&page=1&perPage=20")
    data = safe_json(r, f"search '{search_query}'")
    if data:
        results_count = data.get("total", 0)
        records_count = len(data.get("records", []))
        print(f"  Search '{search_query}': {results_count} total, showing {records_count}")
        check(f"Search '{search_query}' finds results", results_count > 0)

# Search for something that should NOT exist
r = requests.get(f"{API_BASE}/api/getForms?search=ZZZZNOTEXIST&page=1&perPage=20")
data = safe_json(r, "search non-existent")
if data:
    check("Search non-existent returns 0 results", data.get("total", -1) == 0)

# ─── Test 9: Get single record ──────────────────────────────────
print("\n=== Test 9: Get single record ===")
r = requests.get(f"{API_BASE}/api/getForm/seed-1")
data = safe_json(r, "getForm seed-1")
if data:
    check("Single record found", r.status_code == 200)
    print(f"  Record: {data.get('name', '?')} {data.get('surname', '?')} (ID: {data.get('idNumber', '?')})")
    check("Has photo_filename field", "photo_filename" in data)
    if data.get("photo_filename"):
        check("Has photo_url", "photo_url" in data)
    else:
        print("  (no photo — seed data has no photos, expected)")

# Test non-existent
r = requests.get(f"{API_BASE}/api/getForm/NONEXISTENT999")
check("Non-existent returns 404", r.status_code == 404)

# ─── Test 10: Error handling ────────────────────────────────────
print("\n=== Test 10: Error handling ===")
# Update non-existent
r = requests.put(f"{API_BASE}/api/updateForm/NONEXISTENT999", json={"name": "Test"})
data = safe_json(r, "update non-existent")
if data:
    check("Update non-existent returns 404", r.status_code == 404)
    print(f"  Response: {data.get('message', '?')}")

# Delete non-existent
r = requests.delete(f"{API_BASE}/api/deleteForm/NONEXISTENT999")
data = safe_json(r, "delete non-existent")
if data:
    check("Delete non-existent returns 404", r.status_code == 404)
    print(f"  Response: {data.get('message', '?')}")

# ─── Test 11: Pagination edge cases ─────────────────────────────
print("\n=== Test 11: Pagination edge cases ===")
# Page beyond total
r = requests.get(f"{API_BASE}/api/getForms?page=99999&perPage=20")
data = safe_json(r, "page beyond limit")
if data:
    records = data.get("records", [])
    check("Page beyond limit returns empty records", len(records) == 0)
    check("Page beyond limit has correct total", data.get("total", 0) > 0)

# Invalid perPage
r = requests.get(f"{API_BASE}/api/getForms?page=1&perPage=999")
data = safe_json(r, "large perPage")
if data:
    records = data.get("records", [])
    # Should be clamped to 100
    print(f"  Requested perPage=999, got {len(records)} records")

# ─── Test 12: Performance (timing) ──────────────────────────────
print("\n=== Test 12: Performance ===")
start = time.time()
r = requests.get(f"{API_BASE}/api/getForms?page=1&perPage=100")
elapsed = time.time() - start
data = safe_json(r, "performance")
if data:
    print(f"  Get 100 records: {elapsed:.3f}s")
    check("Response under 1s", elapsed < 1.0)

# ─── Summary ────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("  PHASE 3 TESTS COMPLETED")
print("=" * 60)

