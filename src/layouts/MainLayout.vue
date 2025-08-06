<template>
  <q-layout view="hhh lpR fff">
    <!-- Application Header -->
    <q-header reveal elevated class="bg-primary text-white">
      <q-toolbar class="glossy">
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" />
        <q-toolbar-title>Project Management</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <!-- Left Sidebar Navigation -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :breakpoint="500"
      bordered
      :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-3'"
      style="padding: 10px"
    >
      <Sidebar />
    </q-drawer>

    <!-- Main Content Area -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Application Footer -->
    <q-footer elevated>
      <q-toolbar class="glossy">
        <q-toolbar-title>
          <span class="text-caption">© {{ currentYear }}</span>
        </q-toolbar-title>
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<script setup>
/**
 * Main Layout Component
 * Provides the overall application structure with header, sidebar, and footer
 */

import { ref, computed } from "vue";
import Sidebar from "../components/Sidebars/Sidebar.vue";

// Sidebar state
const leftDrawerOpen = ref(false);

/**
 * Toggle the left sidebar visibility
 */
const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value;
};

// Current year for footer
const currentYear = computed(() => new Date().getFullYear());
</script>
