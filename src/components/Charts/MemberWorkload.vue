<script setup>
import { provide, ref, watch } from "vue";
import {
  ChartComponent as EjsChart,
  SeriesCollectionDirective as ESeriesCollection,
  SeriesDirective as ESeries,
  StackingColumnSeries,
  Category,
  Legend,
} from "@syncfusion/ej2-vue-charts";

import { useProjectStore, useTaskStore } from "../../store";

const projectStore = useProjectStore();
const taskStore = useTaskStore();

const memberWorkloadData = ref([]);

function getSeries() {
  if (!projectStore.currentProjectTitle) return [];

  return projectStore.currentProject.status.map((status) => ({
    dataSource: memberWorkloadData.value.map((member) => ({
      x: member.member,
      y: member[status.name],
    })),
    xName: "x",
    yName: "y",
    name: status.name,
    type: "StackingColumn",
    fill: status.color,
  }));
}

const primaryXAxis = {
  title: "Members",
  valueType: "Category",
  labelIntersectAction: "Rotate45",
  labelRotation: 45,
};

const primaryYAxis = {
  title: "Counts",
};

const title = "MEMBERS WORKLOAD";

watch(
  () => [projectStore, taskStore],
  ([{ currentProject, currentProjectTitle }, { tasks }]) => {
    const filteredTasks = currentProjectTitle
      ? tasks.filter((task) => task.pulled && task.project_name == currentProjectTitle)
      : tasks;

    const memberGroups = {};

    if (currentProjectTitle) {
      currentProject.members.forEach((member) => {
        memberGroups[member] = { member };
      });

      filteredTasks.forEach((task) => {
        if (!task.assigned_to) return;

        const member = task.assigned_to;
        const status = task.status || "Open";

        if (memberGroups[member][status]) memberGroups[member][status]++;
        else memberGroups[member][status] = 1;
      });
    }

    const memberWorkload = Object.values(memberGroups).sort((a, b) => a.member.localeCompare(b.member));

    memberWorkloadData.value = memberWorkload;
  },
  { immediate: true, deep: true }
);

provide("chart", [StackingColumnSeries, Category, Legend]);
</script>

<template>
  <div>
    <div v-if="projectStore.loading || taskStore.loading" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading member workload data...</div>
    </div>
    <div v-else-if="memberWorkloadData.length == 0" class="no-data">
      <div class="no-data-text">
        <p>No workload data available for project members.</p>
        <p>Please assign tasks to members to view workload distribution.</p>
      </div>
    </div>
    <ejs-chart
      v-else
      style="height: 420px"
      :title="title"
      :primaryXAxis="primaryXAxis"
      :primaryYAxis="primaryYAxis"
      :legendSettings="{ visible: true }"
    >
      <e-series-collection>
        <e-series v-for="series in getSeries()" :key="series.name" v-bind="series" />
      </e-series-collection>
    </ejs-chart>
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
