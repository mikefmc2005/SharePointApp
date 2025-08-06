<template>
  <router-view />
</template>

<script setup>
/**
 * Main App Component
 * Handles initial data loading for the application
 */

import { onMounted } from "vue";
import { getAllItems } from "./actions/getAllItem";
import { useAnnouncementsStore, useNoteStore, useProjectStore, useTaskStore } from "./store";

/**
 * Load projects from SharePoint
 * Fetches project data and sets the first project as current
 */
function loadProjects() {
  const projectStore = useProjectStore();

  const fields = ["ID", "Title", "phases", "members", "status", "key_IDs", "years", "months", "note_types"];

  projectStore.setLoading(true);

  getAllItems("Projects", fields)
    .then((res) => {
      projectStore.setProjects(res);

      // Set first project as current if projects exist
      if (res.length > 0) {
        projectStore.setCurrentProjectTitle(res[0].Title);
      }
    })
    .catch((error) => {
      console.error("Failed to load projects:", error);
    })
    .finally(() => {
      projectStore.setLoading(false);
    });
}

/**
 * Load tasks from SharePoint
 * Fetches all task data for the application
 */
function loadTasks() {
  const taskStore = useTaskStore();

  const fields = [
    "ID",
    "project_name",
    "phase",
    "task",
    "sub_task",
    "task_progress",
    "start_date",
    "deadline_date",
    "status",
    "assigned_to",
    "dependency",
    "description",
    "groups",
    "architecture",
    "pulled",
  ];

  taskStore.setLoading(true);

  getAllItems("Tasks", fields)
    .then((res) => {
      taskStore.setTasks(res);
      console.log("Tasks loaded successfully:", res.length, "tasks");
    })
    .catch((error) => {
      console.error("Failed to load tasks:", error);
    })
    .finally(() => {
      taskStore.setLoading(false);
    });
}

/**
 * Load notes from SharePoint
 * Fetches all note data for the application
 */
function loadNotes() {
  const noteStore = useNoteStore();

  const fields = ["ID", "type", "created_date", "updated_date", "content"];

  noteStore.setLoading(true);

  getAllItems("Notes", fields)
    .then((res) => {
      noteStore.setNotes(res);
      console.log("Notes loaded successfully:", res.length, "notes");
    })
    .catch((error) => {
      console.error("Failed to load notes:", error);
    })
    .finally(() => {
      noteStore.setLoading(false);
    });
}

/**
 * Load announcements from SharePoint
 * Fetches all announcement data for the application
 */
function loadAnnouncements() {
  const announcementStore = useAnnouncementsStore();

  const fields = ["ID", "project_name", "Title", "content", "posted_date", "posted_by", "deadline_date"];

  announcementStore.setLoading(true);

  getAllItems("Announcements", fields)
    .then((res) => {
      announcementStore.setAnnouncements(res);
      console.log("Announcements loaded successfully:", res.length, "announcements");
    })
    .catch((error) => {
      console.error("Failed to load announcements:", error);
    })
    .finally(() => {
      announcementStore.setLoading(false);
    });
}

/**
 * Initialize application data on component mount
 * Loads all required data from SharePoint
 */
onMounted(() => {
  console.log("Initializing application data...");
  loadProjects();
  loadTasks();
  loadNotes();
  loadAnnouncements();
});
</script>
