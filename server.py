from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import os, csv, time

app = Flask(__name__)
CORS(app)

# ================================
# 📂 File Storage — one CSV per session
# ================================
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Define headers for new session files
click_headers = [
    'sessionId','round','coinId',
    'coin_color','coin_value','points_gained',
    'screen_x','screen_y',
    'timestamp_client_ms','timeLeft_client_s','score_after_click',
    'server_received_ms'
]

event_headers = [
    'sessionId','type','round',
    'timestamp_client_ms','server_received_ms',
    'timeLeft_at_start','timeLeft_at_end',
    'round_time_ms','total_score_after_round','final_score'
]


def ensure_csv_has_header(path, headers):
    """Creates CSV file with header if it doesn’t exist."""
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        with open(path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)


# ================================
# 🪙 Endpoint: coin clicks
# ================================
@app.route('/api/coin_pickup', methods=['POST', 'OPTIONS'])
def coin_pickup():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return response

    data = request.get_json(force=True)

    session_id = data.get('sessionId')
    if not session_id:
        return jsonify({'error': 'Missing sessionId'}), 400

    # determine file path based on session id
    click_file = os.path.join(BASE_DIR, f"{session_id}_clicks.csv")
    ensure_csv_has_header(click_file, click_headers)

    screen_pos = data.get('screenPos', {})
    row = [
        session_id,
        data.get('round'),
        data.get('coinId'),
        data.get('coin_color'),
        data.get('coin_value'),
        data.get('points_gained'),
        screen_pos.get('x'),
        screen_pos.get('y'),
        data.get('timestamp'),
        data.get('timeLeft'),
        data.get('score_after_click'),
        int(time.time() * 1000)
    ]

    with open(click_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(row)

    print(f"💾 Logged click for {session_id}: {data.get('coinId')} ({data.get('coin_value')} pts)")
    return jsonify({'status': 'ok'})


# ================================
# 🎮 Endpoint: round/session events
# ================================
@app.route('/api/round_event', methods=['POST', 'OPTIONS'])
def round_event():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return response

    data = request.get_json(force=True)

    session_id = data.get('sessionId')
    if not session_id:
        return jsonify({'error': 'Missing sessionId'}), 400

    # determine file path based on session id
    event_file = os.path.join(BASE_DIR, f"{session_id}_events.csv")
    ensure_csv_has_header(event_file, event_headers)

    row = [
        session_id,
        data.get('type'),
        data.get('round'),
        data.get('timestamp'),
        int(time.time() * 1000),
        data.get('timeLeft_at_start'),
        data.get('timeLeft_at_end'),
        data.get('round_time_ms'),
        data.get('total_score_after_round'),
        data.get('final_score')
    ]

    with open(event_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(row)

    print(f"📝 Logged event for {session_id}: {data.get('type')}")
    return jsonify({'status': 'ok'})


# ================================
# ✅ Sanity check endpoint
# ================================
@app.route('/')
def index():
    return jsonify({'status': 'running', 'message': 'Coin Game backend active'})


# ================================
# 🚀 Run server
# ================================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
