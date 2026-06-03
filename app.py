from datetime import date, timedelta

from flask import Flask, jsonify, render_template, request

from db import get_db, now_iso, rows_as_dicts

app = Flask(__name__)


# ── Index ──────────────────────────────────────────────────────────────────────

@app.get("/")
def index():
    return render_template("index.html")


# ── Dashboard ─────────────────────────────────────────────────────────────────

@app.get("/api/dashboard")
def dashboard():
    db = get_db()
    today = date.today().isoformat()

    next_event = db.execute(
        "SELECT * FROM events WHERE event_date >= ? ORDER BY event_date ASC LIMIT 1",
        (today,),
    ).fetchone()

    total_budget = db.execute(
        "SELECT COALESCE(SUM(budget), 0) as s FROM budget_categories"
    ).fetchone()["s"]
    total_spent = db.execute(
        "SELECT COALESCE(SUM(amount), 0) as s FROM expenses"
    ).fetchone()["s"]

    week_start = (date.today() - timedelta(days=date.today().weekday())).isoformat()
    workouts_this_week = db.execute(
        "SELECT COUNT(*) as c FROM workouts WHERE date >= ?", (week_start,)
    ).fetchone()["c"]
    total_workouts = db.execute("SELECT COUNT(*) as c FROM workouts").fetchone()["c"]

    total_items = db.execute("SELECT COUNT(*) as c FROM checklist_items").fetchone()["c"]
    packed_items = db.execute(
        "SELECT COUNT(*) as c FROM checklist_items WHERE packed = 1"
    ).fetchone()["c"]

    return jsonify({
        "next_event": dict(next_event) if next_event else None,
        "money": {"budget": total_budget, "spent": total_spent},
        "fitness": {"this_week": workouts_this_week, "total": total_workouts},
        "packing": {"total": total_items, "packed": packed_items},
    })


# ── Events / Roster ───────────────────────────────────────────────────────────

@app.get("/api/events")
def list_events():
    db = get_db()
    events = rows_as_dicts(
        db.execute("SELECT * FROM events ORDER BY event_date ASC").fetchall()
    )
    for ev in events:
        counts = db.execute(
            "SELECT COUNT(*) as total, COALESCE(SUM(confirmed), 0) as confirmed "
            "FROM roster_members WHERE event_id = ?",
            (ev["id"],),
        ).fetchone()
        ev["roster_total"] = counts["total"]
        ev["roster_confirmed"] = counts["confirmed"]
    return jsonify(events)


@app.post("/api/events")
def create_event():
    data = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO events (name, event_date, description, created_at) VALUES (?, ?, ?, ?)",
        (data["name"], data["event_date"], data.get("description", ""), now_iso()),
    )
    db.commit()
    row = db.execute("SELECT * FROM events WHERE id = ?", (cur.lastrowid,)).fetchone()
    result = dict(row)
    result["roster_total"] = 0
    result["roster_confirmed"] = 0
    return jsonify(result), 201


@app.delete("/api/events/<int:event_id>")
def delete_event(event_id):
    db = get_db()
    db.execute("DELETE FROM events WHERE id = ?", (event_id,))
    db.commit()
    return "", 204


@app.get("/api/events/<int:event_id>/roster")
def get_roster(event_id):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM roster_members WHERE event_id = ? ORDER BY id ASC", (event_id,)
    ).fetchall()
    return jsonify(rows_as_dicts(rows))


@app.post("/api/events/<int:event_id>/roster")
def add_roster_member(event_id):
    data = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO roster_members (event_id, name, role, confirmed) VALUES (?, ?, ?, ?)",
        (event_id, data["name"], data.get("role", ""), int(data.get("confirmed", 0))),
    )
    db.commit()
    row = db.execute("SELECT * FROM roster_members WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(row)), 201


@app.put("/api/roster/<int:member_id>")
def update_roster_member(member_id):
    data = request.json
    db = get_db()
    db.execute(
        "UPDATE roster_members SET confirmed = ? WHERE id = ?",
        (int(data["confirmed"]), member_id),
    )
    db.commit()
    row = db.execute("SELECT * FROM roster_members WHERE id = ?", (member_id,)).fetchone()
    return jsonify(dict(row))


@app.delete("/api/roster/<int:member_id>")
def delete_roster_member(member_id):
    db = get_db()
    db.execute("DELETE FROM roster_members WHERE id = ?", (member_id,))
    db.commit()
    return "", 204


# ── Money ─────────────────────────────────────────────────────────────────────

@app.get("/api/categories")
def list_categories():
    db = get_db()
    cats = rows_as_dicts(
        db.execute("SELECT * FROM budget_categories ORDER BY id ASC").fetchall()
    )
    for c in cats:
        spent = db.execute(
            "SELECT COALESCE(SUM(amount), 0) as s FROM expenses WHERE category_id = ?",
            (c["id"],),
        ).fetchone()["s"]
        c["spent"] = spent
    return jsonify(cats)


@app.post("/api/categories")
def create_category():
    data = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO budget_categories (name, budget) VALUES (?, ?)",
        (data["name"], float(data.get("budget", 0))),
    )
    db.commit()
    row = dict(db.execute("SELECT * FROM budget_categories WHERE id = ?", (cur.lastrowid,)).fetchone())
    row["spent"] = 0.0
    return jsonify(row), 201


@app.delete("/api/categories/<int:cat_id>")
def delete_category(cat_id):
    db = get_db()
    db.execute("DELETE FROM budget_categories WHERE id = ?", (cat_id,))
    db.commit()
    return "", 204


@app.get("/api/expenses")
def list_expenses():
    db = get_db()
    rows = db.execute("""
        SELECT e.*, COALESCE(c.name, 'Uncategorized') as category_name
        FROM expenses e
        LEFT JOIN budget_categories c ON e.category_id = c.id
        ORDER BY e.date DESC, e.id DESC
    """).fetchall()
    return jsonify(rows_as_dicts(rows))


@app.post("/api/expenses")
def create_expense():
    data = request.json
    db = get_db()
    cat_id = data.get("category_id")
    cur = db.execute(
        "INSERT INTO expenses (category_id, description, amount, date, created_at) VALUES (?, ?, ?, ?, ?)",
        (int(cat_id) if cat_id else None, data["description"], float(data["amount"]), data["date"], now_iso()),
    )
    db.commit()
    row = db.execute("""
        SELECT e.*, COALESCE(c.name, 'Uncategorized') as category_name
        FROM expenses e LEFT JOIN budget_categories c ON e.category_id = c.id
        WHERE e.id = ?
    """, (cur.lastrowid,)).fetchone()
    return jsonify(dict(row)), 201


@app.delete("/api/expenses/<int:exp_id>")
def delete_expense(exp_id):
    db = get_db()
    db.execute("DELETE FROM expenses WHERE id = ?", (exp_id,))
    db.commit()
    return "", 204


# ── Fitness ───────────────────────────────────────────────────────────────────

@app.get("/api/workouts")
def list_workouts():
    db = get_db()
    rows = db.execute("SELECT * FROM workouts ORDER BY date DESC, id DESC").fetchall()
    return jsonify(rows_as_dicts(rows))


@app.post("/api/workouts")
def create_workout():
    data = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO workouts (date, type, duration_min, notes, created_at) VALUES (?, ?, ?, ?, ?)",
        (data["date"], data["type"], int(data.get("duration_min", 0)), data.get("notes", ""), now_iso()),
    )
    db.commit()
    row = db.execute("SELECT * FROM workouts WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(row)), 201


@app.delete("/api/workouts/<int:workout_id>")
def delete_workout(workout_id):
    db = get_db()
    db.execute("DELETE FROM workouts WHERE id = ?", (workout_id,))
    db.commit()
    return "", 204


# ── Checklist ─────────────────────────────────────────────────────────────────

@app.get("/api/checklist")
def list_checklist():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM checklist_items ORDER BY category ASC, id ASC"
    ).fetchall()
    return jsonify(rows_as_dicts(rows))


@app.post("/api/checklist")
def create_checklist_item():
    data = request.json
    db = get_db()
    cur = db.execute(
        "INSERT INTO checklist_items (category, name, packed, created_at) VALUES (?, ?, 0, ?)",
        (data.get("category", "General"), data["name"], now_iso()),
    )
    db.commit()
    row = db.execute("SELECT * FROM checklist_items WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(row)), 201


@app.put("/api/checklist/<int:item_id>")
def toggle_checklist_item(item_id):
    db = get_db()
    row = db.execute("SELECT packed FROM checklist_items WHERE id = ?", (item_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Not found"}), 404
    db.execute(
        "UPDATE checklist_items SET packed = ? WHERE id = ?",
        (1 - row["packed"], item_id),
    )
    db.commit()
    updated = db.execute("SELECT * FROM checklist_items WHERE id = ?", (item_id,)).fetchone()
    return jsonify(dict(updated))


@app.delete("/api/checklist/<int:item_id>")
def delete_checklist_item(item_id):
    db = get_db()
    db.execute("DELETE FROM checklist_items WHERE id = ?", (item_id,))
    db.commit()
    return "", 204


@app.delete("/api/checklist")
def clear_checklist():
    db = get_db()
    db.execute("DELETE FROM checklist_items")
    db.commit()
    return "", 204


if __name__ == "__main__":
    app.run(debug=True, port=5000)
