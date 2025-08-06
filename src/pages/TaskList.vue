<script setup>
import { ref, watch, computed } from "vue";
import * as XLSX from "xlsx";
import { useQuasar } from "quasar";

import { useProjectStore, useTaskStore } from "../store";
import { addItem } from "../actions/addItem";
import { deleteItem } from "../actions/deleteItem";
import { editItem } from "../actions/editItem";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import AddTask from "../components/AddTask.vue";

const $q = useQuasar();

const projectStore = useProjectStore();
const taskStore = useTaskStore();

const searchText = ref("");

const fileInput = ref(null);

const isImporting = ref(false);
const importProgress = ref(0);
const importTotal = ref(0);
const importCurrent = ref(0);

const statusInfo = ref([]);

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  isImporting.value = true;
  importProgress.value = 0;
  importCurrent.value = 0;

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    let jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    const importedTasks = jsonData.map((row) => ({
      project_name: String(row["ProjectName"] || ""),
      phase: String(row["Phase"] || ""),
      task: String(row["Task"] || ""),
      sub_task: String(row["SubTask"] || ""),
      description: String(row["Description"] || ""),
      dependency: String(row["Dependency"] || ""),
      groups: String(row["Groups"] || ""),
      architecture: String(row["Architecture"] || ""),
    }));

    const validTasks = importedTasks.filter(
      (t) => t.project_name.trim() && t.phase.trim() && t.task.trim() && t.sub_task.trim()
    );

    if (validTasks.length === 0) {
      return;
    }

    importTotal.value = validTasks.length;
    importCurrent.value = 0;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < validTasks.length; i++) {
      const task = validTasks[i];
      task.task_progress = 0;
      task.status = "Open";
      task.pulled = false;
      try {
        const res = await addItem("Tasks", task);
        taskStore.addTask({ ...task, ID: res.ID });
        successCount++;

        importCurrent.value = i + 1;
        importProgress.value = Math.round((importCurrent.value / importTotal.value) * 100);
      } catch (error) {
        console.error("Failed to add task:", task, error);
        errorCount++;
      }
    }

    event.target.value = "";
  } catch (error) {
    console.error("Error importing file:", error);
  } finally {
    setTimeout(() => {
      isImporting.value = false;
      importProgress.value = 0;
      importCurrent.value = 0;
      importTotal.value = 0;
    }, 1000);
  }
};

const selectAllTasks = () => {
  const getAllTaskIds = (nodes) => {
    let taskIds = [];
    for (const node of nodes) {
      if (node.taskData) {
        taskIds.push(node.key);
      }
      if (node.children) {
        taskIds = taskIds.concat(getAllTaskIds(node.children));
      }
    }
    return taskIds;
  };

  checkedNodes.value = getAllTaskIds(treeData.value);
};

const clearAllSelections = () => {
  checkedNodes.value = [];
};

const hasCheckedRows = () => {
  return checkedNodes.value.some((key) => {
    return typeof key === "number" || !isNaN(parseInt(key));
  });
};

const handleSearch = (value) => {
  searchText.value = value;
};

const pullCheckedTasks = async (pulled) => {
  const selectedTaskIds = checkedItems.value.filter((item) => item.pulled != pulled).map((item) => item.ID);

  if (selectedTaskIds.length == 0) return;

  let successed = 0;

  const notif = $q.notify({
    group: false,
    timeout: 0,
    spinner: true,
    caption: `${0} / ${selectedTaskIds.length}`,
  });

  for (const ID of selectedTaskIds) {
    editItem("Tasks", ID, { pulled }).then(() => {
      taskStore.editTask({ ID, pulled });
      successed++;
      notif({
        caption: `${successed} / ${selectedTaskIds.length}`,
      });
      if (successed == selectedTaskIds.length) {
        notif({
          icon: "done",
          spinner: false,
          timeout: 500,
        });
      }
    });
  }
};

const deleteCheckedRows = async () => {
  if (!confirm("Are you sure you want to delete the selected subtasks?")) return;

  const checkedTaskIds = checkedItems.value.map((item) => item.ID);

  if (checkedTaskIds.length === 0) return;

  checkedTaskIds.forEach((ID) => {
    deleteItem("Tasks", ID);
  });

  taskStore.deleteTasks(checkedTaskIds);
  checkedNodes.value = [];
};

// Tree structure for tasks
const treeData = computed(() => {
  const projects = {};

  taskStore.tasks
    .filter((item) => item.project_name == projectStore.currentProjectTitle)
    .forEach((task) => {
      if (!task.project_name || !task.phase || !task.task || !task.sub_task) return;

      if (!projects[task.project_name]) {
        projects[task.project_name] = {
          key: `project-${task.project_name}`,
          label: task.project_name,
          icon: "folder",
          children: {},
        };
      }

      if (!projects[task.project_name].children[task.phase]) {
        projects[task.project_name].children[task.phase] = {
          key: `phase-${task.project_name}-${task.phase}`,
          label: task.phase,
          icon: "folder_open",
          children: {},
        };
      }

      if (!projects[task.project_name].children[task.phase].children[task.task]) {
        projects[task.project_name].children[task.phase].children[task.task] = {
          key: `task-${task.project_name}-${task.phase}-${task.task}`,
          label: task.task,
          icon: "assignment",
          children: {},
        };
      }

      if (!projects[task.project_name].children[task.phase].children[task.task].children[task.sub_task]) {
        projects[task.project_name].children[task.phase].children[task.task].children[task.sub_task] = {
          key: task.ID,
          label: task.sub_task,
          icon: "list",
          taskData: task,
          children: [],
          checkable: true, // Make leaf nodes checkable
        };
      }
    });

  // Convert to array format for q-tree
  return Object.values(projects).map((project) => ({
    ...project,
    children: Object.values(project.children).map((phase) => ({
      ...phase,
      children: Object.values(phase.children).map((task) => ({
        ...task,
        children: Object.values(task.children),
      })),
    })),
  }));
});

const expandedNodes = ref([]);
const selectedNodes = ref([]);
const checkedNodes = ref([]);
const breadcrumbs = ref([]);
const currentPath = ref([]);

watch(
  () => [projectStore.currentProjectTitle],
  ([source]) => {
    statusInfo.value = projectStore.currentProject?.status || [];
  },
  { immediate: true, deep: true }
);

const filteredTreeData = computed(() => {
  if (!searchText.value) return treeData.value;

  const filterNode = (node) => {
    if (node.taskData) {
      const task = node.taskData;
      const searchLower = searchText.value.toLowerCase();
      const matches =
        (task.project_name && task.project_name.toLowerCase().includes(searchLower)) ||
        (task.phase && task.phase.toLowerCase().includes(searchLower)) ||
        (task.task && task.task.toLowerCase().includes(searchLower)) ||
        (task.sub_task && task.sub_task.toLowerCase().includes(searchLower)) ||
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        (task.groups && task.groups.toLowerCase().includes(searchLower)) ||
        (task.architecture && task.architecture.toLowerCase().includes(searchLower));

      if (matches) {
        const expandParents = (nodes, targetKey) => {
          for (const n of nodes) {
            if (n.children) {
              for (const child of n.children) {
                if (child.key === targetKey || expandParents([child], targetKey)) {
                  if (!expandedNodes.value.includes(n.key)) {
                    expandedNodes.value.push(n.key);
                  }
                  return true;
                }
              }
            }
          }
          return false;
        };
        expandParents(treeData.value, node.key);
      }

      return matches;
    } else {
      // For parent nodes, check if any child matches
      const hasMatchingChild = node.children && node.children.some((child) => filterNode(child));
      if (hasMatchingChild && !expandedNodes.value.includes(node.key)) {
        expandedNodes.value.push(node.key);
      }
      return hasMatchingChild;
    }
  };

  return treeData.value.filter((project) => filterNode(project));
});

// Breadcrumb functions
const updateBreadcrumbs = (node) => {
  if (!node) return;

  // Build the complete path to the clicked node
  const buildPathToNode = (nodes, targetKey, currentPath = []) => {
    for (const n of nodes) {
      const newPath = [...currentPath, { label: n.label, key: n.key }];

      if (n.key === targetKey) {
        return newPath;
      }

      if (n.children) {
        const found = buildPathToNode(n.children, targetKey, newPath);
        if (found) return found;
      }
    }
    return null;
  };

  // Find the complete path to the clicked node
  const path = buildPathToNode(treeData.value, node.key);
  if (path) {
    breadcrumbs.value = path;
    currentPath.value = path;
  }
};

const checkedItems = computed(() => {
  return checkedNodes.value
    .filter((key) => typeof key === "number" || !isNaN(parseInt(key)))
    .map((key) => {
      const findTaskInTree = (nodes) => {
        for (const node of nodes) {
          if (node.key === key && node.taskData) {
            return node.taskData;
          }
          if (node.children) {
            const found = findTaskInTree(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      return findTaskInTree(treeData.value);
    })
    .filter((task) => task !== null);
});

const highlightSearchText = (text) => {
  if (!searchText.value || !text) return text;

  const regex = new RegExp(`(${searchText.value})`, "gi");
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
};

const isNodeMatchingSearch = (node) => {
  if (!searchText.value) return false;

  if (node.taskData) {
    const task = node.taskData;
    const searchLower = searchText.value.toLowerCase();
    return (
      (task.project_name && task.project_name.toLowerCase().includes(searchLower)) ||
      (task.phase && task.phase.toLowerCase().includes(searchLower)) ||
      (task.task && task.task.toLowerCase().includes(searchLower)) ||
      (task.sub_task && task.sub_task.toLowerCase().includes(searchLower)) ||
      (task.description && task.description.toLowerCase().includes(searchLower)) ||
      (task.groups && task.groups.toLowerCase().includes(searchLower)) ||
      (task.architecture && task.architecture.toLowerCase().includes(searchLower))
    );
  }

  return node.label && node.label.toLowerCase().includes(searchText.value.toLowerCase());
};
</script>

<template>
  <q-card class="tasklist-body">
    <LoadingSpinner :showing="projectStore.loading || taskStore.loading" text="Loading tasks...">
      <div>
        <div class="tasklist-toolbar">
          <div class="tasklist-toolbar-left">
            <q-input
              white
              dense
              outlined
              rounded
              placeholder="Search tasks..."
              @search="handleSearch"
              v-model="searchText"
              class="tasklist-search-input"
              :disable="isImporting"
            >
              <template v-slot:append>
                <q-icon v-if="searchText === ''" name="search" />
                <q-icon v-else name="clear" class="cursor-pointer" @click="searchText = ''" />
              </template>
            </q-input>
          </div>
          <div class="tasklist-toolbar-right">
            <template v-if="checkedItems.length > 0">
              <q-btn color="secondary" icon="check" @click="pullCheckedTasks(true)" label="Pull" size="sm" />
              <q-btn color="purple" @click="pullCheckedTasks(false)" class="q-ml-sm" label="Push" size="sm" />
              <q-btn
                color="red"
                class="q-mx-lg"
                icon="delete"
                @click="deleteCheckedRows"
                :disabled="!hasCheckedRows || isImporting"
              >
                <q-badge v-if="checkedItems.length > 0" color="red" floating rounded class="q-ml-xs">
                  {{ checkedItems.length }}
                </q-badge>
              </q-btn>
            </template>

            <q-btn
              color="pink-7"
              icon="unfold_less"
              @click="expandedNodes = treeData.map((node) => node.key)"
              class="q-mr-lg"
              title="Collapse"
            />

            <q-btn
              color="secondary"
              icon="select_all"
              title="Select All"
              @click="selectAllTasks"
              :disabled="isImporting"
              class="mr-8"
              size="sm"
            />

            <q-btn
              color="grey"
              icon="clear_all"
              title="Deselect"
              @click="clearAllSelections"
              :disabled="checkedItems.length === 0 || isImporting"
              class="mr-24"
              size="sm"
            />

            <AddTask />

            <q-btn
              color="secondary"
              icon="file_upload"
              label="Import Excel"
              class="q-ml-lg"
              @click="$refs.fileInput.click()"
              :disable="isImporting"
            />

            <input type="file" ref="fileInput" style="display: none" accept=".xls,.xlsx" @change="handleFileUpload" />
          </div>
        </div>

        <div class="tasklist-template-link">
          Download /
          <a href="/data/tasklist_template.xlsx" download="Task List (template).xlsx">Task List (template).xlsx</a>
        </div>

        <div v-if="isImporting" class="q-pa-md tasklist-importing-box">
          <div class="text-h6 q-mb-sm importing-title">
            <q-icon name="file_upload" class="q-mr-sm" />
            Importing Excel Data...
          </div>
          <div class="q-mb-sm">
            <div class="text-caption q-mb-xs">
              Progress: {{ importCurrent }} / {{ importTotal }} tasks ({{ importProgress }}%)
            </div>
            <q-linear-progress :value="importProgress / 100" color="primary" size="md" class="import-progress-bar" />
          </div>
          <div class="text-caption" style="color: #666">Please wait while tasks are being imported...</div>
        </div>

        <div class="tree-container tasklist-tree-box">
          <q-tree
            :nodes="filteredTreeData"
            node-key="key"
            :expanded="expandedNodes"
            :selected="selectedNodes"
            :checked="checkedNodes"
            @update:expanded="expandedNodes = $event"
            @update:selected="selectedNodes = $event"
            @update:checked="checkedNodes = $event"
            :disable="isImporting"
          >
            <template v-slot:default-header="prop">
              <div
                class="row items-center full-width cursor-pointer"
                @click="updateBreadcrumbs(prop.node)"
                :class="{
                  'search-match': isNodeMatchingSearch(prop.node),
                  'checked-item': checkedNodes.includes(prop.node.key) && prop.node.taskData,
                }"
                :data-key="prop.node.key"
              >
                <q-checkbox
                  v-if="prop.node.taskData"
                  v-model="checkedNodes"
                  :val="prop.node.key"
                  @click.stop
                  class="q-mr-sm"
                  color="primary"
                />
                <q-icon :name="prop.node.icon" class="q-mr-sm" />
                <span class="text-weight-medium" v-html="highlightSearchText(prop.node.label)"></span>
                <q-space />
                <template v-if="prop.node.taskData">
                  <q-chip
                    v-if="prop.node.taskData.description"
                    size="sm"
                    color="blue-grey-1"
                    text-color="blue-grey-8"
                    class="q-mr-xs"
                  >
                    <q-tooltip>
                      <strong>Description:</strong><br />
                      {{ prop.node.taskData.description }}
                    </q-tooltip>
                    <span v-html="highlightSearchText(prop.node.taskData.description)"></span>
                  </q-chip>
                  <q-chip
                    v-if="prop.node.taskData.groups"
                    size="sm"
                    color="green-1"
                    text-color="green-8"
                    class="q-mr-xs"
                  >
                    <q-tooltip>
                      <strong>Groups:</strong><br />
                      {{ prop.node.taskData.groups }}
                    </q-tooltip>
                    <span v-html="highlightSearchText(prop.node.taskData.groups)"></span>
                  </q-chip>
                  <q-chip v-if="prop.node.taskData.architecture" size="sm" color="orange-1" text-color="orange-8">
                    <q-tooltip>
                      <strong>Architecture:</strong><br />
                      {{ prop.node.taskData.architecture }}
                    </q-tooltip>
                    <span v-html="highlightSearchText(prop.node.taskData.architecture)"></span>
                  </q-chip>
                  <q-chip
                    v-if="prop.node.taskData.pulled"
                    size="sm"
                    color="green-3"
                    text-color="green-10"
                    class="q-ml-xs q-mr-none"
                  >
                    <q-icon name="check" left size="16px" />
                    Pulled
                  </q-chip>
                </template>
              </div>
            </template>
          </q-tree>
        </div>
      </div>
    </LoadingSpinner>
  </q-card>
</template>

<style lang="scss" scoped>
.tasklist-addform-box {
  min-width: 800px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 1rem;
}
.tasklist-addform-actions {
  text-align: right;
  margin-right: 24px;
}
.disabled-form {
  opacity: 0.6;
  pointer-events: none;
}
.tasklist-body {
  margin: 2rem;
  padding: 2rem;
  background: #ffffff;
  min-height: calc(100vh - 100px - 4rem);
  border-radius: 15px;
}
.tasklist-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.tasklist-toolbar-left {
  flex: 1;
  max-width: 300px;
}
.tasklist-toolbar-right {
  display: flex;
  align-items: center;
}
.tasklist-search-input {
  width: 100%;
}
.tasklist-template-link {
  text-align: right;
  margin-bottom: 1rem;
}
.tasklist-importing-box {
  background: #f0f8ff;
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid #e3f2fd;
}
.tasklist-addform-box {
  min-width: 800px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 1rem;
}
.tasklist-addform-actions {
  text-align: right;
  margin-right: 24px;
}
.tasklist-tree-box {
  border: 1px solid #ececec;
  border-radius: 8px;
  background: white;
  padding: 12px;
  height: calc(100vh - 260px - 4rem);
  overflow-y: scroll;
}
.disabled-form {
  opacity: 0.6;
  pointer-events: none;
}
.search-highlight {
  background-color: #ffeb3b;
  color: #000;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: bold;
}
.search-match {
  background-color: #e3f2fd;
  border-radius: 4px;
  padding: 2px;
}
.tree-container .q-tree__node--selected {
  background-color: #e8f5e8;
}
.tree-container .q-tree__node--selected .search-match {
  background-color: #c8e6c9;
}
.checked-item {
  background-color: #e8f5e8 !important;
  border-left: 3px solid #4caf50 !important;
  padding-left: 8px;
}
.checked-item.search-match {
  background-color: #c8e6c9 !important;
}
.node-highlight {
  background-color: #e3f2fd !important;
  border: 2px solid #1976d2 !important;
  border-radius: 4px;
  animation: pulse 2s ease-in-out;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}
.chip-pulled,
.chip-pull {
  position: absolute;
  right: 12px;
  top: 10px;
  z-index: 2;
}
.mr-8 {
  margin-right: 8px;
}
.ml-16 {
  margin-left: 16px;
}
.mr-24 {
  margin-right: 24px;
}
.importing-title {
  color: #1976d2;
}
.import-progress-bar {
  height: 8px;
}
</style>
