"use client";

import { useAppSelector } from "@/hooks";
import { useEffect } from "react";
import { useAuth } from "@/hooks";
import { useAppDispatch } from "@/hooks";
import { deleteEnrollment, initializeCourses } from "@/reducers/courseReducer";
import { useRouter } from "next/navigation";
import LoadingPage from "@/components/LoadingPage";
import NotifComponent from "@/components/NotifComponent";
import NavigationBar from "@/components/NavigationBar";
import TextField from "@mui/material/TextField";
import { createTheme, ThemeProvider } from "@mui/material";
import { Inter } from "next/font/google";
import {
  DataGrid,
  GridColDef,
  GridValueGetterParams,
  GridActionsCellItem,
  GridRowId,
} from "@mui/x-data-grid";
import AddNewStudentForm from "@/components/FormModal/AddNewStudent";
import { useState } from "react";
import { setNotification } from "@/reducers/notifReducer";
import { Notif } from "@/types";
import { updateCourse, deleteCourse } from "@/reducers/courseReducer";
import { AxiosError } from "axios";
import { NewCourse } from "@/types";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Switch, { SwitchProps } from "@mui/material/Switch";
import { styled } from "@mui/material/styles";
import { Course } from "@/types";
import { isNull } from "util";
import { Button } from "@mui/material";
import courseService from "@/services/courses";

const inter = Inter({ subsets: ["latin"] });

export default function SettingsPage({ courseId }: { courseId: number }) {
  const courses = useAppSelector((state) => state.courses);
  const user = useAppSelector((state) => state.user);
  const [course, setCourse] = useState<Course | null>(
    courses.find((course) => course.id === courseId) ?? null
  );
  const [title, setTitle] = useState<string>(course?.title ? course.title : "");
  const [description, setDescription] = useState<string>(
    course?.description ? course.description : ""
  );
  const [zoomName, setZoomName] = useState<string>(
    course?.zoomName ? course.zoomName : ""
  );
  const [registrationPassword, setRegistrationPassword] = useState('');
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [copyClicked, setCopyClicked] = useState<boolean>(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = createTheme({
    typography: {
      fontFamily: inter.style.fontFamily,
    },

    palette: {
      mode: "dark",
      primary: {
        main: "#fec006",
      },
    },
  });

  if (course === null || !user || user.role !== "teacher") {
    return <main className="bg-bg min-h-screen"></main>;
  }

  // handle removal of student from course
  const handleDeleteClick = (id: GridRowId) => async () => {
    if (window.confirm(`Do you want to remove this student from the course?`)) {
      try {
        const student = Number(id);
        await dispatch(deleteEnrollment(student, course.id));
        const notif: Notif = {
          message: "Student removed from course",
          type: "success",
        };
        dispatch(setNotification(notif, 5000));
      } catch (error: unknown) {
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
      }
    }
  };

  // handle deletion of course
  const handleDeleteCourse = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (
      window.confirm(
        `Are you sure you want to delete this course? This action cannot be undone.`
      )
    ) {
      try {
        await dispatch(deleteCourse(courseId));
        router.push("/dashboard");
        const notif: Notif = {
          message: "Course deleted",
          type: "info",
        };
        dispatch(setNotification(notif, 5000));
      } catch (error: unknown) {
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
      }
    }
  };

  const columns: GridColDef[] = [
    { field: "id", headerName: "Student ID", flex: 0.5, resizable: true },
    { field: "name", headerName: "Name", flex: 1, resizable: true },
    {
      field: "username",
      headerName: "Username",
      flex: 1,
      resizable: true,
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      resizable: true,
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      flex: 0.5,
      resizable: true,
      cellClassName: "actions",
      getActions: ({ id }) => {
        return [
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label="Delete"
            onClick={handleDeleteClick(id)}
            color="inherit"
          />,
        ];
      },
    },
  ];

  // handle editing of courses in settings page
  const handleEdit = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (title.trim().length === 0) {
      setTitle(course.title);
    }
    if (description.trim().length === 0) {
      setDescription(course.description ? course.description : "");
    }

    if (zoomName.trim().length === 0) {
      setZoomName(course.zoomName ? course.zoomName : "");
    }
    try {
      const newCourse: NewCourse = {
        title: title && title.trim(),
        description: description && description.trim(),
        zoomName: zoomName && zoomName.trim(),
      };
      await dispatch(updateCourse(course.id, newCourse));
      setTitle("");
      setDescription("");
      const notif: Notif = {
        type: "success",
        message: "Course edited",
      };
      dispatch(setNotification(notif, 5000));
    } catch (error: unknown) {
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
    }
  };

  const generateRegistrationPassword = async () => {
    setGeneratingPassword(true);
    try {
      setRegistrationPassword(await courseService.generateRegistrationPassword(courseId));
    } catch {
      dispatch(setNotification({ message: "Could not generate a registration password.", type: "error" }, 5000));
    } finally {
      setGeneratingPassword(false);
    }
  };

  const CopyTextbox = () => {
    // Set the initial text for the textbox
    const text = `${window.location.origin}/register/courses/${course.id}`;
    // Function to handle the "Copy" button click
    const handleCopy = () => {
      setCopyClicked(true);
      setTimeout(() => {
        setCopyClicked(false);
      }, 2000);
      navigator.clipboard.writeText(text);
      const notif: Notif = {
        message: "Copied to clipboard",
        type: "info",
      };
      dispatch(setNotification(notif, 2000));
    };

    return (
      <div className="flex flex-row ">
        <input
          type="text"
          value={text}
          readOnly
          className={`sm:w-full md:w-1/2 bg-gray-50 border ${
            copyClicked ? "border-pink" : "border-gray-300"
          } text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 p-2.5 dark:bg-bg dark:placeholder-gray-400 ${
            copyClicked ? "dark:text-pink" : "dark:text-white"
          } dark:hover:ring-yellow dark:focus:border-yellow`}
        ></input>
        <button
          className="flex justify-start	text-heading-4 font-semibold px-2 py-2 bg-transparent text-pink hover:text-darkerpink hover-hover:active:text-darkerpink hover-hover:focus-visible:text-darkerpink"
          title="Copy"
          type="button"
          onClick={handleCopy}
        >
          <ContentCopyIcon />
        </button>
      </div>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="dark">
        <div className="dark:bg-bg">
          <main className="pt-8 pb-16 lg:pt-10 lg:pb-24 bg-white dark:bg-bg">
            <div className="min-h-screen flex justify-between px-4 mx-auto max-w-6xl">
              <div className="flex-grow mx-4">
                <div className="bg-white dark:bg-bg min-h-screen">
                  <div className=" w-full lg:max-w-6xl">
                    <h1 className="mb-8 text-3xl tracking-tight font-semibold text-gray-900 dark:text-white">
                      Course Details
                    </h1>

                    <a className="flex flex-col p-4 bg-white rounded-2xl md:flex-col md:max-w-6xl dark:bg-surface">
                      <div className="flex flex-col py-4">
                        <div className="">
                          <TextField
                            fullWidth
                            id="standard-basic"
                            label="Course Title"
                            variant="standard"
                            defaultValue={course.title}
                            onChange={({ target }) => setTitle(target.value)}
                          />
                        </div>

                        <div className="pt-4">
                          <TextField
                            fullWidth
                            id="standard-basic"
                            label="Course Description"
                            variant="standard"
                            defaultValue={course.description}
                            onChange={({ target }) =>
                              setDescription(target.value)
                            }
                          />
                        </div>
                      </div>
                      <button
                        className="flex justify-start	text-heading-4 font-semibold px-2  bg-transparent text-pink hover-hover:hover:text-darkerpink hover-hover:active:text-darkerpink hover-hover:focus-visible:text-darkerpink"
                        title="Save"
                        type="button"
                        onClick={handleEdit}
                      >
                        Save
                      </button>
                    </a>

                    <div className="mt-12 mx-auto ">
                      <h1 className="text-3xl mb-2 tracking-tight font-semibold text-gray-900 dark:text-white">
                        Sharing Link
                      </h1>
                      <p className="text-base mb-2 dark:text-text">
                        Allow students to create an account and directly enroll
                        into your course.
                      </p>

                      <CopyTextbox />
                      <p className="mt-3 dark:text-text">
                        Students need the registration password. Generating a new password replaces the previous one.
                      </p>
                      <Button onClick={generateRegistrationPassword} disabled={generatingPassword}>
                        Generate registration password
                      </Button>
                      {registrationPassword && (
                        <TextField label="Registration password" value={registrationPassword}
                          InputProps={{ readOnly: true }} fullWidth />
                      )}
                    </div>
                    <div className="mt-12 mb-8 flex justify-between mx-auto">
                      <h1 className="text-3xl tracking-tight font-semibold text-gray-900 dark:text-white">
                        Students
                      </h1>
                      <AddNewStudentForm
                        courseId={course.id}
                        courseTitle={course.title}
                      >
                        <button
                          type="button"
                          className="text-white text-heading-4 font-semibold bg-[#ff4081] hover:bg-canary-500 font-medium rounded-2xl px-5 py-2.5 text-center ml-2 mr-2 mb-2 dark:bg-[#ff4081] dark:hover:bg-[#f01b68]"
                        >
                          Add Student
                        </button>
                      </AddNewStudentForm>
                    </div>

                    <div style={{ width: "100%", maxHeight: 800 }}>
                      <DataGrid
                        rows={course ? course.students : []}
                        columns={columns}
                        autoHeight
                        initialState={{
                          pagination: {
                            paginationModel: { page: 0, pageSize: 5 },
                          },
                        }}
                        pageSizeOptions={[5, 10]}
                      />
                    </div>
                  </div>
                  <div className="mt-12 mx-auto ">
                    <h1 className="text-3xl mb-2 tracking-tight font-semibold text-gray-900 dark:text-white">
                      Zoom Integration
                    </h1>
                    <p className="text-base mb-6 dark:text-text">
                      Automatically sync weekly meeting recording links with
                      Learny.
                    </p>
                    <div className="flex flex-row">
                      <label className="mt-2 text-gray-900 dark:text-text mr-4">
                        Zoom Name
                      </label>
                      <input
                        type="text"
                        defaultValue={course.zoomName}
                        onChange={({ target }) => setZoomName(target.value)}
                        className="sm:w-full md:w-1/2 bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 p-2.5 dark:bg-bg dark:placeholder-gray-400 dark:text-white dark:hover:ring-yellow dark:focus:border-yellow"
                      ></input>
                      <button
                        className="ml-3 mt-2 flex justify-start	text-heading-4 font-semibold px-2  bg-transparent text-pink hover-hover:hover:text-darkerpink hover-hover:active:text-darkerpink hover-hover:focus-visible:text-darkerpink"
                        title="Save"
                        type="button"
                        onClick={handleEdit}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  <div className="mt-12 mx-auto ">
                    <h1 className="text-3xl mb-2 tracking-tight font-semibold text-gray-900 dark:text-white">
                      Deletion of course
                    </h1>
                    <p className="text-base mb-6 dark:text-text">
                      Delete <b>{course.title}</b>.
                    </p>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleDeleteCourse}
                      style={{ textTransform: "none", fontSize: "16px" }}
                    >
                      Delete Course
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <NotifComponent />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
