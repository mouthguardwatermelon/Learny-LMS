"use client";
import { MarkdownEditor } from "@/components/Markdown";
import IconButton from "@mui/material/IconButton";
import { MenuProps } from "@mui/material/Menu";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import { styled, alpha, ThemeProvider } from "@mui/material/styles";
import { Divider } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { Inter } from "next/font/google";
import {
  deleteCourse,
  deleteSection,
  editSection,
} from "@/reducers/courseReducer";
import { deleteChapter } from "@/reducers/courseReducer";
import { useAppDispatch } from "@/hooks";
import React, { useState, useEffect, NewLifecycle } from "react";
import { NewFile, NewSection, Notif } from "@/types";
import { addFile } from "@/reducers/courseReducer";
import { setNotification } from "@/reducers/notifReducer";
import { green } from "@mui/material/colors";
import {
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
} from "@mui/material";
import { File } from "buffer";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs, { Dayjs } from "dayjs";
import { AxiosError } from "axios";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import { addAssignment } from "@/reducers/courseReducer";

const inter = Inter({ subsets: ["latin"] });
interface Props {
  id: number;
  title: string;
}

export default function SectionMenu({ id, title }: Props) {
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
    components: {
      MuiFab: {
        styleOverrides: {
          root: {
            color: "#ffffff",
            backgroundColor: "#ff4081",
            "&:hover": {
              backgroundColor: "#f01b68",
            },
          },
        },
      },
    },
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [sxnTitle, setsxnTitle] = useState<string>(title ? title : "");
  const [openAssignmentDialog, setOpenAssignmentDialog] = useState(false);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [selectedRadio, setSelectedRadio] = useState("");
  const [name, setName] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [url, seturl] = useState<string | null>(null);
  const [visibleDate, setVisibleDate] = useState<Dayjs | null>(dayjs());
  const [deadline, setDeadline] = useState<Dayjs | null>(dayjs());
  const [marks, setMarks] = useState<string>("");

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuClick = () => {
    setAnchorEl(null);
    setOpenDialog(true);
  };
  const handleAssignmentMenuClick = () => {
    setAnchorEl(null);
    setOpenAssignmentDialog(true);
  };
  const handleDialogClose = () => {
    setSelectedRadio("");
    setOpenDialog(false);
  };
  const handleEditDialogOpen = () => {
    setAnchorEl(null);
    setOpenEditDialog(true);
  };

  const handleEditDialogClose = () => {
    setOpenEditDialog(false);
  };

  const handleAssignmentDialogClose = () => {
    setOpenAssignmentDialog(false);
  };

  // handling editing of a section
  const handleEditSection = async (event: React.FormEvent) => {
    event.preventDefault();

    if (sxnTitle.trim().length === 0) {
      console.log("No empty strings allowed");
    } else {
      const section: NewSection = {
        title: sxnTitle && sxnTitle.trim(),
      };
      await dispatch(editSection(section, id));
      setsxnTitle("");
      const notif: Notif = {
        type: "success",
        message: "Section edited",
      };
      await dispatch(setNotification(notif, 5000));
      setOpenEditDialog(false);
    }
  };

  // handling deletion of a section
  const handleDelete = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (window.confirm(`Do you want to delete this section?`)) {
      try {
        await dispatch(deleteSection(id));
        setAnchorEl(null);
        const notif: Notif = {
          message: "Section deleted",
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

  // handling setting of file to state variable once user attaches the file
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    // only choosing PDF files here
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile as unknown as File);
    }
  };

  // Handle creation of file once 'create' button is clicked
  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const newFile = new FormData();
    if (name.trim().length === 0) {
      const notif: Notif = {
        message: "File name cannot be empty",
        type: "error",
      };
      dispatch(setNotification(notif, 5000));
      return;
    }
    if (selectedRadio === "file" && file === null) {
      const notif: Notif = {
        message: "No file uploaded",
        type: "error",
      };
      dispatch(setNotification(notif, 5000));
      return;
    }

    if (selectedRadio === "link" && url === null) {
      const notif: Notif = {
        message: "URL cannot be empty",
        type: "error",
      };
      dispatch(setNotification(notif, 5000));
      return;
    }
    const date = visibleDate
      ? visibleDate?.toDate().toISOString()
      : new Date().toISOString();
    newFile.append("name", name);
    if (file) {
      newFile.append("file", file as unknown as Blob, file?.name);
    }
    if (url) {
      newFile.append("link", url);
    }
    newFile.append("visibledate", date);

    try {
      await dispatch(addFile(newFile, id));
      const notif: Notif = {
        type: "success",
        message: "File uploaded",
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

  // Handle creation of assignment once 'create' button is clicked
  const handleCreateAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    const newAssignment = new FormData();
    if (name.trim().length === 0) {
      const notif: Notif = {
        message: "File name cannot be empty",
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
    if (!instructions?.trim()) {
      const notif: Notif = {
        message: "Add instructions for the assignment.",
        type: "error",
      };
      dispatch(setNotification(notif, 5000));
      return;
    }

    if (deadline == null) {
      const notif: Notif = {
        message: "Set a deadline for the assignment.",
        type: "error",
      };
      dispatch(setNotification(notif, 5000));
      return;
    }

    const visibledet = visibleDate
      ? visibleDate?.toDate().toISOString()
      : new Date().toISOString();

    const deadlinedet = deadline.toISOString();

    newAssignment.append("name", name);
    newAssignment.append("file", file as unknown as Blob, file?.name);
    newAssignment.append("visibledate", visibledet);
    newAssignment.append("deadline", deadlinedet);
    newAssignment.append("instructions", instructions);
    newAssignment.append("marks", marks);

    try {
      await dispatch(addAssignment(newAssignment, id));
      const notif: Notif = {
        type: "success",
        message: "Assignment created.",
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

  const StyledButton = styled(Button)({
    textTransform: "none",
  });

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

  const StyledMenu = styled((props: MenuProps) => (
    <Menu
      elevation={0}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      {...props}
    />
  ))(({ theme }) => ({
    "& .MuiPaper-root": {
      borderRadius: 6,
      marginTop: theme.spacing(1),
      minWidth: 150,
      color:
        theme.palette.mode === "light"
          ? "rgb(55, 65, 81)"
          : theme.palette.grey[300],
      boxShadow:
        "rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px",
      "& .MuiMenu-list": {
        padding: "4px 0",
      },
      "& .MuiMenuItem-root": {
        "& .MuiSvgIcon-root": {
          fontSize: 16,
          marginRight: theme.spacing(1.5),
        },
        fontSize: 16,
      },
    },
  }));

  return (
    <ThemeProvider theme={theme}>
      <div>
        <IconButton
          aria-label="more"
          id="long-button"
          aria-controls={open ? "long-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-haspopup="true"
          onClick={handleClick}
        >
          <MoreVertIcon />
        </IconButton>
        <StyledMenu
          id="long-menu"
          MenuListProps={{
            "aria-labelledby": "long-button",
          }}
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          PaperProps={{
            style: {
              maxHeight: "none",
              width: "15ch",
            },
          }}
        >
          <MenuItem onClick={handleEditDialogOpen}>
            <EditIcon />
            Section
          </MenuItem>
          <MenuItem onClick={handleMenuClick}>
            <AddIcon />
            File
          </MenuItem>
          <MenuItem onClick={handleAssignmentMenuClick}>
            <AddIcon />
            Assignment
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />
          <MenuItem sx={{ color: "red" }} onClick={handleDelete}>
            <DeleteIcon sx={{ color: "red" }} />
            Delete
          </MenuItem>
        </StyledMenu>

        {/* Edit section dialog */}
        <Dialog
          open={openEditDialog}
          onClose={handleEditDialogClose}
          fullWidth
          PaperProps={{ style: { backgroundColor: "black" } }}
        >
          <NewDialogTitle
            id="customized-dialog-title"
            onClose={handleEditDialogClose}
          >
            {" "}
            Edit section title
          </NewDialogTitle>
          <DialogContent dividers>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              defaultValue={title}
              type="text"
              required={true}
              onChange={({ target }) => setsxnTitle(target.value)}
              fullWidth
              variant="standard"
            />
          </DialogContent>
          <DialogActions>
            <StyledButton onClick={handleEditDialogClose}>Cancel</StyledButton>
            <StyledButton onClick={handleEditSection}>Edit</StyledButton>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openDialog}
          onClose={handleDialogClose}
          PaperProps={{ style: { backgroundColor: "black" } }}
        >
          <NewDialogTitle
            id="customized-dialog-title"
            onClose={handleDialogClose}
          >
            Upload file
          </NewDialogTitle>
          <DialogContent dividers>
            <DialogContentText>
              Upload a tutorial file or worksheet here. You are uploading in{" "}
              <b>{title}</b>.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="File Name"
              type="text"
              required={true}
              onChange={({ target }) => setName(target.value)}
              fullWidth
              variant="standard"
            />
            <FormLabel sx={{ mt: 2 }} id="demo-row-radio-buttons-group-label">
              Upload type:
            </FormLabel>
            <RadioGroup
              row
              aria-labelledby="demo-row-radio-buttons-group-label"
              name="row-radio-buttons-group"
              onChange={({ target }) => setSelectedRadio(target.value)}
            >
              <FormControlLabel value="file" control={<Radio />} label="File" />
              <FormControlLabel
                value="link"
                control={<Radio />}
                label="URL/Link"
              />
            </RadioGroup>
            {selectedRadio === "file" && (
              <>
                <DialogContentText sx={{ mt: 2 }}>
                  Choose a file to upload onto our servers. Only PDF files are
                  accepted for now.
                </DialogContentText>
                <div className="mt-2 mb-6">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf"
                    required
                  />
                </div>
              </>
            )}
            {selectedRadio === "link" && (
              <TextField
                margin="dense"
                sx={{ mb: 4 }}
                id="name"
                label="URL of File"
                type="url"
                required={true}
                onChange={({ target }) => seturl(target.value)}
                fullWidth
                variant="standard"
              />
            )}

            <DialogContentText sx={{ mb: 4 }}>
              Set a date and time for this file to become visible for students.
            </DialogContentText>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="File visible date"
                value={visibleDate}
                onChange={(newValue) => setVisibleDate(newValue)}
              />
            </LocalizationProvider>
          </DialogContent>
          <DialogActions>
            <StyledButton onClick={handleDialogClose}>Cancel</StyledButton>
            <StyledButton onClick={handleCreate}>Create</StyledButton>
          </DialogActions>
        </Dialog>
        <Dialog
          open={openAssignmentDialog}
          onClose={handleAssignmentDialogClose}
          PaperProps={{ style: { backgroundColor: "black" } }}
        >
          <NewDialogTitle
            id="customized-dialog-title"
            onClose={handleAssignmentDialogClose}
          >
            Create an Assignment
          </NewDialogTitle>
          <DialogContent dividers>
            <DialogContentText>
              Create an assignment for your students here. You are uploading in{" "}
              <b>{title}</b>.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Assignment Name"
              type="text"
              required={true}
              onChange={({ target }) => setName(target.value)}
              fullWidth
              variant="standard"
            />

            <MarkdownEditor label="Assignment instructions" value={instructions ?? ""} onChange={setInstructions} />

            <TextField
              id="outlined-number"
              label="Maximum score"
              type="number"
              onChange={({ target }) => setMarks(target.value)}
              sx={{ mt: 2 }}
              InputLabelProps={{
                shrink: true,
              }}
            />

            <DialogContentText sx={{ mt: 2 }}>
              Choose a file to upload onto our servers. Only PDF files are
              accepted for now.
            </DialogContentText>
            <div className="mt-2 mb-6">
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".pdf"
                required
              />
            </div>
            <div className="mb-2">
              <DialogContentText sx={{ mb: 2 }}>
                Set a date and time for this file to become visible for
                students.
              </DialogContentText>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="Assignment visible date"
                  value={visibleDate}
                  onChange={(newValue) => setVisibleDate(newValue)}
                />
              </LocalizationProvider>
            </div>

            <DialogContentText sx={{ mb: 2 }}>
              Set a deadline for this assignment.
            </DialogContentText>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Assignment deadline"
                value={deadline}
                onChange={(newValue) => setDeadline(newValue)}
              />
            </LocalizationProvider>
          </DialogContent>
          <DialogActions>
            <StyledButton onClick={() => setOpenAssignmentDialog(false)}>
              Cancel
            </StyledButton>
            <StyledButton onClick={handleCreateAssignment}>Create</StyledButton>
          </DialogActions>
        </Dialog>
      </div>
    </ThemeProvider>
  );
}
