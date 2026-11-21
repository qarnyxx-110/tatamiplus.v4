#!/usr/bin/env python3
"""Transactional cPanel installer for the Tatami Plus consolidated frontend sections."""
from __future__ import annotations
import argparse, hashlib, json, os, shutil, sys
from datetime import datetime
from pathlib import Path
from typing import Any

PACKAGE_ROOT = Path(__file__).resolve().parent
CPANEL_HOME = Path("/home/pvchubir")
APP_ROOT = CPANEL_HOME / "tatamiplus_app"
PUBLIC_ROOT = CPANEL_HOME / "tatamiplus.ir"
TEMPLATE_ROOT = APP_ROOT / "templates"
PREVIEW_ROOT = PUBLIC_ROOT / "preview"
PAYLOAD_ROOT = PACKAGE_ROOT / "payload"
MANIFEST_PATH = PACKAGE_ROOT / "MANIFEST.json"
LAST_INSTALL_PATH = CPANEL_HOME / ".tatami_sections_last_install.json"
BACKUP_ROOT = CPANEL_HOME / "tatami_backups"
STATIC_ROOT = PUBLIC_ROOT / "static"
REQUIRED_STATIC_FILES = (
    "css/tatami.css",
    "css/backend-templates.css",
    "css/module-pages.css",
    "css/home-restored.css",
    "css/reference-store.css",
    "js/tatami.js",
    "js/module-pages.js",
    "js/home-restored.js",
    "js/reference-store.js",
    "data/reference-store-catalog.json",
)

class InstallError(RuntimeError):
    pass

def safe_relative(value: str) -> Path:
    path = Path(value)
    if path.is_absolute() or not value or any(part in ("", ".", "..") for part in path.parts):
        raise InstallError(f"مسیر نامعتبر داخل بسته: {value!r}")
    return path

def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def ensure_no_symlinks(root: Path) -> None:
    if root.is_symlink():
        raise InstallError(f"مسیر نمادین پشتیبانی نمی‌شود: {root}")
    if root.is_dir():
        for child in root.rglob("*"):
            if child.is_symlink():
                raise InstallError(f"فایل یا پوشهٔ نمادین پیدا شد: {child}")

def load_and_verify_manifest() -> dict[str, Any]:
    if not MANIFEST_PATH.is_file():
        raise InstallError("MANIFEST.json در بسته پیدا نشد.")
    try:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        raise InstallError(f"خواندن MANIFEST.json ناموفق بود: {exc}") from exc
    if manifest.get("schema_version") != 1:
        raise InstallError("نسخهٔ ساختار بسته پشتیبانی نمی‌شود.")
    items = manifest.get("files")
    if not isinstance(items, list) or not items:
        raise InstallError("فهرست فایل‌های بسته خالی یا نامعتبر است.")
    expected: dict[str, set[str]] = {"preview": set(), "templates": set()}
    for item in items:
        area = item.get("area")
        relative = safe_relative(str(item.get("path", "")))
        if area not in expected:
            raise InstallError(f"نوع فایل ناشناخته است: {area!r}")
        key = relative.as_posix()
        if key in expected[area]:
            raise InstallError(f"مسیر تکراری در بسته: {area}/{key}")
        expected[area].add(key)
        source = PAYLOAD_ROOT / area / relative
        if not source.is_file() or source.is_symlink():
            raise InstallError(f"فایل بسته موجود نیست یا معتبر نیست: {source}")
        if source.stat().st_size != int(item.get("size", -1)):
            raise InstallError(f"اندازهٔ فایل با مانیفست سازگار نیست: {area}/{key}")
        if file_hash(source) != item.get("sha256"):
            raise InstallError(f"بررسی SHA256 ناموفق بود: {area}/{key}")
    for area, wanted in expected.items():
        root = PAYLOAD_ROOT / area
        if not root.is_dir():
            raise InstallError(f"پوشهٔ بسته موجود نیست: {root}")
        ensure_no_symlinks(root)
        found = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
        if found != wanted:
            raise InstallError(f"فهرست فایل‌های {area} با مانیفست سازگار نیست.")
    required_templates = {
        "base.html", "components/platform_navigation.html", "pages/home.html",
        "pages/home/partials/features.html", "pages/home/partials/intro.html",
        "club/course_list.html", "club/course_detail.html", "coaches/directory.html",
        "blog/post_list.html", "blog/post_detail.html",
    }
    if expected["templates"] != required_templates:
        raise InstallError("فهرست قالب‌های Django با بستهٔ تأییدشده مطابقت ندارد.")
    if "index.html" not in expected["preview"]:
        raise InstallError("فایل اصلی Preview داخل بسته نیست.")
    return manifest

def check_cpanel_paths() -> None:
    if Path.home().resolve() != CPANEL_HOME:
        raise InstallError(
            f"این نصب‌کننده برای کاربر cPanel در {CPANEL_HOME} ساخته شده است؛ "
            f"مسیر خانهٔ فعلی {Path.home()} است."
        )
    for path in (CPANEL_HOME, APP_ROOT, PUBLIC_ROOT, TEMPLATE_ROOT):
        if not path.is_dir() or path.is_symlink():
            raise InstallError(f"مسیر موردنیاز پیدا نشد یا معتبر نیست: {path}")
        if not os.access(path, os.W_OK | os.X_OK):
            raise InstallError(f"دسترسی نوشتن در مسیر وجود ندارد: {path}")
    ensure_no_symlinks(TEMPLATE_ROOT)
    if PREVIEW_ROOT.exists() and not PREVIEW_ROOT.is_dir():
        raise InstallError(f"مسیر Preview پوشه نیست: {PREVIEW_ROOT}")
    if PREVIEW_ROOT.is_symlink():
        raise InstallError(f"مسیر Preview نباید symlink باشد: {PREVIEW_ROOT}")

def check_required_static_assets(static_root: Path) -> None:
    """Refuse template-only installs when their pre-existing static dependencies are missing."""
    if static_root.is_symlink() or not static_root.is_dir():
        raise InstallError(
            f"پوشهٔ static موردنیاز پیدا نشد یا معتبر نیست: {static_root}. "
            "این بسته static را نصب نمی‌کند."
        )

    missing: list[str] = []
    invalid: list[str] = []
    for value in REQUIRED_STATIC_FILES:
        relative = safe_relative(value)
        current = static_root
        for part in relative.parts:
            current = current / part
            if current.is_symlink():
                invalid.append(value)
                break
        else:
            if not current.is_file() or current.stat().st_size <= 0:
                missing.append(value)

    if invalid:
        raise InstallError(
            "مسیرهای static نباید symlink باشند: " + "، ".join(invalid)
        )
    if missing:
        raise InstallError(
            "نصب متوقف شد؛ فایل‌های static موردنیاز از استقرار قبلی روی هاست موجود نیستند: "
            + "، ".join(missing)
            + ". ابتدا بستهٔ static سازگار را با مسئول استقرار بررسی کنید؛ این نصب‌کننده static را تغییر نمی‌دهد."
        )


def copy_tree(source: Path, destination: Path) -> None:
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(source, destination, symlinks=False)

def restore_from_backup(state: dict[str, Any]) -> None:
    backup = Path(state["backup_root"])
    preview_stage = PUBLIC_ROOT / f".preview.rollback-{state['install_id']}"
    if state["preview_existed"]:
        backup_preview = backup / "preview"
        if not backup_preview.is_dir():
            raise InstallError("پشتیبان Preview پیدا نشد؛ بازگردانی متوقف شد.")
        copy_tree(backup_preview, preview_stage)
        failed_preview = PUBLIC_ROOT / f".preview.failed-{state['install_id']}"
        if failed_preview.exists():
            shutil.rmtree(failed_preview)
        if PREVIEW_ROOT.exists():
            os.replace(PREVIEW_ROOT, failed_preview)
        os.replace(preview_stage, PREVIEW_ROOT)
        if failed_preview.exists():
            shutil.rmtree(failed_preview)
    elif PREVIEW_ROOT.exists():
        shutil.rmtree(PREVIEW_ROOT)
    for entry in state["templates"]:
        relative = safe_relative(entry["path"])
        destination = TEMPLATE_ROOT / relative
        if entry["existed"]:
            source = backup / "templates" / relative
            if not source.is_file():
                raise InstallError(f"پشتیبان قالب پیدا نشد: {source}")
            destination.parent.mkdir(parents=True, exist_ok=True)
            staged = destination.with_name(destination.name + f".rollback-{state['install_id']}")
            shutil.copy2(source, staged)
            os.replace(staged, destination)
        else:
            destination.unlink(missing_ok=True)

def install() -> None:
    manifest = load_and_verify_manifest()
    check_cpanel_paths()
    check_required_static_assets(STATIC_ROOT)
    install_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = BACKUP_ROOT / f"frontend_sections_{install_id}"
    backup.mkdir(parents=True, exist_ok=False)
    preview_existed = PREVIEW_ROOT.is_dir()
    try:
        if preview_existed:
            ensure_no_symlinks(PREVIEW_ROOT)
            copy_tree(PREVIEW_ROOT, backup / "preview")
        template_state = []
        for item in manifest["files"]:
            if item["area"] != "templates":
                continue
            relative = safe_relative(item["path"])
            destination = TEMPLATE_ROOT / relative
            existed = destination.is_file()
            if destination.exists() and not existed:
                raise InstallError(f"مقصد قالب، فایل عادی نیست: {destination}")
            if existed:
                backup_file = backup / "templates" / relative
                backup_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(destination, backup_file)
            template_state.append({"path": relative.as_posix(), "existed": existed})
        stage_preview = PUBLIC_ROOT / f".preview.stage-{install_id}"
        old_preview = PUBLIC_ROOT / f".preview.old-{install_id}"
        copy_tree(PAYLOAD_ROOT / "preview", stage_preview)
        state = {
            "schema_version": 1, "install_id": install_id,
            "source_commit": manifest.get("source_commit"),
            "backup_root": str(backup), "preview_existed": preview_existed,
            "templates": template_state,
            "installed_at": datetime.now().isoformat(timespec="seconds"),
            "rolled_back": False,
        }
        try:
            if PREVIEW_ROOT.exists():
                os.replace(PREVIEW_ROOT, old_preview)
            os.replace(stage_preview, PREVIEW_ROOT)
            for item in manifest["files"]:
                if item["area"] != "templates":
                    continue
                relative = safe_relative(item["path"])
                source = PAYLOAD_ROOT / "templates" / relative
                destination = TEMPLATE_ROOT / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                staged = destination.with_name(destination.name + f".stage-{install_id}")
                shutil.copy2(source, staged)
                os.replace(staged, destination)
            if old_preview.exists():
                shutil.rmtree(old_preview)
            LAST_INSTALL_PATH.write_text(
                json.dumps(state, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        except Exception:
            try:
                restore_from_backup(state)
            except Exception as rollback_error:
                raise InstallError(
                    "نصب ناموفق بود و بازگردانی خودکار کامل نشد. "
                    f"پشتیبان در {backup} باقی مانده است. جزئیات: {rollback_error}"
                )
            raise
    except Exception:
        stage = PUBLIC_ROOT / f".preview.stage-{install_id}"
        old = PUBLIC_ROOT / f".preview.old-{install_id}"
        if stage.exists():
            shutil.rmtree(stage)
        if old.exists() and not PREVIEW_ROOT.exists():
            os.replace(old, PREVIEW_ROOT)
        raise
    print("\nنصب با موفقیت انجام شد.")
    print(f"Preview: {PREVIEW_ROOT}")
    print(f"قالب‌های Django: {len(template_state)} فایل در {TEMPLATE_ROOT}")
    print(f"پشتیبان: {backup}")
    print("برای دیدن نسخهٔ تازه، سایت را با Ctrl+F5 بازخوانی کنید.")
    print("بازگردانی در صورت نیاز: python3 install.py --rollback")

def rollback() -> None:
    if not LAST_INSTALL_PATH.is_file():
        raise InstallError("اطلاعات آخرین نصب پیدا نشد؛ بازگردانی خودکار در دسترس نیست.")
    state = json.loads(LAST_INSTALL_PATH.read_text(encoding="utf-8"))
    if state.get("rolled_back"):
        raise InstallError("این نسخه قبلاً بازگردانی شده است.")
    check_cpanel_paths()
    restore_from_backup(state)
    state["rolled_back"] = True
    state["rolled_back_at"] = datetime.now().isoformat(timespec="seconds")
    LAST_INSTALL_PATH.write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("نسخهٔ قبلی با موفقیت بازگردانی شد.")

def main() -> int:
    parser = argparse.ArgumentParser(description="نصب یا بازگردانی تغییرات بخش‌های فرانت‌اند تاتامی پلاس")
    parser.add_argument("--check", action="store_true", help="فقط سلامت ZIP و مانیفست بسته را بررسی کن")
    parser.add_argument("--preflight", action="store_true", help="مسیرهای cPanel و پیش‌نیازهای static را بدون تغییر سایت بررسی کن")
    parser.add_argument("--rollback", action="store_true", help="بازگردانی آخرین نصب")
    args = parser.parse_args()
    try:
        if args.rollback:
            rollback()
        elif args.check:
            manifest = load_and_verify_manifest()
            preview_count = sum(1 for item in manifest["files"] if item["area"] == "preview")
            template_count = sum(1 for item in manifest["files"] if item["area"] == "templates")
            print(f"بسته سالم است: {preview_count} فایل Preview و {template_count} قالب Django.")
            print("در حالت check هیچ تغییری در سایت ایجاد نشد.")
        elif args.preflight:
            manifest = load_and_verify_manifest()
            check_cpanel_paths()
            check_required_static_assets(STATIC_ROOT)
            preview_count = sum(1 for item in manifest["files"] if item["area"] == "preview")
            template_count = sum(1 for item in manifest["files"] if item["area"] == "templates")
            print(f"پیش‌بررسی موفق بود: {preview_count} فایل Preview، {template_count} قالب Django و تمام پیش‌نیازهای static.")
            print("در حالت preflight هیچ فایلی از سایت تغییر نکرد.")
        else:
            install()
        return 0
    except Exception as exc:
        print(f"خطا: {exc}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
