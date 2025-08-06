<script setup>
/**
 * 404 Not Found Page
 * Displays when a user navigates to a non-existent route
 */

import { useRouter } from "vue-router";

const $router = useRouter();

/**
 * Navigate back to the previous page
 */
const goBack = () => {
  $router.back();
};

/**
 * Move background based on mouse position for interactive effect
 * @param {MouseEvent} event - Mouse event object
 */
const moveBackground = (event) => {
  const container = document.getElementById("container");

  if (container) {
    const x = -event.clientX / 5;
    const y = -event.clientY / 5;

    container.style.backgroundPositionX = x + "px";
    container.style.backgroundPositionY = y + "px";
  }
};
</script>

<template>
  <div class="body">
    <!-- Interactive container with parallax effect -->
    <div id="container" @mouseover="moveBackground">
      <div class="content">
        <h2>404</h2>
        <h4>Sorry, the page you visited does not exist.</h4>
        <q-btn color="info" icon="settings_backup_restore" label="Back Home" @click="goBack" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Full-screen gradient background */
.body {
  background: linear-gradient(45deg, #c4302b, #f3ba2f);
  min-width: 100%;
  min-height: 100vh;
}

/* Main container with glassmorphism effect */
#container {
  position: absolute;
  top: 10%;
  left: 10%;
  right: 10%;
  bottom: 30%;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(21, 23, 41, 0.7);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5);
  transition: 0.3s;
}

/* Content wrapper */
#container .content {
  max-width: 600px;
  text-align: center;
}

/* Large 404 text */
#container .content h2 {
  font-size: 18vw;
  color: #ffffff;
  line-height: 0.5em;
}

/* Error message */
#container .content h4 {
  font-size: 1.5em;
  margin-bottom: 20px;
  color: #111111;
  padding: 10px 20px;
}

/* Additional text styling */
#container .content p {
  color: #ffffff;
  font-size: 1.2em;
}
</style>
