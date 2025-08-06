<script setup>
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useProjectStore, useTaskStore, useUserStore } from "../../store";
import { addItem } from "../../actions/addItem";

const route = useRoute();
const userStore = useUserStore();
const taskStore = useTaskStore();
const projectStore = useProjectStore();
const { currentUser } = storeToRefs(userStore);

const selectedProject = ref("");
const selectedPlaybook = ref("- No");
const successed = ref(0);

watch(
  () => [selectedProject.value],
  ([projectTitle]) => {
    projectStore.setCurrentProjectTitle(projectTitle);
  }
);

watch(
  () => [projectStore.currentProjectTitle],
  ([projectTitle]) => {
    selectedProject.value = projectTitle;
  }
);

const options = ref(projectStore.projects.map((item) => item.Title));

function filterFn(val, update) {
  if (val == "") {
    update(() => {
      options.value = projectStore.projects.map((item) => item.Title);
    });
  } else {
    update(() => {
      const needle = val.toLowerCase();

      options.value = projectStore.projects
        .map((item) => item.Title)
        .filter((v) => v.toLowerCase().indexOf(needle) > -1);
    });
  }
}

const menuList = [
  {
    icon: "dashboard",
    label: "Dashboard",
    linkTo: "/",
    separator: false,
  },
  {
    icon: "settings",
    label: "Setup",
    linkTo: "/setup",
    separator: false,
  },
  {
    icon: "checklist", // or 'list_alt'
    label: "Task list",
    linkTo: "/list",
    separator: false,
  },
  {
    icon: "timeline",
    label: "Project Timeline",
    linkTo: "/timeline",
    separator: false,
  },
  {
    icon: "calendar_month", // or 'date_range'
    label: "Weekly Schedule",
    linkTo: "/schedule",
    separator: false,
  },
  {
    icon: "today", // or 'event_note'
    label: "Daily Tasks",
    linkTo: "/dailytasks",
    separator: false,
  },
  {
    icon: "note", // or 'sticky_note_2'
    label: "Notes",
    linkTo: "/notes",
    separator: false,
  },
];

// Helper to get initials from name
function getInitials(name) {
  if (!name) return "-";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// Add project modal state and logic
const showAddProjectModal = ref(false);
const projectName = ref("");
const isAddingProject = ref(false);

async function addProject() {
  if (!projectName.value.trim()) return;

  try {
    isAddingProject.value = true;

    projectStore.setLoading(true);
    addItem("Projects", { Title: projectName.value, status: "Open#666666" })
      .then((res) => {
        projectStore.addProject({
          ID: res.ID,
          Title: res.Title,
          phases: res.phases,
          members: res.members,
          status: res.status,
          key_IDs: res.key_IDs,
          months: res.months,
          years: res.years,
          note_types: res.note_types,
        });

        const tasks = taskStore.tasks.filter((item) => item.project_name == selectedPlaybook.value);

        tasks.forEach((item) => {
          const task = {
            project_name: projectName.value,
            phase: item.phase,
            task: item.task,
            sub_task: item.sub_task,
            description: item.description,
            dependency: item.dependency,
            groups: item.groups,
            architecture: item.architecture,
            task_progress: 0,
            status: "Open",
            pulled: false,
          };

          addItem("Tasks", task).then((res) => {
            taskStore.addTask({ ...task, ID: res.ID });
            successed.value++;
            if (tasks.length == successed.value) {
              // Update options and select the new project
              options.value = projectStore.projects.map((item) => item.Title);
              selectedProject.value = projectName.value.trim();

              // Reset and close modal
              projectName.value = "";
              showAddProjectModal.value = false;
            }
          });
        });
      })
      .finally(() => {
        projectStore.setLoading(false);
      });
  } catch (error) {
    console.error("Error adding project:", error);
  } finally {
    isAddingProject.value = false;
  }
}
</script>

<template>
  <q-scroll-area class="fit">
    <div class="user-card">
      <div class="avatar-wrapper">
        <div class="avatar">
          {{ getInitials(currentUser?.Title || "?") }}
        </div>
      </div>
      <div class="user-info">
        <div class="user-name">{{ currentUser?.Title || "..." }}</div>
        <div class="user-email">{{ currentUser?.Email || "..." }}</div>
      </div>
    </div>
    <div class="project-selection">
      <div class="row">
        <div class="col-10">
          <q-select
            v-model="selectedProject"
            label="Project"
            :options="options"
            use-input
            input-debounce="0"
            map-options
            behavior="menu"
            @filter="filterFn"
          />
        </div>
        <div class="col-me-2">
          <q-btn
            icon="add"
            size="sm"
            color="primary"
            round
            glossy
            style="transform: translate(40%, 60%)"
            @click="showAddProjectModal = true"
          />
        </div>
      </div>
    </div>
    <q-list>
      <template v-for="(menuItem, index) in menuList" :key="index">
        <q-item clickable :to="menuItem.linkTo" :active="route.path === menuItem.linkTo" v-ripple>
          <q-item-section avatar>
            <q-icon :name="menuItem.icon" />
          </q-item-section>
          <q-item-section>
            {{ menuItem.label }}
          </q-item-section>
        </q-item>
        <q-separator :key="'sep' + index" v-if="menuItem.separator" />
      </template>
    </q-list>
  </q-scroll-area>

  <!-- Add Project Modal -->
  <q-dialog v-model="showAddProjectModal" persistent>
    <q-card style="width: 400px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Add New Project</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form @submit="addProject" class="q-gutter-md">
          <q-input
            v-model="projectName"
            label="Project Name"
            outlined
            dense
            :rules="[
              (val) =>
                !val
                  ? 'Project name is required'
                  : projectStore.projects.some((item) => item.Title == val)
                  ? 'Existing project name'
                  : null,
            ]"
          />

          <q-select
            v-model="selectedPlaybook"
            label="Would you like to use an existing playbook?"
            :options="['- No', ...options]"
            use-input
            outlined
            dense
            behavior="menu"
            @filter="filterFn"
          />

          <template v-if="selectedPlaybook != '- No'">
            <div class="text-center">
              {{ successed + " / " + taskStore.tasks.filter((item) => item.project_name == selectedPlaybook).length }}
            </div>
          </template>

          <div class="row justify-end q-gutter-sm">
            <q-btn label="Cancel" color="grey" v-close-popup />
            <q-btn label="Add Project" type="submit" color="primary" :loading="isAddingProject" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.q-scroll-area {
  background: linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%);
  border-radius: 18px;
  box-shadow: 0 4px 24px 0 rgba(60, 72, 88, 0.08);
  padding: 18px 0;
  margin: 12px;
}

.user-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px 0 rgba(60, 72, 88, 0.1);
  padding: 18px 16px 14px 16px;
  flex-direction: row;
}
.project-selection {
  margin: 16px 0;
}
.avatar-wrapper {
  margin-right: 14px;
}
.avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: linear-gradient(135deg, #b3d4fc 0%, #1976d2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.7rem;
  font-weight: 700;
  box-shadow: 0 2px 8px 0 rgba(60, 72, 88, 0.1);
}
.user-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.user-name {
  font-size: 1.1rem;
  font-weight: 500;
  color: #1a237e;
}
.user-email {
  font-size: 0.7rem;
  color: #849ca8;
  margin-top: 2px;
}
.q-list {
  padding: 5px 8px;
}

.q-item {
  border-radius: 12px;
  margin-bottom: 6px;
  transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  font-size: 1.08rem;
  font-weight: 500;
}

.q-item:hover {
  background: #e3eafc;
  box-shadow: 0 2px 8px 0 rgba(60, 72, 88, 0.06);
  transform: translateY(-2px) scale(1.03);
}

.q-item--active,
.q-item[aria-selected="true"] {
  background: #b3d4fc !important;
  color: #1a237e !important;
  box-shadow: 0 2px 12px 0 rgba(60, 72, 88, 0.1);
}

.q-item-section[avatar] {
  min-width: 38px;
}

.q-icon {
  font-size: 1.5rem;
  color: #1976d2;
}

.q-separator {
  margin: 8px 0;
}
</style>
