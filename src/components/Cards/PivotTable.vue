<script setup>
import { ref, watch, computed } from "vue";
import { useProjectStore, useTaskStore } from "../../store";

const projectStore = useProjectStore();
const taskStore = useTaskStore();

const pivotData1Q = ref([]);
const pivotData2Q = ref([]);
const pivotData3Q = ref([]);
const pivotData4Q = ref([]);
const tableLoading = ref({
  table1: true,
  table2: true,
  table3: true,
  table4: true,
});

const filteredTasks = computed(() => {
  if (!projectStore.currentProjectTitle) return [];

  return taskStore.tasks.filter((task) => task.project_name == projectStore.currentProjectTitle);
});

const currentStatusList = computed(() => {
  if (!projectStore.currentProjectTitle) return [];

  return projectStore.currentProject.status;
});

const processPhaseProgress = () => {
  const tasks = filteredTasks.value;

  const taskToPhaseMap = {};
  tasks.forEach((task) => {
    const taskKey = `${task.sub_task}`;
    taskToPhaseMap[taskKey] = task.phase;
  });

  const phaseGroups = {};

  tasks.forEach((task) => {
    let phase = task.phase;

    if (!phaseGroups[phase]) {
      phaseGroups[phase] = [];
    }

    phaseGroups[phase].push(task);
  });

  // Calculate progress for each phase
  const phaseProgress = [];

  Object.entries(phaseGroups).forEach(([phase, tasks]) => {
    if (tasks.length > 0) {
      const validTasks = tasks.filter((task) => task.task_progress !== null && task.task_progress !== undefined);

      if (validTasks.length > 0) {
        const totalProgress = validTasks.reduce((sum, task) => {
          return sum + (parseFloat(task.task_progress) || 0);
        }, 0);

        const averageProgress = totalProgress / validTasks.length;

        phaseProgress.push({
          phase: phase,
          progress: Math.round(averageProgress),
        });
      } else {
        // If no valid progress data, show 0
        phaseProgress.push({
          phase: phase,
          progress: 0,
        });
      }
    }
  });

  // Sort by phase name for consistent display
  phaseProgress.sort((a, b) => a.phase.localeCompare(b.phase));

  pivotData1Q.value = phaseProgress;
  tableLoading.value.table1 = false;
};

// Function to process phase timeline data for second table
const processProjectProgress = () => {
  const tasks = filteredTasks.value;

  // Create a mapping from task title to phase (same as in processPhaseProgress)
  const taskToPhaseMap = {};
  tasks.forEach((task) => {
    const taskKey = `${task.sub_task}`;
    taskToPhaseMap[taskKey] = task.phase;
  });

  // Group plans by phase
  const phaseGroups = {};

  tasks.forEach((task) => {
    let phase = task.phase;

    if (!phaseGroups[phase]) {
      phaseGroups[phase] = [];
    }
    phaseGroups[phase].push(task);
  });

  // Calculate timeline for each phase
  const phaseTimeline = [];
  const today = new Date();

  Object.entries(phaseGroups).forEach(([phase, tasks]) => {
    if (tasks.length > 0) {
      // Find earliest start date and latest end date for this phase
      const validTasks = tasks.filter((plan) => plan.start_date && plan.deadline_date);

      if (validTasks.length > 0) {
        // Find earliest start date
        const startDates = validTasks
          .map((plan) => {
            const date = new Date(plan.start_date);
            return isNaN(date.getTime()) ? null : date;
          })
          .filter((date) => date !== null);
        const earliestStart = startDates.length > 0 ? new Date(Math.min(...startDates)) : null;

        // Find latest end date
        const deadlineDates = validTasks
          .map((plan) => {
            const date = new Date(plan.deadline_date);
            return isNaN(date.getTime()) ? null : date;
          })
          .filter((date) => date !== null);
        const latestEnd = deadlineDates.length > 0 ? new Date(Math.max(...deadlineDates)) : null;

        let daysPassed = "-";
        let daysLeft = "-";

        if (earliestStart) {
          const daysDiff = Math.floor((today - earliestStart) / (1000 * 60 * 60 * 24));
          if (daysDiff >= 0) {
            daysPassed = daysDiff;
          }
        }

        if (latestEnd) {
          const daysDiff = Math.floor((latestEnd - today) / (1000 * 60 * 60 * 24));
          if (daysDiff > 0) {
            daysLeft = daysDiff;
          }
        }

        phaseTimeline.push({
          phase: phase,
          daysPassed: daysPassed,
          daysLeft: daysLeft,
        });
      } else {
        // No valid dates found
        phaseTimeline.push({
          phase: phase,
          daysPassed: "-",
          daysLeft: "-",
        });
      }
    }
  });

  // Sort by phase name for consistent display
  phaseTimeline.sort((a, b) => a.phase.localeCompare(b.phase));

  pivotData2Q.value = phaseTimeline;
  tableLoading.value.table2 = false;
};

// Function to process status counts for third table
const processStatusCounts = () => {
  const tasks = filteredTasks.value;
  const targetStatuses = currentStatusList.value.length > 0 ? currentStatusList.value : [];

  // Initialize counts for all target statuses
  const statusCounts = {};
  targetStatuses.forEach((status) => {
    statusCounts[status.name] = 0;
  });

  // Count statuses from tasks data
  tasks.forEach((task) => {
    const status = task.status || targetStatuses[0].name || "Open";
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++;
    }
  });

  const statusData = Object.keys(statusCounts).map((status) => ({
    status,
    count: statusCounts[status],
  }));

  pivotData3Q.value = statusData;
  tableLoading.value.table3 = false;
};

// Function to process member workload for fourth table
const processMemberWorkload = () => {
  const tasks = filteredTasks.value;
  const targetStatuses = currentStatusList.value.length > 0 ? currentStatusList.value : [];

  const memberGroups = {};
  tasks.forEach((task) => {
    const member = task.assigned_to || "Unassigned";
    if (!memberGroups[member]) {
      memberGroups[member] = { member };
      targetStatuses.forEach((status) => {
        memberGroups[member][status.name] = 0;
      });
    }
    const status = task.status;
    if (status && memberGroups[member].hasOwnProperty(status)) {
      memberGroups[member][status]++;
    }
  });

  const memberWorkload = Object.values(memberGroups).sort((a, b) => a.member.localeCompare(b.member));
  pivotData4Q.value = memberWorkload;
  tableLoading.value.table4 = false;
};

const pivotColumns1Q = [
  { name: "phase", label: "PHASE", field: "phase", align: "left" },
  { name: "progress", label: "PROGRESS %", field: "progress", align: "left" },
];

const pivotColumns2Q = [
  { name: "phase", label: "PHASE", field: "phase", align: "left" },
  { name: "daysPassed", label: "DAYS PASSED", field: "daysPassed", align: "left" },
  { name: "daysLeft", label: "DAYS LEFT", field: "daysLeft", align: "left" },
];

const pivotColumns3Q = [
  { name: "status", label: "STATUS", field: "status", align: "left" },
  { name: "count", label: "COUNT", field: "count", align: "left" },
];

const pivotColumns4Q = computed(() => {
  const base = [{ name: "member", label: "MEMBER", field: "member", align: "left" }];
  const statusCols = currentStatusList.value.map((status) => ({
    name: status.name,
    label: status.name.toUpperCase(),
    field: status.name,
    align: "left",
  }));
  return base.concat(statusCols);
});

watch(
  () => [projectStore.currentProjectTitle, taskStore.tasks],
  ([projectTitle, tasks]) => {
    if (projectTitle && tasks.length > 0) {
      processPhaseProgress();
      processProjectProgress();
      processStatusCounts();
      processMemberWorkload();
    }
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <div class="pivot-section">
    <div v-if="projectStore.loading || taskStore.loading" class="loading-container">
      <q-spinner-dots size="50px" color="primary" />
      <div class="loading-text">Loading project data...</div>
    </div>

    <!-- Tables Content -->
    <div v-else>
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-4">
          <q-card flat bordered>
            <q-card-section>
              <p class="table-header">Project Phase Progress %</p>
              <div v-if="tableLoading.table1" class="table-loading">
                <q-spinner-dots size="30px" color="primary" />
                <div class="table-loading-text">Loading phase progress...</div>
              </div>
              <q-table
                v-else
                :columns="pivotColumns1Q"
                :rows="pivotData1Q"
                dense
                flat
                :pagination="{ rowsPerPage: 0 }"
                bordered
                style="flex: 1; overflow: auto"
              >
                <template v-slot:bottom>
                  <div style="text-align: center">There are {{ pivotData1Q.length }} items.</div>
                </template>
              </q-table>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-4">
          <q-card flat bordered>
            <q-card-section>
              <p class="table-header">Project Phase Timeline</p>
              <div v-if="tableLoading.table2" class="table-loading">
                <q-spinner-dots size="30px" color="primary" />
                <div class="table-loading-text">Loading phase timeline...</div>
              </div>
              <q-table
                v-else
                :columns="pivotColumns2Q"
                :rows="pivotData2Q"
                dense
                flat
                :pagination="{ rowsPerPage: 0 }"
                bordered
                style="flex: 1; overflow: auto"
              >
                <template v-slot:bottom>
                  <div style="text-align: center">There are {{ pivotData2Q.length }} items.</div>
                </template>
              </q-table>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-4">
          <q-card flat bordered>
            <q-card-section>
              <p class="table-header">Project Task Status Distribution</p>
              <div v-if="tableLoading.table3" class="table-loading">
                <q-spinner-dots size="30px" color="primary" />
                <div class="table-loading-text">Loading status distribution...</div>
              </div>
              <q-table
                v-else
                :columns="pivotColumns3Q"
                :rows="pivotData3Q"
                dense
                flat
                :pagination="{ rowsPerPage: 0 }"
                bordered
                style="flex: 1; overflow: auto"
              >
                <template v-slot:bottom>
                  <div style="text-align: center">There are {{ pivotData3Q.length }} items.</div>
                </template>
              </q-table>
            </q-card-section>
          </q-card>
        </div>
      </div>
      <div class="row q-col-gutter-md">
        <div class="col-12">
          <q-card flat bordered>
            <q-card-section>
              <p class="table-header">Project Member Task Status</p>
              <div v-if="tableLoading.table4" class="table-loading">
                <q-spinner-dots size="30px" color="primary" />
                <div class="table-loading-text">Loading member workload...</div>
              </div>
              <q-table
                v-else
                :columns="pivotColumns4Q"
                :rows="pivotData4Q"
                dense
                flat
                :pagination="{ rowsPerPage: 0 }"
                bordered
                style="flex: 1; overflow: auto"
              >
                <template v-slot:bottom>
                  <div style="text-align: center">There are {{ pivotData4Q.length }} items.</div>
                </template>
              </q-table>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}
.loading-text {
  margin-top: 16px;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}
.table-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}
.table-loading-text {
  margin-top: 12px;
  font-size: 12px;
  color: #666;
  font-weight: 500;
}
.table-header {
  color: #1976d2;
  font-weight: bold;
  text-align: center;
  margin-bottom: 10px;
}
</style>
