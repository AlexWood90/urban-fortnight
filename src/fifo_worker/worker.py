import json
import logging
import signal
import time
import traceback
from typing import Any, Callable

from .models import Job
from .queue import FIFOQueue

Handler = Callable[[str, Any], None]

logger = logging.getLogger(__name__)


class Worker:
    """Processes jobs from a FIFOQueue in order, dispatching by job_type."""

    def __init__(self, queue: FIFOQueue, poll_interval: float = 1.0) -> None:
        self._queue = queue
        self._poll_interval = poll_interval
        self._handlers: dict[str, Handler] = {}
        self._running = False

    def register(self, job_type: str, handler: Handler) -> None:
        """Register a handler function for a given job type."""
        self._handlers[job_type] = handler
        logger.debug("Registered handler for job type %r", job_type)

    def process_one(self) -> bool:
        """Dequeue and process a single job. Returns True if a job was processed."""
        job = self._queue.dequeue()
        if job is None:
            return False

        handler = self._handlers.get(job.job_type)
        if handler is None:
            self._queue.fail(job.id, f"No handler registered for job type {job.job_type!r}")
            logger.warning("No handler for job type %r (job_id=%d)", job.job_type, job.id)
            return True

        logger.info("Processing job %d (type=%r)", job.id, job.job_type)
        try:
            payload = json.loads(job.payload)
            handler(job.job_type, payload)
            self._queue.complete(job.id)
            logger.info("Completed job %d", job.id)
        except Exception as exc:
            error_msg = f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
            self._queue.fail(job.id, error_msg)
            logger.error("Failed job %d: %s", job.id, exc)
        return True

    def run(self) -> None:
        """Run the worker loop until interrupted."""
        self._running = True
        self._install_signal_handlers()
        logger.info("Worker started (poll_interval=%.1fs)", self._poll_interval)
        try:
            while self._running:
                processed = self.process_one()
                if not processed:
                    time.sleep(self._poll_interval)
        finally:
            logger.info("Worker stopped")

    def stop(self) -> None:
        self._running = False

    def _install_signal_handlers(self) -> None:
        def _handle(signum, frame):
            logger.info("Received signal %d, stopping worker…", signum)
            self._running = False

        signal.signal(signal.SIGINT, _handle)
        signal.signal(signal.SIGTERM, _handle)
