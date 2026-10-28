"""Short SQLite transactions; workspace computations use optimistic commits."""

import hashlib
import json
import os
import secrets
import sqlite3
from contextlib import contextmanager, closing
from contextvars import ContextVar
from datetime import timedelta
from pathlib import Path
from fastapi import HTTPException
from .domain import seed, stamp, now

DB_PATH = os.getenv("DATABASE_PATH", "data/unblock.db")
_active = ContextVar("workspace_token", default=None)


def connect():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.execute(
        "CREATE TABLE IF NOT EXISTS workspaces (token TEXT PRIMARY KEY, expires TEXT NOT NULL, state TEXT NOT NULL, generation INTEGER NOT NULL DEFAULT 0)"
    )
    if "generation" not in {
        row[1] for row in db.execute("PRAGMA table_info(workspaces)")
    }:
        try:
            db.execute(
                "ALTER TABLE workspaces ADD COLUMN generation INTEGER NOT NULL DEFAULT 0"
            )
        except sqlite3.OperationalError:
            if "generation" not in {
                row[1] for row in db.execute("PRAGMA table_info(workspaces)")
            }:
                db.close()
                raise
    db.execute(
        "CREATE TABLE IF NOT EXISTS budgets (bucket TEXT PRIMARY KEY, used INTEGER NOT NULL)"
    )
    db.execute(
        "CREATE TABLE IF NOT EXISTS rate_limits (identity TEXT NOT NULL, bucket TEXT NOT NULL, at REAL NOT NULL)"
    )
    db.execute(
        "CREATE INDEX IF NOT EXISTS rate_lookup ON rate_limits(identity,bucket,at)"
    )
    db.commit()
    return db


def key(token):
    return hashlib.sha256(token.encode()).hexdigest()


def create():
    token = secrets.token_urlsafe(32)
    with closing(connect()) as db, db:
        db.execute("DELETE FROM workspaces WHERE expires < ?", (stamp(),))
        db.execute(
            "INSERT INTO workspaces(token,expires,state) VALUES (?,?,?)",
            (key(token), (now() + timedelta(hours=24)).isoformat(), json.dumps(seed())),
        )
    return token


def read(token):
    if not token:
        raise HTTPException(401, "Start a demo workspace first")
    with closing(connect()) as db:
        row = db.execute(
            "SELECT state,generation FROM workspaces WHERE token=? AND expires>?",
            (key(token), stamp()),
        ).fetchone()
    if not row:
        raise HTTPException(401, "Workspace expired; start a new demo")
    return json.loads(row[0]), row[1]


@contextmanager
def workspace(token, readonly=False):
    state, generation = read(token)
    context = _active.set(token)
    try:
        yield state
        if not readonly:
            with closing(connect()) as db, db:
                db.execute("BEGIN IMMEDIATE")
                row = db.execute(
                    "SELECT state,generation FROM workspaces WHERE token=? AND expires>?",
                    (key(token), stamp()),
                ).fetchone()
                if not row or row[1] != generation:
                    raise HTTPException(
                        409,
                        "Workspace changed while processing. Refresh before retrying.",
                    )
                saved = json.loads(row[0])
                for field in ("provider_calls", "model_calls"):
                    state[field] = max(state.get(field, 0), saved.get(field, 0))
                db.execute(
                    "UPDATE workspaces SET state=?,generation=generation+1 WHERE token=?",
                    (json.dumps(state), key(token)),
                )
    finally:
        _active.reset(context)


def consume(state, field, maximum):
    """Reserve attempts before network I/O; failed/conflicting commands still count."""
    token = _active.get()
    if not token:  # Pure adapter unit tests and explicitly local, in-memory callers.
        if state.get(field, 0) >= maximum:
            raise HTTPException(429, "Workspace provider-call budget exhausted")
        state[field] = state.get(field, 0) + 1
        return
    provider = "QLOO" if field == "provider_calls" else "MODEL"
    cap = int(
        os.getenv(
            f"{provider}_DAILY_CALL_BUDGET", "200" if provider == "QLOO" else "100"
        )
    )
    bucket = f"{now().date().isoformat()}:{provider}"
    with closing(connect()) as db, db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT state FROM workspaces WHERE token=? AND expires>?",
            (key(token), stamp()),
        ).fetchone()
        if not row:
            raise HTTPException(401, "Workspace expired")
        saved = json.loads(row[0])
        if saved.get(field, 0) >= maximum:
            raise HTTPException(429, "Workspace provider-call budget exhausted")
        used = db.execute(
            "SELECT used FROM budgets WHERE bucket=?", (bucket,)
        ).fetchone()
        if (used[0] if used else 0) >= cap:
            raise HTTPException(
                429,
                "Deployment daily provider budget exhausted; try after UTC midnight",
            )
        db.execute(
            "INSERT INTO budgets VALUES (?,1) ON CONFLICT(bucket) DO UPDATE SET used=used+1",
            (bucket,),
        )
        saved[field] = saved.get(field, 0) + 1
        state[field] = saved[field]
        db.execute(
            "UPDATE workspaces SET state=? WHERE token=?",
            (json.dumps(saved), key(token)),
        )


def rate_limit(identity, bucket, maximum):
    at = now().timestamp()
    with closing(connect()) as db, db:
        db.execute("BEGIN IMMEDIATE")
        db.execute("DELETE FROM rate_limits WHERE at < ?", (at - 60,))
        count = db.execute(
            "SELECT count(*) FROM rate_limits WHERE identity=? AND bucket=?",
            (key(identity), bucket),
        ).fetchone()[0]
        if count >= maximum:
            raise HTTPException(429, "Too many requests; try again in one minute")
        db.execute(
            "INSERT INTO rate_limits VALUES (?,?,?)", (key(identity), bucket, at)
        )


def provider_budget(provider):
    cap = int(
        os.getenv(
            f"{provider}_DAILY_CALL_BUDGET", "200" if provider == "QLOO" else "100"
        )
    )
    day = now().date().isoformat()
    with closing(connect()) as db:
        row = db.execute(
            "SELECT used FROM budgets WHERE bucket=?", (f"{day}:{provider}",)
        ).fetchone()
    used = row[0] if row else 0
    return {
        "limit": cap,
        "used": used,
        "remaining": max(0, cap - used),
        "utc_day": day,
        "reset_at": (
            now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        ).isoformat(),
        "scope": "Application attempt allowance; upstream provider allowance may differ",
    }
