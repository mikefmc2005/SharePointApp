/**
 * Pinia Store Configuration
 * Centralized state management for the application
 */

import { defineStore } from "pinia";

/**
 * Normalize project data from SharePoint format
 * Converts string arrays to actual arrays and processes status colors
 * @param {Object} project - Raw project data from SharePoint
 * @returns {Object} Normalized project data
 */
function normalizeProject(project) {
  // Process status and status colors
  if (typeof project.status === "string") {
    const statusColor = {};
    project.status = project.status
      ? project.status.split(",").map((item) => {
          const [name, color] = item.split("#");
          statusColor[name] = "#" + (color || "666666");
          return {
            name,
            color: statusColor[name],
          };
        })
      : [];
    project.statusColor = statusColor;
  } else {
    const statusColor = {};
    project.status.forEach(({ name, color }) => {
      statusColor[name] = color;
    });
    project.statusColor = statusColor;
  }

  // Convert string arrays to actual arrays
  const stringFields = ["phases", "members", "years", "months", "note_types"];
  stringFields.forEach((field) => {
    project[field] = project[field] || "";
    if (typeof project[field] === "string") {
      project[field] = project[field] ? project[field].split(",") : [];
    }
  });

  return project;
}

function normalizeTask(task) {
  // Convert string arrays to actual arrays
  const today = new Date();
  const startDate = new Date(task.start_date);
  const deadlineDate = new Date(task.deadline_date);
  const msPerDay = 1000 * 60 * 60 * 24;
  const durationMs = deadlineDate - startDate;
  task.duration = Math.round(durationMs / msPerDay);

  const passed_days = Math.round((today - startDate) / msPerDay);
  const left_days = Math.round((deadlineDate - today) / msPerDay);
  task.passed_days = passed_days >= 0 ? passed_days : 0;
  task.left_days = left_days > 0 ? left_days : 0;

  return task;
}

/**
 * User Store
 * Manages current user information
 */
export const useUserStore = defineStore("user", {
  state: () => ({
    currentUser: null,
  }),
  actions: {
    setUser(payload) {
      this.currentUser = payload;
    },
  },
});

/**
 * Project Store
 * Manages project data and current project selection
 */
export const useProjectStore = defineStore("Projects", {
  state: () => ({
    projects: [],
    currentProjectTitle: "",
    currentProject: null,
    loading: false,
  }),
  actions: {
    /**
     * Set all projects and normalize their data
     * @param {Array} payload - Array of project objects
     */
    setProjects(payload) {
      this.projects = payload.map((project) => normalizeProject(project));
    },

    /**
     * Set current project by title
     * @param {string} payload - Project title
     */
    setCurrentProjectTitle(payload) {
      this.currentProjectTitle = payload;
      this.currentProject = this.projects.find((item) => item.Title === payload);
      console.log("Current Project:", this.currentProject);
    },

    /**
     * Add a new project
     * @param {Object} payload - Project object
     */
    addProject(payload) {
      this.projects.push(normalizeProject(payload));
      this.setCurrentProjectTitle(payload.Title);
    },

    /**
     * Edit an existing project
     * @param {Object} payload - Updated project object
     */
    editProject(payload) {
      let currentTitle = "";
      this.projects = this.projects.map((item) => {
        if (payload.ID === item.ID) {
          currentTitle = item.Title;
          return normalizeProject({ ...item, ...payload });
        }
        return item;
      });
      this.setCurrentProjectTitle(currentTitle);
    },

    /**
     * Set loading state
     * @param {boolean} payload - Loading state
     */
    setLoading(payload) {
      this.loading = payload;
    },
  },
});

/**
 * Task Store
 * Manages task data and operations
 */
export const useTaskStore = defineStore("Tasks", {
  state: () => ({
    tasks: [],
    loading: false,
  }),
  actions: {
    /**
     * Set all tasks
     * @param {Array} payload - Array of task objects
     */
    setTasks(payload) {
      this.tasks = payload.map((task) => normalizeTask(task));
    },

    /**
     * Add a new task
     * @param {Object} payload - Task object
     */
    addTask(payload) {
      this.tasks.push(normalizeTask(payload));
    },

    /**
     * Delete multiple tasks by IDs
     * @param {Array} IDs - Array of task IDs to delete
     */
    deleteTasks(IDs) {
      this.tasks = this.tasks.filter((item) => !IDs.includes(item.ID));
    },

    /**
     * Edit an existing task
     * @param {Object} payload - Updated task object
     */
    editTask(payload) {
      this.tasks = this.tasks.map((item) => {
        if (payload.ID === item.ID) {
          return normalizeTask({ ...item, ...payload });
        }
        return item;
      });
    },

    /**
     * Set loading state
     * @param {boolean} payload - Loading state
     */
    setLoading(payload) {
      this.loading = payload;
    },
  },
});

/**
 * Note Store
 * Manages note data and operations
 */
export const useNoteStore = defineStore("Notes", {
  state: () => ({
    notes: [],
    loading: false,
  }),
  actions: {
    /**
     * Set all notes
     * @param {Array} payload - Array of note objects
     */
    setNotes(payload) {
      this.notes = payload;
    },

    /**
     * Add a new note
     * @param {Object} payload - Note object
     */
    addNote(payload) {
      this.notes.push(payload);
    },

    /**
     * Edit an existing note
     * @param {Object} payload - Updated note object
     */
    editNote(payload) {
      this.notes = this.notes.map((item) => {
        if (payload.ID === item.ID) {
          return { ...item, ...payload };
        }
        return item;
      });
    },

    /**
     * Delete a note by ID
     * @param {number} ID - Note ID to delete
     */

    /**
     * Set loading state
     * @param {boolean} payload - Loading state
     */
    setLoading(payload) {
      this.loading = payload;
    },
  },
});

/**
 * Note Store
 * Manages note data and operations
 */
export const useTaskModalStore = defineStore("AddTask", {
  state: () => ({
    task: {},
    open: false,
  }),
  actions: {
    openAdd(payload) {
      this.open = "Add";
      this.task = {
        ...payload,
        depth: 3,
        pulled: true,
        task_progress: 0,
      };
    },
    openEdit(payload) {
      this.open = "Edit";
      this.task = {
        ...payload,
        new_task: payload.new_task || "",
        depth: payload.depth || 3,
        new_phase: payload.new_phase || "",
      };
    },
    close() {
      this.task = {};
      this.open = false;
    },
  },
});

/**
 * Announcements Store
 * Manages announcements data and operations
 */
export const useAnnouncementsStore = defineStore("Announcements", {
  state: () => ({
    announcements: [],
    loading: false,
  }),
  actions: {
    /**
     * Set all announcements
     * @param {Array} payload - Array of announcement objects
     */
    setAnnouncements(payload) {
      this.announcements = payload;
    },

    /**
     * Add a new announcement
     * @param {Object} payload - Announcement object
     */
    addAnnouncement(payload) {
      this.announcements.push(payload);
    },

    editAnnouncement(payload) {
      this.announcements = this.announcements.map((item) => {
        if (payload.ID === item.ID) {
          return { ...item, ...payload };
        }
        return item;
      });
    },

    deleteAnnouncement(ID) {
      this.announcements = this.announcements.filter((item) => item.ID !== ID);
    },

    /**
     * Set loading state
     * @param {boolean} payload - Loading state
     */
    setLoading(payload) {
      this.loading = payload;
    },
  },
});
