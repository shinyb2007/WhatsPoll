from flask import Flask, request, jsonify
import json
import os
import urllib.request
import urllib.parse
import traceback
import base64

app = Flask(__name__)

# --- 1. Environment Variable Loader ---
if os.path.exists('.env'):
    with open('.env', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                parts = line.split('=', 1)
                os.environ[parts[0].strip()] = parts[1].strip()

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

def is_supabase_enabled():
    return (
        SUPABASE_URL 
        and SUPABASE_ANON_KEY 
        and not SUPABASE_URL.startswith("https://your-project-id")
        and not SUPABASE_ANON_KEY.startswith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-key-here")
    )

# --- 2. Native JWT Claim Decoder ---
def decode_jwt_payload(jwt):
    try:
        parts = jwt.split('.')
        if len(parts) < 2:
            return {}
        payload_b64 = parts[1]
        padding = '=' * (4 - (len(payload_b64) % 4))
        decoded = base64.urlsafe_b64decode(payload_b64 + padding).decode('utf-8')
        return json.loads(decoded)
    except Exception as e:
        print(f"JWT payload decode failed: {e}")
        return {}

def get_user_id_from_jwt(jwt):
    if not jwt:
        return None
    payload = decode_jwt_payload(jwt)
    return payload.get('sub', None)

# --- 3. Automatic SQL Migrations check ---
def run_supabase_migrations():
    if not is_supabase_enabled():
        return
        
    db_pass = os.environ.get('SUPABASE_DB_PASSWORD', '')
    if not db_pass or db_pass.startswith("your-supabase-db"):
        print("SUPABASE_DB_PASSWORD not configured. Skipping automatic migrations.")
        return

    try:
        import pg8000.dbapi
    except ImportError:
        print("pg8000 library not found. Installing automatically...")
        try:
            import subprocess
            import sys
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pg8000"])
            import pg8000.dbapi
        except Exception as e:
            print(f"Failed to automatically install pg8000: {e}")
            return

    try:
        parsed = urllib.parse.urlparse(SUPABASE_URL)
        project_id = parsed.hostname.split('.')[0]
        db_host = f"db.{project_id}.supabase.co"
        
        print(f"Connecting to Supabase PostgreSQL database at {db_host}:5432...")
        conn = pg8000.dbapi.connect(
            host=db_host,
            database="postgres",
            user="postgres",
            password=db_pass,
            port=5432,
            timeout=10
        )
        cursor = conn.cursor()
        
        # Check if table public.polls exists
        cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'polls');")
        exists = cursor.fetchone()[0]
        
        if not exists:
            print("Supabase database tables not found. Automatically running schema creation from supabase_schema.sql...")
            if os.path.exists('supabase_schema.sql'):
                with open('supabase_schema.sql', 'r', encoding='utf-8') as f:
                    sql_script = f.read()
                
                statements = sql_script.split(';')
                for stmt in statements:
                    stmt = stmt.strip()
                    if stmt:
                        cursor.execute(stmt)
                conn.commit()
                print("Database migration and tables successfully initialized in Supabase!")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Failed to check/execute database migrations: {e}")

# Run schema migrations check at serverless function cold-boot
try:
    run_supabase_migrations()
except Exception as ex:
    print(f"Initial migration run exception ignored: {ex}")

# --- 4. Supabase API Helper ---
def supabase_api_call(endpoint, method='GET', body=None, user_jwt=None, is_auth=False):
    base_url = SUPABASE_URL.rstrip('/')
    api_path = "/auth/v1/" if is_auth else "/rest/v1/"
    url = f"{base_url}{api_path}{endpoint.lstrip('/')}"
    
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
    }
    
    if user_jwt:
        headers['Authorization'] = f"Bearer {user_jwt}"
    else:
        headers['Authorization'] = f"Bearer {SUPABASE_ANON_KEY}"
        
    if not is_auth:
        headers['Prefer'] = 'return=representation'

    data_payload = json.dumps(body).encode('utf-8') if body else None
    req = urllib.request.Request(url, data=data_payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            res_data = res.read().decode('utf-8')
            return json.loads(res_data) if res_data else []
    except urllib.error.HTTPError as he:
        err_payload = he.read().decode('utf-8')
        print(f"Supabase error response: {err_payload}")
        raise Exception(err_payload)
    except Exception as e:
        raise e

# --- 5. Supabase Auth API Helper ---
def supabase_auth_req(path, method='POST', body=None):
    url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/{path.lstrip('/')}"
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
    }
    data = json.dumps(body).encode('utf-8') if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=10) as res:
        return json.loads(res.read().decode('utf-8'))

# --- 6. OpenAI Client Helper ---
def openai_gpt_generate(prompt):
    if not OPENAI_API_KEY or OPENAI_API_KEY.startswith("sk-proj-your-openai"):
        return None
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    system_prompt = (
        "You are an expert poll assistant. Return a JSON object with keys: "
        "'question' (the formatted question), 'options' (array of objects with keys 'text' and 'emoji'), "
        "'time' (estimated completion time string, e.g. '1 min'), "
        "'advice' (brief 1-sentence design advice tip)."
    )
    user_prompt = f"Create a poll about: '{prompt}'"
    body = {
        "model": "gpt-3.5-turbo",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.7
    }
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as res:
            res_payload = json.loads(res.read().decode('utf-8'))
            content = res_payload['choices'][0]['message']['content']
            return json.loads(content)
    except Exception as e:
        print(f"OpenAI Generation API failed: {e}")
        return None

def get_request_jwt():
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return auth.split(' ', 1)[1]
    return request.headers.get('X-Supabase-Auth', None)

# --- 7. CORS Response Header Injector ---
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Supabase-Auth')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# --- 8. API Endpoint Routes ---

@app.route('/api/state', methods=['GET'])
def api_state():
    if not is_supabase_enabled():
        return jsonify({
            "error": "Supabase Connection Missing",
            "message": "The application requires SUPABASE_URL and SUPABASE_ANON_KEY to be configured."
        }), 503
        
    try:
        jwt = get_request_jwt()
        poll_id = request.args.get('poll_id')
        
        if poll_id:
            polls = supabase_api_call(f"polls?id=eq.{poll_id}", user_jwt=jwt)
        else:
            polls = supabase_api_call("polls?order=created_at.desc&limit=20", user_jwt=jwt)
            
        if not polls:
            return jsonify({
                "currentPoll": None,
                "votes": [],
                "history": [],
                "teams": {}
            })

        current = polls[0]
        current_id = current['id']
        
        # Fetch votes for current poll
        votes = supabase_api_call(f"votes?poll_id=eq.{current_id}", user_jwt=jwt)
        
        # Calculate metrics
        options = current.get('options', [])
        tallies = [0] * len(options)
        for v in votes:
            opt_txt = v.get('option_text', '')
            for idx, opt in enumerate(options):
                if opt.get('text') == opt_txt:
                    tallies[idx] += 1
                    
        winning_opt = "N/A"
        if votes:
            max_idx = tallies.index(max(tallies))
            winning_opt = options[max_idx].get('text', 'N/A')
            
        conf_avg = "0%"
        if votes:
            conf_sum = sum(v.get('confidence', 80) for v in votes)
            conf_avg = f"{round(conf_sum / len(votes))}%"

        current_poll_state = {
            "id": current_id,
            "title": current['title'],
            "description": current.get('description', ''),
            "options": options,
            "completionTime": current.get('completion_time', '1 min'),
            "responsesCount": len(votes),
            "winningOption": winning_opt,
            "confidenceAvg": conf_avg,
            "voteCounts": tallies
        }

        # Construct history array
        history = []
        for p in polls:
            opts = p.get('options', [])
            history.append({
                "id": p['id'],
                "question": p['title'],
                "choiceText": "Created by community",
                "choiceEmoji": opts[0].get('emoji', '💡') if opts else '💡',
                "date": p['created_at'][:10],
                "type": "created",
                "favorite": False,
                "responses": 0
            })

        # Fetch teams
        db_teams = supabase_api_call("teams", user_jwt=jwt)
        teams_state = {}
        for t in db_teams:
            tid = t['id']
            mems = supabase_api_call(f"team_members?team_id=eq.{tid}", user_jwt=jwt)
            teams_state[tid] = {
                "name": t['name'],
                "desc": t.get('description', ''),
                "membersCount": len(mems),
                "pollsCount": 0,
                "visibility": "Private",
                "members": [
                    {
                        "name": m.get('email', '').split('@')[0].capitalize(),
                        "email": m['email'],
                        "role": m.get('role', 'Member'),
                        "permissions": m.get('permissions', 'Vote & Create')
                    } for m in mems
                ]
            }

        state = {
            "currentPoll": current_poll_state,
            "votes": [
                {
                    "optionText": v['option_text'],
                    "optionEmoji": v.get('option_emoji', '💡'),
                    "confidence": v.get('confidence', 80),
                    "reason": v.get('reason', ''),
                    "timestamp": "Now"
                } for v in votes
            ],
            "history": history,
            "teams": teams_state
        }
        return jsonify(state)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Failed to sync with Supabase PostgreSQL.", "detail": str(e)}), 500

@app.route('/api/poll', methods=['POST'])
def api_create_poll():
    if not is_supabase_enabled():
        return jsonify({"error": "Supabase Connection Missing"}), 503
        
    payload = request.json or {}
    question = payload.get('question', 'Untitled Poll')
    options = payload.get('options', [])
    completion_time = payload.get('time', '1 min')
    advice = payload.get('advice', 'Select your choice.')

    try:
        jwt = get_request_jwt()
        user_id = get_user_id_from_jwt(jwt)
        poll_row = {
            "title": question,
            "description": advice,
            "options": options,
            "completion_time": completion_time,
            "created_by": user_id
        }
        supabase_api_call("polls", method='POST', body=poll_row, user_jwt=jwt)
        return api_state()
    except Exception as e:
        return jsonify({"error": "Failed to create poll in Supabase.", "detail": str(e)}), 500

@app.route('/api/vote', methods=['POST'])
def api_submit_vote():
    if not is_supabase_enabled():
        return jsonify({"error": "Supabase Connection Missing"}), 503

    payload = request.json or {}
    option_text = payload.get('optionText')
    option_emoji = payload.get('optionEmoji', '💡')
    confidence = payload.get('confidence', 80)
    reason = payload.get('reason', '')

    try:
        jwt = get_request_jwt()
        user_id = get_user_id_from_jwt(jwt)
        
        polls = supabase_api_call("polls?order=created_at.desc&limit=1", user_jwt=jwt)
        if not polls:
            return jsonify({"error": "No active poll found to vote on."}), 400
        
        poll_id = polls[0]['id']
        
        if user_id:
            try:
                supabase_api_call(f"votes?poll_id=eq.{poll_id}&user_id=eq.{user_id}", method='DELETE', user_jwt=jwt)
            except Exception:
                pass
                
        vote_row = {
            "poll_id": poll_id,
            "user_id": user_id,
            "option_text": option_text,
            "option_emoji": option_emoji,
            "confidence": confidence,
            "reason": reason
        }
        supabase_api_call("votes", method='POST', body=vote_row, user_jwt=jwt)
        return api_state()
    except Exception as e:
        return jsonify({"error": "Failed to submit vote.", "detail": str(e)}), 500

@app.route('/api/team/member', methods=['POST'])
def api_add_member():
    if not is_supabase_enabled():
        return jsonify({"error": "Supabase Connection Missing"}), 503

    payload = request.json or {}
    team_id = payload.get('space')
    email = payload.get('email')
    role = payload.get('role', 'Member')
    permissions = payload.get('permissions', 'Vote & Create')

    try:
        jwt = get_request_jwt()
        member_row = {
            "team_id": team_id,
            "email": email,
            "role": role,
            "permissions": permissions
        }
        supabase_api_call("team_members", method='POST', body=member_row, user_jwt=jwt)
        return api_state()
    except Exception as e:
        return jsonify({"error": "Failed to add team member.", "detail": str(e)}), 500

@app.route('/api/team/member/delete', methods=['POST'])
def api_delete_member():
    if not is_supabase_enabled():
        return jsonify({"error": "Supabase Connection Missing"}), 503

    payload = request.json or {}
    team_id = payload.get('space')
    email = payload.get('email')

    try:
        jwt = get_request_jwt()
        supabase_api_call(f"team_members?team_id=eq.{team_id}&email=eq.{email}", method='DELETE', user_jwt=jwt)
        return api_state()
    except Exception as e:
        return jsonify({"error": "Failed to delete team member.", "detail": str(e)}), 500

@app.route('/api/auth/signup', methods=['POST'])
def api_auth_signup():
    if not is_supabase_enabled():
        return jsonify({"error": "Supabase Connection Missing"}), 503
    try:
        res = supabase_auth_req('signup', method='POST', body=request.json)
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": "Authentication failed.", "detail": str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def api_auth_login():
    if not is_supabase_enabled():
        return jsonify({"error": "Supabase Connection Missing"}), 503
    try:
        res = supabase_auth_req('token?grant_type=password', method='POST', body=request.json)
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": "Authentication failed.", "detail": str(e)}), 500

@app.route('/api/ai/generate', methods=['POST'])
def api_ai_generate():
    payload = request.json or {}
    prompt = payload.get('prompt', '')
    if not prompt:
        return jsonify({"error": "Prompt query parameter is required."}), 400
        
    gpt_result = openai_gpt_generate(prompt)
    if gpt_result:
        return jsonify(gpt_result)
    else:
        return jsonify({
            "question": prompt,
            "options": [
                { "text": "Option 1: Proceed immediately", "emoji": "⚡" },
                { "text": "Option 2: Schedule pilot test", "emoji": "⚙️" }
            ],
            "time": "1 min",
            "advice": "Simple phrasing detected. Ensure options are mutually exclusive."
        })

# local standalone testing execution
if __name__ == '__main__':
    app.run(port=PORT)
