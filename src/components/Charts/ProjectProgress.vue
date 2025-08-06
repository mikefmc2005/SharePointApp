<script setup>
import { provide, ref, watch } from "vue";
import {
  ChartComponent as EjsChart,
  SeriesCollectionDirective as ESeriesCollection,
  SeriesDirective as ESeries,
  StackingColumnSeries,
  Category,
  Legend,
  DataLabel,
} from "@syncfusion/ej2-vue-charts";

import { useProjectStore, useTaskStore } from "../../store";

const projectStore = useProjectStore();
const taskStore = useTaskStore();

const seriesData = ref([]);

const primaryXAxis = {
  title: "Phases",
  valueType: "Category",
  labelIntersectAction: "Rotate45",
  labelRotation: 45,
};
const primaryYAxis = {
  title: "Days",
};
const title = "PROJECT PROGRESS IN DAYS";
const legendSettings = { visible: true };
const markerSettingsLeft = {
  dataLabel: {
    visible: true,
    position: "Middle",
    font: { color: "#fff", fontWeight: "bold" },
  },
};
const markerSettingsPassed = {
  dataLabel: {
    visible: true,
    position: "Middle",
    font: { color: "#fff", fontWeight: "bold" },
  },
};

const processProjectTimeline = (filteredTasks) => {
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

  const phaseTimeline = [];
  const today = new Date();

  Object.entries(phaseGroups).forEach(([phase, filteredTasks]) => {
    if (filteredTasks.length > 0) {
      const validPlans = filteredTasks.filter((task) => task.start_date && task.deadline_date);

      if (validPlans.length > 0) {
        const startDates = validPlans
          .map((task) => {
            const date = new Date(task.start_date);
            return isNaN(date.getTime()) ? null : date;
          })
          .filter((date) => date !== null);
        const earliestStart = startDates.length > 0 ? new Date(Math.min(...startDates)) : null;

        const deadlineDates = validPlans
          .map((task) => {
            const date = new Date(task.deadline_date);
            return isNaN(date.getTime()) ? null : date;
          })
          .filter((date) => date !== null);
        const latestEnd = deadlineDates.length > 0 ? new Date(Math.max(...deadlineDates)) : null;

        let daysPassed = 0;
        let daysLeft = 0;

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
          project: phase,
          daysPassed: daysPassed,
          daysLeft: daysLeft,
        });
      } else {
        phaseTimeline.push({
          project: phase,
          daysPassed: 0,
          daysLeft: 0,
        });
      }
    }
  });

  phaseTimeline.sort((a, b) => a.project.localeCompare(b.project));

  seriesData.value = phaseTimeline;
};

provide("chart", [StackingColumnSeries, Category, Legend, DataLabel]);

watch(
  () => [projectStore.currentProjectTitle, taskStore.tasks],
  ([projectTitle, tasks]) => {
    if (projectTitle && tasks.length > 0) {
      processProjectTimeline(tasks.filter((item) => item.project_name == projectTitle));
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
        <div class="loading-text">Loading project progress...</div>
      </div>
      <div v-else-if="seriesData.length == 0" class="no-data">
        <div class="no-data-text">
          <p>No progress data available for the selected project.</p>
          <p>Please add tasks with valid start and deadline dates to view project progress.</p>
        </div>
      </div>
      <ejs-chart
        v-else
        style="height: 420px"
        :title="title"
        :primaryXAxis="primaryXAxis"
        :primaryYAxis="primaryYAxis"
        :legendSettings="legendSettings"
      >
        <e-series-collection>
          <e-series
            :dataSource="seriesData"
            type="StackingColumn"
            xName="project"
            yName="daysPassed"
            name="DAYS PASSED"
            :marker="markerSettingsPassed"
            fill="#F79646"
          />
          <e-series
            :dataSource="seriesData"
            type="StackingColumn"
            xName="project"
            yName="daysLeft"
            name="DAYS LEFT"
            :marker="markerSettingsLeft"
            fill="#4F81BD"
          />
        </e-series-collection>
      </ejs-chart>
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
</style>
