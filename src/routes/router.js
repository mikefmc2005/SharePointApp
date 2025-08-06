/**
 * Vue Router Configuration
 * Defines all application routes and navigation structure
 */

import { createRouter, createWebHashHistory } from "vue-router";

// Layout imports
import MainLayout from "../layouts/MainLayout.vue";

// Page imports
import Dashboard from "../pages/Dashboard.vue";
import Setup from "../pages/Setup.vue";
import ProjectTimeline from "../pages/ProjectTimeline.vue";
import TaskList from "../pages/TaskList.vue";
import DailyTasks from "../pages/DailyTasks.vue";
import Schedule from "../pages/Schedule.vue";
import Notes from "../pages/Notes.vue";
import NotFound from "../pages/NotFound.vue";

/**
 * Application routes configuration
 * All routes are nested under MainLayout except 404
 */
const routes = [
  {
    path: "/",
    component: MainLayout,
    children: [
      {
        path: "/",
        name: "dashboard",
        component: Dashboard,
        meta: { title: "Dashboard" },
      },
      {
        path: "/setup",
        name: "setup",
        component: Setup,
        meta: { title: "Setup" },
      },
      {
        path: "/timeline",
        name: "timeline",
        component: ProjectTimeline,
        meta: { title: "Project Timeline" },
      },
      {
        path: "/list",
        name: "tasklist",
        component: TaskList,
        meta: { title: "Task List" },
      },
      {
        path: "/dailytasks",
        name: "dailytasks",
        component: DailyTasks,
        meta: { title: "Daily Tasks" },
      },
      {
        path: "/schedule",
        name: "schedule",
        component: Schedule,
        meta: { title: "Schedule" },
      },
      {
        path: "/notes",
        name: "notes",
        component: Notes,
        meta: { title: "Notes" },
      },
    ],
  },
  // 404 route - must be last
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: NotFound,
    meta: { title: "Page Not Found" },
  },
];

// Create router instance
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Pre-resolve 404 route for better performance
router.resolve({
  name: "not-found",
  params: { pathMatch: ["not", "found"] },
}).href;

export default router;
