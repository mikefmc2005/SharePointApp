<script setup>
/**
 * Loading Spinner Component
 * Displays a loading overlay with customizable text and blur effect
 */

import { defineProps } from "vue";

const props = defineProps({
  showing: {
    type: Boolean,
    required: true,
    description: "Controls whether the loading spinner is visible",
  },
  text: {
    type: String,
    default: "Loading...",
    description: "Text to display below the spinner",
  },
});
</script>

<template>
  <div class="spinner-wrapper">
    <!-- Loading overlay with spinner -->
    <q-inner-loading :showing="showing" class="custom-spinner-overlay">
      <q-spinner-pie size="60px" color="primary" class="cool-spinner" />
      <div class="spinner-text">{{ text }}</div>
    </q-inner-loading>

    <!-- Content with blur effect when loading -->
    <div :class="{ 'blurred-bg': showing }">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.spinner-wrapper {
  position: relative;
}

/* Blur effect for background content during loading */
.blurred-bg {
  filter: blur(3px) grayscale(0.2) brightness(0.95);
  pointer-events: none;
  user-select: none;
}

/* Loading overlay styling */
.custom-spinner-overlay {
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Spinner animation and effects */
.cool-spinner {
  animation: spin 1.2s linear infinite;
  filter: drop-shadow(0 0 8px #1976d2);
}

/* Loading text styling */
.spinner-text {
  margin-top: 18px;
  font-size: 1.1rem;
  color: #1976d2;
  letter-spacing: 1px;
  font-weight: 500;
  text-shadow: 0 2px 8px #e3eafc;
}

/* Spinner rotation animation */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
