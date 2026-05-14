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

  - task: "Recensioni + Ritira gioia (V7a)"
    implemented: true
    working: true
    file: "backend/routes/recensioni.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "New routes: POST /api/doni/{id}/ritira marks dono as received by current user; POST /api/recensioni creates a 1-5 stars review (only by ritirer, one per dono); GET /api/users/{id}/rating aggregates {avg,count}; GET /api/users/{id}/recensioni lists reviews with reviewer_nome from profiles."
      - working: true
        agent: "testing"
        comment: "PASS - 28/28 V7a checks via EXPO_PUBLIC_BACKEND_URL/api. Ritira: B ritira A.dono1 -> 200 {ok,dono_id,needs_review:true}; B re-ritira -> 400 'Questa gioia è già stata ritirata'; A ritira own dono -> 400 'Non puoi ritirare una tua gioia'; non-existing id -> 404; missing token -> 401. After ritiro, GET /api/doni excludes dono1 and GET /api/doni/{dono1} returns ritirato=true with ritirato_da=B.id and ritirato_at ISO string. Recensioni: C (non-ritirer) -> 403 'Puoi recensire solo gioie che hai ritirato tu'; B with stars=5 -> 200 returns RecensioneOut with donor_id=A, reviewer_id=B, reviewer_nome='Beatrice Ricciardi', stars=5 (int), commento, created_at; duplicate B review -> 400 'Hai già recensito'; stars=0 -> 422, stars=6 -> 422; missing token -> 401. Rating: after B 5* -> {avg:5.0,count:1}; after D ritira+rates 3* on dono2 -> {avg:4.0,count:2}; non-existing user_id -> {avg:null,count:0} (200, NOT 404). GET /api/users/{A}/recensioni returns both reviews sorted desc with reviewer_nome populated (Beatrice Ricciardi, Davide Sartori). GET /api/doni/{dono2} reflects donatore_rating_avg=4.0, donatore_rating_count=2 and donatore_telefono populated from profile A. No 5xx anywhere."

  - task: "Doni create/list/detail/delete with Cloudinary URLs + V7a enrichment"
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
      - working: true
        agent: "testing"
        comment: "PASS V7a enrichment - POST /api/doni now returns the new fields with proper defaults (ritirato_da=None, ritirato_at=None, donatore_telefono populated from profile, donatore_rating_avg=None when no reviews, donatore_rating_count=0). Existing fields (id, titolo, foto_urls, lat/lng, categoria, created_at) all intact. After two reviews on user A (5 stars + 3 stars), GET /api/doni/{dono2_id} correctly reports donatore_rating_avg=4.0 and donatore_rating_count=2, and donatore_telefono='+393331112233' (from profile A). After ritiro by B, GET /api/doni/{dono1_id} returns ritirato=true, ritirato_da=B.id, ritirato_at=ISO timestamp. List endpoint /api/doni correctly excludes ritirato doni."

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
      - working: true
        agent: "testing"
        comment: "PASS V7b - GET /api/conversazioni now includes the new 'unread' (int) field per conversation. Verified scenario A->B with 3 messages: B's GET /api/conversazioni shows convX.unread=3; after B opens GET /api/conversazioni/{X}/messaggi the unread drops to 0 on next list. mark_conversation_read is correctly invoked from the GET messages route."

  - task: "Push token register/clear + notifiche unread-count (V7b)"
    implemented: true
    working: true
    file: "backend/routes/notifiche.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "PASS - 23/23 V7b checks via EXPO_PUBLIC_BACKEND_URL/api (script: /app/backend_test_v7b.py). POST /api/users/me/push-token with valid ExponentPushToken -> 200 {ok:true,has_token:true}; empty token -> {has_token:false}; missing token field -> {has_token:false}; no auth -> 401. DELETE /api/users/me/push-token -> 200 {ok:true}; GET /api/auth/me still returns 200 (note: current UserOut model exposes only {id,email} - it does NOT serialize push_token, but DB doc has push_token set to null after delete). GET /api/notifiche/unread-count: baseline {messages:0,total:0,per_conversation:{}}; no auth -> 401. End-to-end unread flow: A sends 3 msgs to B -> B's /unread-count={messages:3,total:3,per_conversation:{X:3}} and /conversazioni convX.unread=3; after B GETs /conversazioni/X/messaggi -> /unread-count={0,0,{}} and convX.unread=0. Regressions: /auth/login, /auth/me, /conversazioni/start, /conversazioni/{id}/messaggi, /doni create, /doni/{id}/ritira, /recensioni all 200. No 5xx in backend logs during the run. Push send is fire-and-forget (httpx -> exp.host) and never blocks the POST messaggi route."

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
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

# ---- STEP 1 backend tasks ----
# (appended by testing agent — yaml-only fragment, keep alongside the original 'backend:' list)
# Task: DELETE /api/auth/me  -> implemented:true, working:true (with caveat: full block-cleanup verification couldn't be done because /api/blocks is 404).
# Task: POST /api/segnalazioni  -> implemented:true (code present in routes/moderation.py), working:false at runtime — endpoint returns 404 because moderation_router is NOT included in server.py.
# Task: POST/DELETE/GET /api/blocks  -> implemented:true (code present), working:false at runtime — same root cause: router not registered.
# Task: Block-symmetric filter on GET /api/doni  -> code is correctly wired in routes/dono.py (uses blocked_ids_for), but cannot be exercised because /api/blocks/{id} returns 404 (can't create the block to test the filter). The filter logic itself is correct on a code-read basis.

agent_communication:
  - agent: "main"
    message: |
      V7a backend additions need validation:

      1) DONO model enrichment (regression check):
         - GET /api/doni and GET /api/doni/{id} responses must now include the new
           fields: ritirato_da (nullable), ritirato_at (nullable), donatore_telefono,
           donatore_rating_avg (nullable), donatore_rating_count (int default 0).
         - Existing fields (id, titolo, foto_urls, etc.) must remain intact.
         - When no reviews exist for the donor, donatore_rating_avg=null and donatore_rating_count=0.

      2) NEW endpoint POST /api/doni/{id}/ritira (auth required):
         - Setup: user A creates a dono with foto_urls from Cloudinary.
         - User B calls POST /api/doni/{A_dono_id}/ritira → 200 with {ok:true, dono_id, needs_review:true}.
         - Re-call same endpoint as B → 400 (already ritirato).
         - User A calls POST /api/doni/{A_dono_id}/ritira → 400 (own dono).
         - Random non-existent id → 404.
         - GET /api/doni after ritiro → that dono no longer appears (ritirato=true filter).
         - GET /api/doni/{A_dono_id} as anyone (still allowed if logged in) → response has ritirato=true,
           ritirato_da=B.id, ritirato_at populated.

      3) NEW endpoint POST /api/recensioni (auth required):
         Body schema: {dono_id, stars: 1..5, commento?: str}
         - User C (not the ritirer) → 403 "Puoi recensire solo gioie che hai ritirato tu".
         - User B (the ritirer) → 200 with returned RecensioneOut (id, donor_id=A.id, reviewer_id=B.id,
           reviewer_nome, stars, commento, created_at).
         - Same B re-posts review for same dono → 400 "Hai già recensito".
         - stars=0 or stars=6 → 422 validation.
         - Stars must be saved as integer.

      4) NEW endpoint GET /api/users/{A_id}/rating:
         After a 5-star review by B → returns {avg: 5.0, count: 1}.
         Add second user D who also ritirates a different dono of A and rates 3 → returns {avg: 4.0, count: 2}.
         Non-existing user_id → still returns {avg: null, count: 0} (not 404).

      5) GET /api/users/{A_id}/recensioni:
         Returns the list with reviewer_nome populated (lookup from profiles).

      6) Verify GET /api/doni/{A_id_other_dono} now returns donatore_rating_avg=4.0, donatore_rating_count=2.

      Cloudinary creds still in backend/.env, MongoDB at MONGO_URL. Test user A available
      (test1@joy.it / test123). Create fresh users B, C, D via /api/auth/register as needed.
      Update /app/test_result.md with PASS/FAIL per task in the backend section.
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
      V7b backend validation COMPLETE. 23/23 backend checks PASS via the public
      EXPO_PUBLIC_BACKEND_URL/api. Test script at /app/backend_test_v7b.py.

      Coverage:
      • POST /api/users/me/push-token: valid ExponentPushToken[...] -> 200 {ok:true,has_token:true};
        empty token "" -> {has_token:false}; missing token field -> {has_token:false};
        no auth -> 401.
      • DELETE /api/users/me/push-token: 200 {ok:true}. db.users.push_token is set to null.
        Note: current /api/auth/me response model (UserOut) only exposes {id,email}, so
        push_token is NOT serialized in the GET /api/auth/me response. The DB value
        is correctly cleared. If the frontend needs to read push_token from /auth/me,
        main agent should add it to UserOut.
      • GET /api/notifiche/unread-count: baseline {messages:0,total:0,per_conversation:{}};
        no auth -> 401. End-to-end flow with fresh users A & B: A sends 3 messages to
        conv X -> B's /unread-count = {messages:3,total:3,per_conversation:{X:3}} and
        B's GET /api/conversazioni returns convX with unread=3. After B GETs
        /api/conversazioni/X/messaggi (which invokes mark_conversation_read),
        /unread-count drops to {0,0,{}} and convX.unread=0.
      • GET /api/conversazioni: now includes the new "unread" (int) field per conv.
      • Regressions: POST /api/auth/login, GET /api/auth/me, POST /api/conversazioni/
        start/{user_id}, POST /api/conversazioni/{id}/messaggi, POST /api/doni,
        POST /api/doni/{id}/ritira, POST /api/recensioni all return 200.
      • Push send is fire-and-forget (httpx -> exp.host) and never blocks the route.
        No 5xx in /var/log/supervisor/backend.*.log during the run.

      Minor (non-blocking): GET /api/auth/me does not surface push_token (UserOut
      schema). Consider adding it if the FE relies on it for state hydration.
  - agent: "testing"
    message: |
      V7a backend validation COMPLETE. 28/28 backend checks PASS via the public
      EXPO_PUBLIC_BACKEND_URL/api. Test script at /app/backend_test.py.

      Setup: logged in as test1@joy.it (user A, id=8164e399…), upgraded profile to
      {nome: 'Alessandro Bianchi', citta: 'Roma', telefono: '+393331112233'}.
      Registered fresh B (Beatrice Ricciardi/Milano), C (Carlo Moretti/Torino),
      D (Davide Sartori/Napoli) and completed their profiles. Uploaded two real 1x1
      PNGs via POST /api/uploads/image → Cloudinary secure_urls under drmrh9h7f.
      Created 2 doni for A at Roma (41.9028, 12.4964) with those Cloudinary URLs.

      Results per scenario:
      • Dono enrichment: POST/GET /api/doni and /api/doni/{id} now include
        ritirato_da, ritirato_at, donatore_telefono, donatore_rating_avg,
        donatore_rating_count. Defaults correct (None/None/tel/None/0).
      • POST /api/doni/{id}/ritira: A on own dono → 400; non-existing → 404;
        B on A.dono1 → 200 {ok,dono_id,needs_review:true}; B re-call → 400;
        missing token → 401. After ritiro, /api/doni excludes dono1; GET
        /api/doni/{dono1} → ritirato=true, ritirato_da=B.id, ritirato_at set.
      • POST /api/recensioni: C (non-ritirer) → 403; B with stars=5 → 200 with
        full RecensioneOut (donor_id=A, reviewer_id=B, reviewer_nome=
        'Beatrice Ricciardi', stars=5 int, commento, created_at); duplicate B →
        400; stars=0/6 → 422; missing token → 401.
      • GET /api/users/{A}/rating: after B 5* → {avg:5.0,count:1}. After D
        ritira+rates 3 on dono2 → {avg:4.0,count:2}. Non-existing user_id →
        {avg:null,count:0} returned as 200 (NOT 404).
      • GET /api/doni/{dono2}: donatore_rating_avg=4.0, donatore_rating_count=2,
        donatore_telefono='+393331112233'.
      • GET /api/users/{A}/recensioni: returns both items sorted desc with
        reviewer_nome populated (Beatrice Ricciardi + Davide Sartori).
      • Regression: login, /auth/me, /profile/me, /doni list all green.
      No 5xx anywhere in logs. test_result.md updated.
  - agent: "testing"
    message: |
      [V2 historical] Backend regression COMPLETE for JOY V2. 38/38 backend checks PASS via the public
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


#====================================================================================================
# STEP 1 (Apple App Store compliance) - NEW endpoints to test
#====================================================================================================
# NEW BACKEND TASKS - require testing:
#
# Task A: DELETE /api/auth/me — Delete account (Apple Guideline 5.1.1)
#   - File: backend/routes/auth.py
#   - Authenticated. Anonymizes user (email -> deleted-XXXX@joy.local, password_hash -> "!deleted",
#     deleted: true), removes profile, marks all their active doni as ritirato, removes their
#     password_resets / letture, removes all blocks involving them. Returns {ok: true}.
#   - Verify: after DELETE, the same user cannot login with old credentials; profile is gone;
#     their doni no longer appear in GET /api/doni; the JWT becomes effectively useless.
#
# Task B: POST /api/segnalazioni — Report content
#   - File: backend/routes/moderation.py
#   - Authenticated. Body: { target_type: 'dono'|'utente'|'recensione'|'messaggio',
#     target_id: str, reason: 'spam'|'contenuto_offensivo'|'truffa'|'inappropriato'|'minorenne'|'altro',
#     note?: str (max 500) }.
#   - Anti-spam: same reporter + same target returns the existing report (idempotent).
#   - Invalid reason -> 400.
#   - Returns SegnalazioneOut (id, target_type, target_id, reason, status='pending', created_at).
#
# Task C: POST /api/blocks/{user_id} — Block a user
#   - File: backend/routes/moderation.py
#   - Authenticated. Cannot block self (-> 400). Unknown user_id -> 404.
#   - Idempotent: re-blocking same user is OK (upsert).
#
# Task D: DELETE /api/blocks/{user_id} — Unblock
#   - Authenticated. Always returns {ok: true, unblocked_id}.
#
# Task E: GET /api/blocks — List blocked users
#   - Returns list of { user_id, nome?, citta?, blocked_at }.
#
# Task F: Filter blocked content from GET /api/doni
#   - File: backend/routes/dono.py (lista_doni now uses blocked_ids_for)
#   - Doni from users blocked-by OR blocking the requester must NOT appear in the list.
#
# REGRESSION: ensure existing auth/profile/doni/chat/recensioni endpoints still 200.

agent_communication:
  - agent: "main"
    message: |
      STEP 1 of pre-launch (Apple App Store compliance) implemented. Please run a backend
      regression that includes the NEW endpoints listed in the section above:
        1) DELETE /api/auth/me  → account deletion + side effects
        2) POST   /api/segnalazioni  → report content (idempotency + 400 on bad reason)
        3) POST   /api/blocks/{user_id} + DELETE /api/blocks/{user_id} + GET /api/blocks
        4) Filtering: GET /api/doni excludes doni from blocked / blocking users (symmetric)
      Plus a quick smoke-test of existing flows (auth, profile, doni create+list, chat start,
      recensioni list) to confirm no regression introduced by routes/moderation.py and the
      changes in routes/auth.py + routes/dono.py + core/database.py (new indexes).

      Test users: see /app/memory/test_credentials.md (test1@joy.it / test123 etc).
      Create fresh throwaway accounts as needed; clean up at the end (the DELETE /me task
      itself anonymizes the account so re-using emails is fine).
  - agent: "testing"
    message: |
      STEP 1 backend validation COMPLETE — 16/32 PASS, 16/32 FAIL.
      Test script: /app/backend_test_step1.py against EXPO_PUBLIC_BACKEND_URL/api.

      ❌ CRITICAL BLOCKER (single root cause for 15/16 failures):
        backend/server.py imports `from routes.moderation import router as moderation_router`
        (line 14) BUT never calls `api.include_router(moderation_router)`. As a result, EVERY
        moderation endpoint returns 404 in production:
           POST /api/segnalazioni            -> 404
           POST /api/blocks/{user_id}        -> 404
           DELETE /api/blocks/{user_id}      -> 404
           GET  /api/blocks                  -> 404
        FIX (1 line, after include of notifiche_router around line 32 of server.py):
            api.include_router(moderation_router)
        After this, all the moderation tests should pass on a code-read basis — the logic
        in routes/moderation.py is correct (reason whitelist validation, idempotent
        upsert on duplicate report returning the SAME id, self-block 400, missing user
        404, list with profile lookup, idempotent unblock).

      ✅ PASS (16):
        • GET /api/ health
        • DELETE /api/auth/me without token -> 401
        • DELETE /api/auth/me with token -> 200 {ok:true, message:"Account cancellato definitivamente."}
        • Old credentials no longer log in (401)
        • GET /api/profile/{deleted_uid} -> 200 null (profile removed)
        • GET /api/doni excludes deleted user's dono (ritirato flag set)
        • Regression: POST /auth/register, /auth/login, GET /auth/me
        • Regression: POST /uploads/image returns https://res.cloudinary.com/drmrh9h7f/... secure_url
        • Regression: POST /doni, GET /doni
        • Regression: POST /conversazioni/start/{other_user_id}
        • Regression: GET /api/users/{id}/recensioni -> 200 (note: path is /users/{id}/recensioni,
          NOT /recensioni/utente/{id} — the alt path returned 404)

      ❌ FAIL (all derived from the missing router include):
        • POST /api/segnalazioni  (without auth -> 404 instead of 401)
        • POST /api/segnalazioni invalid reason  -> 404 instead of 400
        • POST /api/segnalazioni valid  -> 404 instead of 200
        • POST /api/segnalazioni idempotency  -> 404
        • POST /api/blocks/{id} without auth, self-block, non-existent, valid, idempotent re-block  -> all 404
        • GET  /api/blocks (list, empty for fresh user)  -> 404
        • DELETE /api/blocks/{id} (idempotent) -> 404
        • Block-symmetric filter on /api/doni — could not be exercised because /api/blocks is 404.
          The filter implementation in routes/dono.py (lista_doni using blocked_ids_for)
          is correct on code-read and ready to be re-validated once the router is wired.
        • Sub-check inside DELETE /auth/me suite: "blocks cleanup for partner-Z" couldn't
          be verified because the precondition (blocking X) returned 404. The auth.py
          deletion routine itself does call db.blocks.delete_many({$or: [...]}) so the
          cleanup logic is correct; it just couldn't be observed end-to-end.

      ⚠️ Minor (not blocking):
        • GET /api/recensioni/utente/{user_id} (path explicitly requested in the review)
          returns 404 — the route is mounted at GET /api/users/{user_id}/recensioni
          (in routes/recensioni.py). Either update the FE to use /users/{id}/recensioni
          or add an alias in the router. Existing endpoint works, so it's a naming nit.

      NEXT ACTION FOR MAIN AGENT:
        Add ONE line to /app/backend/server.py (after line 32):
            api.include_router(moderation_router)
        Restart backend (supervisor will auto-reload). Re-run /app/backend_test_step1.py;
        all 16 failing moderation/block-filter tests are expected to flip to PASS.
  - agent: "testing"
    message: |
      STEP 1 backend RE-RUN COMPLETE — 33/33 PASS (0 FAIL).
      Confirmed `api.include_router(moderation_router)` is now wired at /app/backend/server.py
      line 33. Test script: /app/backend_test_step1.py against EXPO_PUBLIC_BACKEND_URL/api.

      ✅ DELETE /api/auth/me:
         - no token -> 401
         - with token -> 200 {ok:true, message:"Account cancellato definitivamente."}
         - old creds login -> 401
         - GET /profile/{deleted_uid} -> 200 null
         - deleted user's dono removed from GET /doni
         - partner Z's GET /blocks empty (block-cleanup confirmed end-to-end)

      ✅ POST /api/segnalazioni:
         - no auth -> 401
         - invalid reason -> 400 with detail listing valid reasons
           (spam, contenuto_offensivo, truffa, inappropriato, minorenne, altro)
         - valid -> 200 returning SegnalazioneOut {id, target_type, target_id, reason,
           status:'pending', created_at}
         - duplicate report by same reporter on same target -> returns SAME id (idempotent),
           status stays 'pending'

      ✅ POST /api/blocks/{user_id}:
         - no auth -> 401
         - block self -> 400 "Non puoi bloccare te stesso"
         - block non-existent user -> 404 "Utente non trovato"
         - block valid -> 200 {ok:true, blocked_id}
         - re-block (idempotent) -> 200

      ✅ DELETE /api/blocks/{user_id}:
         - 200 {ok:true, unblocked_id}
         - idempotent when no block exists -> 200

      ✅ GET /api/blocks:
         - returns list of {user_id, nome, citta, blocked_at} with profile lookup populated
         - fresh user -> []

      ✅ Block-symmetric filter on GET /api/doni:
         - Before block: A sees B's dono
         - After A blocks B: A's /doni excludes B's dono AND B's /doni excludes A's dono
           (SYMMETRIC filter confirmed)
         - After unblock: both doni reappear for both users

      ✅ Regression smoke (all 200):
         - POST /auth/register, /auth/login, GET /auth/me
         - POST /uploads/image returns https://res.cloudinary.com/drmrh9h7f/... secure_url
         - POST /doni, GET /doni
         - POST /conversazioni/start/{other_user_id}
         - GET /api/users/{id}/recensioni (canonical path)
         - GET /api/recensioni/utente/{id} returns 404 (not mounted — FE should use
           /api/users/{id}/recensioni)

      No 5xx in backend logs. All current_focus and stuck_tasks cleared.
