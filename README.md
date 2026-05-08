## Attendance App API Documentation

Frontend-focused documentation for all active routes, payloads, and model shapes.

## 1. Base Setup

- Base URL: `http://localhost:3000`
- Content-Type: `application/json` (except file upload routes)
- Auth header for protected routes:

```http
Authorization: Bearer <JWT_TOKEN>
```

## 2. Roles and Access

- `Admin`: full access
- `Teacher`: allowed on selected user, attendance, fees, batch operations
- `Student`: limited read access (fees history, user details)

If token is missing/invalid:

```json
{ "message": "No token, authorization denied" }
```

or

```json
{ "message": "Token is not valid" }
```

## 3. API Summary

### Auth
- [POST /auth/sendotp](#route-auth-sendotp)
- [POST /auth/verifyotp](#route-auth-verifyotp)

### User
- [GET /user/students](#route-user-students)
- [GET /user/teachers](#route-user-teachers)
- [POST /user/add](#route-user-add) (multipart)
- [PATCH /user/edit/:userId](#route-user-edit) (multipart)
- [GET /user/details/:userId](#route-user-details)

### Batch (Class)
- [GET /batch](#route-batch-list)
- [GET /batch/show/:id](#route-batch-show)
- [GET /batch/students/:id](#route-batch-students)
- [POST /batch/create](#route-batch-create)
- [POST /batch/add-student/:id](#route-batch-add-student)
- [DELETE /batch/remove-student/:id](#route-batch-remove-student)
- [PUT /batch/edit/:id](#route-batch-edit)
- [DELETE /batch/delete/:id](#route-batch-delete)

### Main Class
- [GET /mainclass](#route-mainclass-list)
- [GET /mainclass/show/:id](#route-mainclass-show)
- [POST /mainclass/create](#route-mainclass-create)
- [PATCH /mainclass/edit/:id](#route-mainclass-edit)
- [DELETE /mainclass/delete/:id](#route-mainclass-delete)
- [POST /mainclass/add-student](#route-mainclass-add-student)
- [DELETE /mainclass/remove-student](#route-mainclass-remove-student)
- [PATCH /mainclass/:studentBatchId](#route-mainclass-patch-studentbatch)

### Attendance
- [POST /attendence/mark/:classId](#route-attendence-mark)
- [PATCH /attendence/update/:classId](#route-attendence-update)
- [GET /attendence/by-date](#route-attendence-by-date)
- [GET /attendence/by-date/:classId](#route-attendence-by-date-class)
- [GET /attendence/by-date-range/:classId](#route-attendence-by-date-range)
- [GET /attendence/summary/mainclass/:mainClassId](#route-attendence-summary-mainclass)
- [GET /attendence/summary/mainclass/:mainClassId/student/:studentId](#route-attendence-summary-mainclass-student)

### Fees
- [GET /fees/details/:mainClassId/:studentId](#route-fees-details)
- [POST /fees/pay/:mainClassId/:studentId](#route-fees-pay)
- [PATCH /fees/edit/:feesId](#route-fees-edit)
- [GET /fees/history/:mainClassId/:studentId](#route-fees-history)

---

## 4. Detailed Endpoints

## 4.1 Auth

<a id="route-auth-sendotp"></a>
### POST `/auth/sendotp`
What it does:
- Sends OTP to email for login flow.

When to use:
- Before login verification screen.

Request:
```json
{
	"email": "a3@s.com"
}
```

Response:
```json
{
	"success": true,
	"message": "Otp send successfully",
	"data": {
		"message": "OTP sent to email"
	}
}
```

<a id="route-auth-verifyotp"></a>
### POST `/auth/verifyotp`
What it does:
- Verifies OTP and returns JWT token + user.

When to use:
- After user enters OTP.

Request:
```json
{
	"email": "a3@s.com",
	"otp": "123456"
}
```

Response:
```json
{
	"success": true,
	"message": "OTP verified successfully",
	"data": {
		"user": {
			"_id": "699346212530ac75eb40fd3d",
			"name": "Arya3",
			"email": "a3@s.com",
			"role": "Student"
		},
		"token": "<JWT_TOKEN>"
	}
}
```

---

## 4.2 User

<a id="route-user-students"></a>
### GET `/user/students` (Admin/Teacher)
What it does:
- Lists all students with populated `batches` and `mainClasses`.

When to use:
- Student list page.

Response:
```json
{
	"success": true,
	"message": "Students fetched successfully",
	"count": 1,
	"data": [
		{
			"_id": "699346212530ac75eb40fd3d",
			"name": "Arya3",
			"email": "a3@s.com",
			"phone": "9876543",
			"role": "Student",
			"mainClasses": [
				{
					"_id": "69c2bb5d8932def09e153224",
					"name": "DSA 2",
					"duration": 3,
					"fees": 1000
				}
			]
		}
	]
}
```

<a id="route-user-teachers"></a>
### GET `/user/teachers` (Admin/Teacher)
What it does:
- Lists all teachers.

When to use:
- Teacher management page.

<a id="route-user-add"></a>
### POST `/user/add` (Admin/Teacher, multipart/form-data)
What it does:
- Creates student/teacher.

When to use:
- Add user form.

Form fields:
- `name` (required)
- `email` (required)
- `phone` (required)
- `role` (required: `Student` or `Teacher`)
- `adhar` (required for Student)
- `mainClasses` (optional array of ids)
- `profilePic` (optional file, max 1)
- `documents` (optional files, max 3; student only)

Response:
```json
{
	"success": true,
	"message": "User added successfully",
	"data": {
		"_id": "699346212530ac75eb40fd3d",
		"name": "Arya3",
		"email": "a3@s.com",
		"role": "Student"
	}
}
```

<a id="route-user-edit"></a>
### PATCH `/user/edit/:userId` (Admin, multipart/form-data)
What it does:
- Updates user details including images/documents/mainClasses.

When to use:
- Edit user profile/admin panel.

<a id="route-user-details"></a>
### GET `/user/details/:userId` (Admin/Teacher/Student)
What it does:
- Returns one user with `batches` + `mainClasses` populated.

When to use:
- Profile details page.

---

## 4.3 Batch (Class)

<a id="route-batch-list"></a>
### GET `/batch`
What it does:
- Fetches all batches.

<a id="route-batch-show"></a>
### GET `/batch/show/:id`
What it does:
- Fetches one batch with full populated details (main classes, students, pair mapping).

<a id="route-batch-students"></a>
### GET `/batch/students/:id`
What it does:
- Fetches students mapped in the batch.

<a id="route-batch-create"></a>
### POST `/batch/create` (Admin)
What it does:
- Creates a batch with schedule and mainclass mapping.

When to use:
- Batch creation form.

Request:
```json
{
	"name": "Morning Batch A",
	"weekday": "Monday",
	"startTime": "10:00",
	"endTime": "12:00",
	"teacherEmail": "teacher@x.com",
	"mainClasses": ["69c2bb5d8932def09e153224"],
	"students": ["699346212530ac75eb40fd3d"],
	"mainClassStudentPairs": [
		{
			"mainClass": "69c2bb5d8932def09e153224",
			"student": "699346212530ac75eb40fd3d"
		}
	]
}
```

<a id="route-batch-add-student"></a>
### POST `/batch/add-student/:id` (Admin/Teacher)
What it does:
- Adds student to batch for one selected main class using student email.

Request:
```json
{
	"mainClassId": "69c2bb5d8932def09e153224",
	"studentEmail": "a3@s.com"
}
```

<a id="route-batch-remove-student"></a>
### DELETE `/batch/remove-student/:id` (Admin/Teacher)
What it does:
- Removes a student from a batch for a specific main class.
- Removes student from batch's `students` array.
- Removes the student-mainClass pair from `mainClassStudentPairs`.
- Removes batch from student's `batches` array in User model.

Request:
```json
{
	"mainClassId": "69c2bb5d8932def09e153224",
	"studentId": "64f2bb5d8932def09e153118"
}
```

Response:
```json
{
	"message": "Student removed from batch successfully",
	"data": {
		"_id": "66c2bb5d8932def09e153445",
		"name": "Batch A",
		"weekday": "Monday",
		"startTime": "09:00",
		"endTime": "10:30",
		"teacherEmail": "teacher@x.com",
		"mainClasses": ["69c2bb5d8932def09e153224"],
		"students": [],
		"mainClassStudentPairs": []
	}
}
```

<a id="route-batch-edit"></a>
### PUT `/batch/edit/:id` (Admin)
What it does:
- Updates batch details.

<a id="route-batch-delete"></a>
### DELETE `/batch/delete/:id` (Admin)
What it does:
- Deletes a batch.

---

## 4.4 Main Class

<a id="route-mainclass-list"></a>
### GET `/mainclass`
What it does:
- Fetches all main classes.

<a id="route-mainclass-show"></a>
### GET `/mainclass/show/:id`
What it does:
- Fetches main class details and student progress (`Student_Batch`).

<a id="route-mainclass-create"></a>
### POST `/mainclass/create` (Admin)
What it does:
- Creates main class.
- `endDate` is auto-calculated from `startDate + duration` (months).

<a id="route-mainclass-edit"></a>
### PATCH `/mainclass/edit/:id` (Admin)
What it does:
- Updates an existing main class.
- Recalculates `endDate` if `startDate` or `duration` changes.

<a id="route-mainclass-delete"></a>
### DELETE `/mainclass/delete/:id` (Admin)
What it does:
- Deletes a main class.
- Removes related references from `User.mainClasses`, `Batch.mainClasses`, and `Student_Batch` records.

Request:
```json
{
	"name": "DSA 2",
	"startDate": "2026-04-01",
	"duration": 3,
	"fees": 1000,
	"teacherEmail": "teacher@x.com"
}
```

<a id="route-mainclass-add-student"></a>
### POST `/mainclass/add-student` (Admin)
What it does:
- Adds student to main class.
- Creates Student_Batch record.
- Also pushes mainClass id into `User.mainClasses`.

Request:
```json
{
	"mainClassId": "69c2bb5d8932def09e153224",
	"studentEmail": "a3@s.com",
	"admissionDate": "2026-04-25"
}
```

<a id="route-mainclass-remove-student"></a>
### DELETE `/mainclass/remove-student` (Admin)
What it does:
- Removes student from `MainClass.students`.
- Removes mainClass from `User.mainClasses`.
- Deletes related `Student_Batch` documents.

Request:
```json
{
	"mainClassId": "69c2bb5d8932def09e153224",
	"studentId": "699346212530ac75eb40fd3d"
}
```

or

```json
{
	"mainClassId": "69c2bb5d8932def09e153224",
	"studentEmail": "a3@s.com"
}
```

Response:
```json
{
	"message": "Student removed from main class successfully",
	"data": {
		"mainClass": { "_id": "69c2bb5d8932def09e153224" },
		"removedStudentId": "699346212530ac75eb40fd3d",
		"deletedStudentBatchCount": 1
	}
}
```

<a id="route-mainclass-patch-studentbatch"></a>
### PATCH `/mainclass/:studentBatchId` (Admin)
What it does:
- Updates Student_Batch progress flags/fields.

---

## 4.5 Attendance

<a id="route-attendence-mark"></a>
### POST `/attendence/mark/:classId` (Admin/Teacher)
What it does:
- Marks attendance for a batch on a date, based on present student IDs.

Request:
```json
{
	"presentStudentIds": ["699346212530ac75eb40fd3d"],
	"date": "2026-06-26"
}
```

<a id="route-attendence-update"></a>
### PATCH `/attendence/update/:classId` (Admin)
What it does:
- Manual correction for one student using student email.
- Updates daily class list + attendance history record.

When to use:
- Admin correction if student was marked wrong.

Request:
```json
{
	"studentEmail": "a3@s.com",
	"mainClassId": "69c2bb5d8932def09e153224",
	"date": "2026-06-26",
	"status": "present"
}
```

or

```json
{
	"studentEmail": "a3@s.com",
	"mainClassId": "69c2bb5d8932def09e153224",
	"date": "2026-06-26",
	"status": "absent"
}
```

<a id="route-attendence-by-date"></a>
### GET `/attendence/by-date` (Admin/Teacher)
What it does:
- Gets attendance by date with optional filters.

Query params:
- `date` (required)
- `batchId` (optional)
- `mainClassId` (optional)

Example:
- `/attendence/by-date?date=2026-06-26&batchId=...&mainClassId=...`

<a id="route-attendence-by-date-class"></a>
### GET `/attendence/by-date/:classId` (Admin/Teacher)
What it does:
- Same as above, where `:classId` works as fallback batch id.

<a id="route-attendence-by-date-range"></a>
### GET `/attendence/by-date-range/:classId` (Admin/Teacher)
What it does:
- Gets attendance records in date range for a batch.

Query:
- `startDate` (required)
- `endDate` (required)
- `mainClassId` (optional)

<a id="route-attendence-summary-mainclass"></a>
### GET `/attendence/summary/mainclass/:mainClassId` (Admin/Teacher)
What it does:
- Returns student-wise attendance summary for a main class.

<a id="route-attendence-summary-mainclass-student"></a>
### GET `/attendence/summary/mainclass/:mainClassId/student/:studentId` (Admin/Teacher)
What it does:
- Returns detailed present/absent dates for one student.

---

## 4.6 Fees

<a id="route-fees-details"></a>
### GET `/fees/details/:mainClassId/:studentId` (Protected)
What it does:
- Returns full fee dashboard for one student in one main class.
- Includes `dueMonths`, `paidMonths`, `pendingMonths`, `nextDueMonth`, totals, overpaid amount.

When to use:
- Fees details page before payment.

Response example:
```json
{
	"mainClassId": "69c2bb5d8932def09e153224",
	"studentId": "699346212530ac75eb40fd3d",
	"studentName": "Arya3",
	"mainClassName": "DSA 2",
	"durationInMonths": 3,
	"monthlyFees": 1000,
	"dueMonths": ["April 2026", "May 2026", "June 2026"],
	"paidMonths": ["April 2026", "May 2026"],
	"pendingMonths": ["June 2026"],
	"nextDueMonth": "June 2026",
	"totalDueAmount": 3000,
	"totalPaidAmount": 10000,
	"pendingAmount": 0,
	"overpaidAmount": 7000,
	"paymentStatus": "Fully Paid"
}
```

<a id="route-fees-pay"></a>
### POST `/fees/pay/:mainClassId/:studentId` (Admin/Teacher)
What it does:
- Adds a payment entry.

Request:
```json
{
	"month": "June 2026",
	"totalAmount": 1000,
	"PaidAt": "2026-06-26"
}
```

<a id="route-fees-edit"></a>
### PATCH `/fees/edit/:feesId` (Admin)
What it does:
- Edits any fee record fields.

Request (all fields optional):
```json
{
	"mainClassId": "69c2bb5d8932def09e153224",
	"studentId": "699346212530ac75eb40fd3d",
	"month": "June 2026",
	"baseamount": 1000,
	"totalAmount": 1200,
	"PaidAt": "2026-06-30"
}
```

<a id="route-fees-history"></a>
### GET `/fees/history/:mainClassId/:studentId` (Admin/Teacher/Student)
What it does:
- Returns all payment entries sorted by latest date.

---

## 5. Data Models (MongoDB)

## User
```json
{
	"_id": "ObjectId",
	"name": "Arya3",
	"email": "a3@s.com",
	"phone": "9876543",
	"adhar": "123412341234",
	"batches": ["ObjectId"],
	"mainClasses": ["ObjectId"],
	"profilePic": "https://...",
	"documents": ["https://..."],
	"role": "Student"
}
```

## Batch
```json
{
	"_id": "ObjectId",
	"name": "Morning Batch A",
	"weekday": "Monday",
	"startTime": "10:00",
	"endTime": "12:00",
	"teacherEmail": "teacher@x.com",
	"mainClasses": ["ObjectId"],
	"students": ["ObjectId"],
	"mainClassStudentPairs": [
		{ "mainClass": "ObjectId", "student": "ObjectId" }
	]
}
```

## MainClass
```json
{
	"_id": "ObjectId",
	"name": "DSA 2",
	"startDate": "2026-04-01T00:00:00.000Z",
	"duration": 3,
	"endDate": "2026-07-01T00:00:00.000Z",
	"fees": 1000,
	"teacherName": "Teacher Name",
	"teacherEmail": "teacher@x.com",
	"students": ["ObjectId"],
	"batches": ["ObjectId"],
	"isActive": true
}
```

## Student_Batch
```json
{
	"_id": "ObjectId",
	"rollno": 3,
	"student": "ObjectId",
	"mainClass": "ObjectId",
	"joinDate": "2026-04-25T00:00:00.000Z",
	"startDate": "2026-04-25T00:00:00.000Z",
	"endDate": "2026-07-25T00:00:00.000Z",
	"batchcompletion": false,
	"examcompletion": false,
	"certificateIssued": false
}
```

## Attendence
```json
{
	"_id": "ObjectId",
	"batch": "ObjectId",
	"mainClass": "ObjectId",
	"student": "ObjectId",
	"date": "2026-06-26T00:00:00.000Z",
	"status": "present"
}
```

## Class (daily class document)
```json
{
	"_id": "ObjectId",
	"batch": "ObjectId",
	"mainClass": "ObjectId",
	"Present_students": ["ObjectId"],
	"Absent_students": ["ObjectId"],
	"date": "2026-06-26T00:00:00.000Z"
}
```

## Fees
```json
{
	"_id": "ObjectId",
	"mainClass": "ObjectId",
	"student": "ObjectId",
	"month": "June 2026",
	"baseamount": 1000,
	"totalAmount": 1200,
	"PaidAt": "2026-06-30T00:00:00.000Z"
}
```

---

## 6. Frontend Integration Notes

- Keep `attendence` spelling exactly as route path (not `attendance`) because backend path is `/attendence`.
- For file upload (`/user/add`, `/user/edit/:userId`), use `multipart/form-data`.
- For protected routes, always send Bearer token.
- For fees dashboard:
	- use `pendingMonths` and `nextDueMonth` for unpaid logic
	- `dueMonths` means full scheduled course months.

---

## 7. Common Error Pattern

Most APIs return:
```json
{
	"message": "Human readable error",
	"error": "Detailed technical message"
}
```

Status codes used:
- `200`: success
- `201`: created
- `400`: bad request/validation
- `401`: unauthorized token
- `403`: role not allowed
- `404`: resource not found
- `500`: server error

