# Load Testing

This project includes an Artillery benchmark for the real student flow:

1. Login
2. Load exams
3. Load tests for an exam
4. Open one published test
5. Start a monitored session
6. Wait through an active test window
7. Send a heartbeat
8. Submit the attempt

## Files

- `load-tests/artillery/student-session.yml`
- `load-tests/artillery/processor.cjs`
- `load-tests/artillery/students.example.csv`

## Why Artillery Here

Your backend enforces single-session tokens. That means one account cannot safely represent many simultaneous students. This benchmark uses a CSV of unique student credentials so each virtual user behaves like a different real student.

## Required Input

Create a real credentials file at:

`load-tests/artillery/students.csv`

Format:

```csv
email,password
student1@example.com,Password123
student2@example.com,Password123
```

Use verified student accounts that can log in normally.

If you want the repo to generate dedicated benchmark-only student accounts for you, run:

```powershell
npm run bench:prepare
```

That script will:

- create or refresh dedicated load-test student accounts
- clear old attempts for those accounts
- write `load-tests/artillery/students.csv`
- write `load-tests/artillery/benchmark-meta.json` with the chosen published exam/test

## Required Environment Variables

- `TARGET_URL`
- `LOAD_EXAM_ID`
- `LOAD_TEST_ID`

Optional:

- `LOAD_SESSION_WAIT_SECONDS`
Default: `75`
- `VERCEL_PROTECTION_BYPASS_TOKEN`
  Optional Vercel-authenticated bypass token for protected deployments
- `VERCEL_AUTOMATION_BYPASS_SECRET`
  Required when the target deployment is protected by Vercel authentication or deployment protection

PowerShell example:

```powershell
$env:TARGET_URL="https://your-deployed-domain.com"
$env:LOAD_EXAM_ID="mhtcet-pcb"
$env:LOAD_TEST_ID="67f01b2c3d4e5f6789012345"
$env:LOAD_SESSION_WAIT_SECONDS="75"
$env:VERCEL_PROTECTION_BYPASS_TOKEN="token-from-vercel-curl"
$env:VERCEL_AUTOMATION_BYPASS_SECRET="your-generated-vercel-bypass-secret"
```

If your production site is protected on `*.vercel.app`, you can either:

- pass a valid `VERCEL_PROTECTION_BYPASS_TOKEN` captured from `vercel curl`
- or generate a Protection Bypass for Automation secret in Vercel and pass it as `VERCEL_AUTOMATION_BYPASS_SECRET`

The benchmark will send the `x-vercel-protection-bypass` header when `VERCEL_PROTECTION_BYPASS_TOKEN` is set, and it will append the automation-bypass query parameters when `VERCEL_AUTOMATION_BYPASS_SECRET` is set.

## Run Profiles

Smoke check:

```powershell
npx artillery run --environment smoke load-tests/artillery/student-session.yml
```

Approx. 500 concurrent students:

```powershell
npx artillery run --environment peak500 --output load-tests/reports/peak500.json load-tests/artillery/student-session.yml
```

Approx. 200 concurrent students:

```powershell
npx artillery run --environment peak200 --output load-tests/reports/peak200.json load-tests/artillery/student-session.yml
```

Approx. 2,000 concurrent students:

```powershell
npx artillery run --environment peak2000 --output load-tests/reports/peak2000.json load-tests/artillery/student-session.yml
```

Generate an HTML report:

```powershell
npx artillery report --output load-tests/reports/peak2000.html load-tests/reports/peak2000.json
```

## Credential Count Guidance

- `smoke`: at least `10` unique students
- `peak500`: at least `800` unique students
- `peak2000`: at least `2,600` unique students

The `peak2000` profile injects users fast enough that, with the default `75s` active-session wait, the test reaches roughly 2,000 simultaneous in-flight student sessions.

## How To Choose The Test

Use one stable published test and its parent exam:

- `LOAD_EXAM_ID`: exam slug used by `/api/tests/exam/:examId`
- `LOAD_TEST_ID`: published test document ID used by `/api/tests/:id`

Pick a test that is representative of your real exam traffic.

## What Success Looks Like

For the `peak2000` run, look for:

- Very low `401`, `429`, and `5xx` rates
- Stable p95 latency on login, session start, heartbeat, and submit
- No sudden spike in failed heartbeats or submit requests
- No DB connection saturation or serverless cold-start cascades in platform logs

## Important Notes

- Run this against staging first, then production during a safe window.
- Do not use admin accounts in `students.csv`.
- Because this benchmark performs real logins and submissions, use dedicated load-test student accounts.
- If you want longer sustained proof at 2,000+ concurrent students, increase the phase duration and increase the CSV row count to match.
