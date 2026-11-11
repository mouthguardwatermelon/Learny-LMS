"use client";

import { MarkdownEditor } from "@/components/Markdown";
import * as React from "react";
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu, { MenuProps } from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { styled, alpha, ThemeProvider } from "@mui/material/styles";
import { Divider } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { Inter } from "next/font/google";
import { useAppDispatch } from "@/hooks";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import {
  deleteAssignment,
  editAssignment,
  editFile,
} from "@/reducers/courseReducer";
import { setNotification } from "@/reducers/notifReducer";
import { Assignment, File, NewAssignment, Notif } from "@/types";
import { AxiosError } from "axios";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs, { Dayjs } from "dayjs";
import {
  Dialog,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
} from "@mui/material";

const ITEM_HEIGHT = 36;
const inter = Inter({ subsets: ["latin"] });
interface Props {
  id: number;
  assignment: Assignment;
}

export default function AssignmentMenu({ id, assignment }: Props): JSX.Element {
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

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [name, setName] = useState<string>(
    assignment.name ? assignment.name : ""
  );
  const [instructions, setInstructions] = useState(assignment.instructions ?? "");
  const [visibleDate, setVisibleDate] = useState<Dayjs | null>(
    dayjs(assignment.visibledate)
  );
  const [deadline, setDeadline] = useState<Dayjs | null>(
    dayjs(assignment.deadline)
  );

  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleEditOptionClick = () => {
    setAnchorEl(null);
    setInstructions(assignment.instructions ?? "");
    setOpenDialog(true);
  };
  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // to ensure button's text is not all CAPS
  const StyledButton = styled(Button)({
    textTransform: "none",
  });

  const handleEdit = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (name.trim().length === 0) {
      const notif: Notif = {
        message: "Assignment name cannot be empty",
        type: "error",
      };
      dispatch(setNotification(notif, 5000));
      return;
    }
    const date = visibleDate
      ? visibleDate?.toDate().toISOString()
      : new Date().toISOString();

    const deadline1 = deadline
      ? deadline?.toDate().toISOString()
      : assignment.deadline;

    const editedAssignment: NewAssignment = {
      name: name,
      instructions,
      visibledate: date,
      deadline: deadline1,
    };
    try {
      await dispatch(editAssignment(editedAssignment, id));
      const notif: Notif = {
        type: "success",
        message: "Assignment edited",
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

  // Handle delete of assignment
  const handleDelete = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (window.confirm(`Do you want to delete this assignment?`)) {
      try {
        await dispatch(deleteAssignment(id));
        setAnchorEl(null);
        const notif: Notif = {
          message: "Assignment deleted",
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
          console.log(error);
          const notif: Notif = {
            message: "Unknown error happpened. Contact support!",
            type: "error",
          };
          dispatch(setNotification(notif, 5000));
        }
      }
    }
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
          <MenuItem onClick={handleEditOptionClick}>
            <EditIcon />
            Edit
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />
          <MenuItem sx={{ color: "red" }} onClick={handleDelete}>
            <DeleteIcon sx={{ color: "red" }} />
            Delete
          </MenuItem>
        </StyledMenu>
        <Dialog
          open={openDialog}
          onClose={handleDialogClose}
          PaperProps={{ style: { backgroundColor: "black" } }}
        >
          <NewDialogTitle
            id="customized-dialog-title"
            onClose={() => setOpenDialog(false)}
          >
            Edit assignment
          </NewDialogTitle>
          <DialogContent dividers>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Assignment Name"
              type="text"
              required={true}
              onChange={({ target }) => setName(target.value)}
              defaultValue={assignment.name}
              fullWidth
              variant="standard"
            />

            <MarkdownEditor label="Assignment instructions" value={instructions} onChange={setInstructions} />

            <DialogContentText sx={{ mt: 4, mb: 2 }}>
              Set a date and time for this file to become visible for students.
            </DialogContentText>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="File visible date"
                defaultValue={dayjs(assignment.visibledate)}
                onChange={(newValue) => setVisibleDate(newValue)}
              />
            </LocalizationProvider>

            <DialogContentText sx={{ mt: 4, mb: 2 }}>
              Set a deadline for this assignment.
            </DialogContentText>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Assignment deadline"
                defaultValue={dayjs(assignment.deadline)}
                onChange={(newValue) => setDeadline(newValue)}
              />
            </LocalizationProvider>
          </DialogContent>
          <DialogActions>
            <StyledButton onClick={() => setOpenDialog(false)}>
              Cancel
            </StyledButton>
            <StyledButton onClick={handleEdit}>Edit</StyledButton>
          </DialogActions>
        </Dialog>
      </div>
    </ThemeProvider>
  );
}
