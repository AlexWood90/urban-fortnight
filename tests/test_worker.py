import json
import pytest
from src.fifo_worker.queue import FIFOQueue
from src.fifo_worker.worker import Worker
from src.fifo_worker.models import JobStatus


@pytest.fixture
def queue(tmp_path):
    q = FIFOQueue(db_path=str(tmp_path / "test.db"))
    yield q
    q.close()


@pytest.fixture
def worker(queue):
    return Worker(queue, poll_interval=0.01)


def test_process_one_calls_handler(queue, worker):
    received = []

    def handler(job_type, payload):
        received.append((job_type, payload))

    worker.register("test", handler)
    queue.enqueue("test", {"x": 42})
    processed = worker.process_one()

    assert processed is True
    assert received == [("test", {"x": 42})]


def test_process_one_marks_job_done(queue, worker):
    worker.register("test", lambda t, p: None)
    job = queue.enqueue("test", {})
    worker.process_one()
    updated = queue.get(job.id)
    assert updated.status == JobStatus.DONE


def test_process_one_marks_job_failed_on_exception(queue, worker):
    def bad_handler(job_type, payload):
        raise ValueError("something broke")

    worker.register("bad", bad_handler)
    job = queue.enqueue("bad", {})
    worker.process_one()
    updated = queue.get(job.id)
    assert updated.status == JobStatus.FAILED
    assert "ValueError" in updated.error


def test_process_one_fails_job_with_no_handler(queue, worker):
    job = queue.enqueue("unknown_type", {})
    worker.process_one()
    updated = queue.get(job.id)
    assert updated.status == JobStatus.FAILED
    assert "No handler" in updated.error


def test_process_one_returns_false_when_queue_empty(queue, worker):
    result = worker.process_one()
    assert result is False


def test_process_one_respects_fifo_order(queue, worker):
    order = []

    def handler(job_type, payload):
        order.append(payload["n"])

    worker.register("seq", handler)
    for n in range(5):
        queue.enqueue("seq", {"n": n})

    for _ in range(5):
        worker.process_one()

    assert order == list(range(5))


def test_stop_exits_run_loop(queue):
    worker = Worker(queue, poll_interval=0.01)
    worker.register("noop", lambda t, p: None)
    # Enqueue one job then stop immediately after
    queue.enqueue("noop", {})

    import threading

    def stopper():
        import time
        time.sleep(0.05)
        worker.stop()

    t = threading.Thread(target=stopper)
    t.start()
    worker.run()
    t.join()
    # If we reach here without hanging, the stop mechanism works
