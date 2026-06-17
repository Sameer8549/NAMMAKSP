import httpx
import json
import uuid
import sys

# Reconfigure stdout to use UTF-8 to prevent UnicodeEncodeError on Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

URL = "http://127.0.0.1:8002/api"

def test_chatbot_language_routing():
    session_id = str(uuid.uuid4())
    print(f"Starting language routing chat test with session_id: {session_id}")
    
    # Test Case 1: English Query, Kannada Selection
    payload1 = {
        "message": "Who are the top offenders?",
        "session_id": session_id,
        "language": "kn-IN"
    }
    print(f"\nSending English message with Kannada selection: '{payload1['message']}'")
    r1 = httpx.post(f"{URL}/chat", json=payload1, timeout=30.0)
    assert r1.status_code == 200, f"Expected 200, got {r1.status_code}: {r1.text}"
    res1 = r1.json()
    print("Response received!")
    print(f"Model used: {res1.get('model')}")
    print(f"Response (first 250 chars):\n{res1.get('response')[:250]}...")
    
    # Assert that response contains Kannada unicode block characters
    kannada_char_count = sum(1 for char in res1.get('response') if '\u0A80' <= char <= '\u0DFF')
    print(f"Kannada character count in response: {kannada_char_count}")
    assert kannada_char_count > 20, "Expected Kannada response for Kannada selection, but response lacked Kannada text."

    # Test Case 2: Kannada Query, English Selection
    payload2 = {
        "message": "ಮೈಸೂರಿನಲ್ಲಿ ಕನ್ನಗಳ್ಳತನ ಪ್ರಕರಣಗಳನ್ನು ತೋರಿಸಿ.",
        "session_id": session_id,
        "language": "en-US"
    }
    print(f"\nSending Kannada message with English selection: '{payload2['message']}'")
    r2 = httpx.post(f"{URL}/chat", json=payload2, timeout=30.0)
    assert r2.status_code == 200, f"Expected 200, got {r2.status_code}: {r2.text}"
    res2 = r2.json()
    print("Response received!")
    print(f"Response (first 250 chars):\n{res2.get('response')[:250]}...")
    
    # Assert that response contains predominantly English/ASCII and is structured
    english_char_count = sum(1 for char in res2.get('response') if 'a' <= char.lower() <= 'z')
    print(f"English character count in response: {english_char_count}")
    assert english_char_count > 100, "Expected English response for English selection."

if __name__ == "__main__":
    test_chatbot_language_routing()
