import { Action, PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  Assignment,
  Course,
  NewAssignment,
  NewCourse,
  NewEnrollment,
  NewFile,
  NewSection,
} from "../types";

import { AppState } from "../store";
import courseService from "../services/courses";

import { ThunkAction } from "@reduxjs/toolkit";
import { NewChapter } from "../types";
import { AxiosError } from "axios";
import { setNotification } from "./notifReducer";
import { Notif } from "../types";

const courseSlice = createSlice({
  name: "courses",
  initialState: [] as Course[],
  reducers: {
    create(state, action: PayloadAction<Course>) {
      const course = action.payload;
      state.push(course);
    },
    setCourses(state, action) {
      return action.payload;
    },
    edit(state, action) {
      const updatedCourse = action.payload;
      return state.map((item) =>
        item.id === updatedCourse.id ? updatedCourse : item
      );
    },
    remove(state, action) {
      const id = action.payload;
      return state.filter((forms) => forms.id !== id);
    },
  },
});

export const { create, edit, setCourses, remove } = courseSlice.actions;

export const initializeCourses = (
  id: number = -1
): ThunkAction<Promise<number | undefined>, AppState, unknown, Action> => {
  return async (dispatch) => {
    try {
      if (id === -1) {
        const courses = await courseService.getAll();
        dispatch(setCourses(courses));
      } else {
        const course = await courseService.getOne(id);
        dispatch(setCourses(course));
      }
      return undefined;
    } catch (error) {
      if (id !== -1) {
        return error instanceof AxiosError ? error.response?.status ?? 500 : 500;
      }
      if (error instanceof AxiosError) {
        const notif: Notif = {
          message: error.response?.data,
          type: "error",
        };
        dispatch(setNotification(notif, 5000));
      } else {
        const notif: Notif = {
          message: "Unknown error happpened. Contact support!",
          type: "error",
        };
        dispatch(setNotification(notif, 5000));
      }
      return 500;
    }
  };
};


export const createCourse = (
  courseObject: NewCourse
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.create(courseObject);
    dispatch(create(newCourse));
  };
};

export const deleteCourse = (
  id: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const response = await courseService.remove(id);
    dispatch(remove(id));
  };
};

export const updateCourse = (
  id: number,
  courseObject: NewCourse
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.update(id, courseObject);
    dispatch(edit(newCourse));
  };
};

export const addChapter = (
  chapter: NewChapter,
  id: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.createChapter(chapter, id);

    dispatch(edit(newCourse));
  };
};

export const editChapter = (
  chapter: NewChapter,
  chapterId: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.updateChapter(chapter, chapterId);
    dispatch(edit(newCourse));
  };
};

export const deleteChapter = (
  chpId: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.removeChapter(chpId);
    dispatch(edit(newCourse));
  };
};

export const addSection = (
  section: NewSection,
  chpId: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.createSection(section, chpId);
    dispatch(edit(newCourse));
  };
};

export const editSection = (
  section: NewSection,
  sxnId: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.updateSection(section, sxnId);
    dispatch(edit(newCourse));
  };
};

export const deleteSection = (
  sxnId: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.removeSection(sxnId);
    dispatch(edit(newCourse));
  };
};

export const addFile = (
  file: FormData,
  sxnId: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.createFile(file, sxnId);
    dispatch(edit(newCourse));
  };
};
export const editFile = (
  file: NewFile,
  fileId: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.updateFile(file, fileId);
    dispatch(edit(newCourse));
  };
};

export const deleteFile = (
  fileId: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.removeFile(fileId);
    dispatch(edit(newCourse));
  };
};

export const addEnrollment = (
  enrollment: NewEnrollment
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.createEnrollment(enrollment);
    dispatch(edit(newCourse));
  };
};

export const deleteEnrollment = (
  student_id: number,
  course_id: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.removeEnrollment(
      student_id,
      course_id
    );
    dispatch(edit(newCourse));
  };
};

export const addAssignment = (
  file: FormData,
  sxnId: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.createAssignment(file, sxnId);
    dispatch(edit(newCourse));
  };
};
export const editAssignment = (
  assignment: NewAssignment,
  assignmentId: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.updateAssignment(
      assignment,
      assignmentId
    );
    dispatch(edit(newCourse));
  };
};

export const deleteAssignment = (
  assignmentId: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.removeAssignment(assignmentId);
    dispatch(edit(newCourse));
  };
};

export const submitToAssignment = (
  file: FormData,
  assignmentId: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.submitAssignment(file, assignmentId);
    dispatch(edit(newCourse));
  };
};

export const gradeAssignment = (
  file: FormData,
  submissionId: number
): ThunkAction<void, AppState, unknown, Action> => {
  return async (dispatch) => {
    const newCourse = await courseService.gradeAssignment(file, submissionId);
    dispatch(edit(newCourse));
  };
};

export default courseSlice.reducer;
