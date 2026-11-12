# Learny LMS

### Site is deployed [here](https://learny-lms.com)!


## Table of contents

- [Motivations and Aims](#motivations-and-aims)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup](#setup)
- [Development](#development)

## Motivations and Aims

The process of distributing worksheets and assignments to students can be a challenge for online tutors. Many tutors rely on platforms like Google Drive or Onedrive to store and distribute materials, but these platforms can be inconvenient and inefficient. For example, file permissions (viewing date and time) can be hard to set and assignment submissions for students can be hard to track using existing solutions.

To solve this problem, I developed Learny, a Progressive Web App (PWA) with an intuitive user interface that simplifies the process of organising and distributing assignments, worksheets, and answer keys to students. Learny provides a more efficient solution for online tutors by streamlining the process of setting file permissions and tracking student submissions.

## Features

<b>List of core features</b>

- <b>Role-based user system: </b>Teachers can create 'courses' and add students to view these courses. ✅
- <b>Easy organisation of content: </b>Each course can have multiple 'chapters', under which there can be multiple 'sections', and each section can host multiple 'files'. ✅
- <b>File permissions: </b>Teachers can set a 'visible date & time' for files to become 'visible' to students. ✅
- <b>Tracking of assignments: </b> Students can submit assignments through this platform and teachers will receive a notification once submitted. Once teacher has been graded, they can also submit the marked copy on the platform and students will receive a notification that the assignment has been graded. ✅
- <b>Automated uploading of Zoom recording links: </b> After each Zoom lesson, the recording links for each lesson can be synced to our platform. ✅
- <b>Course Templates: </b>Teachers can create 'templates' of courses and can create multiple course instances from the same template. 🚧
- <b>Automated creation of OneNote Notebook: </b>Based on the organisation structure used, Learny can create a OneNote notebook for teachers for each course. 🚧
- <b>Grade Tracker: </b> Teachers can easily monitor progression of their students. 🚧
- <b>Payment Tracking:</b> An easy way for teachers to track if their students have paid their fees for the month.

## Screenshots

![Home page](/screenshots/home_page.png)

![Course page](/screenshots/course_page.png)

![Add File Modal](/screenshots/add_file.gif)

![Add Student](/screenshots/add_student.gif)

## Guide to use the App

Demo account (Teacher)

Username: demo_teacher

Password: demo1

## Tech Stack

- PostgreSQL (database)
- Express, NodeJS (server)
- NextJS (app)

## Setup

### Ensure that you have Node.js, npm and PostgreSQL installed.

If you do not have Node.js installed, it is recommended to install from their site [here](https://nodejs.org/en/). This will install the latest version of Node.js along with npm.

If you do not have PostgreSQL installed, download it [here](https://postgresapp.com/downloads.html).

### Clone the repository

```bash
git clone git@github.com:xxdydx/Learny-LMS.git
```

### Install dependencies

1. To install frontend dependencies, `cd` to the frontend directory and run

   ```bash
   npm install
   ```

1. To install backend dependencies, `cd` to the backend directory and run
   ```bash
   npm install
   ```

### Initializing PostgreSQL database

Assuming you have Docker on your system installed, you can run the following command in the backend directory to start a Postgres Docker image. If you want to change the credentials of the database, you can do so in the `docker-compose.yml` file.

```bash
docker-compose up -d
```

### Initializing environment variables

I use the Amazon S3 service to upload files. To ensure you have access to all the features, you can create an AWS account and add your API keys to the app in an .env file.

The .env file should contain the following:

```bash
DATABASE_URL=postgresql://postgres:secret@localhost:5432/postgres
JWT_SECRET= (For Login purposes)
ACCESS_KEY_ID= (From AWS)
SECRET_ACCESS_KEY= (From AWS)
AWS_REGION= (From AWS)
AWS_BUCKET_NAME= (From AWS)
PORT=3001
SENDGRID_SECRET= (SendGrid API key for assignment reminders)
ASSIGNMENT_REMINDER_FROM= (Verified SendGrid sender for assignment reminders)
```

## Development

### Start server in development

1. Run Postgres app and start the server on `Port 5432`.

2. Start the local backend server by `cd` to the backend folder running
   ```bash
   npm run dev
   ```

The server should now be running locally on `localhost:3001`, and the API can be reached via `localhost:3001/api`.

The backend server must be running before starting the app.

### Start frontend NextJS app in development

1. Start the app by `cd` to the frontend folder and running

```bash
npm run dev
```

The app should now be running locally on `localhost:3000`.

The website should be now be live and connected with the backend server and database.

### Some errors that may occur during the setup process

1. `PostgreSQL: Role postgres does not exist`
This error can possibly happen in MacOS systems, to fix this you may follow the steps outlined in this [Stack Overflow article](https://stackoverflow.com/questions/33339246/postgresql-role-postgres-does-not-exist)
