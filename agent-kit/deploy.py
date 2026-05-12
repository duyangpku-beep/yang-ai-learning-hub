"""
yang-html-deploy.py
Deploy any HTML string to Vercel via REST API — no CLI required.
Works from any environment: Tencent Cloud SCF, container, local script, etc.

Usage:
    python3 deploy.py --slug "meeting-report-20260512" --file report.html
    python3 deploy.py --slug "my-report" --html "<html>...</html>"

Requires:
    VERCEL_TOKEN environment variable  (get from: vercel.com/account/tokens)

Returns:
    Stable public URL, e.g. https://yang-meeting-report-20260512.vercel.app
"""

import os, sys, json, time, argparse
try:
    import urllib.request as req
except ImportError:
    raise SystemExit("Python 3.4+ required")


VERCEL_API = "https://api.vercel.com"


def deploy(slug: str, html_content: str, token: str) -> str:
    """
    Deploy html_content to Vercel as project `yang-{slug}`.
    Returns the stable (aliased) deployment URL.
    """
    project_name = f"yang-{slug}"

    payload = json.dumps({
        "name": project_name,
        "files": [
            {
                "file": "index.html",
                "data": html_content,
                "encoding": "utf-8"
            }
        ],
        "projectSettings": {
            "framework": None
        },
        "target": "production"
    }).encode("utf-8")

    request = req.Request(
        f"{VERCEL_API}/v13/deployments",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST"
    )

    try:
        with req.urlopen(request, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        raise SystemExit(f"Deployment request failed: {e}")

    deployment_id = body.get("id", "")
    deployment_url = body.get("url", "")

    if not deployment_url:
        raise SystemExit(f"Unexpected response: {json.dumps(body, indent=2)}")

    # Poll until ready (usually <10s)
    stable_url = _wait_for_ready(deployment_id, token)
    return stable_url or f"https://{deployment_url}"


def _wait_for_ready(deployment_id: str, token: str, timeout: int = 60) -> str:
    """Poll deployment status, return aliased URL when live."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        request = req.Request(
            f"{VERCEL_API}/v13/deployments/{deployment_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        try:
            with req.urlopen(request, timeout=10) as resp:
                body = json.loads(resp.read().decode("utf-8"))
        except Exception:
            time.sleep(2)
            continue

        state = body.get("readyState", "")
        alias = body.get("alias", [])

        if state == "READY" and alias:
            return f"https://{alias[0]}"
        if state in ("ERROR", "CANCELED"):
            raise SystemExit(f"Deployment failed with state: {state}")

        time.sleep(2)

    # Timeout — return best-effort URL
    return ""


def main():
    parser = argparse.ArgumentParser(description="Deploy HTML to Vercel via API")
    parser.add_argument("--slug", required=True,
                        help="Project slug, e.g. meeting-report-20260512")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--file", help="Path to HTML file")
    group.add_argument("--html", help="Raw HTML string")
    args = parser.parse_args()

    token = os.environ.get("VERCEL_TOKEN", "").strip()
    if not token:
        raise SystemExit(
            "VERCEL_TOKEN environment variable not set.\n"
            "Get a token at: https://vercel.com/account/tokens\n"
            "Then: export VERCEL_TOKEN=your_token_here"
        )

    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            html_content = f.read()
    else:
        html_content = args.html

    print(f"Deploying yang-{args.slug} to Vercel...")
    url = deploy(args.slug, html_content, token)
    print(f"\n✅ Live at: {url}\n")
    # Also print bare URL for easy piping / parsing
    print(url)


# ── Importable API ─────────────────────────────────────────────────────────────

def deploy_html(slug: str, html: str) -> str:
    """
    One-liner for use inside agent code:

        from deploy import deploy_html
        url = deploy_html("my-report-20260512", html_string)

    Reads VERCEL_TOKEN from environment.
    """
    token = os.environ.get("VERCEL_TOKEN", "").strip()
    if not token:
        raise ValueError("VERCEL_TOKEN not set")
    return deploy(slug, html, token)


if __name__ == "__main__":
    main()
