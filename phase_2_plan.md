# Phase 2: Backend Architecture & Implementation Plan

Welcome to Phase 2 of the Mock Test Platform! Since Phase 1 (Basic Frontend) is successfully completed, Phase 2 focuses entirely on building a robust, production-ready backend. 

Since this is an internship project, this plan is structured to show clear daily/weekly progress to your mentors. The platform will be **100% Free of Cost** for students, and we will be using **PostgreSQL** as our primary database for better data integrity and relation management.

---

## 🎯 Phase 2 Objectives
1. **Database Migration:** Transition from MongoDB to **PostgreSQL** (using an ORM like Prisma or Sequelize) since relational databases are best for examination systems.
2. **Secure Authentication:** Implement robust JWT-based authentication with Role-Based Access Control (RBAC) for Admins and Students.
3. **Admin Dashboard (Test Management):** Allow admins to safely create, update, and manage tests and questions.
4. **Student Testing Engine:** Build a seamless test-taking experience with secure API endpoints, dynamic test fetching, and result calculation.
5. **No Payments:** The system will bypass all payment gateways as tests are free.

---

## 🏗️ Technology Stack (Phase 2)
- **Runtime Environment:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM (Object-Relational Mapping):** Prisma (Highly recommended for TypeScript/JavaScript) or Sequelize.
- **Validation:** Zod
- **Authentication:** JWT (JSON Web Tokens) & bcrypt

---

## 🗄️ Database Schema Design (PostgreSQL)

Here is the relational schema we will implement:

### 1. `User` Table
- `id` (UUID, Primary Key)
- `name` (String)
- `email` (String, Unique)
- `password_hash` (String)
- `role` (Enum: `STUDENT`, `ADMIN`)
- `created_at` (Timestamp)

### 2. [Test](file:///c:/Users/Milin/Desktop/WEB%20Dev/mock-nectar-main%20-%20Copy/mock-nectar-main%20-%20Copy/mock-nectar-main/backend/controllers/testController.js#3-15) Table
- `id` (UUID, Primary Key)
- `title` (String)
- `subject` (String)
- `duration_minutes` (Integer)
- `total_marks` (Integer)
- `is_published` (Boolean, default: false)
- `created_at` (Timestamp)

### 3. `Question` Table
- `id` (UUID, Primary Key)
- `test_id` (UUID, Foreign Key -> Test.id)
- `question_text` (Text)
- `options` (JSON Array) -> e.g., `["A", "B", "C", "D"]`
- `correct_answer_index` (Integer)
- `explanation` (Text, optional)

### 4. `TestAttempt` Table (Tracks student progress & results)
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> User.id)
- `test_id` (UUID, Foreign Key -> Test.id)
- `score` (Integer)
- `status` (Enum: `IN_PROGRESS`, `COMPLETED`)
- `answers_submitted` (JSON Object) -> e.g., `{"question_id": "selected_option_index"}`
- `started_at` (Timestamp)
- `completed_at` (Timestamp, nullable)

---

## 📅 Implementation Roadmap (Feature Breakdown)

### Step 1: Foundation & PostgreSQL Setup
- Initialize PostgreSQL database.
- Setup Prisma ORM and define models.
- Run initial database migrations.

### Step 2: Authentication & Authorization (RBAC)
- Refactor Login/Register APIs to use PostgreSQL.
- Add `role` validation.
- Create middleware to protect Admin-only routes (`isAdmin`).

### Step 3: Admin Test Management APIs
- **POST** `/api/admin/tests` - Create a new test structure.
- **POST** `/api/admin/tests/:testId/questions` - Add questions to a specific test.
- **PUT** `/api/admin/tests/:testId` - Publish or update test details.
- **GET** `/api/admin/tests` - View all tests (published and draft).

### Step 4: Student Exam APIs
- **GET** `/api/tests` - Fetch all *published* tests for students to attempt.
- **GET** `/api/tests/:testId/questions` - Fetch questions for an ongoing test (excluding `correct_answer_index`).
- **POST** `/api/tests/start` - Create a `TestAttempt` record with status `IN_PROGRESS`.
- **POST** `/api/tests/submit` - Calculate marks based on submitted answers, update `TestAttempt` status to `COMPLETED`, and save the score.

### Step 5: Results & Leaderboard
- **GET** `/api/results/:attemptId` - Show detailed breakdown of a student's attempt.
- **GET** `/api/leaderboard/:testId` - Display top students for a specific test.

---

## 🚀 Daily Standup Reporting Format
*Since you need to show daily progress to your internship mentors, use this format for your end-of-day reports:*

**Today's Update [Date]**
* **Tasks Planned:** [e.g., Setup PostgreSQL and User Schema]
* **Accomplished:** [e.g., Successfully migrated User model to Prisma, tested registration endpoint via Postman]
* **Blockers (if any):** [e.g., None]
* **Next Steps for Tomorrow:** [e.g., Implement JWT Auth and Admin Middleware]
