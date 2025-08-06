<script setup>
import { provide, ref, watch } from "vue";
import {
  ChartComponent as EjsChart,
  SeriesDirective as Series,
  SeriesCollectionDirective as SeriesCollection,
  ColumnSeries,
  Category,
  Tooltip,
  Legend,
} from "@syncfusion/ej2-vue-charts";

import { useProjectStore, useTaskStore } from "../../store";

const projectStore = useProjectStore();
const taskStore = useTaskStore();

const seriesData = ref([]);

const primaryXAxis = {
  valueType: "Category",
  labelRotation: 0,
  labelIntersectAction: "Rotate45",
  labelRotation: 45,
};
const primaryYAxis = {
  minimum: 0,
  maximum: 100,
  interval: 20,
  labelFormat: "{value}%",
};

const legendSettings = { visible: false };

const title = "PROJECT PHASE PROGRESS %";

const processPhaseProgress = (filteredTasks) => {
  const taskToPhaseMap = {};
  filteredTasks.forEach((task) => {
    const taskKey = `${task.sub_task}`;
    taskToPhaseMap[taskKey] = task.phase;
  });

  const phaseGroups = {};

  filteredTasks.forEach((task) => {
    let phase;

    if (taskToPhaseMap[task.sub_task]) {
      phase = taskToPhaseMap[task.sub_task];

      if (!phaseGroups[phase]) {
        phaseGroups[phase] = [];
      }
      phaseGroups[phase].push(task);
    }
  });

  const phaseProgress = [];

  Object.entries(phaseGroups).forEach(([phase, filteredTasks]) => {
    if (filteredTasks.length > 0) {
      const validPlans = [...filteredTasks];

      if (validPlans.length > 0) {
        const totalProgress = validPlans.reduce((sum, task) => {
          return sum + (parseFloat(task.task_progress) || 0);
        }, 0);

        const averageProgress = totalProgress / validPlans.length;

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

  // Transform data for chart format
  const chartData = phaseProgress.map((item) => ({
    phase: item.phase,
    progress: item.progress,
  }));

  seriesData.value = chartData;
};

provide("chart", [ColumnSeries, Category, Tooltip, Legend]);

watch(
  () => [projectStore.currentProjectTitle, taskStore.tasks],
  ([projectTitle, tasks]) => {
    if (projectTitle && tasks.length > 0) {
      processPhaseProgress(tasks.filter((item) => item.project_name == projectTitle));
    }
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <div class="control-section">
    <div align="center">
      <div v-if="projectStore.loading || taskStore.loading" class="loading-container">
        <q-spinner-dots size="40px" color="primary" />
        <div class="loading-text">Loading phase progress...</div>
      </div>
      <div v-else-if="seriesData.length == 0" class="no-data">
        <div class="no-data-text">
          <p>No phase progress data available for the selected project.</p>
          <p>Please add tasks with timeline progress information to view phase progress.</p>
        </div>
      </div>
      <EjsChart
        v-else
        ref="chart"
        :title="title"
        :primaryXAxis="primaryXAxis"
        :primaryYAxis="primaryYAxis"
        :legendSettings="legendSettings"
        width="100%"
        height="420px"
      >
        <SeriesCollection>
          <Series :dataSource="seriesData" type="Column" xName="phase" yName="progress" name="Progress %" />
        </SeriesCollection>
      </EjsChart>
    </div>
  </div>
</template>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 420px;
  text-align: center;
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}
.loading-text {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}
.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 420px;
  text-align: center;
}
.no-data-text {
  font-size: 16px;
  color: #999;
  font-weight: 500;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.e-series-0 rect {
  fill: #4472c4;
}
.e-series-1 rect {
  fill: #ed7d31;
}
</style>
