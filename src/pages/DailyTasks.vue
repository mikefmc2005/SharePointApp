<script setup>
import { ref, onMounted, computed, watch } from "vue";
import draggable from "vuedraggable";

import { useProjectStore, useTaskModalStore, useTaskStore } from "../store";
import { getItem } from "../actions/getItem";
import { editItem } from "../actions/editItem";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import AddTask from "../components/AddTask.vue";

const projectStore = useProjectStore();
const taskStore = useTaskStore();
const taskModalStore = useTaskModalStore();

const selectedDate = ref(new Date().toISOString().substr(0, 10));

const dragInfo = ref(null);
const miniLoading = ref({});
const showDailyTasks = ref(true);

watch(
  () => selectedDate.value,
  (source) => {
    watchCallback(source);
  },
  { immediate: true, deep: true }
);

function watchCallback(source) {}

function isTaskOnSelectedDate(task) {
  if (!task.start_date || !task.duration) return false;
  const start = new Date(task.start_date);
  const duration = parseInt(task.duration) || 1;
  const end = new Date(start);
  end.setDate(start.getDate() + duration - 1);
  const selected = selectedDate.value;
  return selected >= start.toISOString().slice(0, 10) && selected <= end.toISOString().slice(0, 10);
}

const columns = computed(() => {
  if (!projectStore.currentProjectTitle) return [];

  return projectStore.currentProject.status.map((status, index) => {
    let statusTasks = taskStore.tasks.filter((task) => {
      if (task.project_name != projectStore.currentProjectTitle || !task.pulled || !task.status) return false;
      const match = task.status.match(/^([^#]+)/);
      const taskStatusName = match ? match[1].trim() : task.status;
      return taskStatusName === status.name;
    });
    if (showDailyTasks.value) {
      statusTasks = statusTasks.filter(isTaskOnSelectedDate);
    }

    return {
      id: `status-${index}`,
      title: status.name,
      editing: false,
      tasks: statusTasks.map((task) => ({
        id: task.ID,
        title: task.sub_task,
        code: task.ID,
      })),
      showingAddTask: false,
      selectedTaskId: "",
      menu: false,
    };
  });
});

function onDragStart(originColIdx) {
  return (event) => {
    dragInfo.value = {
      originColIdx,
      originBoard: columns.value[originColIdx],
      originTaskIdx: event.oldIndex,
      task: columns.value[originColIdx].tasks[event.oldIndex],
    };
  };
}
function onTaskAdd(destColIdx) {
  return (event) => {
    const origin = dragInfo.value;

    taskStore.editTask({
      ID: origin.task.id,
      status: columns.value[destColIdx].title,
    });

    editItem("Tasks", origin.task.id, {
      status: columns.value[destColIdx].title,
    });
  };
}
function onDragEnd(destColIdx) {
  return (event) => {
    dragInfo.value = null;
  };
}

function onTaskClick(ID) {
  const task = taskStore.tasks.find((item) => item.ID == ID);
  if (task) {
    taskModalStore.openEdit(task);
  }
}

onMounted(async () => {
  if (selectedDate.value) {
    watchCallback(selectedDate.value);
  }
});
</script>

<template>
  <LoadingSpinner :showing="projectStore.loading || taskStore.loading" text="Loading daily tasks...">
    <q-card class="daily-tasks-body">
      <div>
        <label>
          <input type="checkbox" v-model="showDailyTasks" />
          Daily tasks
        </label>
        <input type="date" v-model="selectedDate" class="kanban-datepicker" :disabled="!showDailyTasks" />
        <div style="float: right">
          <AddTask />
        </div>
      </div>
      <div class="kanban-board">
        <div class="kanban-column" v-for="(column, colIdx) in columns" :key="column.id">
          <div class="kanban-header">
            <div class="kanban-header-left">
              <span v-if="!column.editing" class="kanban-title">
                <span
                  v-if="selectedProject"
                  class="status-chip"
                  :style="{
                    backgroundColor: projectStore.currentProject.statusColor[column.title],
                    color: '#fff',
                    padding: '2px 10px',
                    borderRadius: '10px',
                    fontWeight: 500,
                    fontSize: '13px',
                    marginRight: '8px',
                    display: 'inline-block',
                  }"
                >
                  {{ column.title }}
                </span>
                <span v-else>
                  {{ column.title }}
                </span>
              </span>
              <span v-if="Array.isArray(column.tasks) && column.tasks.length" class="kanban-count">
                {{ column.tasks.length }}
              </span>
              <q-spinner-pie v-if="miniLoading[column.id]" size="18px" color="primary" class="mini-spinner" />
            </div>
            <div class="kanban-header-right"></div>
          </div>

          <div>
            <draggable
              v-model="column.tasks"
              group="tasks"
              :animation="200"
              item-key="id"
              class="kanban-tasks"
              @start="(event) => onDragStart(colIdx)(event)"
              @add="(event) => onTaskAdd(colIdx)(event)"
              @end="(event) => onDragEnd(colIdx)(event)"
            >
              <template #item="{ element: task }">
                <div
                  class="kanban-card"
                  :title="
                    (() => {
                      const temp = taskStore.tasks.find((item) => item.ID == task.id);
                      return `𝗜𝗗 ${temp.ID}\n𝗣𝗿𝗼𝗷𝗲𝗰𝘁 : ${temp.project_name}\n𝗣𝗵𝗮𝘀𝗲 : ${temp.phase}\n𝗧𝗮𝘀𝗸 : ${
                        temp.task
                      }\n𝗦𝘂𝗯𝗧𝗮𝘀𝗸 : ${temp.sub_task}\n𝗔𝘀𝘀𝗶𝗴𝗻𝗲𝗱 𝘁𝗼 ${temp.assigned_to || '-'}`;
                    })()
                  "
                  @click="onTaskClick(task.id)"
                >
                  <div class="kanban-card-title-row">
                    <span class="kanban-card-title" :title="task.title">{{ task.title }}</span>
                  </div>
                  <div class="kanban-card-meta">
                    <span class="kanban-card-id">{{ task.code }}</span>
                  </div>
                </div>
              </template>
              <template #footer>
                <div v-if="!column.tasks.length" class="kanban-empty-placeholder">Drop tasks here</div>
              </template>
            </draggable>
          </div>
        </div>
      </div>
    </q-card>
  </LoadingSpinner>
</template>

<style lang="scss" scoped>
.daily-tasks-body {
  margin: 2rem;
  padding: 2rem;
  background: #ffffff;
  min-height: calc(100vh - 4rem - 100px);
  border-radius: 15px;
}
.kanban-board {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  display: flex;
  gap: 2rem;
  padding: 2rem;
  background: #fff;
  white-space: nowrap;
}
.kanban-column {
  background: #fff;
  border-radius: 1.2rem;
  box-shadow: 0 4px 24px 0 rgba(25, 118, 210, 0.2);
  padding: 1.5rem 1rem 2rem 1rem;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 4rem - 280px);
  position: relative;
  flex-shrink: 0;
}
/* Optional: Hide scrollbar for webkit browsers */
.kanban-board::-webkit-scrollbar {
  height: 10px;
}
.kanban-board::-webkit-scrollbar-thumb {
  background: #e3f2fd;
  border-radius: 5px;
}
.kanban-board::-webkit-scrollbar-track {
  background: #fff;
}
.kanban-create-btn-large {
  padding: 0.7rem 1.5rem;
  font-size: 1.1rem;
  border-radius: 0.7rem;
  cursor: pointer;
  background: #e3f2fd;
  color: #1976d2;
  border: none;
  font-weight: 700;
  box-shadow: none;
  transition: background 0.2s;
  &:hover {
    background: #bbdefb;
  }
  .plus {
    font-size: 1.3rem;
    font-weight: 700;
    margin-right: 0.5rem;
  }
}
.kanban-datepicker {
  font-size: 1rem;
  padding: 0.3rem 0.7rem;
  border-radius: 0.5rem;
  border: 1px solid #bbdefb; /* light blue */
  margin-left: 16px;
}

.kanban-add-task-btn-small {
  padding: 0.3rem 0.7rem;
  font-size: 1.1rem;
  min-width: 0;
  width: 32px;
  cursor: pointer;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e3f2fd; /* lighter blue */
  color: #1976d2;
  border: none;
  box-shadow: none;
  transition: all 0.2s;
  &:hover {
    background: #bbdefb;
  }
  &.active {
    background: #1976d2;
    color: #fff;
  }
  .plus {
    font-size: 1.2rem;
    font-weight: 700;
  }
}
.kanban-add-board-btn {
  margin-left: 0.5rem;
}
.kanban-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 1.2rem;
  color: #1976d2;
}
.kanban-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.kanban-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.kanban-title {
  letter-spacing: 1px;
  cursor: pointer;
}
.kanban-count {
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 1rem;
  padding: 0.1rem 0.7rem;
  font-size: 0.9rem;
  margin-left: 0.3rem;
}
.kanban-done-check {
  color: #1976d2;
  font-size: 1.2rem;
  margin-left: 0.5rem;
}
.kanban-tasks {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
  cursor: pointer;
}
.kanban-card {
  background: #f5faff;
  border-radius: 0.8rem;
  box-shadow: 0 2px 8px 0 rgba(25, 118, 210, 0.04);
  padding: 1rem 1rem 0.7rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  transition: box-shadow 0.2s;
  position: relative;
  border: 1.5px solid #e3f2fd;
  &:hover {
    box-shadow: 0 6px 24px 0 rgba(25, 118, 210, 0.13);
    border-color: #1976d2;
  }
}
.kanban-card-title-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  justify-content: space-between;
}
.kanban-card-title {
  font-size: 1.08rem;
  font-weight: 600;
  color: #1976d2;
  display: inline-block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
.kanban-card-meta {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-size: 0.97rem;
  color: #1976d2;
}
.kanban-card-id {
  background: #e3f2fd;
  border-radius: 0.7rem;
  padding: 0.1rem 0.6rem;
  font-size: 0.93rem;
}
.kanban-add-task-inline {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: #f8fbff;
  border-radius: 0.8rem;
  padding: 1rem;
  border: 1px solid #e3f2fd;
}
.kanban-add-task-select-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin-bottom: 0.8rem;
}
.kanban-add-task-select {
  font-size: 1rem;
  padding: 0.5rem 0.8rem;
  border-radius: 0.5rem;
  border: 1px solid #e3f2fd;
  width: 180px;
  background: #fff;
  color: #1976d2;
}
.kanban-empty-placeholder {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b0b0b0;
  font-style: italic;
  border: 2px dashed #e3f2fd;
  border-radius: 0.7rem;
  background: #f8fbff;
  margin: 0.5rem 0;
}
.mini-spinner {
  margin-left: 0.5rem;
  vertical-align: middle;
}
.daily-project-selects {
  display: flex;
  align-items: center;

  select {
    width: 320px;
  }
}
.selectbox {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #f1f5f9;
  font-size: 15px;
  margin: 0 10px;
  transition: border 0.2s;
  outline: none;
  &:focus {
    border: 1.5px solid #6366f1;
  }

  &.no-project-selected {
    border-color: #ef4444;
    box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.2);
  }
}
</style>
