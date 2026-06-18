import json
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler, HTTPServer


HOST = "0.0.0.0"
PORT = int(os.getenv("X_ZOHO_CATALYST_LISTEN_PORT") or os.getenv("PORT") or "8000")
VENDOR_DIR = os.path.join(os.path.dirname(__file__), ".appsail_deps")
if os.path.isdir(VENDOR_DIR):
    sys.path.insert(0, VENDOR_DIR)


def run_fallback(error_text):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            body = json.dumps({
                "status": "startup_error",
                "detail": error_text,
            }).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format, *args):
            return

    HTTPServer((HOST, PORT), Handler).serve_forever()


try:
    import uvicorn

    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=False, log_level="info")
except Exception:
    run_fallback(traceback.format_exc())
