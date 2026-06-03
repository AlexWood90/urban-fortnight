import pytest
import db as db_module
import app as app_module


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test.db")
    monkeypatch.setattr(db_module, "DB_PATH", db_path)
    monkeypatch.setattr(db_module, "_db", None)
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as c:
        yield c
    if db_module._db:
        db_module._db.close()
    monkeypatch.setattr(db_module, "_db", None)


# ── Dashboard ────────────────────────────────────────────────────────────────

def test_dashboard_empty(client):
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    d = r.get_json()
    assert d["next_event"] is None
    assert d["money"]["budget"] == 0
    assert d["packing"]["total"] == 0


# ── Events / Roster ──────────────────────────────────────────────────────────

def test_create_and_list_events(client):
    r = client.post("/api/events", json={"name": "Tour 2026", "event_date": "2026-08-01"})
    assert r.status_code == 201
    ev = r.get_json()
    assert ev["name"] == "Tour 2026"

    r2 = client.get("/api/events")
    assert len(r2.get_json()) == 1


def test_delete_event(client):
    ev = client.post("/api/events", json={"name": "Test", "event_date": "2026-09-01"}).get_json()
    assert client.delete(f"/api/events/{ev['id']}").status_code == 204
    assert client.get("/api/events").get_json() == []


def test_roster_cascade_delete(client):
    ev = client.post("/api/events", json={"name": "Evt", "event_date": "2026-07-01"}).get_json()
    client.post(f"/api/events/{ev['id']}/roster", json={"name": "Alice"})
    client.delete(f"/api/events/{ev['id']}")
    # Roster should be gone
    r = client.get(f"/api/events/{ev['id']}/roster")
    assert r.get_json() == []


def test_add_and_confirm_roster_member(client):
    ev = client.post("/api/events", json={"name": "E", "event_date": "2026-07-10"}).get_json()
    m = client.post(f"/api/events/{ev['id']}/roster", json={"name": "Bob", "role": "Dev"}).get_json()
    assert m["confirmed"] == 0

    updated = client.put(f"/api/roster/{m['id']}", json={"confirmed": 1}).get_json()
    assert updated["confirmed"] == 1


# ── Money ────────────────────────────────────────────────────────────────────

def test_create_category_and_expense(client):
    cat = client.post("/api/categories", json={"name": "Food", "budget": 500}).get_json()
    assert cat["spent"] == 0.0

    exp = client.post("/api/expenses", json={
        "description": "Lunch", "amount": 12.50,
        "category_id": cat["id"], "date": "2026-06-01",
    }).get_json()
    assert exp["amount"] == 12.50
    assert exp["category_name"] == "Food"


def test_category_spent_aggregation(client):
    cat = client.post("/api/categories", json={"name": "Travel", "budget": 1000}).get_json()
    for amt in [100, 200, 50]:
        client.post("/api/expenses", json={
            "description": "x", "amount": amt,
            "category_id": cat["id"], "date": "2026-06-01",
        })
    cats = client.get("/api/categories").get_json()
    assert cats[0]["spent"] == 350.0


def test_delete_expense(client):
    cat = client.post("/api/categories", json={"name": "Misc", "budget": 100}).get_json()
    exp = client.post("/api/expenses", json={
        "description": "x", "amount": 10, "category_id": cat["id"], "date": "2026-06-01",
    }).get_json()
    assert client.delete(f"/api/expenses/{exp['id']}").status_code == 204
    assert client.get("/api/expenses").get_json() == []


# ── Fitness ──────────────────────────────────────────────────────────────────

def test_log_and_list_workouts(client):
    w = client.post("/api/workouts", json={
        "date": "2026-06-03", "type": "Run", "duration_min": 45, "notes": "Easy",
    }).get_json()
    assert w["type"] == "Run"
    assert client.get("/api/workouts").get_json()[0]["id"] == w["id"]


def test_delete_workout(client):
    w = client.post("/api/workouts", json={
        "date": "2026-06-03", "type": "Lift", "duration_min": 60,
    }).get_json()
    assert client.delete(f"/api/workouts/{w['id']}").status_code == 204
    assert client.get("/api/workouts").get_json() == []


# ── Checklist ────────────────────────────────────────────────────────────────

def test_add_toggle_delete_item(client):
    item = client.post("/api/checklist", json={"name": "Passport", "category": "Documents"}).get_json()
    assert item["packed"] == 0

    toggled = client.put(f"/api/checklist/{item['id']}", json={}).get_json()
    assert toggled["packed"] == 1

    toggled2 = client.put(f"/api/checklist/{item['id']}", json={}).get_json()
    assert toggled2["packed"] == 0

    assert client.delete(f"/api/checklist/{item['id']}").status_code == 204
    assert client.get("/api/checklist").get_json() == []


def test_clear_checklist(client):
    for name in ["Boots", "Jacket", "Water bottle"]:
        client.post("/api/checklist", json={"name": name})
    assert len(client.get("/api/checklist").get_json()) == 3
    assert client.delete("/api/checklist").status_code == 204
    assert client.get("/api/checklist").get_json() == []


def test_dashboard_reflects_data(client):
    client.post("/api/events", json={"name": "Camp", "event_date": "2027-01-01"})
    client.post("/api/categories", json={"name": "Kit", "budget": 200})
    client.post("/api/expenses", json={"description": "Boots", "amount": 80, "date": "2026-06-01"})
    client.post("/api/checklist", json={"name": "Tent"})
    client.post("/api/workouts", json={"date": "2026-06-03", "type": "Run", "duration_min": 30})

    d = client.get("/api/dashboard").get_json()
    assert d["next_event"]["name"] == "Camp"
    assert d["money"]["spent"] == 80.0
    assert d["packing"]["total"] == 1
    assert d["fitness"]["total"] == 1
