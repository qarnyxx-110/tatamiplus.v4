#!/usr/bin/env python3
"""Build a reversible cPanel installer for Persian Django Admin sidebar text."""
from __future__ import annotations

import hashlib
import json
import py_compile
import shutil
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE_NAME = "TatamiPlus-Admin-Navigation-Text-2026-11-21"
OUTPUT = ROOT / "tatami-admin-navigation-text-cpanel.zip"
SOURCE_FILES = {
    "tatamiplus_app/templates/admin/base_site.html": ROOT / "django/templates/admin/base_site.html",
    "tatamiplus.ir/static/css/tatami-admin-navigation-text.css": ROOT / "django/static/css/tatami-admin-navigation-text.css",
    "tatamiplus.ir/static/js/tatami-admin-navigation.js": ROOT / "django/static/js/tatami-admin-navigation.js",
}
CSS_REFERENCE = "/static/css/tatami-admin-navigation-text.css?v=20261121.1"

INSTALLER = r'''#!/usr/bin/env python3
"""Safe, reversible cPanel installer for Persian Admin sidebar text corrections."""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

APP_ROOT = Path("/home/pvchubir/tatamiplus_app")
DOMAIN_ROOT = Path("/home/pvchubir/tatamiplus.ir")
VENV_PYTHON = Path("/home/pvchubir/virtualenv/tatamiplus_app/3.13/bin/python")
PACKAGE_ROOT = Path(__file__).resolve().parent
PAYLOAD = PACKAGE_ROOT / "payload"
BACKUP_ROOT = APP_ROOT / ".tatami_admin_navigation_text_backups"
REPORT = PACKAGE_ROOT / "INSTALL-RESULT-FA.txt"
CSS_REFERENCE = "/static/css/tatami-admin-navigation-text.css?v=20261121.1"

FILES = [
    (
        PAYLOAD / "tatamiplus_app/templates/admin/base_site.html",
        APP_ROOT / "templates/admin/base_site.html",
        0o644,
    ),
    (
        PAYLOAD / "tatamiplus.ir/static/css/tatami-admin-navigation-text.css",
        DOMAIN_ROOT / "static/css/tatami-admin-navigation-text.css",
        0o644,
    ),
    (
        PAYLOAD / "tatamiplus.ir/static/js/tatami-admin-navigation.js",
        DOMAIN_ROOT / "static/js/tatami-admin-navigation.js",
        0o644,
    ),
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_install(source: Path, target: Path, mode: int) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(
        prefix=f".{target.name}.", suffix=".tmp", dir=target.parent
    )
    os.close(fd)
    temp_path = Path(temp_name)
    try:
        shutil.copyfile(source, temp_path)
        os.chmod(temp_path, mode)
        os.replace(temp_path, target)
        os.chmod(target, mode)
    finally:
        if temp_path.exists():
            temp_path.unlink()


def run_check(command: list[str], label: str) -> None:
    result = subprocess.run(
        command,
        cwd=APP_ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if result.stdout:
        print(result.stdout.rstrip())
    if result.returncode:
        raise RuntimeError(f"{label} failed with exit code {result.returncode}")


def main() -> int:
    print("مرحله ۱ از ۶: بررسی مسیرهای پروژه")
    if not (APP_ROOT / "manage.py").is_file() or not DOMAIN_ROOT.is_dir():
        raise RuntimeError("مسیر پروژه یا پوشه دامنه پیدا نشد؛ هیچ فایلی تغییر نکرد.")
    if not VENV_PYTHON.exists():
        raise RuntimeError(f"Python محیط پروژه پیدا نشد: {VENV_PYTHON}")
    for source, _, _ in FILES:
        if not source.is_file():
            raise RuntimeError(f"فایل بسته ناقص است: {source}")

    template_text = FILES[0][0].read_text(encoding="utf-8")
    if CSS_REFERENCE not in template_text:
        raise RuntimeError("پیوند CSS فارسی در قالب وجود ندارد؛ نصب متوقف شد.")

    navigation_js = FILES[2][0].read_text(encoding="utf-8")
    for required in ("حساب‌های کاربری", "کاربران و دسترسی‌ها", "باشگاه", "سفارش‌ها", "tpa-app-label"):
        if required not in navigation_js:
            raise RuntimeError(f"نام نمایشی یا ساختار منو در JavaScript ناقص است: {required}")

    print("مرحله ۲ از ۶: بررسی محتوا و نسخه فایل‌ها")
    manifest = json.loads(
        (PACKAGE_ROOT / "PACKAGE-MANIFEST.json").read_text(encoding="utf-8")
    )
    for source, _, _ in FILES:
        relative = source.relative_to(PAYLOAD).as_posix()
        expected = manifest["files"].get(relative)
        if not expected or sha256(source) != expected["sha256"]:
            raise RuntimeError(f"بررسی SHA256 ناموفق بود: {relative}")
        print(f"  تأیید شد: {relative} ({source.stat().st_size:,} bytes)")

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = BACKUP_ROOT / stamp
    backup_dir.mkdir(parents=True, exist_ok=False)
    backups: dict[Path, Path | None] = {}
    installed: list[Path] = []

    try:
        print("مرحله ۳ از ۶: تهیه نسخه پشتیبان از فایل‌های قبلی")
        for _, target, _ in FILES:
            root = APP_ROOT if target.is_relative_to(APP_ROOT) else DOMAIN_ROOT
            if target.exists():
                backup = backup_dir / target.relative_to(root)
                backup.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(target, backup)
                backups[target] = backup
                print(f"  پشتیبان: {target}")
            else:
                backups[target] = None
        print(f"  پوشه پشتیبان: {backup_dir}")

        print("مرحله ۴ از ۶: نصب اصلاحات نوشته‌ها و چیدمان منو")
        for source, target, mode in FILES:
            atomic_install(source, target, mode)
            installed.append(target)
            if sha256(source) != sha256(target):
                raise RuntimeError(f"تأیید فایل مقصد ناموفق بود: {target}")
            if (target.stat().st_mode & 0o777) != mode:
                raise RuntimeError(f"مجوز فایل مقصد نامعتبر است: {target}")
            print(f"  نصب شد: {target}")

        print("مرحله ۵ از ۶: بررسی Django و بارگذاری قالب‌ها")
        run_check(
            [str(VENV_PYTHON), str(APP_ROOT / "manage.py"), "check"],
            "Django system check",
        )
        shell_code = (
            'from django.template.loader import get_template; '
            'get_template("admin/base_site.html"); '
            'get_template("admin/index.html"); '
            'get_template("admin/change_form.html"); '
            'print("ADMIN_TEMPLATES_OK")'
        )
        run_check(
            [str(VENV_PYTHON), str(APP_ROOT / "manage.py"), "shell", "-c", shell_code],
            "Admin template check",
        )

        print("مرحله ۶ از ۶: درخواست راه‌اندازی مجدد و ثبت گزارش")
        restart_dir = APP_ROOT / "tmp"
        restart_dir.mkdir(parents=True, exist_ok=True)
        (restart_dir / "restart.txt").touch()
        report = [
            "نصب اصلاحات متن و چیدمان منوی کناری تاتامی پلاس موفق بود.",
            f"تاریخ نصب: {datetime.now().isoformat(timespec='seconds')}",
            f"نسخه پشتیبان: {backup_dir}",
            "فایل‌های نصب‌شده:",
            *(f"- {target}" for _, target, _ in FILES),
            "Static file permissions: 644",
            "Django check: OK",
            "Admin templates: OK",
            "Database / models / views / URLs / permissions / .env: untouched",
            "Django-generated app/model/add/change URLs remain unchanged.",
        ]
        REPORT.write_text("\n".join(report) + "\n", encoding="utf-8")
        print(f"مسیر نسخه پشتیبان: {backup_dir}")
        print(f"گزارش نصب: {REPORT}")
        print("نصب موفق بود. پنل مدیریت برای راه‌اندازی مجدد علامت‌گذاری شد.")
        return 0

    except Exception:
        print("خطا در نصب؛ بازگردانی فایل‌های قبلی آغاز شد.")
        for target in reversed(installed):
            backup = backups.get(target)
            if backup and backup.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(backup, target)
            elif target.exists():
                target.unlink()
        raise


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"خطا: {exc}", file=sys.stderr)
        raise SystemExit(1)
'''

README = """بسته اصلاح نوشته‌ها و چیدمان منوی کناری تاتامی پلاس
تاریخ بسته: 2026-11-21

این نسخه روی مشکل نام نمایشی گروه‌ها، متن‌های فارسی، شکستن خطوط،
تراز ستاره منتخب، شمارنده و دکمه باز/بسته شدن تمرکز دارد.

تغییرات:
- عنوان اپ‌ها به فارسی نمایش داده می‌شود: حساب‌های کاربری، باشگاه،
  مربیان، جم، سفارش‌ها، فروشگاه و وبلاگ.
- مقصد واقعی هر عنوان دقیقاً همان URL تولیدشده توسط Django باقی می‌ماند.
- عنوان، شمارنده و فلش هر گروه ستون جدا دارند و هم‌پوشانی نمی‌کنند.
- متن فارسی راست‌چین و در محل فاصله کلمات می‌شکند؛ حروف و کلمات بی‌دلیل
  به‌صورت تکه‌تکه یا با حروف بزرگ نمایش داده نمی‌شوند.
- ستاره منتخب کنار عنوان مدل و در یک ردیف ثابت قرار می‌گیرد.
- ستون‌های افزودن/تغییر اندازه کنترل‌شده دارند تا عنوان مدل فضای کافی بگیرد.
- مدل‌های add-only همچنان فقط با مقصد واقعی افزودن نمایش داده می‌شوند.
- عرض منو برای دسکتاپ، تبلت و موبایل تنظیم می‌شود.

نصب:
1) ZIP را در /home/pvchubir بارگذاری کنید.
2) همان‌جا Extract کنید. پوشه زیر ساخته می‌شود:
   /home/pvchubir/TatamiPlus-Admin-Navigation-Text-2026-11-21
3) در Terminal اجرا کنید:
/home/pvchubir/virtualenv/tatamiplus_app/3.13/bin/python /home/pvchubir/TatamiPlus-Admin-Navigation-Text-2026-11-21/install_admin_navigation_text.py
4) باید ADMIN_TEMPLATES_OK و «نصب موفق بود» دیده شود.
5) در مرورگر وارد https://tatamiplus.ir/admin/ شوید و Ctrl+F5 بزنید.

پشتیبان خودکار:
  /home/pvchubir/tatamiplus_app/.tatami_admin_navigation_text_backups/

CSS و JavaScript با مجوز 644 نصب می‌شوند. دیتابیس، مدل‌ها، Viewها،
URLها، سطح دسترسی‌ها، عملیات افزودن/تغییر/حذف و .env تغییر نمی‌کنند.
فایل‌های نصب‌شده در صورت شکست بررسی Django یا قالب‌ها بازگردانده می‌شوند.
"""

def main() -> None:
    for relative, source in SOURCE_FILES.items():
        if not source.is_file():
            raise SystemExit(f"Missing source file: {source}")
        if relative.endswith("base_site.html"):
            content = source.read_text(encoding="utf-8")
            if CSS_REFERENCE not in content:
                raise SystemExit(f"Template reference missing: {CSS_REFERENCE}")

    with tempfile.TemporaryDirectory(prefix="tatami-admin-navigation-text-") as temporary:
        package_root = Path(temporary) / PACKAGE_NAME
        payload = package_root / "payload"
        payload.mkdir(parents=True)
        entries = {}

        for relative, source in SOURCE_FILES.items():
            target = payload / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            entries[relative] = {
                "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
                "size": target.stat().st_size,
            }

        installer_path = package_root / "install_admin_navigation_text.py"
        installer_path.write_text(INSTALLER, encoding="utf-8")
        compile(INSTALLER, str(installer_path), "exec")
        py_compile.compile(
            str(installer_path),
            doraise=True,
            cfile=str(Path(temporary) / "installer.pyc"),
        )
        (package_root / "README-INSTALL-FA.txt").write_text(README, encoding="utf-8")
        (package_root / "PACKAGE-MANIFEST.json").write_text(
            json.dumps(
                {"package": PACKAGE_NAME, "created": "2026-11-21", "files": entries},
                ensure_ascii=False,
                indent=2,
            ) + "\n",
            encoding="utf-8",
        )

        if OUTPUT.exists():
            OUTPUT.unlink()
        with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for source in sorted(package_root.rglob("*")):
                if source.is_file():
                    archive.write(source, source.relative_to(package_root.parent).as_posix())

        with zipfile.ZipFile(OUTPUT) as archive:
            if archive.testzip() is not None:
                raise SystemExit("Generated ZIP integrity test failed.")
            names = set(archive.namelist())
            expected = {
                f"{PACKAGE_NAME}/install_admin_navigation_text.py",
                f"{PACKAGE_NAME}/README-INSTALL-FA.txt",
                f"{PACKAGE_NAME}/PACKAGE-MANIFEST.json",
                *(f"{PACKAGE_NAME}/payload/{path}" for path in SOURCE_FILES),
            }
            if names != expected:
                raise SystemExit(f"ZIP contents mismatch: {names ^ expected}")

        print(
            f"ADMIN_NAVIGATION_TEXT_PACKAGE_OK | files={len(entries)} | "
            f"bytes={OUTPUT.stat().st_size} | path={OUTPUT}"
        )


if __name__ == "__main__":
    main()
