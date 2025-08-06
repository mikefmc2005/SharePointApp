<script setup>
import { computed, ref, watch } from "vue";
import { useTaskModalStore, useProjectStore, useTaskStore } from "../store";
import { addItem } from "../actions/addItem";
import { editItem } from "../actions/editItem";

const props = defineProps({
  hideBtn: {
    type: Boolean,
    default: false,
  },
});

const projectStore = useProjectStore();
const taskStore = useTaskStore();
const taskModalStore = useTaskModalStore();

const showAddForm = computed(() => {
  return !!taskModalStore.open;
});

const newConfirmState = ref(false);
const miniLoading = ref(false);

const start_deadline_date = ref({});

watch(
  () => [taskModalStore.open, taskModalStore.task.depth],
  ([open, depth]) => {
    newConfirmState.value = false;
    if (open === "Edit" && depth === 3) {
      const today = new Date().toISOString().slice(0, 10);

      start_deadline_date.value = {
        from: taskModalStore.task.start_date || today,
        to: taskModalStore.task.deadline_date || today,
      };

      if (start_deadline_date.value.from == start_deadline_date.value.to) {
        start_deadline_date.value = start_deadline_date.value.from;
      }
    } else {
      start_deadline_date.value = {};
    }
  }
);

const projectOptions = computed(() => {
  if (projectStore.currentProjectTitle) {
    return [
      {
        label: projectStore.currentProjectTitle,
        value: projectStore.currentProjectTitle,
      },
    ];
  } else {
    return projectStore.projects.map((project) => ({
      label: project.Title,
      value: project.Title,
    }));
  }
});

const phaseOptions = computed(() => {
  const project = projectStore.projects.find((p) => p.Title === taskModalStore.task.project_name);
  if (!project || !project.phases) return [];
  return project.phases.map((phase) => ({
    label: phase.trim(),
    value: phase.trim(),
  }));
});

const NEW_TASK_OPTION = "__NEW_TASK_OPTION__";
const taskOptions = computed(() => {
  const uniqueTasks = [
    ...new Set(
      taskStore.tasks
        .filter(
          (task) => task.project_name == taskModalStore.task.project_name && task.phase == taskModalStore.task.phase
        )
        .map((task) => task.task)
        .filter((task) => task && task.trim())
    ),
  ];
  const options = uniqueTasks.map((task) => ({
    label: task,
    value: task,
  }));
  options.unshift({ label: "+ New task", value: NEW_TASK_OPTION });
  return options;
});
const showNewTaskInput = computed(() => taskModalStore.task.task === NEW_TASK_OPTION);

function isFieldInvalid(field) {
  const record = taskModalStore.task;

  if (field == "sub_task") {
    return !showNewTaskInput.value && (!record.sub_task || record.sub_task.trim() === "");
  }

  return (
    ["project_name", "phase", "task", "assigned_to", "status"].includes(field) &&
    (!record[field] || record[field].trim() === "")
  );
}

function handleProjectChange(val) {
  taskModalStore.task.project_name = val;
  taskModalStore.task.phase = "";
}

const addNewRow = () => {
  taskModalStore.openAdd({});
};

async function saveNewTask() {
  newConfirmState.value = true;

  let taskName = taskModalStore.task.task;

  if (taskModalStore.task.task === NEW_TASK_OPTION) {
    if (!taskModalStore.task._newTaskName || !taskModalStore.task._newTaskName.trim()) return;
    taskName = taskModalStore.task._newTaskName.trim();
  }

  const taskData = { ...taskModalStore.task, task: taskName };

  if (!isRowValid(taskData)) return;

  miniLoading.value = true;

  const start_deadline_date_temp =
    typeof start_deadline_date.value == "string"
      ? {
          start_date: start_deadline_date.value,
          deadline_date: start_deadline_date.value,
        }
      : {
          start_date: start_deadline_date.value.from,
          deadline_date: start_deadline_date.value.to,
        };

  try {
    const sendData = {
      project_name: taskData.project_name,
      phase: taskData.phase,
      task: taskData.task,
      sub_task: taskData.sub_task,
      assigned_to: taskData.assigned_to,
      description: taskData.description,
      dependency: taskData.dependency,
      groups: taskData.groups,
      architecture: taskData.architecture,
      pulled: taskData.pulled,
      status: taskData.status,
      task_progress: taskData.task_progress,
      ...start_deadline_date_temp,
    };

    if (taskModalStore.open == "Edit") {
      await editItem("Tasks", taskModalStore.task.ID, sendData);
      taskStore.editTask({ ID: taskModalStore.task.ID, ...sendData });
    } else {
      const res = await addItem("Tasks", sendData);
      taskStore.addTask({
        ...sendData,
        ID: res.ID,
      });
    }

    // Show success notification
    cancelNewTask();
  } catch (error) {
    console.error("Failed to add task:", error);
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 500));
    miniLoading.value = false;
  }
}

async function editTask() {
  newConfirmState.value = true;

  if (!taskModalStore.task.task) return;

  miniLoading.value = true;

  try {
    const sendData = { task: taskModalStore.task.new_task };

    taskStore.tasks
      .filter(
        (item) =>
          item.project_name == projectStore.currentProjectTitle &&
          item.phase == taskModalStore.task.phase &&
          item.task == taskModalStore.task.task
      )
      .forEach((item) => {
        editItem("Tasks", item.ID, sendData);
        taskStore.editTask({ ID: item.ID, ...sendData });
      });

    // Show success notification
    cancelNewTask();
  } catch (error) {
    console.error("Failed to edit task:", error);
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 500));
    miniLoading.value = false;
  }
}

async function editPhase() {
  newConfirmState.value = true;

  if (!taskModalStore.task.phase) return;

  miniLoading.value = true;

  try {
    const sendData = { phase: taskModalStore.task.new_phase };

    taskStore.tasks
      .filter(
        (item) => item.project_name == projectStore.currentProjectTitle && item.phase == taskModalStore.task.phase
      )
      .forEach((item) => {
        editItem("Tasks", item.ID, sendData);
        taskStore.editTask({ ID: item.ID, ...sendData });
      });

    // Show success notification
    cancelNewTask();
  } catch (error) {
    console.error("Failed to edit phase:", error);
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 500));
    miniLoading.value = false;
  }
}

function isRowValid(record) {
  return (
    ["project_name", "phase", "task", "assigned_to", "status"].every((f) => record[f] && record[f].trim() !== "") &&
    (typeof start_deadline_date.value === "string"
      ? !!start_deadline_date.value
      : !!start_deadline_date.value.from && !!start_deadline_date.value.to) &&
    (showNewTaskInput.value ? true : record.sub_task && record.sub_task.trim() !== "")
  );
}

function cancelNewTask() {
  taskModalStore.close();
}
</script>

<template>
  <q-btn
    v-if="!props.hideBtn"
    color="primary"
    icon="add"
    @click="addNewRow"
    class="ml-16 mr-8"
    :disable="isImporting"
  />

  <q-dialog v-model="showAddForm" persistent>
    <!-- for adding/editting subTask -->
    <q-card class="q-pa-md main-form" v-if="taskModalStore.task.depth == 3">
      <div class="text-h6 q-mb-md">
        {{ taskModalStore.open + " SubTask" }}
      </div>
      <div class="row">
        <div class="col-md-7" style="padding-right: 24px">
          <q-select
            v-model="taskModalStore.task.project_name"
            :options="projectOptions"
            label="* Project"
            dense
            outlined
            emit-value
            map-options
            :error="isFieldInvalid('project_name') && newConfirmState"
            :error-message="isFieldInvalid('project_name') && newConfirmState ? 'Required' : ''"
            @update:model-value="handleProjectChange"
          />
          <q-select
            v-model="taskModalStore.task.phase"
            :options="phaseOptions"
            label="* Phase"
            dense
            outlined
            emit-value
            map-options
            :disable="!taskModalStore.task.project_name"
            :error="isFieldInvalid('phase') && newConfirmState"
            :error-message="isFieldInvalid('phase') && newConfirmState ? 'Required' : ''"
          />

          <div class="row">
            <div :class="showNewTaskInput ? 'col-md-4' : 'col-md-12'">
              <q-select
                v-model="taskModalStore.task.task"
                :options="taskOptions"
                label="* Task"
                dense
                outlined
                emit-value
                map-options
                :error="isFieldInvalid('task') && newConfirmState"
                :error-message="isFieldInvalid('task') && newConfirmState ? 'Required' : ''"
              />
            </div>
            <div v-if="showNewTaskInput" :class="showNewTaskInput ? 'col-md-8' : ''" style="padding-left: 16px">
              <q-input
                v-model="taskModalStore.task._newTaskName"
                label="* Task"
                dense
                outlined
                :error="!taskModalStore.task._newTaskName && newConfirmState"
                :error-message="!taskModalStore.task._newTaskName && newConfirmState ? 'Required' : ''"
              />
            </div>
          </div>
          <q-input
            v-model="taskModalStore.task.sub_task"
            :label="(showNewTaskInput ? '' : '* ') + 'SubTask'"
            class="q-mb-md"
            dense
            outlined
            :error="isFieldInvalid('sub_task') && newConfirmState"
            :error-message="isFieldInvalid('sub_task') && newConfirmState ? 'Required' : ''"
          />
          <q-select
            v-model="taskModalStore.task.assigned_to"
            :options="projectStore.currentProject.members"
            label="* Assigned to"
            dense
            outlined
            emit-value
            map-options
            :error="isFieldInvalid('assigned_to') && newConfirmState"
            :error-message="isFieldInvalid('assigned_to') && newConfirmState ? 'Required' : ''"
          />
          <div class="row q-col-gutter-md q-mt-sm">
            <div class="col-md-6">
              <q-input v-model="taskModalStore.task.description" label="Description" dense outlined />
            </div>
            <div class="col-md-6">
              <q-input v-model="taskModalStore.task.dependency" label="Dependency" dense outlined />
            </div>
            <div class="col-md-6"><q-input v-model="taskModalStore.task.groups" label="Groups" dense outlined /></div>
            <div class="col-md-6">
              <q-input v-model="taskModalStore.task.architecture" label="Architecture" dense outlined />
            </div>
          </div>
          <div class="q-mt-lg text-right">
            <div>Task Progress: {{ taskModalStore.task.task_progress }}%</div>
            <q-slider
              v-model="taskModalStore.task.task_progress"
              :min="0"
              :max="100"
              :step="1"
              label
              label-always
              switch-label-side
              color="green"
            />
          </div>
        </div>
        <div class="col-md-5">
          <q-date
            v-model="start_deadline_date"
            mask="YYYY-MM-DD"
            range
            :error="(isFieldInvalid('start_date') || isFieldInvalid('deadline_date')) && newConfirmState"
            :error-message="
              (isFieldInvalid('start_date') || isFieldInvalid('deadline_date')) && newConfirmState ? 'Required' : ''
            "
          />
          <div
            class="text-red"
            style="position: absolute"
            v-if="
              (typeof start_deadline_date == 'string'
                ? !start_deadline_date
                : !start_deadline_date?.from && !start_deadline_date?.to) && newConfirmState
            "
          >
            <small>Required</small>
          </div>
          <div class="row q-mt-lg">
            <div class="col-md-7">
              <q-checkbox
                v-model="taskModalStore.task.pulled"
                label="Add to playbook"
                @update:model-value="(val) => (taskModalStore.task.pulled = !!val)"
              />
            </div>
            <div class="col-md-5">
              <q-select
                v-model="taskModalStore.task.status"
                :options="projectStore.currentProject.status.map((item) => item.name)"
                label="* Status"
                dense
                outlined
                emit-value
                map-options
                :error="isFieldInvalid('status') && newConfirmState"
                :error-message="isFieldInvalid('status') && newConfirmState ? 'Required' : ''"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="main-form-actions">
        <q-btn color="primary" @click="saveNewTask" :loading="miniLoading">
          <q-spinner v-if="miniLoading" size="18px" color="white" />
          Save
        </q-btn>
        <q-btn flat @click="cancelNewTask" class="q-ml-sm">Cancel</q-btn>
      </div>
    </q-card>

    <!-- for editing task -->
    <q-card class="q-pa-md main-form edit-task-form" v-if="taskModalStore.task.depth == 2">
      <div class="text-h6 q-mb-md">Edit Task</div>
      <q-input
        v-model="taskModalStore.task.new_task"
        label="Task"
        dense
        outlined
        :error="!taskModalStore.task.new_task && newConfirmState"
        :error-message="!taskModalStore.task.new_task && newConfirmState ? 'Required' : ''"
      />
      <div class="main-form-actions">
        <q-btn color="primary" @click="editTask" :loading="miniLoading">
          <q-spinner v-if="miniLoading" size="18px" color="white" />
          Save
        </q-btn>
        <q-btn flat @click="cancelNewTask" class="q-ml-sm">Cancel</q-btn>
      </div>
    </q-card>

    <!-- for editing phase -->
    <q-card class="q-pa-md main-form edit-task-form" v-if="taskModalStore.task.depth == 1">
      <div class="text-h6 q-mb-md">Edit Phase</div>
      <q-input
        v-model="taskModalStore.task.new_phase"
        label="Phase"
        dense
        outlined
        :error="!taskModalStore.task.new_phase && newConfirmState"
        :error-message="!taskModalStore.task.new_phase && newConfirmState ? 'Required' : ''"
      />
      <div class="main-form-actions">
        <q-btn color="primary" @click="editPhase" :loading="miniLoading">
          <q-spinner v-if="miniLoading" size="18px" color="white" />
          Save
        </q-btn>
        <q-btn flat @click="cancelNewTask" class="q-ml-sm">Cancel</q-btn>
      </div>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.main-form {
  min-width: 850px;
  background: #f9f9f9;
  border-radius: 8px;
  padding: 2rem 1.5rem 1rem;
}
.edit-task-form {
  min-width: 420px;
}
.main-form-actions {
  text-align: right;
  margin-right: 24px;
}
.disabled-form {
  opacity: 0.6;
  pointer-events: none;
}
.q-date {
  width: auto;
}
</style>
