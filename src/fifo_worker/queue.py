import json
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any

from .models import Job, JobStatus

_SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type    TEXT    NOT NULL,
    payload     TEXT    NOT NULL DEFAULT '{}',
    status      TEXT    NOT NULL DEFAULT 'pending',
    created_at  TEXT    NOT NULL,
    started_at  TEXT,
    finished_at TEXT,
    error       TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs (status, created_at);
"""


def _row_to_job(row: sqlite3.Row) -> Job:
    def _dt(v: str | None) -> datetime | None:
        return datetime.fromisoformat(v) if v else None

    return Job(
        id=row["id"],
        job_type=row["job_type"],
        payload=row["payload"],
        status=JobStatus(row["status"]),
        created_at=datetime.fromisoformat(row["created_at"]),
        started_at=_dt(row["started_at"]),
        finished_at=_dt(row["finished_at"]),
        error=row["error"],
    )


class FIFOQueue:
    """Thread-safe SQLite-backed FIFO job queue."""

    def __init__(self, db_path: str = "jobs.db") -> None:
        self._db_path = db_path
        self._lock = threading.Lock()
        self._conn = self._connect()
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def _init_schema(self) -> None:
        with self._lock:
            self._conn.executescript(_SCHEMA)
            self._conn.commit()

    def enqueue(self, job_type: str, payload: Any = None) -> Job:
        """Add a new job to the end of the queue. Returns the created Job."""
        now = datetime.now(timezone.utc).isoformat()
        payload_str = json.dumps(payload) if payload is not None else "{}"
        with self._lock:
            cur = self._conn.execute(
                "INSERT INTO jobs (job_type, payload, status, created_at) VALUES (?, ?, 'pending', ?)",
                (job_type, payload_str, now),
            )
            self._conn.commit()
            job_id = cur.lastrowid
        return self.get(job_id)

    def dequeue(self) -> Job | None:
        """Claim and return the oldest pending job, or None if queue is empty."""
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at ASC, id ASC LIMIT 1"
            ).fetchone()
            if row is None:
                return None
            now = datetime.now(timezone.utc).isoformat()
            self._conn.execute(
                "UPDATE jobs SET status = 'running', started_at = ? WHERE id = ?",
                (now, row["id"]),
            )
            self._conn.commit()
        return self.get(row["id"])

    def complete(self, job_id: int) -> None:
        """Mark a running job as done."""
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            self._conn.execute(
                "UPDATE jobs SET status = 'done', finished_at = ? WHERE id = ?",
                (now, job_id),
            )
            self._conn.commit()

    def fail(self, job_id: int, error: str) -> None:
        """Mark a running job as failed with an error message."""
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            self._conn.execute(
                "UPDATE jobs SET status = 'failed', finished_at = ?, error = ? WHERE id = ?",
                (now, error, job_id),
            )
            self._conn.commit()

    def requeue(self, job_id: int) -> None:
        """Reset a failed job back to pending so it can be retried."""
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            self._conn.execute(
                "UPDATE jobs SET status = 'pending', started_at = NULL, finished_at = NULL, "
                "error = NULL, created_at = ? WHERE id = ? AND status = 'failed'",
                (now, job_id),
            )
            self._conn.commit()

    def get(self, job_id: int) -> Job | None:
        """Fetch a single job by ID."""
        row = self._conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return _row_to_job(row) if row else None

    def list_jobs(self, status: str | None = None, limit: int = 50) -> list[Job]:
        """Return jobs ordered by creation time, optionally filtered by status."""
        if status:
            rows = self._conn.execute(
                "SELECT * FROM jobs WHERE status = ? ORDER BY created_at ASC, id ASC LIMIT ?",
                (status, limit),
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM jobs ORDER BY created_at ASC, id ASC LIMIT ?",
                (limit,),
            ).fetchall()
        return [_row_to_job(r) for r in rows]

    def stats(self) -> dict[str, int]:
        """Return counts per status."""
        rows = self._conn.execute(
            "SELECT status, COUNT(*) as cnt FROM jobs GROUP BY status"
        ).fetchall()
        result = {s.value: 0 for s in JobStatus}
        for row in rows:
            result[row["status"]] = row["cnt"]
        result["total"] = sum(result.values())
        return result

    def close(self) -> None:
        self._conn.close()
