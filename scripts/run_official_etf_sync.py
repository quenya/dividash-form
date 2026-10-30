#!/usr/bin/env python3
"""Cron-safe launcher for the official ETF sync; defaults to dry-run."""
from __future__ import annotations
import argparse
import fcntl
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

DEFAULT_CREDENTIAL_NOTE = Path('/Volumes/Seagate500/obsidian/api_key/supabase.md')


def parse_credentials(text: str) -> dict[str, str]:
    """Parse only the credential note's documented key/value forms."""
    names = {'host': 'SUPABASE_DB_HOST', 'port': 'SUPABASE_DB_PORT',
             'database': 'SUPABASE_DB_NAME', 'user': 'SUPABASE_DB_USER'}
    result = {}
    for key, envname in names.items():
        matches = re.findall(rf'^\s*{key}\s*=\s*["\']?([^\s"\']+)', text, re.I | re.M)
        if matches:
            result[envname] = matches[-1]
    match = re.search(r'^\s*(?:[-*]\s*)?pw\s*:\s*`?([^`\r\n]+)', text, re.I | re.M)
    if match and match.group(1).strip():
        result['SUPABASE_DB_PASSWORD'] = match.group(1).strip()
    required = ('SUPABASE_DB_HOST', 'SUPABASE_DB_NAME', 'SUPABASE_DB_USER', 'SUPABASE_DB_PASSWORD')
    if any(not result.get(k) for k in required):
        raise ValueError('incomplete credentials')
    return result


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--write', action='store_true', help='allow database writes (default: dry-run)')
    mode.add_argument('--dry-run', action='store_true', help='explicitly run without writes (default)')
    parser.add_argument('--python', dest='python_path', help='absolute path to executable Python')
    parser.add_argument('--credential-note', default=str(DEFAULT_CREDENTIAL_NOTE), help=argparse.SUPPRESS)
    args = parser.parse_args(argv)
    python_path = args.python_path or os.environ.get('OFFICIAL_ETF_PYTHON')
    if not python_path or not Path(python_path).is_absolute() or not os.access(python_path, os.X_OK):
        return 2
    try:
        # Read at runtime only; never include parsed contents in diagnostics.
        credentials = parse_credentials(Path(args.credential_note).read_text())
    except (OSError, UnicodeError, ValueError):
        return 2
    script = Path(__file__).resolve().with_name('sync_recent_official_etfs.py')
    if not script.is_file():
        return 2
    lock_name = hashlib.sha256(str(script.parent.resolve()).encode()).hexdigest()[:20]
    lock_path = Path(tempfile.gettempdir()) / f'official-etf-sync-{lock_name}.lock'
    try:
        lock = lock_path.open('a')
    except OSError:
        return 2
    try:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return 75
        env = os.environ.copy()
        env.update(credentials)
        command = [str(Path(python_path)), str(script), '--write' if args.write else '--dry-run', '--trigger', 'schedule']
        try:
            return subprocess.run(command, env=env, check=False).returncode
        except OSError:
            return 2
    finally:
        lock.close()

if __name__ == '__main__':
    raise SystemExit(main())
