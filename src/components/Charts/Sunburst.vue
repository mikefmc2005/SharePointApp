<script setup>
import { ref, watch, computed, onMounted, nextTick } from "vue";
import * as d3 from "d3";
import AddTask from "../AddTask.vue";
import { useProjectStore, useTaskModalStore, useTaskStore } from "../../store";
import { deleteItem } from "../../actions/deleteItem";

// Helper: Convert hex color to RGB array
function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");
  }
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Helper: Convert RGB array to hex color
function rgbToHex([r, g, b]) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

// Helper: Average array of RGB arrays
function averageRgb(colors) {
  if (!colors.length) return [102, 102, 102];
  const sum = colors.reduce((acc, rgb) => [acc[0] + rgb[0], acc[1] + rgb[1], acc[2] + rgb[2]], [0, 0, 0]);
  return sum.map((x) => Math.round(x / colors.length));
}

// Main: Get color for node (d3 node)
function getStatusColorForNode(d) {
  // If leaf (subtask), use its status color
  if (!d.children || d.children.length === 0) {
    const status = d.data.status || d.data.name;
    return projectStore.currentProject?.statusColor[status] || "#666666";
  }
  // If has children, average their colors recursively
  const childColors = d.children.map((child) => {
    if (!child.children || child.children.length === 0) {
      const status = child.data.status || child.data.name;
      return hexToRgb(projectStore.currentProject?.statusColor[status] || "#666666");
    } else {
      return hexToRgb(getStatusColorForNode(child));
    }
  });
  return rgbToHex(averageRgb(childColors));
}

const projectStore = useProjectStore();
const taskStore = useTaskStore();
const taskModalStore = useTaskModalStore();

const height = ref("100%");
const legendItems = ref([]);
const chartContainer = ref(null);
const currentRoot = ref(null);
const chartHistory = ref([]);
const heldSegments = ref(new Set());
const infoCards = ref([]);

// Function to process long titles
const processTitle = (title, maxLength = 15) => {
  if (!title) return "";
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + "...";
};

// Function to get segment identifier
const getSegmentId = (d) => {
  return d
    .ancestors()
    .map((ancestor) => ancestor.data.name)
    .join(" > ");
};

// Function to toggle hold on a segment
const toggleHold = (segmentId) => {
  if (heldSegments.value.has(segmentId)) {
    heldSegments.value.delete(segmentId);
  } else {
    heldSegments.value.add(segmentId);
  }
};

// Function to clear all holds
const clearHolds = () => {
  heldSegments.value.clear();
};

// Function to check if a segment is held
const isSegmentHeld = (d) => {
  const segmentId = getSegmentId(d);
  return heldSegments.value.has(segmentId);
};

// Function to handle "View Details" action
const handleViewDetails = (event, d) => {
  const pathComponents = d
    .ancestors()
    .map((ancestor) => ancestor.data.name)
    .reverse();
  const projectName = pathComponents[0] || "";
  const phase = pathComponents[1] || "";
  const task = pathComponents[2] || "";
  const subTask = pathComponents[3] || "";

  const cardWidth = 600;
  const cardHeight = 600;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x = (viewportWidth - cardWidth) / 2;
  let y = (viewportHeight - cardHeight) / 2;

  if (x < 20) x = 20;
  if (y < 20) y = 20;

  const isLeafNode = !d.children || d.children.length === 0;

  let displayData;
  if (isLeafNode) {
    displayData = {
      name: d.data.name,
      depth: d.depth,
      projectName: projectName,
      phase: phase,
      task: task,
      subTask: subTask,
      description: d.data.description || "",
      groups: d.data.groups || "",
      architecture: d.data.architecture || "",
      task_progress: d.data.task_progress || "",
      status: d.data.status || "",
      assigned_to: d.data.assigned_to || "",
      start_date: d.data.start_date || "",
      deadline_date: d.data.deadline_date || "",
      duration: d.data.duration || "",
      isHeld: isSegmentHeld(d),
      isLeafNode: true,
    };
  } else {
    const children = d.children || [];
    displayData = {
      name: d.data.name,
      depth: d.depth,
      projectName: projectName,
      phase: phase,
      task: task,
      subTask: subTask,
      children: children.map((child) => ({
        name: child.data.name,
        description: child.data.description || "",
        groups: child.data.groups || "",
        architecture: child.data.architecture || "",
        task_progress: child.data.task_progress || "",
        status: child.data.status || "",
        assigned_to: child.data.assigned_to || "",
        start_date: child.data.start_date || "",
        deadline_date: child.data.deadline_date || "",
        duration: child.data.duration || "",
        isHeld: isSegmentHeld(child),
      })),
      isHeld: isSegmentHeld(d),
      isLeafNode: false,
    };
  }

  const nodeInfo = {
    id: `node-${Date.now()}-${Math.random()}`,
    ...displayData,
    position: { x, y },
  };

  infoCards.value.push(nodeInfo);
};

const showContextMenu = (event, d) => {
  // Function to show context menu
  d3.selectAll(".context-menu").remove();

  const menu = d3
    .select("body")
    .append("div")
    .attr("class", "context-menu")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("box-shadow", "0 2px 10px rgba(0,0,0,0.2)")
    .style("z-index", "1000")
    .style("min-width", "150px");

  // Add menu item - Add task
  menu
    .append("div")
    .attr("class", "menu-item")
    .style("padding", "8px 12px")
    .style("cursor", "pointer")
    .text("Add new SubTask")
    .on("click", () => {
      const data = { project_name: projectStore.currentProjectTitle };

      switch (d.depth) {
        case 1:
          data.phase = d.data.name;
          break;

        case 2:
          data.phase = d.parent.data.name;
          data.task = d.data.name;
          break;

        case 3:
          data.phase = d.parent.parent.data.name;
          data.task = d.parent.data.name;
          break;
      }

      taskModalStore.openAdd(data);
      menu.remove();
    });

  if (d.depth == 3) {
    const task = taskStore.tasks.find(
      (it) =>
        it.project_name == projectStore.currentProjectTitle &&
        it.phase == d.parent.parent.data.name &&
        it.task == d.parent.data.name &&
        it.sub_task == d.data.name
    );

    menu
      .append("div")
      .attr("class", "menu-item")
      .style("padding", "8px 12px")
      .style("cursor", "pointer")
      .text("Edit SubTask")
      .on("click", () => {
        if (task) taskModalStore.openEdit(task);

        menu.remove();
      });

    // Add menu item - Delete task
    menu
      .append("div")
      .attr("class", "menu-item")
      .style("padding", "8px 12px")
      .style("cursor", "pointer")
      .text("Delete SubTask")
      .on("click", () => {
        if (task && confirm("Are you sure to delete this subtask?")) {
          deleteItem("Tasks", task.ID);
          taskStore.deleteTasks([task.ID]);
        }
        menu.remove();
      });
  }

  if (d.depth == 2) {
    const task = {
      project_name: projectStore.currentProjectTitle,
      phase: d.parent.data.name,
      task: d.data.name,
      new_task: d.data.name,
      depth: 2,
    };

    menu
      .append("div")
      .attr("class", "menu-item")
      .style("padding", "8px 12px")
      .style("cursor", "pointer")
      .text("Edit Task")
      .on("click", () => {
        taskModalStore.openEdit(task);

        menu.remove();
      });

    // // Add menu item - Delete task
    menu
      .append("div")
      .attr("class", "menu-item")
      .style("padding", "8px 12px")
      .style("cursor", "pointer")
      .text("Delete Task")
      .on("click", () => {
        if (confirm("Are you sure to delete this task? All subtasks will be deleted.")) {
          const IDs = taskStore.tasks
            .filter(
              (item) => item.project_name == task.project_name && item.phase == task.phase && item.task == task.task
            )
            .map((item) => item.ID);

          IDs.forEach((item) => {
            deleteItem("Tasks", item);
          });

          taskStore.deleteTasks(IDs);
        }
        menu.remove();
      });
  }

  if (d.depth == 1) {
    const task = {
      project_name: projectStore.currentProjectTitle,
      phase: d.data.name,
      new_phase: d.data.name,
      depth: 1,
    };

    menu
      .append("div")
      .attr("class", "menu-item")
      .style("padding", "8px 12px")
      .style("cursor", "pointer")
      .text("Edit Phase")
      .on("click", () => {
        taskModalStore.openEdit(task);

        menu.remove();
      });

    // // Add menu item - Delete task
    menu
      .append("div")
      .attr("class", "menu-item")
      .style("padding", "8px 12px")
      .style("cursor", "pointer")
      .text("Delete Phase")
      .on("click", () => {
        if (confirm("Are you sure to delete this phase? All tasks & subtasks will be deleted.")) {
          const IDs = taskStore.tasks
            .filter((item) => item.project_name == task.project_name && item.phase == task.phase)
            .map((item) => item.ID);

          IDs.forEach((item) => {
            deleteItem("Tasks", item);
          });

          taskStore.deleteTasks(IDs);
        }
        menu.remove();
      });
  }

  // Add menu item - View Details
  menu
    .append("div")
    .attr("class", "menu-item")
    .style("padding", "8px 12px")
    .style("cursor", "pointer")
    .text("View Details")
    .on("click", () => {
      handleViewDetails(event, d);
      menu.remove();
    });

  menu.style("left", event.pageX + "px").style("top", event.pageY + "px");

  setTimeout(() => {
    d3.select("body").on("click.context-menu", () => {
      menu.remove();
      d3.select("body").on("click.context-menu", null);
    });
  }, 0);
};

// Function to close specific info card
const closeInfoCard = (cardId) => {
  const index = infoCards.value.findIndex((card) => card.id === cardId);
  if (index !== -1) {
    infoCards.value.splice(index, 1);
  }
};

// Function to close all info cards
const closeAllInfoCards = () => {
  infoCards.value = [];
};

// Function to format dates
const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return dateString;
  }
};

// Function to get status class for styling
const getStatusClass = (status) => {
  if (!status) return "";
  const statusLower = status.toLowerCase();
  if (statusLower.includes("completed") || statusLower.includes("done")) return "status-completed";
  if (statusLower.includes("in progress") || statusLower.includes("ongoing")) return "status-progress";
  if (statusLower.includes("pending") || statusLower.includes("waiting")) return "status-pending";
  if (statusLower.includes("blocked") || statusLower.includes("stopped")) return "status-blocked";
  return "status-default";
};

// Transform task data into hierarchical structure for sunburst chart
const transformTaskData = (taskData, projectTitle) => {
  if (!taskData || !projectTitle) {
    return {
      name: "Select a Project",
      children: [],
    };
  }

  const projectTasks = taskData.filter(
    (task) => task.pulled && task.project_name && task.project_name.toLowerCase() === projectTitle.toLowerCase()
  );

  if (projectTasks.length === 0) {
    return {
      name: projectTitle,
      children: [
        {
          name: "No tasks found for this project",
          value: 1,
        },
      ],
    };
  }

  const phaseGroups = {};
  projectTasks.forEach((task) => {
    const phase = task.phase || "Uncategorized";
    if (!phaseGroups[phase]) {
      phaseGroups[phase] = {};
    }

    const taskName = task.task || "Uncategorized";
    if (!phaseGroups[phase][taskName]) {
      phaseGroups[phase][taskName] = [];
    }

    if (task.sub_task) {
      phaseGroups[phase][taskName].push({
        name: task.sub_task,
        value: 1,
        description: task.description || "",
        groups: task.groups || "",
        architecture: task.architecture || "",
        task_progress: task.task_progress || "",
        status: task.status || "",
        assigned_to: task.assigned_to || "",
        start_date: task.start_date || "",
        deadline_date: task.deadline_date || "",
        duration: task.duration || "",
      });
    }
  });

  const children = Object.entries(phaseGroups).map(([phaseName, tasks]) => ({
    name: phaseName,
    children: Object.entries(tasks).map(([taskName, subtasks]) => ({
      name: taskName,
      value: subtasks.length ? 0 : 1,
      children: subtasks,
    })),
  }));

  if (children.length === 0) {
    children.push({
      name: "No phases found",
      children: [{ name: "No tasks found", value: 1 }],
    });
  }

  return {
    name: projectTitle,
    children: children,
  };
};

// Computed property for chart data based on selected project
const chartData = computed(() => {
  if (projectStore.currentProject && taskStore.tasks.length > 0) {
    return transformTaskData(taskStore.tasks, projectStore.currentProjectTitle);
  }
  return {
    name: "Select a Project",
    children: [
      {
        name: "Choose a project from the dropdown above",
        value: 1,
      },
    ],
  };
});

// Function to initialize chart when container is ready
const initializeChart = async () => {
  await nextTick();
  if (chartContainer.value) {
    console.log("Initializing chart with data:", chartData.value);
    createSunburstChart();
    createLegendItems();
  } else {
    console.log("Chart container not ready yet");
  }
};

// Initialize chart when component is mounted
onMounted(() => {
  initializeChart();
});

// Watch for chart container availability
watch(
  () => chartContainer.value,
  (newContainer) => {
    if (newContainer) {
      initializeChart();
    }
  }
);

// Watch for chart data changes
watch(
  () => chartData.value,
  () => {
    initializeChart();
  },
  { deep: true }
);

watch(
  () => [taskStore.tasks],
  () => {
    initializeChart();
  },
  { deep: true }
);

watch(
  () => projectStore.currentProject,
  () => {
    chartHistory.value = [];
    currentRoot.value = null;
    initializeChart();
  },
  { deep: true }
);

function createSunburstChart() {
  // Check if we have valid data to render
  if (!chartData.value || !chartData.value.children || chartData.value.children.length === 0) {
    console.log("No chart data available");
    return;
  }

  const partition = (data) => {
    const root = d3
      .hierarchy(data)
      .sum((d) => d.value)
      .sort((a, b) => b.value - a.value);
    return d3.partition().size([2 * Math.PI, root.height + 1])(root);
  };

  const root = partition(chartData.value);
  currentRoot.value = root;

  root.each((d) => (d.current = d));

  const width = 932;

  const svg = d3
    .create("svg")
    .attr("width", width.value)
    .attr("height", height.value)
    .attr("viewBox", [0, 0, width, width])
    .style("font", "14px sans-serif bold");

  const g = svg.append("g").attr("transform", `translate(${width / 2},${width / 2})`);

  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, chartData.value.children.length + 1));

  const radius = width / 8;

  const arc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius)
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

  const path = g
    .append("g")
    .selectAll("path")
    .data(root.descendants().slice(1))
    .join("path")
    .attr("fill", (d) => getStatusColorForNode(d))
    .attr("fill-opacity", (d) => (arcVisible(d.current) ? (d.children ? 0.8 - d.depth * 0.1 : 0.6 - d.depth * 0.1) : 0))
    .attr("d", (d) => arc(d.current))
    .attr("stroke", (d) => (isSegmentHeld(d) ? "#000" : "none"))
    .attr("stroke-width", (d) => (isSegmentHeld(d) ? 3 : 0))
    .on("contextmenu", function (event, d) {
      event.preventDefault();
      showContextMenu(event, d);
    });

  path
    .filter((d) => d.children)
    .style("cursor", "pointer")
    .on("click", clicked);

  const format = d3.format(",d");

  path.append("title").text(
    (d) =>
      `${d
        .ancestors()
        .map((d) => d.data.name)
        .reverse()
        .join("/")}\n${format(d.value)}`
  );

  const label = g
    .append("g")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .style("user-select", "none")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
    .attr("dy", "0.35em")
    .attr("fill-opacity", (d) => +labelVisible(d.current))
    .attr("transform", (d) => labelTransform(d.current))
    .text((d) => processTitle(d.data.name));

  const centerGroup = g.append("g");

  const parent = centerGroup
    .append("circle")
    .datum(root)
    .attr("r", radius)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("click", clicked);

  const centerText = centerGroup
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text(processTitle(chartData.value.name, 20));

  const undoButton = centerGroup
    .append("g")
    .attr("class", "undo-button")
    .style("opacity", 0)
    .style("cursor", "pointer")
    .on("click", undoZoom);

  undoButton
    .append("circle")
    .attr("r", 25)
    .attr("fill", "rgba(255, 255, 255, 0.9)")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1);

  undoButton.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").style("font-size", "20px").text("↶");

  centerGroup
    .on("mouseenter", function () {
      if (currentRoot.value && currentRoot.value.parent) {
        d3.select(this).select(".undo-button").style("opacity", 1);
      }
    })
    .on("mouseleave", function () {
      d3.select(this).select(".undo-button").style("opacity", 0);
    });

  function clicked(event, p) {
    if (currentRoot.value) {
      chartHistory.value.push(currentRoot.value);
    }

    parent.datum(p.parent || root);
    currentRoot.value = p.parent || root;

    root.each(
      (d) =>
        (d.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth),
        })
    );

    const t = g.transition().duration(750);

    path
      .transition(t)
      .tween("data", (d) => {
        const i = d3.interpolate(d.current, d.target);
        return (t) => (d.current = i(t));
      })
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
      .attr("fill-opacity", (d) =>
        arcVisible(d.target) ? (d.children ? 0.8 - d.depth * 0.1 : 0.6 - d.depth * 0.1) : 0
      )
      .attrTween("d", (d) => () => arc(d.current))
      .attr("stroke", (d) => (isSegmentHeld(d) ? "#000" : "none"))
      .attr("stroke-width", (d) => (isSegmentHeld(d) ? 3 : 0));

    label
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      })
      .transition(t)
      .attr("fill-opacity", (d) => +labelVisible(d.target))
      .attrTween("transform", (d) => () => labelTransform(d.current));
  }

  function undoZoom() {
    if (chartHistory.value.length > 0) {
      const previousRoot = chartHistory.value.pop();
      currentRoot.value = previousRoot;
      parent.datum(previousRoot);

      root.each(
        (d) =>
          (d.target = {
            x0: Math.max(0, Math.min(1, (d.x0 - previousRoot.x0) / (previousRoot.x1 - previousRoot.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - previousRoot.x0) / (previousRoot.x1 - previousRoot.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - previousRoot.depth),
            y1: Math.max(0, d.y1 - previousRoot.depth),
          })
      );

      const t = g.transition().duration(750);

      path
        .transition(t)
        .tween("data", (d) => {
          const i = d3.interpolate(d.current, d.target);
          return (t) => (d.current = i(t));
        })
        .filter(function (d) {
          return +this.getAttribute("fill-opacity") || arcVisible(d.target);
        })
        .attr("fill-opacity", (d) =>
          arcVisible(d.target) ? (d.children ? 0.8 - d.depth * 0.1 : 0.6 - d.depth * 0.1) : 0
        )
        .attrTween("d", (d) => () => arc(d.current))
        .attr("stroke", (d) => (isSegmentHeld(d) ? "#000" : "none"))
        .attr("stroke-width", (d) => (isSegmentHeld(d) ? 3 : 0));

      label
        .filter(function (d) {
          return +this.getAttribute("fill-opacity") || labelVisible(d.target);
        })
        .transition(t)
        .attr("fill-opacity", (d) => +labelVisible(d.target))
        .attrTween("transform", (d) => () => labelTransform(d.current));
    }
  }

  function arcVisible(d) {
    return d.x1 > d.x0;
  }

  function labelVisible(d) {
    return (d.y1 - d.y0) * (d.x1 - d.x0) > 0.01;
  }

  function labelTransform(d) {
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
    const y = ((d.y0 + d.y1) / 2) * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  if (chartContainer.value) {
    // Clear existing content
    chartContainer.value.innerHTML = "";
    // Append new SVG
    chartContainer.value.appendChild(svg.node());
  } else {
    console.warn("Chart container not found");
  }
}

function createLegendItems() {
  const items = [];
  if (chartData.value.children) {
    const colorScale = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, chartData.value.children.length + 1));
    chartData.value.children.forEach((child) => {
      items.push({
        key: child.name,
        name: child.name,
        color: getStatusColor(child.status),
      });
    });
  }
  legendItems.value = items;
}

const getStatusColor = (status) => {
  return projectStore.currentProject?.statusColor[status] || "#666666";
};

defineExpose({
  toggleHold,
  clearHolds,
  heldSegments,
  handleViewDetails,
  closeInfoCard,
  closeAllInfoCards,
  showContextMenu,
  formatDate,
  getStatusClass,
});
</script>

<template>
  <div class="chart-container">
    <div v-if="projectStore.loading || taskStore.loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Loading chart...</p>
    </div>
    <div ref="chartContainer" class="sunburst-chart"></div>

    <div class="legend">
      <div v-for="item in legendItems" :key="item.key" class="legend-item">
        <span class="legend-color" :style="{ backgroundColor: item.color }"></span>
        <span class="legend-label">{{ item.name }}</span>
      </div>
    </div>

    <div v-if="infoCards.length > 0" class="info-cards-overlay" @click="closeAllInfoCards">
      <div
        v-for="card in infoCards"
        :key="card.id"
        class="info-card-container"
        :style="{
          left: (card.position?.x || 0) + 'px',
          top: (card.position?.y || 0) + 'px',
        }"
        @click.stop
      >
        <div class="info-card">
          <div class="info-card-header">
            <h3>{{ card.name }}</h3>
            <button @click="closeInfoCard(card.id)" class="close-btn">×</button>
          </div>
          <div class="info-card-content">
            <div class="info-section"><strong>Project:</strong> {{ card.projectName }}</div>
            <div class="info-section" v-if="card.phase"><strong>Phase:</strong> {{ card.phase }}</div>
            <div class="info-section" v-if="card.task"><strong>Task:</strong> {{ card.task }}</div>

            <!-- Display children for non-leaf nodes -->
            <div v-if="!card.isLeafNode && card.children" class="info-section">
              <strong>Children:</strong>
              <div class="children-list">
                <div v-for="child in card.children" :key="child.name" class="child-item">
                  <div class="child-name">
                    <b>{{ child.name }}</b>
                    <span v-if="child.isHeld" class="held-badge">✓ Held</span>
                  </div>
                  <div class="child-details">
                    <span v-if="child.description" class="child-detail">Description: {{ child.description }}</span>
                    <span v-if="child.status" class="child-detail">
                      <span class="status-badge" :class="getStatusClass(child.status)">{{ child.status }}</span>
                    </span>
                    <span v-if="child.assigned_to" class="child-detail">
                      by <u>{{ child.assigned_to }}</u>
                    </span>
                    <span v-if="child.task_progress" class="child-detail"> Progress: {{ child.task_progress }}% </span>
                    <span v-if="child.start_date" class="child-detail">
                      {{ formatDate(child.start_date) + " ~ " + (child.duration || 1) + " days" }}
                    </span>
                    <span v-if="child.groups" class="child-detail">Groups: {{ child.groups }}</span>
                    <span v-if="child.architecture" class="child-detail">Architecture: {{ child.architecture }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Display node's own information for leaf nodes -->
            <div v-if="card.isLeafNode">
              <div class="info-section" v-if="card.task_progress">
                <strong>Progress:</strong> {{ card.task_progress }}%
              </div>
              <div class="info-section" v-if="card.status">
                <strong>Status:</strong>
                <span class="status-badge" :class="getStatusClass(card.status)">
                  {{ card.status }}
                </span>
              </div>
              <div class="info-section"><strong>Assigned To:</strong> {{ card.assigned_to || "-" }}</div>
              <div class="info-section" v-if="card.start_date">
                <strong>Start Date:</strong> {{ formatDate(card.start_date) }}
              </div>
              <div class="info-section" v-if="card.deadline_date">
                <strong>Deadline Date:</strong> {{ formatDate(card.deadline_date) }}
              </div>
              <div class="info-section" v-if="card.duration"><strong>Duration:</strong> {{ card.duration }} days</div>
              <div class="info-section" v-if="card.isHeld">
                <strong>Hold Status:</strong> <span class="held-status">✓ Held</span>
              </div>
              <div class="info-section">
                <strong>Description:</strong>
                <p v-if="card.description" class="description-text">{{ card.description }}</p>
                <p v-else class="no-info-text">No description available</p>
              </div>
              <div class="info-section">
                <strong>Groups:</strong>
                <p v-if="card.groups" class="groups-text">{{ card.groups }}</p>
                <p v-else class="no-info-text">No groups assigned</p>
              </div>
              <div class="info-section">
                <strong>Architecture:</strong>
                <p v-if="card.architecture" class="architecture-text">{{ card.architecture }}</p>
                <p v-else class="no-info-text">No architecture information available</p>
              </div>
            </div>
          </div>
          <div class="info-card-actions">
            <button @click="closeInfoCard(card.id)" class="close-info-btn">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <AddTask :hideBtn="true" />
</template>

<style scoped>
.chart-container {
  position: relative;
  justify-items: center;
}
.sunburst-chart {
  margin-bottom: 16px;
  width: calc(100vh - 240px);
  position: relative;
}
.sunburst-chart > svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100% !important;
  height: 100% !important;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 16px;
}
.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}
.legend-color {
  width: 16px;
  height: 16px;
  display: inline-block;
  margin-right: 8px;
  border-radius: 3px;
  border: 1px solid #ccc;
}
.legend-label {
  font-size: 14px;
}
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  border-radius: 8px;
  backdrop-filter: blur(2px);
}
.loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}
.loading-overlay p {
  color: #666;
  font-size: 16px;
  margin: 0;
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
.info-cards-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.info-card-container {
  position: absolute;
  z-index: 1001;
  pointer-events: auto;
  max-width: 600px;
  max-height: 80vh;
}
.info-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  border: 1px solid #e9ecef;
}
.context-menu {
  position: absolute;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 150px;
}
.menu-item {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s;
}
.menu-item:hover {
  background-color: #f8f9fa;
}
.menu-item:last-child {
  border-bottom: none;
}
.info-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e9ecef;
}
.info-card-header h3 {
  margin: 0;
  color: #333;
  font-size: 20px;
  font-weight: 600;
}
.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}
.close-btn:hover {
  background-color: #f8f9fa;
  color: #333;
}
.info-card-content {
  padding: 20px 24px;
  max-height: 400px;
  overflow-y: auto;
}
.info-section {
  margin-bottom: 16px;
  line-height: 1.5;
}
.info-section:last-child {
  margin-bottom: 0;
}
.info-section strong {
  color: #333;
  font-weight: 600;
}
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}
.status-completed {
  background-color: #d4edda;
  color: #155724;
}
.status-progress {
  background-color: #fff3cd;
  color: #856404;
}
.status-pending {
  background-color: #f8d7da;
  color: #721c24;
}
.status-blocked {
  background-color: #f5c6cb;
  color: #721c24;
}
.status-default {
  background-color: #e2e3e5;
  color: #383d41;
}
.held-status {
  color: #28a745;
  font-weight: 600;
}
.description-text,
.groups-text,
.architecture-text {
  margin: 8px 0 0 0;
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #007bff;
  font-size: 14px;
  line-height: 1.4;
}
.no-info-text {
  margin: 8px 0 0 0;
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #6c757d;
  font-size: 14px;
  line-height: 1.4;
  color: #6c757d;
  font-style: italic;
}
.info-card-actions {
  padding: 16px 24px 20px;
  border-top: 1px solid #e9ecef;
  text-align: right;
}
.close-info-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}
.close-info-btn:hover {
  background: #0056b3;
}
.children-list {
  margin-top: 8px;
}
.child-item {
  border-bottom: 1px solid #e9ecef;
  padding: 12px 0;
  margin-bottom: 8px;
}
.child-item:last-child {
  border-bottom: none;
}
.child-name {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  color: #333;
}
.held-badge {
  color: #28a745;
  font-weight: 600;
  font-size: 12px;
}
.child-details {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}
.child-detail {
  display: inline-block;
  margin-right: 16px;
  margin-bottom: 4px;
}
</style>
