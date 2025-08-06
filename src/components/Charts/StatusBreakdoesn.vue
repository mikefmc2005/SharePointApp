<script setup>
import { ref, provide, watch } from "vue";
import { Browser } from "@syncfusion/ej2-base";
import {
  AccumulationChartComponent,
  AccumulationSeriesCollectionDirective,
  AccumulationSeriesDirective,
  PieSeries,
  AccumulationTooltip,
  AccumulationDataLabel,
  AccumulationAnnotation,
} from "@syncfusion/ej2-vue-charts";
import { loadChartTheme, roundedCornnerPointRender } from "./theme-color";

import { useProjectStore, useTaskStore } from "../../store";

const projectStore = useProjectStore();
const taskStore = useTaskStore();

const theme = ref(loadChartTheme());
const seriesData = ref([]);

const chartArea = ref({
  border: { width: 0 },
});

const dataLabel = ref({
  visible: true,
  position: "Outside",
  name: "text",
  font: { size: "12px", fontWeight: "600" },
  connectorStyle: { length: "20px", type: "Curve" },
});

const border = ref({ width: 0.5, color: "#ffffff" });
const borderRadius = ref(8);
const radius = ref(Browser.isDevice ? "30%" : "70%");
const animation = ref({ enable: true });

const tooltip = ref({
  enable: true,
  header: "",
  format: "<b>${point.x}</b><br>Tasks: <b>${point.y}</b>",
  enableHighlight: true,
});

const width = ref(Browser.isDevice ? "100%" : "90%");
const height = ref(Browser.isDevice ? "300px" : "420px");
const enableAnimation = ref(true);
const legend = ref({ visible: true, position: "bottom" });
const title = ref("STATUS BREAKDOWN");
const palette = ref([]);

const constructData = (filteredTasks) => {
  if (filteredTasks.length == 0) {
    seriesData.value = [];
    return;
  }

  const { currentProject } = projectStore;

  if (!currentProject || !currentProject.status) {
    seriesData.value = [];
    return;
  }

  const { statusColor } = currentProject;

  const statusCounts = {};
  filteredTasks.forEach((task) => {
    const status = task.status || "Open";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    x: status,
    y: count,
    text: `${status}: ${count}`,
  }));
  seriesData.value = chartData;

  const paletteColors = chartData.map((item) => statusColor[item.x]);
  palette.value = paletteColors;
};

const pointRender = (args) => {
  roundedCornnerPointRender(args);
};

provide("accumulationchart", [PieSeries, AccumulationTooltip, AccumulationDataLabel, AccumulationAnnotation]);

watch(
  () => [projectStore.currentProjectTitle, taskStore.tasks, projectStore.projects],
  ([projectTitle, tasks, projects]) => {
    if (projectTitle && tasks.length > 0 && projects.length > 0) {
      constructData(tasks.filter((item) => item.pulled && item.project_name == projectTitle));
    }
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <div class="control-section">
    <div align="center">
      <div v-if="projectStore.loading || taskStore.loading" class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading status data...</div>
      </div>
      <div v-else-if="seriesData.length == 0" class="no-data">
        <div class="no-data-text">
          <p>No status data available for the selected project.</p>
          <p>Please ensure the project has tasks with status information.</p>
        </div>
      </div>
      <AccumulationChartComponent
        v-else
        style="display: block"
        :theme="theme"
        id="pie-border-container"
        :chartArea="chartArea"
        :pointRender="pointRender"
        :tooltip="tooltip"
        :enableBorderOnMouseMove="false"
        :enableAnimation="enableAnimation"
        :width="width"
        :height="height"
        :title="title"
        :legendSettings="legend"
      >
        <AccumulationSeriesCollectionDirective>
          <AccumulationSeriesDirective
            type="Pie"
            :dataSource="seriesData"
            xName="x"
            yName="y"
            name="Project"
            :radius="radius"
            startAngle="120"
            innerRadius="50%"
            :dataLabel="dataLabel"
            :border="border"
            :animation="animation"
            :borderRadius="borderRadius"
            :palettes="palette"
          ></AccumulationSeriesDirective>
        </AccumulationSeriesCollectionDirective>
      </AccumulationChartComponent>
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
