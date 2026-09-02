# telegram-content-download

![alt text](resources/image.png)

![alt text](resources/image-1.png)

![alt text](resources/image-2.png)

Project Architecture: Telegram Content Downloader                                                
                                                                                                   
  This is a full-stack web app with two parts: a Node.js backend and an Angular frontend.          
                                                                                                   
  ---             
  Big Picture                                                                                      
                                                                                                   
  User's Browser (Angular UI)
          |                                                                                        
          | HTTP (via proxy)                                                                       
          |                                                                                        
  Node.js Express Server  (server.js)                                                              
          |                                                                                        
          | Telegram MTProto protocol                                                              
          |                                                                                        
  Telegram's servers                                                                               
                                                                                                   
  ---                                                                                              
  Backend (Node.js) — 2 files                                                                      
                                                                                                   
  server.js — The web server / API gateway
  - Starts an Express HTTP server on port 3000                                                     
  - Exposes REST API routes that the Angular UI calls                                              
  - Routes:                                                                                        
    - GET /auth/status — is the user already logged into Telegram?                                 
    - POST /auth/send-code — send OTP to phone                                                     
    - POST /auth/sign-in — verify OTP and log in                                                   
    - POST /auth/2fa — submit 2FA password (if enabled)                                            
    - GET /groups — list all Telegram groups/channels                                              
    - GET /groups/:id/photo — fetch group profile photo as image                                   
    - GET /groups/:id/content — fetch messages/files from a group                                  
    - POST /download — placeholder (not implemented yet)                                           
                                                                                                   
  services/user-authorization/auth.service.js — The Telegram brain                                 
  - Uses the telegram npm library (GramJS) to talk directly to Telegram's servers                  
  - Manages a single TelegramClient instance (singleton — created once, reused)                    
  - Handles the 3-step Telegram login flow:                                                        
    a. sendCode() → asks Telegram to SMS an OTP to the phone                                       
    b. signIn() → submits the OTP to get a session          
    c. signInWith2FA() → submits a password if 2FA is on                                           
  - Saves the session string to .env so the user stays logged in across server restarts            
  - getGroups() → fetches all dialogs (chats/channels) from Telegram                               
  - getGroupPhoto() → downloads a group's avatar as a buffer                                       
  - getGroupContent() → fetches messages and categorizes them as video/image/pdf/chat/other        
                                                                                                   
  .env — Config file storing API_ID, API_HASH (Telegram app credentials) and SESSION_STRING (saved 
  login session)                                                                                   
                                                                                                   
  ---                                                                                              
  Frontend (Angular) — key files
                                                                                                   
  ui/proxy.conf.json — The glue between frontend and backend
  - During dev, Angular runs on port 4200. Any request to /api/... is transparently forwarded to   
  localhost:3000 (the Node server). So the UI just calls /api/groups and the proxy handles the     
  rest.                                                                                            
                                                                                                   
  ui/src/app/app.ts + app.html — Root component / Auth gate
  - The very first thing loaded in the browser                                                     
  - On startup: calls /api/auth/status to check if the user is already logged in                   
  - If not logged in: shows a login form (phone → OTP → optional 2FA), step by step                
  - If already logged in: immediately navigates to the home page                                   
  - Contains the <router-outlet> where page components are rendered                                
                                                                                                   
  ui/src/app/app.routes.ts — URL routing                                                           
  - / → HomeComponent                                                                              
  - / → HomeComponent
  - /group/:groupId → GroupDetailComponent



  ui/src/app/services/auth.service.ts — Frontend HTTP client
  - A shared Angular service that wraps all HttpClient calls to the backend
  - All components use this single service — they don't call the API directly
  - Also defines the Group and ContentItem TypeScript interfaces



  ui/src/app/home/home.ts + home.html — Home page
  - Shows a list of all the user's Telegram groups/channels with their photos
  - Supports pagination (10 per page, prev/next)
  - Has a URL input bar to paste a t.me/... link for downloading (wired up but download logic is a TODO on the
  backend)
  - Clicking a group navigates to its detail page



  ui/src/app/group-detail/group-detail.ts + group-detail.html — Group detail page
  - Shows all content inside a specific group
  - Tabs: All / Videos / Images / PDFs / Chat / Other
  - Load more button (appends items, doesn't replace)
  - Checkbox selection for bulk operations (selection works, actual download action is a TODO)



  ---
  End-to-End Login Flow



  1. Browser loads → app.ts checks /api/auth/status
  2. If not logged in:
     - User types phone number → POST /auth/send-code → Telegram sends SMS
     - User types OTP → POST /auth/sign-in → success OR 2FA required
     - (If 2FA) User types password → POST /auth/2fa
     - Session string saved to .env, user is logged in
  3. Router navigates to HomeComponent
  4. HomeComponent calls /api/groups → auth.service.js calls Telegram → returns group list
  5. User clicks a group → navigate to /group/:id
  6. GroupDetailComponent calls /api/groups/:id/content → returns messages



  ---
  What's NOT done yet



  - POST /download on the backend — the route exists but just echoes back the URL
  - Actually downloading files from selected items in the group detail view
  - No authentication/security on the API (anyone who can reach port 3000 can access your Telegram data)