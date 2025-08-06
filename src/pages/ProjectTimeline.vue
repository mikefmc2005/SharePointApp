<script setup>
import { ref, provide, watch, computed } from "vue";
import { useRouter } from "vue-router";

import {
  GanttComponent,
  ColumnsDirective,
  ColumnDirective,
  Edit,
  Selection,
  DayMarkers,
  Toolbar,
} from "@syncfusion/ej2-vue-gantt";

import { useProjectStore, useTaskModalStore, useTaskStore } from "../store";
import { editItem } from "../actions/editItem";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import AddTask from "../components/AddTask.vue";

const router = useRouter();

const projectStore = useProjectStore();
const taskStore = useTaskStore();
const taskModalStore = useTaskModalStore();

defineExpose({
  GanttComponent,
  ColumnsDirective,
  ColumnDirective,
});

defineOptions({ name: "ProjectTimeline" });

const ganttData = ref([]);

function normalizeGanttDates(item, index) {
  const dateFields = ["start_date", "deadline_date"];
  const newItem = { ...item };

  dateFields.forEach((field) => {
    if (newItem[field]) {
      // Handle string dates
      if (typeof newItem[field] === "string") {
        const date = new Date(newItem[field]);
        // Check if date is valid
        if (!isNaN(date.getTime())) {
          newItem[field] = date;
        } else {
          // If invalid date, set to today
          newItem[field] = new Date();
        }
      }
      // Handle Date objects
      else if (newItem[field] instanceof Date) {
        // Date is already a Date object, keep as is
      }
      // Handle invalid values
      else {
        newItem[field] = new Date();
      }
    } else {
      // If no date provided, set to today
      newItem[field] = new Date();
    }
  });

  // For Gantt chart, the end date should be the day after the deadline
  // This ensures the task bar extends to the actual deadline date
  if (newItem.deadline_date) {
    const deadlineDate = new Date(newItem.deadline_date);
    deadlineDate.setDate(deadlineDate.getDate() + 1);
    newItem.deadline_date = deadlineDate;
  }

  // Calculate duration if not provided
  if (!newItem.duration && newItem.start_date && newItem.deadline_date) {
    const start = new Date(newItem.start_date);
    const end = new Date(newItem.deadline_date);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    newItem.duration = diffDays;
  }

  if (Array.isArray(newItem.subtasks)) {
    newItem.subtasks = newItem.subtasks.map((subtask, subIndex) =>
      normalizeGanttDates(subtask, `${index}_${subIndex}`)
    );
  }

  // Ensure all required fields for Gantt chart are present
  if (!newItem.sub_task) {
    newItem.sub_task = `Task ${newItem.ID}`;
  }

  return newItem;
}

provide("gantt", [Edit, Toolbar, Selection, DayMarkers]);

watch(
  () => [projectStore.currentProjectTitle, taskStore.tasks],
  ([projectTitle, tasks]) => {
    if (projectTitle && tasks.length > 0) {
      const filteredTasks = tasks.filter(
        (item) =>
          item.pulled && item.project_name == projectTitle && item.start_date && item.deadline_date && item.sub_task // Only show tasks with names
      );

      // Validate and normalize the data
      const validatedTasks = validateGanttData(filteredTasks);
      ganttData.value = validatedTasks.map((item, index) => normalizeGanttDates(item, index));
    } else {
      ganttData.value = [];
    }
  },
  { immediate: true, deep: true }
);

const taskFields = {
  id: "ID",
  rowUniqueID: "ID", // Add unique identifier for rows
  assignedTo: "assigned_to",
  Dependency: "dependency",
  startDate: "start_date",
  endDate: "deadline_date",
  Duration: "duration",
  progress: "task_progress",
  status: "status",
};

const viewMode = ref({
  timelineViewMode: "Day",
  timelineUnitSize: 25,
  topTier: {
    unit: "Week",
    format: "dd MMM",
  },
  bottomTier: {
    unit: "Day",
    format: "d",
  },
});

const editSettings = ref({
  // allowEditing: true,
  allowTaskbarEditing: true,
});

const labelSettings = ref({
  taskLabel: "sub_task",
  taskLabelFont: {
    size: "12px",
    color: "#ffffff",
  },
  taskLabelPosition: "Left",
});

const taskbarRendering = (args) => {
  if (args.data.sub_task) {
    const taskbar = args.element;
    const textElement = taskbar.querySelector(".e-taskbar-text");
    if (textElement) {
      textElement.style.textAlign = "left";
      textElement.style.width = "100%";
      textElement.style.position = "absolute";
      textElement.style.left = "50%";
      textElement.style.top = "50%";
      textElement.style.transform = "translate(-50%, -50%)";
    }
  }
};
const splitterSettings = ref({ position: "23%" });
const toolbar = ref(["Edit", "Update", "Cancel"]);
const allowSelection = ref(true);

// Function to validate and fix data for Gantt chart
function validateGanttData(data) {
  const seenIds = new Set();
  const validatedData = [];

  data.forEach((item, index) => {
    let validatedItem = { ...item };

    // Ensure unique ID
    if (!validatedItem.ID || seenIds.has(validatedItem.ID)) {
      validatedItem.ID = `task_${Date.now()}_${index}`;
    }
    seenIds.add(validatedItem.ID);

    validatedData.push(validatedItem);
  });

  return validatedData;
}

// Computed property to check if there are valid tasks
const hasValidTasks = computed(() => {
  if (!projectStore.currentProjectTitle || !taskStore.tasks.length) {
    return false;
  }

  const validTasks = taskStore.tasks.filter(
    (item) =>
      item.pulled &&
      item.project_name == projectStore.currentProjectTitle &&
      item.start_date &&
      item.deadline_date &&
      item.sub_task
  );

  return validTasks.length > 0;
});

function onActionComplete(args) {
  if (args.requestType === "save") {
    // Ensure dates are properly formatted
    let startDate = args.data.start_date;
    let endDate = args.data.deadline_date;

    // Convert Date objects to ISO string format
    if (startDate instanceof Date) {
      startDate = startDate.toISOString().slice(0, 10);
    }
    if (endDate instanceof Date) {
      // Subtract one day from the end date since Gantt chart adds one day
      endDate = new Date(endDate).toISOString().slice(0, 10);
    }

    const editData = {
      assigned_to: args.data.assigned_to,
      start_date: startDate,
      deadline_date: endDate,
      task_progress: args.data.task_progress,
      status: args.data.status,
    };

    editItem("Tasks", args.data.ID, editData)
      .then((res) => {
        taskStore.editTask({
          ...editData,
          ID: args.data.ID,
        });
      })
      .catch((error) => {
        console.error("Error updating task:", error);
      });
  }
}

function queryTaskbarInfo(args) {
  args.taskbarBgColor = projectStore.currentProject?.statusColor[args.data.status] || "#666666";
}

function onTaskbarClick(e) {
  const task = taskStore.tasks.find((item) => item.ID == e.data.ID);
  console.log(task.start_date, "~", task.deadline_date);
  if (task) {
    taskModalStore.openEdit(task);
  }
}

function onQueryCellInfo(args) {
  if (args.column) {
    // Set the title attribute to show full sub_task text as tooltip
    args.cell.setAttribute("title", args.data[args.column.field] || "");

    if (args.column.field == "sub_task") {
      const temp = taskStore.tasks.find((item) => item.ID == args.data.ID);
      args.cell.setAttribute(
        "title",
        `𝗜𝗗 ${temp.ID}\n𝗣𝗿𝗼𝗷𝗲𝗰𝘁 : ${temp.project_name}\n𝗣𝗵𝗮𝘀𝗲 : ${temp.phase}\n𝗧𝗮𝘀𝗸 : ${temp.task}\n𝗦𝘂𝗯𝗧𝗮𝘀𝗸 : ${
          temp.sub_task
        }\n𝗔𝘀𝘀𝗶𝗴𝗻𝗲𝗱 𝘁𝗼 ${temp.assigned_to || "-"}`
      );
    }
  }
}

function goToList() {
  router.push("/list");
}
</script>

<template>
  <LoadingSpinner :showing="projectStore.loading || taskStore.loading" text="Loading project timeline...">
    <q-card class="timeline-body">
      <div class="gantt-toolbar-row">
        <AddTask />
        <q-btn color="purple" icon="cloud_download" class="pull-tasks-btn" label="Pull tasks" @click="goToList" />
      </div>
      <template v-if="hasValidTasks">
        <GanttComponent
          :dataSource="ganttData"
          :taskFields="taskFields"
          :treeColumnIndex="1"
          class="gantt-component"
          :timelineSettings="viewMode"
          :editSettings="editSettings"
          :labelSettings="labelSettings"
          :splitterSettings="splitterSettings"
          :allowSelection="allowSelection"
          :highlightWeekends="true"
          :workWeek="['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']"
          :taskbarHeight="30"
          :toolbar="toolbar"
          :rowHeight="50"
          :queryTaskbarInfo="queryTaskbarInfo"
          :actionComplete="onActionComplete"
          :taskbarRendering="taskbarRendering"
          @taskbarClick="onTaskbarClick"
          :queryCellInfo="onQueryCellInfo"
        >
          <ColumnsDirective>
            <ColumnDirective field="ID" headerText="Task ID" width="70" textAlign="Right" />
            <ColumnDirective field="sub_task" headerText="Task Name" textAlign="Left" width="200" />
            <ColumnDirective field="assigned_to" headerText="Assigned To" textAlign="Left" width="100" />
            <ColumnDirective field="dependency" headerText="Dependency" textAlign="Left" width="100" />
            <ColumnDirective field="start_date" headerText="Start Date" textAlign="Right" width="150" />
            <ColumnDirective field="deadline_date" headerText="Deadline Date" textAlign="Right" width="150" />
            <ColumnDirective
              field="passed_days"
              headerText="Days Passed From Start Date"
              textAlign="Left"
              width="100"
            />
            <ColumnDirective field="left_days" headerText="Days Left To Deadline" textAlign="Left" width="100" />
            <ColumnDirective field="task_progress" headerText="Task Progress" textAlign="Left" width="110" />
            <ColumnDirective field="status" headerText="Status" textAlign="Right" width="150" />
          </ColumnsDirective>
        </GanttComponent>
      </template>
      <div v-else class="no-tasks-message">
        <div v-if="!projectStore.currentProjectTitle">Please select a project to view the timeline.</div>
        <div v-else-if="!taskStore.tasks.length">No tasks found. Please pull tasks from the task list.</div>
        <div v-else>
          No <b>pulled</b> subtasks with valid start and deadline dates to display for this project.
          <br />
          <small class="text-grey-6">SubTasks need to have both start_date and deadline_date fields populated.</small>
        </div>
      </div>
    </q-card>
  </LoadingSpinner>
</template>

<style lang="scss" scoped>
@import url("https://cdn.syncfusion.com/ej2/tailwind.css");

.timeline-body {
  margin: 2rem;
  padding: 2rem;
  border-radius: 15px;
  height: calc(100vh - 4rem - 100px);
}
.gantt-toolbar-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 8px;
}
.gantt-toolbar-placeholder {
  flex: 1;
}
.pull-tasks-btn {
  margin-left: 16px;
}
.gantt-component {
  height: calc(100vh - 4rem - 205px) !important;
}
.import-section {
  .import-card {
    background: #f8f9fa;
    border: 2px dashed #dee2e6;
    border-radius: 8px;

    &:hover {
      border-color: #007bff;
      background: #f0f8ff;
    }
  }
}
.no-tasks-message {
  padding-top: 2rem;
  text-align: center;
  color: #6c757d;
}
</style>
