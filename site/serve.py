#!/usr/bin/env python3
"""
Serve the QLOCK build tracker and keep its progress in site/progress.json.

    python3 site/serve.py            # http://localhost:8017, opens the browser
    python3 site/serve.py --lan      # also reachable from your phone on the same wifi
    python3 site/serve.py --port 9000 --no-open

Standard library only. Only site/ and stl/ are served, so the 3D view always
loads the current STLs and nothing else in the project (like the Wi-Fi
password in the firmware) is exposed.
"""
import argparse
import json
import os
import posixpath
import re
import shutil
import socket
import sys
import threading
import webbrowser
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

SITE = Path(__file__).resolve().parent
ROOT = SITE.parent
PROGRESS = SITE / "progress.json"
BACKUP = SITE / "progress.backup.json"
SERVED = ("/site/", "/stl/")
ROOTS = {"tasks", "shop", "custom", "log"}
KEY = re.compile(r"^[A-Za-z0-9_.:\-]{1,80}$")
MAX_BODY = 256 * 1024
LOCK = threading.Lock()


def read_progress():
    try:
        data = json.loads(PROGRESS.read_text())
        return data if isinstance(data, dict) else {}
    except (FileNotFoundError, ValueError):
        return {}


def apply_ops(state, ops):
    """Each op is {"p": [key, ...], "v": value}; v = null deletes the key."""
    if not isinstance(ops, list) or not 0 < len(ops) <= 500:
        raise ValueError("ops must be a non-empty list")
    for op in ops:
        path = op.get("p") if isinstance(op, dict) else None
        if (not isinstance(path, list) or not 1 <= len(path) <= 4 or path[0] not in ROOTS
                or not all(isinstance(k, str) and KEY.match(k) for k in path)):
            raise ValueError(f"bad path: {path!r}")
        cur = state
        for k in path[:-1]:
            if not isinstance(cur.get(k), dict):
                cur[k] = {}
            cur = cur[k]
        if op.get("v") is None:
            cur.pop(path[-1], None)
        else:
            cur[path[-1]] = op["v"]
    state["version"] = 2
    state["updated"] = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    return state


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        if "/api/" in str(args[0] if args else ""):
            return                      # saves are frequent; keep the terminal quiet
        super().log_message(fmt, *args)

    def end_headers(self):
        # Always serve the latest files: STLs get regenerated, the site gets edited.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _path(self):
        return self.path.split("?")[0].split("#")[0]

    def _allowed(self):
        # normalise first: /site/../firmware/... must not slip through
        norm = posixpath.normpath(unquote(self._path()))
        return any(norm == p.rstrip("/") or norm.startswith(p) for p in SERVED)

    def do_GET(self):
        path = self._path()
        if path in ("/", "/index.html", "/site"):
            self.send_response(302)
            self.send_header("Location", "/site/")
            self.end_headers()
            return
        if path == "/api/progress":
            with LOCK:
                body = json.dumps(read_progress()).encode()
            return self._json(200, body)
        if not self._allowed():
            return self.send_error(404)
        return super().do_GET()

    def do_HEAD(self):
        if not self._allowed():
            return self.send_error(404)
        return super().do_HEAD()

    def do_POST(self):
        if self._path() != "/api/progress":
            return self._json(404, b'{"error":"not found"}')
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = -1
        if not 0 < length <= MAX_BODY:
            return self._json(413, b'{"error":"body too large or empty"}')
        try:
            ops = json.loads(self.rfile.read(length)).get("ops")
            with LOCK:
                state = apply_ops(read_progress(), ops)
                if PROGRESS.exists():
                    shutil.copyfile(PROGRESS, BACKUP)
                tmp = PROGRESS.with_suffix(".tmp")
                tmp.write_text(json.dumps(state, indent=1, ensure_ascii=False) + "\n")
                os.replace(tmp, PROGRESS)
                body = json.dumps(state).encode()
        except (ValueError, AttributeError) as e:
            return self._json(400, json.dumps({"error": str(e)}).encode())
        return self._json(200, body)

    def _json(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class Server(ThreadingHTTPServer):
    # The default backlog of 5 resets connections on macOS when a page load
    # opens more at once (scripts, fonts, a dozen STLs).
    request_queue_size = 64
    daemon_threads = True


def lan_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))
            return s.getsockname()[0]
    except OSError:
        return None


def main():
    ap = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    ap.add_argument("--port", type=int, default=8017)
    ap.add_argument("--lan", action="store_true",
                    help="listen on all interfaces so a phone on the same network can open it")
    ap.add_argument("--no-open", action="store_true", help="don't open a browser tab")
    args = ap.parse_args()

    host = "0.0.0.0" if args.lan else "127.0.0.1"
    handler = partial(Handler, directory=str(ROOT))
    try:
        server = Server((host, args.port), handler)
    except OSError:
        sys.exit(f"Port {args.port} is busy. Try: python3 site/serve.py --port {args.port + 1}")

    url = f"http://localhost:{args.port}/site/"
    print(f"QLOCK tracker  {url}")
    ip = lan_ip() if args.lan else None
    if ip:
        print(f"on your phone  http://{ip}:{args.port}/site/   (anyone on this network can tick things)")
    print(f"progress file  {PROGRESS.relative_to(ROOT)}")
    print("Ctrl+C to stop.\n")
    if not args.no_open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()
