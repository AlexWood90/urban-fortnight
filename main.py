#!/usr/bin/env python3
"""FIFO Worker App — CLI entry point."""

import argparse
import json
import logging
import sys
import time

from src.fifo_worker import FIFOQueue, Worker


def cmd_enqueue(args: argparse.Namespace, queue: FIFOQueue) -> None:
    payload = json.loads(args.payload) if args.payload else {}
    job = queue.enqueue(args.job_type, payload)
    print(f"Enqueued job {job.id} (type={job.job_type!r})")


def cmd_worker(args: argparse.Namespace, queue: FIFOQueue) -> None:
    worker = Worker(queue, poll_interval=args.poll_interval)

    # Built-in demo handlers
    def echo_handler(job_type: str, payload: dict) -> None:
        print(f"  [echo] {payload}")

    def sleep_handler(job_type: str, payload: dict) -> None:
        duration = payload.get("seconds", 1)
        print(f"  [sleep] sleeping {duration}s…")
        time.sleep(duration)

    worker.register("echo", echo_handler)
    worker.register("sleep", sleep_handler)

    print(f"Starting worker (poll={args.poll_interval}s). Press Ctrl+C to stop.")
    worker.run()


def cmd_status(args: argparse.Namespace, queue: FIFOQueue) -> None:
    stats = queue.stats()
    width = 10
    print(f"{'Status':<{width}}  Count")
    print("-" * (width + 8))
    for key in ("pending", "running", "done", "failed", "total"):
        print(f"{key:<{width}}  {stats.get(key, 0)}")


def cmd_list(args: argparse.Namespace, queue: FIFOQueue) -> None:
    jobs = queue.list_jobs(status=args.status or None, limit=args.limit)
    if not jobs:
        print("No jobs found.")
        return
    print(f"{'ID':>6}  {'Type':<16}  {'Status':<8}  Created")
    print("-" * 60)
    for job in jobs:
        print(
            f"{job.id:>6}  {job.job_type:<16}  {job.status.value:<8}  "
            f"{job.created_at.strftime('%Y-%m-%d %H:%M:%S')}"
        )


def cmd_requeue(args: argparse.Namespace, queue: FIFOQueue) -> None:
    queue.requeue(args.job_id)
    job = queue.get(args.job_id)
    if job:
        print(f"Job {job.id} requeued (status={job.status.value})")
    else:
        print(f"Job {args.job_id} not found.")
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="fifo-worker",
        description="FIFO job queue worker",
    )
    parser.add_argument("--db", default="jobs.db", help="Path to SQLite database (default: jobs.db)")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])

    sub = parser.add_subparsers(dest="command", required=True)

    # enqueue
    p_enq = sub.add_parser("enqueue", help="Add a job to the queue")
    p_enq.add_argument("job_type", help="Job type identifier (e.g. 'echo', 'sleep')")
    p_enq.add_argument("payload", nargs="?", default="{}", help="JSON payload string (default: {})")

    # worker
    p_wrk = sub.add_parser("worker", help="Start the worker process")
    p_wrk.add_argument("--poll-interval", type=float, default=1.0, help="Seconds to wait when queue is empty")

    # status
    sub.add_parser("status", help="Show queue statistics")

    # list
    p_lst = sub.add_parser("list", help="List jobs")
    p_lst.add_argument("--status", choices=["pending", "running", "done", "failed"], help="Filter by status")
    p_lst.add_argument("--limit", type=int, default=50, help="Max rows to show (default: 50)")

    # requeue
    p_req = sub.add_parser("requeue", help="Re-enqueue a failed job")
    p_req.add_argument("job_id", type=int, help="Job ID to requeue")

    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )

    queue = FIFOQueue(db_path=args.db)
    try:
        dispatch = {
            "enqueue": cmd_enqueue,
            "worker": cmd_worker,
            "status": cmd_status,
            "list": cmd_list,
            "requeue": cmd_requeue,
        }
        dispatch[args.command](args, queue)
    finally:
        queue.close()


if __name__ == "__main__":
    main()
