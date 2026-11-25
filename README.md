# ARX HOSTING Starter

## Deploy on Render
1. Upload this project to a GitHub repository (do not upload `.env`).
2. In Render choose **New + → Web Service** and connect the repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add these Environment Variables in Render:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = a long random secret
   - `UPSTASH_REDIS_REST_URL` = your Upstash REST URL
   - `UPSTASH_REDIS_REST_TOKEN` = your Upstash REST token
6. Deploy. Test `/api/health`.

## Important
This starter supports account registration/login and project metadata using Upstash Redis. It does not upload or execute Python/Node bot files. Do not run untrusted user code in the web process. A separate isolated runner, resource limits, storage, and security review are required before enabling bot execution.

For production, use a persistent session store, HTTPS, rate limiting, email verification, CSRF protections, and an admin provisioning flow. The `ADMIN_EMAIL` variable is reserved for a future admin feature and does not grant admin privileges in this starter.
