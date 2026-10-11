import { createBrowserRouter, redirect } from "react-router";
import AppLayout from "./AppLayout";
import { ForgotPasswordPage, LoginPage, SignupPage } from "../pages/AuthPage";
import FeaturePage from "../pages/FeaturePage";
import {
  MiniDoctorPage,
  TestedLevelsPage,
  UncertaintyFlagsPage,
} from "../pages/FeatureToolsPage";
import HomePage from "../pages/HomePage";
import LandingPage from "../pages/LandingPage";
import NotFoundPage from "../pages/NotFoundPage";
import SampleReportPage from "../pages/SampleReportPage";
import VoiceAssistantPage from "../pages/VoiceAssistantPage";

import PatientLoginPage from "../pages/auth/PatientLoginPage";
import PatientSignupPage from "../pages/auth/PatientSignupPage";
import DoctorLoginPage from "../pages/auth/DoctorLoginPage";
import DoctorSignupPage from "../pages/auth/DoctorSignupPage";

export const router = createBrowserRouter([
  {
    Component: AppLayout,
    children: [
      {
        index: true,
        Component: LandingPage,
      },
      {
        path: "start",
        Component: HomePage,
      },
      {
        path: "login",
        Component: PatientLoginPage,
      },
      {
        path: "login/patient",
        Component: PatientLoginPage,
      },
      {
        path: "signup",
        Component: PatientSignupPage,
      },
      {
        path: "signup/patient",
        Component: PatientSignupPage,
      },
      {
        path: "login/doctor",
        Component: DoctorLoginPage,
      },
      {
        path: "signup/doctor",
        Component: DoctorSignupPage,
      },
      {
        path: "forgot-password",
        Component: ForgotPasswordPage,
      },
      {
        path: "features/structured-summaries",
        Component: SampleReportPage,
      },
      {
        path: "features/voice-assistant",
        Component: VoiceAssistantPage,
      },
      {
        path: "features/tested-levels",
        Component: TestedLevelsPage,
      },
      {
        path: "features/verified-extraction",
        loader: () => redirect("/features/tested-levels"),
      },
      {
        path: "features/uncertainty-flags",
        Component: UncertaintyFlagsPage,
      },
      {
        path: "features/mini-doctor-box",
        Component: MiniDoctorPage,
      },
      {
        path: "features/:featureId",
        Component: FeaturePage,
      },
      {
        path: "*",
        Component: NotFoundPage,
      },
    ],
  },
]);
