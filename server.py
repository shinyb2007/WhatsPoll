import http.server
import json
import os
import urllib.request
import urllib.parse
import traceback

PORT = int(os.environ.get('PORT', 8000))

# --- 1. Environment Variable Loader ---
SUPABASE_URL = ""
SUPABASE_ANON_KEY = ""
OPENAI_API_KEY = ""

def load_env():
    global SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    parts = line.split('=', 1)
                    key = parts[0].strip()
                    val = parts[1].strip()
                    os.environ[key] = val
                    
    SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
    SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

load_env()

def is_supabase_enabled():
    return (
        SUPABASE_URL 
        and SUPABASE_ANON_KEY 
        and not SUPABASE_URL.startswith("https://your-project-id")
        and not SUPABASE_ANON_KEY.startswith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-key-here")
    )

print("WhatsPoll Backend Configurations:")
print(f"- Port: {PORT}")
print(f"- Supabase Enabled: {is_supabase_enabled()}")
if not is_supabase_enabled():
    print("WARNING: Supabase URL and Anon Key are missing or are default placeholders. All database calls will fail with 503 Service Unavailable.")

# --- 2. Supabase API Helper ---
def supabase_api_call(endpoint, method='GET', body=None, user_jwt=None, is_auth=False):
    base_url = SUPABASE_URL.rstrip('/')
    api_path = "/auth/v1/" if is_auth else "/rest/v1/"
    url = f"{base_url}{api_path}{endpoint.lstrip('/')}"
    
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
    }
    
    # Forward user JWT token for RLS validation if available
    if user_jwt:
        headers['Authorization'] = f"Bearer {user_jwt}"
    else:
        headers['Authorization'] = f"Bearer {SUPABASE_ANON_KEY}"
        
    if not is_auth:
        headers['Prefer'] = 'return=representation'

    data_payload = json.dumps(body).encode('utf-8') if body else None
    
    req = urllib.request.Request(url, data=data_payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            res_data = res.read().decode('utf-8')
            return json.loads(res_data) if res_data else []
    except urllib.error.HTTPError as he:
        err_msg = he.read().decode('utf-8')
        print(f"Supabase HTTP Error [{he.code}] on {method} {url}: {err_msg}")
        raise Exception(err_msg)
    except Exception as e:
        print(f"Supabase Request Error on {method} {url}: {e}")
        raise e

# --- 3. OpenAI Client Helper ---
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

# --- 4. Main HTTP Request Router ---
class WhatsPollHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching for API development convenience
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Supabase-Auth')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def get_user_jwt(self):
        # Read user authentication JWT token from headers
        auth = self.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            return auth.split(' ', 1)[1]
        return self.headers.get('X-Supabase-Auth', None)

    def do_GET(self):
        if self.path == '/api/state':
            self.handle_get_state()
        else:
            super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b''
        
        try:
            payload = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception:
            payload = {}

        if self.path == '/api/poll':
            self.handle_create_poll(payload)
        elif self.path == '/api/vote':
            self.handle_submit_vote(payload)
        elif self.path == '/api/team/member':
            self.handle_add_member(payload)
        elif self.path == '/api/team/member/delete':
            self.handle_delete_member(payload)
        elif self.path == '/api/auth/signup':
            self.handle_auth_action('signup', payload)
        elif self.path == '/api/auth/login':
            self.handle_auth_action('token?grant_type=password', payload)
        elif self.path == '/api/ai/generate':
            self.handle_ai_generate(payload)
        else:
            self.send_response(404)
            self.end_headers()

    def respond_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def verify_supabase_connection(self):
        if not is_supabase_enabled():
            self.respond_json(503, {
                "error": "Supabase Connection Missing",
                "message": "The application requires SUPABASE_URL and SUPABASE_ANON_KEY to be configured in your .env file."
            })
            return False
        return True

    def handle_get_state(self):
        if not self.verify_supabase_connection():
            return
            
        try:
            jwt = self.get_user_jwt()
            # 1. Fetch polls
            polls = supabase_api_call("polls?order=created_at.desc&limit=20", user_jwt=jwt)
            
            if not polls:
                self.respond_json(200, {
                    "currentPoll": None,
                    "votes": [],
                    "history": [],
                    "teams": {}
                })
                return

            current = polls[0]
            poll_id = current['id']
            
            # 2. Fetch votes for current poll
            votes = supabase_api_call(f"votes?poll_id=eq.{poll_id}", user_jwt=jwt)
            
            # 3. Calculate metrics
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
                "id": poll_id,
                "title": current['title'],
                "description": current.get('description', ''),
                "options": options,
                "completionTime": current.get('completion_time', '1 min'),
                "responsesCount": len(votes),
                "winningOption": winning_opt,
                "confidenceAvg": conf_avg,
                "voteCounts": tallies
            }

            # 4. Construct history array
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

            # 5. Fetch teams
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
            self.respond_json(200, state)
        except Exception as e:
            traceback.print_exc()
            self.respond_json(500, {"error": "Failed to sync with Supabase PostgreSQL.", "detail": str(e)})

    def handle_create_poll(self, payload):
        if not self.verify_supabase_connection():
            return

        question = payload.get('question', 'Untitled Poll')
        options = payload.get('options', [])
        completion_time = payload.get('time', '1 min')
        advice = payload.get('advice', 'Select your choice.')

        try:
            jwt = self.get_user_jwt()
            poll_row = {
                "title": question,
                "description": advice,
                "options": options,
                "completion_time": completion_time
            }
            # Insert new poll
            inserted_poll = supabase_api_call("polls", method='POST', body=poll_row, user_jwt=jwt)
            # Fetch updated state
            self.handle_get_state()
        except Exception as e:
            self.respond_json(500, {"error": "Failed to create poll in Supabase.", "detail": str(e)})

    def handle_submit_vote(self, payload):
        if not self.verify_supabase_connection():
            return

        option_text = payload.get('optionText')
        option_emoji = payload.get('optionEmoji', '💡')
        confidence = payload.get('confidence', 80)
        reason = payload.get('reason', '')

        try:
            jwt = self.get_user_jwt()
            # Fetch latest active poll
            polls = supabase_api_call("polls?order=created_at.desc&limit=1", user_jwt=jwt)
            if not polls:
                self.respond_json(400, {"error": "No active poll found to vote on."})
                return
            
            poll_id = polls[0]['id']
            vote_row = {
                "poll_id": poll_id,
                "option_text": option_text,
                "option_emoji": option_emoji,
                "confidence": confidence,
                "reason": reason
            }
            
            supabase_api_call("votes", method='POST', body=vote_row, user_jwt=jwt)
            self.handle_get_state()
        except Exception as e:
            self.respond_json(500, {"error": "Failed to submit vote to Supabase PostgreSQL.", "detail": str(e)})

    def handle_add_member(self, payload):
        if not self.verify_supabase_connection():
            return

        team_id = payload.get('space')
        email = payload.get('email')
        role = payload.get('role', 'Member')
        permissions = payload.get('permissions', 'Vote & Create')

        try:
            jwt = self.get_user_jwt()
            member_row = {
                "team_id": team_id,
                "email": email,
                "role": role,
                "permissions": permissions
            }
            supabase_api_call("team_members", method='POST', body=member_row, user_jwt=jwt)
            self.handle_get_state()
        except Exception as e:
            self.respond_json(500, {"error": "Failed to add team member to Supabase.", "detail": str(e)})

    def handle_delete_member(self, payload):
        if not self.verify_supabase_connection():
            return

        team_id = payload.get('space')
        email = payload.get('email')

        try:
            jwt = self.get_user_jwt()
            supabase_api_call(f"team_members?team_id=eq.{team_id}&email=eq.{email}", method='DELETE', user_jwt=jwt)
            self.handle_get_state()
        except Exception as e:
            self.respond_json(500, {"error": "Failed to delete team member from Supabase.", "detail": str(e)})

    def handle_auth_action(self, action_path, payload):
        if not self.verify_supabase_connection():
            return

        try:
            res = supabase_auth_req(action_path, method='POST', body=payload)
            self.respond_json(200, res)
        except Exception as e:
            self.respond_json(500, {"error": "Supabase Authentication failed.", "detail": str(e)})

    def handle_ai_generate(self, payload):
        prompt = payload.get('prompt', '')
        if not prompt:
            self.respond_json(400, {"error": "Prompt query parameter is required."})
            return
            
        gpt_result = openai_gpt_generate(prompt)
        if gpt_result:
            self.respond_json(200, gpt_result)
        else:
            # Fallback to templates
            self.respond_json(200, {
                "question": prompt,
                "options": [
                    { "text": "Option 1: Proceed immediately", "emoji": "⚡" },
                    { "text": "Option 2: Schedule pilot test", "emoji": "⚙️" }
                ],
                "time": "1 min",
                "advice": "Simple phrasing detected. Ensure options are mutually exclusive."
            })

# Set proper MIME mappings for standard files
WhatsPollHandler.extensions_map.update({
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.html': 'text/html',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
})

if __name__ == '__main__':
    server_address = ('', PORT)
    httpd = http.server.HTTPServer(server_address, WhatsPollHandler)
    print(f"WhatsPoll Backend running at http://localhost:{PORT}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
