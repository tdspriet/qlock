#!/usr/bin/env python3
"""
The QLOCK build tracker.

    python3 site/serve.py          opens http://localhost:8017
    python3 site/serve.py --lan    also reachable from a phone on the same Wi-Fi

Serves only this folder. Ticks are saved in site/progress.json.
"""
import argparse
import json
import socket
import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SITE = Path(__file__).resolve().parent
PROGRESS = SITE / "progress.json"
LOCK = threading.Lock()


def load():
    try:
        done = json.loads(PROGRESS.read_text()).get("done", {})
        return done if isinstance(done, dict) else {}
    except (OSError, ValueError, AttributeError):
        return {}


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def reply(self, done):
        body = json.dumps({"done": done}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split("?")[0] == "/progress":
            return self.reply(load())
        return super().do_GET()

    def do_POST(self):
        """Body: {"id": "step-id", "done": true or false}"""
        try:
            tick = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)))
            step, on = str(tick["id"])[:60], bool(tick["done"])
        except (ValueError, KeyError, TypeError):
            return self.send_error(400)
        with LOCK:
            done = load()
            if on:
                done[step] = True
            else:
                done.pop(step, None)
            PROGRESS.write_text(json.dumps({"done": done}, indent=1, sort_keys=True) + "\n")
        self.reply(done)


def main():
    ap = argparse.ArgumentParser(description="The QLOCK build tracker.")
    ap.add_argument("--port", type=int, default=8017)
    ap.add_argument("--lan", action="store_true", help="let a phone on the same Wi-Fi open it")
    args = ap.parse_args()

    handler = partial(Handler, directory=str(SITE))
    try:
        server = ThreadingHTTPServer(("0.0.0.0" if args.lan else "127.0.0.1", args.port), handler)
    except OSError:
        raise SystemExit(f"Port {args.port} is in use. Try: python3 site/serve.py --port {args.port + 1}")

    url = f"http://localhost:{args.port}"
    print(f"QLOCK tracker: {url}")
    if args.lan:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            try:
                s.connect(("10.255.255.255", 1))
                print(f"On your phone: http://{s.getsockname()[0]}:{args.port}")
            except OSError:
                pass
    print("Ctrl+C to stop.")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
