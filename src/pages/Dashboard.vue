<template>
  <div class="row q-col-gutter-md" style="padding: 1rem">
    <!-- Quick Access Sidebar -->
    <div class="col-3">
      <QuickAccessPanel />
    </div>

    <!-- Main Dashboard Content -->
    <div class="col-9">
      <q-card>
        <!-- Navigation Tabs -->
        <q-tabs v-model="tab" dense align="left" class="bg-primary text-white shadow-2" :breakpoint="0">
          <q-tab name="overview" label="Overviews" icon="insert_chart" />
          <q-tab name="pivot" label="Pivot Tables" icon="table_chart" />
        </q-tabs>

        <!-- Tab Content Panels -->
        <q-tab-panels v-model="tab" animated>
          <q-tab-panel name="overview">
            <Overview />
          </q-tab-panel>

          <q-tab-panel name="pivot">
            <PivotTable />
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </div>
  </div>
</template>

<script setup>
/**
 * Dashboard Page
 * Main dashboard with overview and pivot table views
 */

import { ref } from "vue";
import QuickAccessPanel from "../components/Cards/QuickAccessPanel.vue";
import Overview from "../components/Cards/Overview.vue";
import PivotTable from "../components/Cards/PivotTable.vue";

// Active tab state
const tab = ref("overview");
</script>

<style lang="scss" scoped>
/* Custom tab styling for dense layout */
.q-tabs--dense {
  .q-tab--full {
    padding: 12px 24px 0;
  }
}
</style>
