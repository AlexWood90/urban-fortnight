import json
import pytest
from src.fifo_worker.queue import FIFOQueue
from src.fifo_worker.models import JobStatus


@pytest.fixture
def queue(tmp_path):
    q = FIFOQueue(db_path=str(tmp_path / "test.db"))
    yield q
    q.close()


def test_enqueue_returns_pending_job(queue):
    job = queue.enqueue("echo", {"msg": "hello"})
    assert job.id is not None
    assert job.job_type == "echo"
    assert job.status == JobStatus.PENDING
    assert json.loads(job.payload) == {"msg": "hello"}


def test_dequeue_returns_oldest_job_first(queue):
    j1 = queue.enqueue("echo", {"n": 1})
    j2 = queue.enqueue("echo", {"n": 2})
    j3 = queue.enqueue("echo", {"n": 3})

    got = queue.dequeue()
    assert got.id == j1.id


def test_dequeue_marks_job_running(queue):
    queue.enqueue("echo", {})
    job = queue.dequeue()
    assert job.status == JobStatus.RUNNING
    assert job.started_at is not None


def test_dequeue_empty_returns_none(queue):
    assert queue.dequeue() is None


def test_complete_marks_job_done(queue):
    queue.enqueue("echo", {})
    job = queue.dequeue()
    queue.complete(job.id)
    updated = queue.get(job.id)
    assert updated.status == JobStatus.DONE
    assert updated.finished_at is not None


def test_fail_marks_job_failed(queue):
    queue.enqueue("echo", {})
    job = queue.dequeue()
    queue.fail(job.id, "something went wrong")
    updated = queue.get(job.id)
    assert updated.status == JobStatus.FAILED
    assert updated.error == "something went wrong"
    assert updated.finished_at is not None


def test_requeue_failed_job(queue):
    queue.enqueue("echo", {})
    job = queue.dequeue()
    queue.fail(job.id, "oops")
    queue.requeue(job.id)
    updated = queue.get(job.id)
    assert updated.status == JobStatus.PENDING
    assert updated.error is None
    assert updated.started_at is None


def test_stats_counts_by_status(queue):
    queue.enqueue("a", {})
    queue.enqueue("b", {})
    j = queue.dequeue()
    queue.complete(j.id)

    stats = queue.stats()
    assert stats["pending"] == 1
    assert stats["done"] == 1
    assert stats["total"] == 2


def test_list_jobs_fifo_order(queue):
    for i in range(5):
        queue.enqueue("task", {"i": i})
    jobs = queue.list_jobs(status="pending")
    ids = [j.id for j in jobs]
    assert ids == sorted(ids)


def test_list_jobs_filter_by_status(queue):
    queue.enqueue("echo", {})
    queue.enqueue("echo", {})
    j = queue.dequeue()
    queue.complete(j.id)

    pending = queue.list_jobs(status="pending")
    done = queue.list_jobs(status="done")
    assert len(pending) == 1
    assert len(done) == 1


def test_payload_none_defaults_to_empty_dict(queue):
    job = queue.enqueue("echo")
    assert json.loads(job.payload) == {}
