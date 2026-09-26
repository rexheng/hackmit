#!/usr/bin/env python3
"""Static server so ES modules and trajectory JSON load."""

from __future__ import annotations

import http.server
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8060"))
    http.server.ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
