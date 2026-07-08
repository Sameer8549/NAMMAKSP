#!/usr/bin/env python
"""Run a small live reliability eval against the NAMMA KSP chat API.

The eval intentionally requires an explicit authenticated session. For Catalyst
auth, pass the browser Cookie header through EVAL_AUTH_COOKIE or --cookie. For
demo mode, pass EVAL_AUTH_TOKEN or --token.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass
from typing import Iterable

import httpx


DEFAULT_BASE_URL = os.getenv(
    "EVAL_BASE_URL",
    "https://namma-ksp-50043229029.development.catalystappsail.in",
)


@dataclass(frozen=True)
class EvalCase:
    name: str
    message: str
    expected_any: tuple[str, ...] = ()
    language: str = "en-US"
    require_sources: bool = True
    require_citation: bool = False


CASES: tuple[EvalCase, ...] = (
    EvalCase("greeting-short", "hi", ("case", "offender", "crime pattern"), require_sources=False),
    EvalCase("overall-summary", "Give total crime overview", ("crime", "fir"), require_citation=True),
    EvalCase("top-crimes", "What are the top crime types?", ("theft", "burglary", "drug", "fraud"), require_citation=True),
    EvalCase("recent-cases", "Show recent FIRs", ("FIR", "recent"), require_citation=True),
    EvalCase("district-mysuru", "Analyze crime trend in Mysuru", ("Mysuru", "trend", "crime"), require_citation=True),
    EvalCase("district-bengaluru", "How many theft cases in Bengaluru?", ("Bengaluru", "theft"), require_citation=True),
    EvalCase("crime-burglary", "Which districts have burglary?", ("burglary", "district"), require_citation=True),
    EvalCase("financial", "Analyze financial fraud patterns", ("financial", "fraud"), require_citation=True),
    EvalCase("cyber", "Give cyber crime hotspots", ("cyber", "hotspot", "district"), require_citation=True),
    EvalCase("high-risk", "List high risk repeat offenders", ("OFF", "risk", "offender"), require_citation=True),
    EvalCase("forecast", "Forecast emerging hotspots", ("forecast", "hotspot", "risk"), require_citation=True),
    EvalCase("network", "Identify criminal network relationships", ("relationship", "network", "offender"), require_citation=True),
    EvalCase("decision-support", "Recommend investigation leads for theft", ("recommend", "lead", "theft"), require_citation=True),
    EvalCase("explainable", "Explain the evidence for current active cases", ("evidence", "active", "case"), require_citation=True),
    EvalCase("simple-factual", "How many districts are monitored?", ("district"), require_citation=True),
    EvalCase("kannada-greeting", "ನಮಸ್ಕಾರ", ("ಪ್ರಕರಣ", "ಅಪರಾಧ", "ನಮಸ್ಕಾರ"), language="kn-IN", require_sources=False),
    EvalCase("kannada-query", "ಮೈಸೂರಿನಲ್ಲಿ ಅಪರಾಧ ಪ್ರವೃತ್ತಿ ತಿಳಿಸಿ", ("ಮೈಸೂರು", "ಅಪರಾಧ"), language="kn-IN", require_citation=True),
    EvalCase("case-specific", "Show details of FIR00001", ("FIR00001", "case"), require_citation=True),
    EvalCase("offender-specific", "Show profile of OFF00001", ("OFF00001", "offender", "risk"), require_citation=True),
    EvalCase("thanks-short", "thank you", ("welcome", "support"), require_sources=False),
)


def _contains_any(text: str, terms: Iterable[str]) -> bool:
    folded = text.casefold()
    return any(term.casefold() in folded for term in terms)


def run_case(client: httpx.Client, case: EvalCase, index: int) -> tuple[bool, str]:
    response = client.post(
        "/api/chat",
        json={
            "message": case.message,
            "session_id": f"eval-{int(time.time())}-{index}",
            "language": case.language,
        },
    )
    if response.status_code != 200:
        return False, f"HTTP {response.status_code}: {response.text[:180]}"

    payload = response.json()
    answer = payload.get("response", "")
    sources = payload.get("sources") or []

    if not answer:
        return False, "empty response"
    if case.expected_any and not _contains_any(answer, case.expected_any):
        return False, f"missing expected terms {case.expected_any}; answer={answer[:180]!r}"
    if case.require_sources and not sources:
        return False, "missing sources"
    if case.require_sources and sources and not sources[0].get("evidence_excerpt"):
        return False, "source missing evidence excerpt"
    if case.require_citation and "[S1]" not in answer:
        return False, "missing [S1] citation"
    if not case.require_sources and sources:
        return False, "conversational turn unexpectedly returned database sources"

    return True, "ok"


def main() -> int:
    parser = argparse.ArgumentParser(description="Run NAMMA KSP live chat evals.")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--token", default=os.getenv("EVAL_AUTH_TOKEN", ""))
    parser.add_argument("--cookie", default=os.getenv("EVAL_AUTH_COOKIE", ""))
    parser.add_argument("--timeout", type=float, default=45.0)
    args = parser.parse_args()

    headers = {"Accept": "application/json"}
    if args.token:
        headers["Authorization"] = f"Bearer {args.token}"
    if args.cookie:
        headers["Cookie"] = args.cookie

    if not args.token and not args.cookie:
        print("Refusing to run without EVAL_AUTH_COOKIE or EVAL_AUTH_TOKEN.", file=sys.stderr)
        return 2

    passed = 0
    with httpx.Client(base_url=args.base_url.rstrip("/"), headers=headers, timeout=args.timeout) as client:
        for index, case in enumerate(CASES, start=1):
            ok, detail = run_case(client, case, index)
            status = "PASS" if ok else "FAIL"
            print(f"{status:4} {case.name}: {detail}")
            passed += int(ok)

    total = len(CASES)
    print(f"\n{passed}/{total} eval cases passed.")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
