"use client";

import ChapterView from "../../../components/CourseView/ChapterView";
import NavigationBar from "../../../components/NavigationBar";
import { useEffect, useState } from "react";
import { initializeCourses } from "@/reducers/courseReducer";
import { useAppDispatch, useAppSelector, useIsMobile } from "@/hooks";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks";
import { Chapter } from "@/types";
import NewChapterForm from "@/components/FormModal/NewChapterForm";
import NotifComponent from "@/components/NotifComponent";
import {
  Tooltip,
  Tabs,
  Tab,
  Box,
  createTheme,
  ThemeProvider,
  Button,
  Menu,
  MenuItem,
  Badge,
  CircularProgress,
} from "@mui/material";
import CampaignIcon from "@mui/icons-material/Campaign";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AnnouncementsPage from "@/components/CourseView/AnnouncementsPage";
import RecordingsPage from "@/components/CourseView/RecordingPage";
import SettingsPage from "@/components/CourseView/SettingsPage";
import NotFoundPage from "@/components/NotFoundPage";
import { Inter } from "next/font/google";
import { Typography } from "@mui/material";

const inter = Inter({ subsets: ["latin"] });

export default function CoursePage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const courses = useAppSelector((state) => state.courses);
  const isMobile = useIsMobile();
  const dispatch = useAppDispatch();
  const [isLoading, user] = useAuth();
  const [result, setResult] = useState<{ slug: string; status?: number }>();
  const [value, setValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

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
    let active = true;
    const fetchCourse = async () => {
      if (user) {
        const status = /^\d+$/.test(params.slug)
          ? await dispatch(initializeCourses(Number(params.slug)))
          : 404;
        if (active) setResult({ slug: params.slug, status });
      }
    };
    fetchCourse();
    return () => { active = false; };
  }, [dispatch, user, params.slug]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || result?.slug !== params.slug) {
    return (
      <main className="bg-bg min-h-screen flex items-center justify-center">
        <CircularProgress style={{ color: "#fec006" }} />
      </main>
    );
  }

  if (result.status === 403 || result.status === 404) {
    return <NotFoundPage status={result.status} />;
  }
  if (result.status !== undefined) {
    return <NotFoundPage status={500} />;
  }

  const course = courses.find((course) => course.id === parseInt(params.slug));

  if (!course) {
    return <NotFoundPage />;
  }

  const sortChapterFunc = (a: Chapter, b: Chapter) => {
    if (a.pinned && !b.pinned) {
      return -1;
    }
    if (b.pinned && !a.pinned) {
      return 1;
    }
    return 0;
  };

  interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
  }

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleClick = (event: React.SyntheticEvent) => {
    setAnchorEl(event.currentTarget as HTMLElement);
  };

  const handleClose = (index: number) => {
    setValue(index);
    setAnchorEl(null);
  };

  function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {value === index && <Box>{children}</Box>}
      </div>
    );
  }

  const labels = ["Coursework", "Announcements", "Lesson Recordings"];
  if (user && user.role === "teacher") {
    labels.push("Settings");
  }

  function a11yProps(index: number) {
    return {
      id: `simple-tab-${index}`,
      "aria-controls": `simple-tabpanel-${index}`,
    };
  }

  return (
    <ThemeProvider theme={theme}>
      <div className="dark">
        <div className="dark:bg-bg">
          <NavigationBar />
          <main className="pt-6 pb-16 lg:pt-6 lg:pb-24 bg-white dark:bg-bg">
            <div className="min-h-screen flex justify-between px-4 mx-auto max-w-6xl">
              <div className="flex-grow mx-4">
                <div className="bg-white dark:bg-bg min-h-screen">
                  <Box sx={{ width: "100%" }}>
                    {isMobile ? (
                      <div>
                        <Button
                          id="mobile-tabs-button"
                          aria-controls={open ? "mobile-tabs-menu" : undefined}
                          aria-haspopup="true"
                          aria-expanded={open ? "true" : undefined}
                          onClick={handleClick}
                          endIcon={<KeyboardArrowDownIcon />}
                        >
                          Menu
                        </Button>
                        <Menu
                          id="mobile-tabs-menu"
                          anchorEl={anchorEl}
                          open={open}
                          onClose={() => handleClose(value)} // Close without changing tab
                        >
                          {labels.map((label, index) => (
                            <MenuItem
                              key={label}
                              onClick={() => handleClose(index)}
                              selected={index === value}
                            >
                              {label}
                            </MenuItem>
                          ))}
                        </Menu>
                      </div>
                    ) : (
                      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                        <Tabs
                          value={value}
                          onChange={handleChange}
                          textColor="primary"
                          indicatorColor="primary"
                          centered
                          scrollButtons="auto"
                          aria-label="course tabs"
                        >
                          <Tab
                            label="Coursework"
                            sx={{ textTransform: "none" }}
                            {...a11yProps(0)}
                          />
                          <Tab
                            label="Announcements"
                            icon={
                              <Badge
                                badgeContent={
                                  course.announcements?.length
                                    ? course.announcements?.length
                                    : null
                                }
                                color="error"
                              >
                                <CampaignIcon color="action" />
                              </Badge>
                            }
                            sx={{ textTransform: "none" }}
                            iconPosition="end"
                            {...a11yProps(1)}
                          />
                          <Tab
                            label="Lesson Recordings"
                            sx={{ textTransform: "none" }}
                            {...a11yProps(2)}
                          />
                          {user && user.role === "teacher" && (
                            <Tab
                              label="Settings"
                              sx={{ textTransform: "none" }}
                              {...a11yProps(3)}
                            />
                          )}
                        </Tabs>
                      </Box>
                    )}
                    <CustomTabPanel value={value} index={0}>
                      <div className=" w-full lg:max-w-6xl pt-10">
                        <div className="flex flex-col justify-between md:flex-row mx-auto">
                          <h1 className="mb-4 md:mb-12 text-4xl text-clip overflow-hidden tracking-tight font-semibold text-gray-900 dark:text-white ">
                            {course.title}
                          </h1>

                          <div className="flex flex-row mb-8 md:mb-0">
                            {user?.role === "teacher" ? (
                              <Tooltip title="Add Chapter" placement="top">
                                <NewChapterForm courseId={course.id} />
                              </Tooltip>
                            ) : null}
                          </div>
                        </div>

                        {course.chapters.length > 0 ? (
                          [...course.chapters]
                            .sort(sortChapterFunc)
                            .map((chapter) => (
                              <ChapterView key={chapter.id} chapter={chapter} />
                            ))
                        ) : (
                          <Typography color="text.secondary">
                            No course work found.
                          </Typography>
                        )}
                      </div>
                    </CustomTabPanel>
                    <CustomTabPanel value={value} index={1}>
                      <AnnouncementsPage courseId={course.id} />
                    </CustomTabPanel>
                    <CustomTabPanel value={value} index={2}>
                      <RecordingsPage courseId={course.id} />
                    </CustomTabPanel>
                    {user && user.role === "teacher" && (
                      <CustomTabPanel value={value} index={3}>
                        <SettingsPage courseId={course.id} />
                      </CustomTabPanel>
                    )}
                  </Box>
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
