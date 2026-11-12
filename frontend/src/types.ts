export type AlertColor = "success" | "info" | "warning" | "error";

export interface File {
  name: string;
  link: string;
  awskey: string;
  id: number;
  visibledate: string;
}

export interface Assignment extends File {
  deadline: string;
  marks: number;
  instructions: string;
  submissions: Submission[];
}

export interface Submission {
  id: number;
  submittedLink: string;
  markedLink?: string;
  submittedAwsKey: string;
  markedAwsKey?: string;
  score?: number;
  grade?: string;
  comments?: string;
  studentId: number;
  student: User;
  createdAt: string;
  student_name?: string;
  marked?: boolean;
}

export interface Section {
  title: string;
  files: File[];
  assignments: Assignment[];
  id: number;
}

export interface Chapter {
  title: string;
  sections: Section[];
  id: number;
  pinned?: boolean;
}

export interface Teacher {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
}
type UserRole = "student" | "teacher" | "admin";
export interface NewUser {
  courseString?: string;
  name: string;
  email?: string;
  password?: string;
  username: string;
  role?: UserRole;
}
export interface User {
  id: number;
  name: string;
  email?: string;
  password?: string;
  username: string;
  role: UserRole;
  passwordHash?: string;
}

export interface UserIdentifier {
  name: string;
  username: string;
  token: string;
  role: UserRole;
}

// New course that has yet to be updated on backend
export interface NewCourse {
  title: string;
  description: string;
  zoomName?: string;
}
export interface NewChapter {
  title: string;
  pinned?: boolean;
}
export interface NewSection {
  title: string;
}
export interface NewFile {
  name: string;
  link?: string;
  awskey?: string;
  visibledate?: string;
}

export interface NewAssignment {
  instructions?: string;
  name: string;
  link?: string;
  visibledate?: string;
  deadline: string;
}

export interface NewEnrollment {
  username: string;
  courseId: number;
}

export interface NewRecording {
  title: string;
  shareUrl: string;
  duration: number;
  startTime: string;
}

export interface Notif {
  type: AlertColor;
  message: string;
}

export interface Recording {
  createdAt: string;
  updatedAt: string;
  id: number;
  passcode: string;
  share_url: string;
  start_time: string;
  duration: number;
  title: string;
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  expiry: string;
  createdAt: string;
}

export interface Course {
  title: string;
  id: number;
  teacher: Teacher;
  description?: string;
  announcements?: Announcement[];
  author?: string;
  zoomName?: string;
  chapters: Chapter[];
  students: User[];
  createdAt: string;
  updatedAt: string;
}
