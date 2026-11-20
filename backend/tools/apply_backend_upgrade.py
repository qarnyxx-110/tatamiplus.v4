#!/usr/bin/env python3
"""Safely add the Radin blog app and URL to an existing cPanel Django app.

This script intentionally does not replace config/settings.py or config/urls.py.
It makes two idempotent, anchor-checked insertions and backs up both files first.
It does not install dependencies, run migrations, touch .env, or access the DB.
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile

APP_ROOT = Path(__file__).resolve().parent
SETTINGS = APP_ROOT / "config" / "settings.py"
URLS = APP_ROOT / "config" / "urls.py"


class UpgradeError(RuntimeError):
    pass


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        raise UpgradeError(f"Cannot read {path}: {exc}") from exc


def patch_settings(source: str) -> tuple[str, bool]:
    marker = "blog.apps.BlogConfig"
    if marker in source or re.search(r"(?m)^\s*['\"]blog['\"],\s*$", source):
        return source, False

    anchor = re.compile(
        r"(?m)^(?P<indent>[ \t]*)['\"](?:gems\.apps\.GemsConfig|gems)['\"]\s*,\s*$"
    )
    matches = list(anchor.finditer(source))
    if len(matches) != 1:
        raise UpgradeError(
            "Could not find exactly one INSTALLED_APPS anchor for gems. "
            "No settings file was changed; inspect config/settings.py manually."
        )

    match = matches[0]
    insertion = f"{match.group('indent')}'blog.apps.BlogConfig',"
    return source[:match.end()] + "\n" + insertion + source[match.end():], True


def patch_urls(source: str) -> tuple[str, bool]:
    if re.search(r"path\(\s*['\"]blog/['\"]\s*,\s*include\(\s*['\"]blog\.urls['\"]\s*\)\s*\)", source):
        return source, False

    anchor = re.compile(
        r"(?m)^(?P<indent>[ \t]*)path\(\s*(['\"])club/\2\s*,\s*include\(\s*(['\"])club\.urls\3\s*\)\s*\)\s*,?\s*$"
    )
    matches = list(anchor.finditer(source))
    if len(matches) != 1:
        raise UpgradeError(
            "Could not find exactly one club URL include anchor in config/urls.py. "
            "No URL file was changed; inspect config/urls.py manually."
        )

    match = matches[0]
    insertion = f"{match.group('indent')}path('blog/', include('blog.urls')),"
    return source[:match.end()] + "\n" + insertion + source[match.end():], True


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description="Safely integrate the backend weblog app.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--plan", action="store_true", help="Show changes only (default).")
    mode.add_argument("--apply", action="store_true", help="Apply after explicit confirmation.")
    parser.add_argument("--confirm", default="", help="Must equal BACKEND-UPGRADE with --apply.")
    args = parser.parse_args()

    if not (APP_ROOT / "manage.py").is_file():
        raise UpgradeError(f"manage.py was not found in application root: {APP_ROOT}")
    if not (APP_ROOT / "blog" / "apps.py").is_file():
        raise UpgradeError("blog app files are missing. Extract the backend package first.")
    if not SETTINGS.is_file() or not URLS.is_file():
        raise UpgradeError("Expected config/settings.py and config/urls.py were not found.")

    old_settings = read_text(SETTINGS)
    old_urls = read_text(URLS)
    new_settings, settings_changed = patch_settings(old_settings)
    new_urls, urls_changed = patch_urls(old_urls)

    print(f"APP_ROOT={APP_ROOT}")
    print(f"SETTINGS={'ADD blog app' if settings_changed else 'already configured'}")
    print(f"URLS={'ADD /blog/' if urls_changed else 'already configured'}")
    print("DATABASE_SETTINGS=UNCHANGED")
    print("SECRET_KEY_AND_ENV=UNCHANGED")
    print("MIGRATIONS=NOT RUN")
    print("FILES_TO_WRITE=" + (", ".join(
        str(p.relative_to(APP_ROOT))
        for p, changed in ((SETTINGS, settings_changed), (URLS, urls_changed))
        if changed
    ) or "none"))

    if not args.apply:
        print("PLAN_ONLY | no files changed")
        return 0
    if args.confirm != "BACKEND-UPGRADE":
        raise UpgradeError("Confirmation missing. Re-run with --confirm BACKEND-UPGRADE.")

    if not (settings_changed or urls_changed):
        print("ALREADY_CONFIGURED | no files changed")
        return 0

    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = APP_ROOT / f"tatami_backend_config_backup_{stamp}"
    backup_dir.mkdir(parents=True, exist_ok=False)
    try:
        if settings_changed:
            shutil.copy2(SETTINGS, backup_dir / "settings.py")
        if urls_changed:
            shutil.copy2(URLS, backup_dir / "urls.py")

        # Re-read immediately before writing, and refuse if another process changed a file.
        if settings_changed and read_text(SETTINGS) != old_settings:
            raise UpgradeError("config/settings.py changed after the plan. Re-run --plan.")
        if urls_changed and read_text(URLS) != old_urls:
            raise UpgradeError("config/urls.py changed after the plan. Re-run --plan.")

        if settings_changed:
            atomic_write(SETTINGS, new_settings)
        if urls_changed:
            atomic_write(URLS, new_urls)
    except Exception:
        # Restore any partial config write from this transaction.
        saved_settings = backup_dir / "settings.py"
        saved_urls = backup_dir / "urls.py"
        if saved_settings.exists():
            shutil.copy2(saved_settings, SETTINGS)
        if saved_urls.exists():
            shutil.copy2(saved_urls, URLS)
        raise

    print("CONFIG_PATCH_APPLIED")
    print(f"BACKUP_DIR={backup_dir}")
    print("NEXT: run manage.py check, inspect manage.py migrate --plan, then back up DB before migrate.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except UpgradeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
