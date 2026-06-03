from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


@dataclass
class Job:
    id: int
    job_type: str
    payload: str
    status: JobStatus
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None

    def __repr__(self) -> str:
        return (
            f"Job(id={self.id}, type={self.job_type!r}, "
            f"status={self.status.value}, created_at={self.created_at.isoformat()})"
        )
