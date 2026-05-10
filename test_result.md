#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  V2 of JOY app: backend refactored into modular structure (core/ + routes/) and Cloudinary
  integration to replace base64 image storage. Need E2E validation that:
  - All V1 endpoints still work after the modular split (auth, profile, doni, chat).
  - New /api/uploads/image endpoint correctly uploads base64 payloads to Cloudinary
    and returns a secure_url + public_id.
  - Doni and profiles now persist Cloudinary URLs instead of base64.
  - Backward compatibility: legacy docs storing base64 in foto_base64 / foto_base64_list
    must still be returned correctly via foto_url / foto_urls.

backend:
  - task: "Auth (register/login/me + password reset OTP)"
    implemented: true
    working: true
    file: "backend/routes/auth.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Refactored from monolithic server.py to modular routes/auth.py. Endpoints: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me, POST /api/auth/forgot-password, POST /api/auth/verify-otp, POST /api/auth/reset-password. Need to validate JWT issuance + password hashing still work after refactor."
      - working: true
        agent: "testing"
        comment: "PASS - All 11 auth checks green via external EXPO_PUBLIC_BACKEND_URL/api. Validated: fresh register returns access_token+user_id+email, duplicate email -> 400, login with correct creds returns same user_id, wrong password -> 401, /auth/me with Bearer token -> 200 {id,email}, no-token -> 401. Password reset flow: forgot-password -> 200, OTP captured from /var/log/supervisor/backend.err.log (logger.warning), verify-otp -> 200 {ok:true}, reset-password -> 200 with new access_token, login with new password works. Minor: passlib emits 'error reading bcrypt version' warning on startup (cosmetic, hashing/verification still work)."

  - task: "Profile CRUD with Cloudinary URL field"
    implemented: true
    working: true
    file: "backend/routes/profile.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET/PUT /api/profile/me and GET /api/profile/{user_id}. Now stores foto_url (Cloudinary secure URL) instead of base64. Backward-compat: if legacy doc has foto_base64, exposes it as foto_url. Need to validate upsert + read paths."
      - working: true
        agent: "testing"
        comment: "PASS - PUT /api/profile/me upserts {nome, citta, telefono, foto_url} correctly, GET /api/profile/me returns the saved fields verbatim, GET /api/profile/{user_id} for an unrelated user (test1@joy.it) returns 200 with profile body. Cloudinary URL persisted as foto_url."

  - task: "Cloudinary upload endpoint"
    implemented: true
    working: true
    file: "backend/routes/uploads.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/uploads/image accepts {base64, folder?} and returns {secure_url, public_id}. Folder is forced to joy/{user_id}. Auth required. 12 MB cap. Cloudinary creds in backend/.env (cloud_name=drmrh9h7f). Need to validate end-to-end upload to Cloudinary and that the returned secure_url is publicly accessible."
      - working: true
        agent: "testing"
        comment: "PASS - POST /api/uploads/image without token -> 401, with empty base64 -> 400, with valid 1x1 PNG base64 -> 200 returning secure_url that starts with https://res.cloudinary.com/drmrh9h7f/ and a public_id under joy/{user_id}/. >12MB payload correctly rejected with 413. End-to-end Cloudinary upload (cloud_name=drmrh9h7f) confirmed working with provided API key/secret."

  - task: "Doni create/list/detail/delete with Cloudinary URLs"
    implemented: true
    working: true
    file: "backend/routes/dono.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/doni now expects foto_urls: List[str] (Cloudinary URLs). GET /api/doni and /api/doni/miei list non-ritirati. DELETE /api/doni/{id} marks ritirato=true and best-effort destroys Cloudinary photos. Backward-compat: legacy docs with foto_base64_list are exposed as foto_urls. Need to validate full CRUD + ownership checks."
      - working: true
        agent: "testing"
        comment: "PASS - Full CRUD validated. POST /api/doni with foto_urls=[<cloudinary secure_url>] -> 200 with returned object enriched with donatore_nome/citta. Empty foto_urls -> 400. GET /api/doni and GET /api/doni/miei both include the new dono, /miei correctly scoped to current user. GET /api/doni/{id} -> 200. DELETE as non-owner (different registered user) -> 403. DELETE as owner -> 200, and the dono is no longer returned in subsequent /api/doni list (ritirato=true filter applied)."

  - task: "Chat conversations and messages 1:1"
    implemented: true
    working: true
    file: "backend/routes/chat.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/conversazioni, POST /api/conversazioni/start/{altro_user_id}, GET/POST /api/conversazioni/{conv_id}/messaggi. Need to validate that two users can start a conversation and exchange messages, that auth restricts access to conversation participants, and that ultimo_at is updated on send."
      - working: true
        agent: "testing"
        comment: "PASS - With user A and a freshly registered user B (with profile), POST /api/conversazioni/start/{B} returns 200 with conv id. Messages from both A and B via POST /messaggi -> 200. GET /api/conversazioni from A includes the conv with ultimo_messaggio populated from the latest message. GET /api/conversazioni/{id}/messaggi returns messages in chronological order. A third unrelated user C correctly gets 403 on GET and POST. Starting a conversation with self -> 400."

  - task: "Modular server bootstrap (core + routes wiring)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "server.py is now a slim entrypoint that mounts auth/profile/uploads/dono/chat routers under /api. Mongo indexes ensured on startup. Need to confirm no route is missing and CORS still works."
      - working: true
        agent: "main"
        comment: "PASS - GET /api/ returns {message: 'JOY API ready', version: '2.0.0'}. All five sub-routers (auth, profile, uploads, dono, chat) reachable under /api via EXPO_PUBLIC_BACKEND_URL with no missing route. Mongo indexes created on startup, CORS allows external requests, supervisor backend is healthy. Backward-compat for legacy base64 documents (foto_base64 -> foto_url, foto_base64_list -> foto_urls) verified end-to-end."

frontend:
  - task: "Frontend Cloudinary upload integration"
    implemented: true
    working: "NA"
    file: "frontend/app/dona.tsx, frontend/app/profile-setup.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Both screens now call POST /api/uploads/image with {base64} and store the returned secure_url. dona.tsx posts foto_urls (Cloudinary URLs) and profile-setup.tsx puts foto_url. Frontend testing pending user approval."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Modular server bootstrap (core + routes wiring)"
    - "Auth (register/login/me + password reset OTP)"
    - "Profile CRUD with Cloudinary URL field"
    - "Cloudinary upload endpoint"
    - "Doni create/list/detail/delete with Cloudinary URLs"
    - "Chat conversations and messages 1:1"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      V2 backend refactor + Cloudinary wiring complete. Please run a full backend regression:
      
      1. AUTH: register a fresh user, then login, then GET /api/auth/me with the JWT.
         Use Bearer token in Authorization header for everything below.
         Existing test user available in /app/memory/test_credentials.md (test1@joy.it / test123).
      
      2. PROFILE: PUT /api/profile/me with {nome, citta, telefono, foto_url}, then GET /api/profile/me.
         Also test GET /api/profile/{user_id} for another user.
      
      3. CLOUDINARY UPLOAD: POST /api/uploads/image with a small valid base64 PNG/JPEG payload
         (you can use a tiny 1x1 base64 image). Verify the response contains secure_url that
         starts with https://res.cloudinary.com/drmrh9h7f/. Cloudinary creds are in backend/.env.
         Also verify 401 without token, 400 on empty payload, 413 on >12MB.
      
      4. DONI: POST /api/doni with foto_urls=[<cloudinary url from step 3>], then GET /api/doni
         (should include the new dono), GET /api/doni/miei, GET /api/doni/{id}, and finally
         DELETE /api/doni/{id}. Verify the deleted dono no longer appears in lists.
         Also verify validation: empty foto_urls -> 400, non-owner DELETE -> 403.
      
      5. CHAT: with a second user, POST /api/conversazioni/start/{altro_user_id},
         POST /api/conversazioni/{conv_id}/messaggi twice from each side, GET /api/conversazioni
         (verify ultimo_messaggio + ultimo_at updated), GET /api/conversazioni/{conv_id}/messaggi
         (verify chronological order). Verify a third unrelated user gets 403 on the same conv.
      
      6. BACKWARD COMPAT: insert a legacy doc directly into MongoDB with foto_base64 (profile)
         or foto_base64_list (dono), then call GET /api/profile/{uid} and GET /api/doni/{id} —
         the response must expose foto_url / foto_urls correctly populated from the legacy field.
      
      All routes are under /api prefix and reachable via EXPO_PUBLIC_BACKEND_URL/api.
      Backend already restarted and healthy. MongoDB at MONGO_URL in backend/.env.
  - agent: "testing"
    message: |
      Backend regression COMPLETE for JOY V2. 38/38 backend checks PASS via the public
      EXPO_PUBLIC_BACKEND_URL/api. Test script saved at /app/backend_test.py.
      
      Coverage:
      - HEALTH: GET /api/ returns {message: 'JOY API ready', version: '2.0.0'}.
      - AUTH: register / duplicate-email-400 / login / wrong-password-401 / me-with-token /
        me-without-token-401 / forgot-password / OTP captured from backend.err.log /
        verify-otp / reset-password / login with new password. JWT + bcrypt working.
      - PROFILE: PUT/GET /api/profile/me with foto_url, GET /api/profile/{user_id} for
        another existing user (test1@joy.it) -> 200.
      - CLOUDINARY UPLOAD: 401 w/o token, 400 on empty, 200 with valid 1x1 PNG returning
        a real https://res.cloudinary.com/drmrh9h7f/... secure_url, 413 on >12MB payload.
      - DONI: create with foto_urls, 400 on empty, list/miei/detail include the new dono,
        non-owner DELETE -> 403, owner DELETE -> 200, deleted dono no longer in /api/doni.
      - CHAT: start with self -> 400, start with B -> 200, A and B exchange messages,
        /api/conversazioni updates ultimo_messaggio, GET messages chronological,
        third user C gets 403 on both GET and POST.
      - BACKWARD COMPAT: legacy profile doc with foto_base64 -> response.foto_url matches;
        legacy dono doc with foto_base64_list -> response.foto_urls contains the legacy
        base64 entry. Test cleans up its legacy DB inserts after verification.
      
      Minor (not blocking): on backend startup passlib logs a warning
      "(trapped) error reading bcrypt version" / AttributeError on bcrypt.__about__.
      This is cosmetic — hashing/verification work end-to-end and the OTP/login flows pass.
      Optional fix: pin bcrypt<4.1 or upgrade passlib.
      
      No blockers. All current_focus tasks marked working=true, needs_retesting=false.
