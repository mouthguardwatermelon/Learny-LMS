"use client";

import ChapterView from "../../../components/CourseView/ChapterView";
import NavigationBar from "../../../components/NavigationBar";
import { useEffect, useState } from "react";
import { gradeAssignment, initializeCourses } from "@/reducers/courseReducer";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks";
import LoadingPage from "@/components/LoadingPage";
import styled from "@mui/material/styles/styled";
import NewCourseForm from "@/components/FormModal/NewCourseForm";
import { Chapter, NewChapter } from "@/types";
import NewChapterForm from "@/components/FormModal/NewChapterForm";
import NotifComponent from "@/components/NotifComponent";
import SettingsIcon from "@mui/icons-material/Settings";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Box, createTheme, ThemeProvider } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { Assignment, Submission } from "@/types";
import courseService from "@/services/courses";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SubmitAssignmentForm from "@/components/FormModal/SubmitAssignment";
import {
  DataGrid,
  GridColDef,
  GridValueGetterParams,
  GridActionsCellItem,
  GridRowId,
} from "@mui/x-data-grid";
import { Inter } from "next/font/google";
import DoneIcon from "@mui/icons-material/Done";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { IconButton, Tooltip } from "@mui/material";
import Button from "@mui/material/Button";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import { setNotification } from "@/reducers/notifReducer";
import { Notif } from "@/types";
import { AxiosError } from "axios";
import { TextField } from "@mui/material";
import { Markdown } from "@/components/Markdown";

const inter = Inter({ subsets: ["latin"] });
export default function MyPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const courses = useAppSelector((state) => state.courses);
  const dispatch = useAppDispatch();
  // abstracted GET users and courses into a hook
  const [isLoading, user] = useAuth();
  const [open, setOpen] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [score, setScore] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [comments, setComments] = useState<string>("");

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

  useEffect(() => {
    if (user) {
      dispatch(initializeCourses());
    }
  }, [dispatch, user]);

  // if page is loaded + no user => redirect to login page
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user]);

  useEffect(() => {
    if (user && Number.isInteger(parseInt(params.slug))) {
      courseService
        .getAssignment(parseInt(params.slug))
        .then((response) => setAssignment(response))
        .catch((error) => {
          console.error("Error fetching assignment:", error);
        });
    }
  }, [user, params.slug]);

  // if page is loading and no user => redirect to loading page
  if (isLoading || !user) {
    return <LoadingPage />;
  }
  if (!Array.isArray(courses)) {
    // handle error or return null
    return null;
  }
  const handleCloseDialog = () => {
    setOpen(false);
    setSubmission(null);
  };

  // handling setting of file to state variable once user attaches the file
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    // only choosing PDF files here
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile as unknown as File);
    }
  };

  const StyledButton = styled(Button)({
    textTransform: "none",
  });

  const sortSubmissionFunc = (a: Submission, b: Submission) => {
    if (a.marked === true && b.marked === false) {
      return -1;
    }
    if (b.marked === true && a.marked === false) {
      return 1;
    } else {
      return 0;
    }
  };
  if (assignment === null || assignment == undefined) {
    return <main className="bg-bg min-h-screen"></main>;
  }
  const StyledGridOverlay = styled("div")(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    "& .ant-empty-img-1": {
      fill: theme.palette.mode === "light" ? "#aeb8c2" : "#262626",
    },
    "& .ant-empty-img-2": {
      fill: theme.palette.mode === "light" ? "#f5f5f7" : "#595959",
    },
    "& .ant-empty-img-3": {
      fill: theme.palette.mode === "light" ? "#dce0e6" : "#434343",
    },
    "& .ant-empty-img-4": {
      fill: theme.palette.mode === "light" ? "#fff" : "#1c1c1c",
    },
    "& .ant-empty-img-5": {
      fillOpacity: theme.palette.mode === "light" ? "0.8" : "0.08",
      fill: theme.palette.mode === "light" ? "#f5f5f5" : "#fff",
    },
  }));

  function CustomNoRowsOverlay() {
    return (
      <StyledGridOverlay>
        <Box sx={{ mt: 1 }}>No submissions found.</Box>
      </StyledGridOverlay>
    );
  }

  interface DialogTitleProps {
    id: string;
    children?: React.ReactNode;
    onClose: () => void;
  }

  const NewDialogTitle = (props: DialogTitleProps) => {
    const { children, onClose, ...other } = props;

    return (
      <DialogTitle {...other}>
        {children}
        {onClose ? (
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        ) : null}
      </DialogTitle>
    );
  };
  const onClickRow = (submission: Submission) => {
    setSubmission(submission);
    setOpen(true);
  };

  const columns: GridColDef[] = [
    {
      field: "student_name",
      headerName: "Student Name",
      flex: 0.5,
      resizable: true,
    },
    {
      field: "createdAt",
      headerName: "Submission Time",
      flex: 0.5,
      resizable: true,
    },
    {
      field: "comments",
      headerName: "Comments",
      flex: 1,
      resizable: true,
    },
    {
      field: "score",
      headerName: "Score",
      flex: 0.5,
      resizable: true,
    },
    {
      field: "marked",
      headerName: "Graded?",
      flex: 0.5,
      resizable: true,
      renderCell: ({ row }) => {
        if (row.marked) {
          return (
            <div className="flex items-center justify-center">
              <DoneIcon
                sx={{
                  marginLeft: "auto",
                  marginRight: "auto",
                  display: "block",
                }}
              />
            </div>
          );
        } else {
          return (
            <div className="flex items-center justify-center">
              <CloseIcon
                sx={{
                  marginLeft: "auto",
                  marginRight: "auto",
                  display: "block",
                }}
              />
            </div>
          );
        }
      },
    },

    {
      field: "actions",
      headerName: "",
      flex: 0.5,
      resizable: true,
      cellClassName: "actions",
      renderCell: (params) => {
        const { row } = params;

        if (user.role === "student") {
          return (
            <>
              <GridActionsCellItem
                icon={
                  <Tooltip title="Student Submission" placement="top">
                    <PictureAsPdfIcon />
                  </Tooltip>
                }
                label="Link"
                onClick={() => window.open(row.submittedLink)}
                color="inherit"
              />
              {row.markedLink && (
                <GridActionsCellItem
                  icon={
                    <Tooltip title="Graded submission" placement="top">
                      <AssignmentTurnedInIcon />
                    </Tooltip>
                  }
                  label="Link"
                  onClick={() => window.open(row.markedLink)}
                  color="inherit"
                />
              )}
            </>
          );
        } else {
          return (
            <>
              <GridActionsCellItem
                icon={
                  <Tooltip title="Grade submission form" placement="top">
                    <AssignmentReturnIcon />
                  </Tooltip>
                }
                label="Link"
                onClick={() => onClickRow(row as Submission)}
                color="inherit"
              />
              <GridActionsCellItem
                icon={
                  <Tooltip title="Student Submission" placement="top">
                    <PictureAsPdfIcon />
                  </Tooltip>
                }
                label="Link"
                onClick={() => window.open(row.submittedLink)}
                color="inherit"
              />
              {row.markedLink && (
                <GridActionsCellItem
                  icon={
                    <Tooltip title="Graded submission" placement="top">
                      <AssignmentTurnedInIcon />
                    </Tooltip>
                  }
                  label="Link"
                  onClick={() => window.open(row.markedLink)}
                  color="inherit"
                />
              )}
            </>
          );
        }
      },
    },
  ];

  const checkAssignmentSubmit = (): boolean => {
    const todayDate = new Date();

    if (todayDate > new Date(assignment.deadline)) {
      return true;
    }
    const submissionsWithName = submissions.filter(
      (submission) => submission.student_name === user.name
    );
    if (submissionsWithName.length >= 1) {
      return true;
    }
    return false;
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const newFile = new FormData();
    if (submission === null) {
      const notif: Notif = {
        message: "Submission not selected. Refresh page and try again.",
        type: "error",
      };
      dispatch(setNotification(notif, 5000));
      return;
    }

    if (file === null) {
      const notif: Notif = {
        message: "No file uploaded",
        type: "error",
      };
      dispatch(setNotification(notif, 5000));
      return;
    }

    if (file) {
      newFile.append("file", file as unknown as Blob, file?.name);
    }
    if (score) {
      newFile.append("score", score);
    }
    if (grade) {
      newFile.append("grade", grade);
    }
    if (comments) {
      newFile.append("comments", comments);
    }

    try {
      const newAssignmentObj = await courseService.gradeAssignment(
        newFile,
        submission.id
      );
      setAssignment(newAssignmentObj);
      setOpen(false);
      const notif: Notif = {
        type: "success",
        message: "Assignment submission graded",
      };
      await dispatch(setNotification(notif, 5000));
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

  const handleSubmissionStateChange = (newAssignmentObj: Assignment) => {
    setAssignment(newAssignmentObj);
  };

  if (assignment === null || assignment === undefined) {
    return <main className="bg-bg min-h-screen"></main>;
  }

  const submissions = assignment.submissions
    ? assignment?.submissions
        .map((item: Submission, index) => {
          const dateObj = new Date(item.createdAt).toLocaleString("en-GB", {
            timeZone: "Asia/Singapore",
          });
          const studentName = item.student.name;
          const marked = item.markedLink ? true : false;

          return {
            ...item,
            createdAt: dateObj,
            sn: index + 1,
            student_name: studentName,
            marked: marked,
          };
        })
        .sort(sortSubmissionFunc)
    : [];

  return (
    <ThemeProvider theme={theme}>
      <div className="dark">
        <div className="dark:bg-bg">
          <NavigationBar />
          <main className="pt-8 pb-16 lg:pt-16 lg:pb-24 bg-white dark:bg-bg">
            <div className="min-h-screen flex justify-between px-4 mx-auto max-w-6xl">
              <div className="flex-grow mx-4">
                <div className="bg-white dark:bg-bg min-h-screen">
                  <div className=" w-full lg:max-w-6xl">
                    <div className="flex flex-col mx-auto mb-12 ">
                      <div className="flex justify-between">
                        <h1 className="mb-2 text-4xl tracking-tight font-semibold text-gray-900 dark:text-white">
                          {assignment?.name}
                        </h1>
                        {user.role === "student" && (
                          <SubmitAssignmentForm
                            title={assignment?.name}
                            id={assignment.id}
                            handleSubmissionStateChange={
                              handleSubmissionStateChange
                            }
                            checkAssignmentSubmit={checkAssignmentSubmit()}
                          />
                        )}
                      </div>

                      <h2 className="text-lg tracking-tight text-gray-900 dark:text-text">
                        Assignment deadline:{" "}
                        {new Date(assignment.deadline)
                          .toLocaleString("en-GB", {
                            timeZone: "Asia/Singapore",
                          })
                          .slice(0, -3)}
                      </h2>
                      <h2 className="text-lg tracking-tight text-gray-900 dark:text-text">
                        Maximum score: {assignment.marks}
                      </h2>
                    </div>
                    <div className="mb-8">
                      <h2 className="mb-3 text-2xl tracking-tight font-semibold text-gray-900 dark:text-white">
                        <u>Instructions</u>
                      </h2>
                      <Markdown value={assignment.instructions || "No instructions given."} />
                    </div>
                    <div className="mb-10">
                      <h2 className="mb-3 text-2xl tracking-tight font-semibold text-gray-900 dark:text-white">
                        <u>Attached Files</u>
                      </h2>
                      <button
                        type="button"
                        onClick={() => window.open(assignment.link)}
                        className="text-white text-heading-4 font-semibold bg-[#ff4081] hover:bg-canary-500 font-medium rounded-2xl px-5 py-2.5 text-center mr-2 mb-2 dark:bg-[#ff4081] dark:hover:bg-[#f01b68]"
                      >
                        <PictureAsPdfIcon /> {assignment.name}.pdf
                      </button>
                    </div>

                    <div>
                      <h2 className="mb-3 text-2xl tracking-tight font-semibold text-gray-900 dark:text-white">
                        <u>Submissions</u>
                      </h2>
                      <div style={{ width: "100%", maxHeight: 800 }}>
                        <DataGrid
                          rows={submissions}
                          columns={columns}
                          autoHeight
                          getRowHeight={() => "auto"}
                          getEstimatedRowHeight={() => 250}
                          sx={{
                            "&.MuiDataGrid-root--densityCompact .MuiDataGrid-cell":
                              { py: "8px" },
                            "&.MuiDataGrid-root--densityStandard .MuiDataGrid-cell":
                              { py: "15px" },
                            "&.MuiDataGrid-root--densityComfortable .MuiDataGrid-cell":
                              { py: "22px" },
                          }}
                          slots={{
                            noRowsOverlay: CustomNoRowsOverlay,
                          }}
                          initialState={{
                            pagination: {
                              paginationModel: { page: 0, pageSize: 10 },
                            },
                          }}
                          pageSizeOptions={[5, 10]}
                        />
                      </div>
                      <Dialog
                        open={open}
                        onClose={handleCloseDialog}
                        PaperProps={{ style: { backgroundColor: "black" } }}
                      >
                        <NewDialogTitle
                          id="customized-dialog-title"
                          onClose={handleCloseDialog}
                        >
                          {" "}
                          Grade an assignment
                        </NewDialogTitle>
                        <DialogContent dividers>
                          <DialogContentText sx={{ mt: 2 }}>
                            You are grading <b>{submission?.student_name}'s</b>{" "}
                            submission. Choose a file to upload onto our
                            servers. Only PDF files are accepted for now.
                          </DialogContentText>
                          <div className="mt-2 mb-6">
                            <input
                              type="file"
                              onChange={handleFileUpload}
                              accept=".pdf"
                              required
                            />
                          </div>

                          <TextField
                            autoFocus
                            id="outlined-number"
                            label="Score"
                            type="number"
                            onChange={({ target }) => setScore(target.value)}
                            sx={{ mt: 2 }}
                            InputLabelProps={{
                              shrink: true,
                            }}
                          />
                          <TextField
                            margin="dense"
                            id="name"
                            label="Grade"
                            type="text"
                            required={true}
                            onChange={({ target }) => setGrade(target.value)}
                            fullWidth
                            variant="standard"
                          />
                          <TextField
                            sx={{ mt: 3, mb: 2 }}
                            placeholder="Comments (optional)"
                            multiline
                            onChange={({ target }) => setComments(target.value)}
                            fullWidth
                            rows={4}
                            maxRows={8}
                          />
                        </DialogContent>
                        <DialogActions>
                          <StyledButton onClick={handleCloseDialog}>
                            Cancel
                          </StyledButton>
                          <StyledButton onClick={handleCreate}>
                            Grade
                          </StyledButton>
                        </DialogActions>
                      </Dialog>
                    </div>
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
