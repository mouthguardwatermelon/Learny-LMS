"use client";

import NotifComponent from "@/components/NotifComponent";
import { Typography } from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import { useAppDispatch } from "@/hooks";
import { setNotification } from "@/reducers/notifReducer";
import { NewUser, Notif, User } from "@/types";
import courseService from "@/services/courses";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks";
import { useEffect } from "react";
import LoadingPage from "@/components/LoadingPage";
import React from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";

export default function MyPage({ params }: { params: { slug: string } }) {
  const course = params.slug;
  const [isLoading, user] = useAuth();
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [isLoading, user]);

  if (isLoading || user) {
    return <LoadingPage />;
  }

  if (user) {
    router.push("/dashboard");
  }

  const usernameRegex = /^(?=[a-zA-Z0-9._-]{4,16}$)(?!.*[_.]{2})[^_.].*[^_.]$/;

  const DisplayingErrorMessagesSchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "Too Short!")
      .max(20, "Too Long!")
      .required("Required"),
    username: Yup.string()
      .min(4, "Too Short!")
      .max(16, "Too Long!")
      .matches(usernameRegex, "No spaces or special characters allowed")
      .required("Required"),
    email: Yup.string().email("Invalid email").required("Required"),
    password: Yup.string()
      .min(8, "Your password must at least be 8 characters!")
      .required("How are you going to log in without a password? 🙄"),
    registrationPassword: Yup.string().required("Enter the password from your teacher"),
    confirmPwd: Yup.string().oneOf(
      [Yup.ref("password")],
      "Passwords must match"
    ),
  });

  const handleSignUp = async (values: any) => {
    const { name, email, password, username, registrationPassword } = values;
    try {
      const user: NewUser = {
        name: name,
        email: email,
        password: password,
        username: username,
        courseString: course,
      };

      await courseService.directSignUp(course, { ...user, registrationPassword });
      router.push("/login");
    } catch (error: unknown) {
      // Error handling
      if (error instanceof AxiosError) {
        const notif: Notif = {
          message: error.response?.data.error
            ? error.response?.data.error
            : error.response?.data,
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
  };

  return (
    <div className="dark">
      <section className="bg-gray-50 dark:bg-bg min-h-screen">
        <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
          <div className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
            <SchoolIcon sx={{ display: { xs: "flex", md: "flex" }, mr: 1 }} />
            <Typography
              variant="h6"
              noWrap
              component="a"
              href="/"
              sx={{
                mr: 4,
                display: { xs: "flex", md: "flex" },
                fontWeight: 700,
                color: "inherit",
                textDecoration: "none",
              }}
            >
              Learny LMS
            </Typography>
          </div>
          <div className="w-full bg-white overflow-y-auto	rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-bg ">
            <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
              <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
                Register for a student account
              </h1>

              <Formik
                initialValues={{
                  name: "",
                  username: "",
                  email: "",
                  password: "",
                  confirmPwd: "",
                  registrationPassword: "",
                }}
                validationSchema={DisplayingErrorMessagesSchema}
                onSubmit={(values) => {
                  handleSignUp(values);
                }}
              >
                {({ errors, touched }) => (
                  <Form className="space-y-4 md:space-y-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Your name
                      </label>
                      <Field
                        type="name"
                        name="name"
                        id="name"
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-bg  dark:placeholder-gray-400 dark:text-white dark:focus:ring-yellow dark:focus:border-yellow"
                        placeholder="John Appleseed"
                      />
                      {touched.name && errors.name && (
                        <div className="mt-1 text-xs text-red-600">
                          {errors.name}
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Your email
                      </label>
                      <Field
                        type="email"
                        name="email"
                        id="email"
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-bg  dark:placeholder-gray-400 dark:text-white dark:focus:ring-yellow dark:focus:border-yellow"
                        placeholder="name@company.com"
                      />
                      {touched.email && errors.email && (
                        <div className="mt-1 text-xs text-red-600">
                          {errors.email}
                        </div>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="username"
                        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Username
                      </label>
                      <Field
                        type="username"
                        name="username"
                        id="username"
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-bg  dark:placeholder-gray-400 dark:text-white dark:focus:ring-yellow dark:focus:border-yellow"
                      />
                      {touched.username && errors.username && (
                        <div className="mt-1 text-xs text-red-600">
                          {errors.username}
                        </div>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="password"
                        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Password
                      </label>
                      <Field
                        type="password"
                        name="password"
                        id="password"
                        placeholder="••••••••"
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-bg  dark:placeholder-gray-400 dark:text-white dark:focus:ring-yellow dark:focus:border-yellow"
                      />
                      {touched.password && errors.password && (
                        <div className="mt-1 text-xs text-red-600">
                          {errors.password}
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPwd"
                        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Confirm Password
                      </label>
                      <Field
                        type="password"
                        name="confirmPwd"
                        id="confirmPwd"
                        placeholder="••••••••"
                        className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-bg  dark:placeholder-gray-400 dark:text-white dark:focus:ring-yellow dark:focus:border-yellow"
                      />
                      {touched.confirmPwd && errors.confirmPwd && (
                        <div className="mt-1 text-xs text-red-600">
                          {errors.confirmPwd}
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="registrationPassword" className="block mb-2 text-sm font-medium dark:text-white">
                        Course registration password
                      </label>
                      <Field type="password" name="registrationPassword" id="registrationPassword"
                        autoComplete="off" required className="w-full rounded-lg border p-2.5 dark:bg-bg dark:text-white" />
                      {touched.registrationPassword && errors.registrationPassword && (
                        <div className="mt-1 text-xs text-red-600">{errors.registrationPassword}</div>
                      )}
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="terms"
                          aria-describedby="terms"
                          type="checkbox"
                          className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-primary-600 dark:ring-offset-gray-800"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label
                          htmlFor="terms"
                          className="font-light text-gray-500 dark:text-gray-300"
                        >
                          I accept the{" "}
                          <a
                            className="text-sm font-medium text-primary-600 hover:underline dark:text-yellow"
                            href="#"
                          >
                            Terms and Conditions
                          </a>
                        </label>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full text-white bg-primary-600 hover:bg-primary-700  font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-pink dark:hover:bg-darkerpink"
                    >
                      Create an account
                    </button>
                    <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                      Already have an account?{" "}
                      <a
                        href="/login"
                        className="text-sm font-medium text-primary-600 hover:underline dark:text-yellow"
                      >
                        Login here
                      </a>
                    </p>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        </div>
      </section>
      <NotifComponent />
    </div>
  );
}
