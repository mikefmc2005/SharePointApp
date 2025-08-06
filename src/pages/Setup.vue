<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useProjectStore } from "../store";
import { addItem } from "../actions/addItem";
import { getItem } from "../actions/getItem";
import { editItem } from "../actions/editItem";
import { deleteItem } from "../actions/deleteItem";
import LoadingSpinner from "../components/LoadingSpinner.vue";

const projectStore = useProjectStore();

const current = ref({
  columns: [],
});
const currentKeyRows = ref([]);

const newItems = ref({});
const showAddInput = ref({});
const confirmDelete = ref(null);

const newProjectName = ref("");
const newKeyCol1 = ref("");
const newKeyCol2 = ref("");
const newStatusColor = ref("#666666");

watch(
  () => [projectStore.currentProject],
  ([project]) => {
    if (project) {
      current.value = {
        ProjectTitle: project.Title,
        columns: Object.keys(project)
          .filter((item) => ["phases", "status", "members", "key_IDs", "years", "months", "note_types"].includes(item))
          .map((item) => {
            return {
              title: item == "key_IDs" ? "KEY" : item == "note_types" ? "NOTE TYPES" : item,
              items: project[item],
            };
          }),
      };
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => [current.value.columns],
  ([source]) => {
    if (source) {
      source.map((item) => {
        newItems[item.title] = "";
        showAddInput[item.title] = false;
      });

      const keyCol = source.find((c) => c.title === "KEY");
      if (!keyCol) return [];
      const fields = ["ID", "key", "value"];

      getItem("Keys", fields).then((res) => {
        currentKeyRows.value = res.filter((item) => (keyCol.items ? keyCol.items : "").indexOf(String(item.ID)) != -1);
      });
    }
  },
  { immediate: true, deep: true }
);

function showAdd(colTitle) {
  showAddInput.value[colTitle] = true;
  newItems.value[colTitle] = "";
  if (colTitle === "KEY") {
    newKeyCol1.value = "";
    newKeyCol2.value = "";
  }
  if (colTitle === "status") {
    newStatusColor.value = "#666666";
  }
}

function cancelAdd(colTitle) {
  showAddInput.value[colTitle] = false;
  newItems.value[colTitle] = "";
  if (colTitle === "KEY") {
    newKeyCol1.value = "";
    newKeyCol2.value = "";
  }
  if (colTitle === "status") {
    newStatusColor.value = "#666666";
  }
}

function addElement(colTitle) {
  const value = newItems.value[colTitle]?.trim();
  if (value) {
    const keyName = colTitle == "KEY" ? "key_IDs" : colTitle == "NOTE TYPES" ? "note_types" : colTitle;

    let finalValue = value;

    let currentValue = projectStore.currentProject[keyName] ? projectStore.currentProject[keyName] : [];

    if (colTitle === "status") {
      finalValue = { name: value, color: newStatusColor.value };
    }

    currentValue.push(finalValue);

    let valueName = currentValue.join(",");

    if (colTitle === "status") {
      valueName = currentValue
        .map((item) => {
          return item.name + item.color;
        })
        .join(",");
    }

    projectStore.setLoading(true);
    editItem("Projects", projectStore.currentProject.ID, { [keyName]: valueName })
      .then((res) => {
        projectStore.editProject({
          ID: projectStore.currentProject.ID,
          [keyName]: currentValue,
        });
        newItems.value[colTitle] = "";
        showAddInput.value[colTitle] = false;
        if (colTitle === "status") {
          newStatusColor.value = "#666666";
        }
      })
      .finally(() => {
        projectStore.setLoading(false);
      });
  }
}

function addKeyRow() {
  const keyCol = current.value.columns.find((c) => c.title === "KEY");
  if (!keyCol) return;
  const val1 = newKeyCol1.value.trim();
  const val2 = newKeyCol2.value.trim();
  projectStore.setLoading(true);
  addItem("Keys", { key: val1, value: val2 })
    .then((res) => {
      const currentValue = projectStore.currentProject["key_IDs"];
      const parts = typeof currentValue === "string" ? currentValue.split(",") : [];
      parts.push(res.ID);
      const valueName = parts.join(",");

      editItem("Projects", projectStore.currentProject.ID, { key_IDs: valueName })
        .then(() => {
          projectStore.editProject({
            ID: projectStore.currentProject.ID,
            key_IDs: valueName,
          });

          currentKeyRows.value.push({
            ID: res.ID,
            key: val1,
            value: val2,
          });

          newKeyCol1.value = "";
          newKeyCol2.value = "";
          showAddInput.value["KEY"] = false;
        })
        .finally(() => {
          projectStore.setLoading(false);
        });
    })
    .catch(() => {
      projectStore.setLoading(false);
    });
}

function showDeleteConfirm(colTitle, itemIdx) {
  confirmDelete.value = { col: colTitle, idx: itemIdx };
}

function confirmDeleteItem(colTitle, itemIdx) {
  const keyName = colTitle == "KEY" ? "key_IDs" : colTitle == "NOTE TYPES" ? "note_types" : colTitle;
  const currentValue = projectStore.currentProject[keyName];

  currentValue.splice(itemIdx, 1);
  let valueName = currentValue.join(",");

  if (colTitle === "status") {
    valueName = currentValue
      .map((item) => {
        return item.name + item.color;
      })
      .join(",");
  }

  projectStore.setLoading(true);

  editItem("Projects", projectStore.currentProject.ID, { [keyName]: valueName })
    .then((res) => {
      projectStore.editProject({
        ID: projectStore.currentProject.ID,
        [keyName]: currentValue,
      });
      confirmDelete.value = null;
    })
    .finally(() => {
      projectStore.setLoading(false);
    });
}

function confirmDeleteKeyRow(rowIdx) {
  const keyColObj = current.value.columns.find((c) => c.title === "KEY");
  if (!keyColObj) return;

  projectStore.setLoading(true);
  deleteItem("Keys", keyColObj.items.split(",")[rowIdx])
    .then((res) => {
      const currentValue = projectStore.currentProject["key_IDs"];
      const parts = typeof currentValue == "string" ? currentValue.split(",") : [];
      parts.splice(rowIdx, 1);
      const valueName = parts.join(",");

      editItem("Projects", projectStore.currentProject.ID, { key_IDs: valueName })
        .then((res) => {
          projectStore.editProject({
            ID: projectStore.currentProject.ID,
            key_IDs: valueName,
          });
          confirmDelete.value = null;
        })
        .finally(() => {
          projectStore.setLoading(false);
        });
    })
    .catch(() => {
      projectStore.setLoading(false);
    });
}

function cancelDelete() {
  confirmDelete.value = null;
}

function handleClickOutside(event) {
  if (
    !event.target.closest(".delete-area") &&
    !event.target.closest(".add-item") &&
    !event.target.closest(".add-key-row")
  ) {
    confirmDelete.value = null;
  }
}

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
});
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});

function updateStatusColor(itemIdx, newColor) {
  const currentValue = projectStore.currentProject["status"];

  console.log(currentValue);

  const newItemValue = { name: currentValue[itemIdx].name, color: newColor };
  currentValue[itemIdx] = newItemValue;
  const valueName = currentValue
    .map((item) => {
      return item.name + item.color;
    })
    .join(",");

  projectStore.setLoading(true);
  editItem("Projects", projectStore.currentProject.ID, { status: valueName })
    .then((res) => {
      projectStore.editProject({
        ID: projectStore.currentProject.ID,
        status: currentValue,
      });
    })
    .finally(() => {
      projectStore.setLoading(false);
    });
}
</script>

<template>
  <LoadingSpinner :showing="projectStore.loading" text="Loading...">
    <div class="setup-dashboard">
      <div v-for="(column, colIdx) in current.columns" :key="colIdx" class="dashboard-column" ref="dashboardColumns">
        <div class="dashboard-header">{{ column.title }}</div>
        <ul v-if="column.title !== 'KEY'" class="dashboard-list">
          <li v-for="(item, i) in column.items" :key="i" class="dashboard-list-item">
            <span v-if="column.title !== 'status'">{{ item }}</span>
            <div v-else class="status-item-container">
              <input
                :value="item.color"
                @change="updateStatusColor(i, $event.target.value)"
                class="status-color-picker"
                type="color"
                title="Change color"
              />
              <q-badge :style="{ backgroundColor: item.color }" class="status-badge">
                {{ item.name }}
              </q-badge>
            </div>
            <div class="delete-area">
              <template v-if="confirmDelete && confirmDelete.col === column.title && confirmDelete.idx === i">
                <span class="popconfirm">
                  <span class="popconfirm-text">Are you sure?</span>
                  <span class="popconfirm-btn-row">
                    <button class="popconfirm-btn yes" @click="confirmDeleteItem(column.title, i)">Yes</button>
                    <button class="popconfirm-btn no" @click="cancelDelete">No</button>
                  </span>
                </span>
              </template>
              <template v-else>
                <button class="delete-btn" @click="showDeleteConfirm(column.title, i)" title="Delete">❌</button>
              </template>
            </div>
          </li>
          <li v-if="showAddInput[column.title]" class="dashboard-list-item add-item">
            <div class="add-input-container">
              <div v-if="column.title === 'status'" class="status-input-row">
                <input
                  v-model="newItems[column.title]"
                  @keyup.enter="addElement(column.title)"
                  class="inline-add-input status-text-input"
                  type="text"
                  placeholder="Status name"
                  autofocus
                />
                <input v-model="newStatusColor" class="inline-color-input" type="color" title="Choose color" />
              </div>
              <input
                v-else
                v-model="newItems[column.title]"
                @keyup.enter="addElement(column.title)"
                class="inline-add-input"
                type="text"
                :placeholder="'Add new ' + column.title.slice(0, -1)"
                autofocus
              />
              <div class="inline-buttons">
                <button class="inline-confirm-btn" @click="addElement(column.title)">Add</button>
                <button class="inline-cancel-btn" @click="cancelAdd(column.title)">Cancel</button>
              </div>
            </div>
          </li>
        </ul>
        <div v-else class="dashboard-list key-list">
          <div v-for="(row, rowIdx) in currentKeyRows" :key="'row-' + rowIdx" class="key-row">
            <div class="key-col">
              <div class="key-item">
                <span>{{ row.key || "" }}</span>
              </div>
            </div>
            <div class="key-col">
              <div class="key-item">
                <span>{{ row.value || "" }}</span>
              </div>
            </div>
            <div class="delete-area">
              <template v-if="confirmDelete && confirmDelete.col === column.title && confirmDelete.idx === rowIdx">
                <span class="popconfirm">
                  <span class="popconfirm-text">Are you sure?</span>
                  <span class="popconfirm-btn-row">
                    <button class="popconfirm-btn yes" @click="confirmDeleteKeyRow(rowIdx)">Yes</button>
                    <button class="popconfirm-btn no" @click="cancelDelete">No</button>
                  </span>
                </span>
              </template>
              <template v-else>
                <button class="delete-btn" @click="showDeleteConfirm(column.title, rowIdx)" title="Delete">❌</button>
              </template>
            </div>
          </div>
          <div v-if="showAddInput[column.title]" class="dashboard-list-item">
            <div class="add-input-container">
              <div class="key-col">
                <input
                  v-model="newKeyCol1"
                  @keyup.enter="addKeyRow"
                  class="inline-add-input"
                  type="text"
                  placeholder="Input key"
                  autofocus
                />
              </div>
              <div class="key-col">
                <input
                  v-model="newKeyCol2"
                  @keyup.enter="addKeyRow"
                  class="inline-add-input"
                  type="text"
                  placeholder="Input value"
                />
              </div>
              <div class="inline-buttons">
                <button class="inline-confirm-btn" @click="addKeyRow">Add</button>
                <button class="inline-cancel-btn" @click="cancelAdd(column.title)">Cancel</button>
              </div>
            </div>
          </div>
        </div>
        <div class="add-item-row">
          <template v-if="!showAddInput[column.title]">
            <button class="show-add-btn" @click="showAdd(column.title)">+ Add</button>
          </template>
        </div>
      </div>
    </div>
  </LoadingSpinner>
</template>

<style lang="scss" scoped>
.setup-dashboard {
  display: flex;
  height: calc(100vh - 100px);
  overflow: auto;
  padding: 0 3rem 2rem;
  text-wrap-mode: nowrap;
}
.dashboard-column {
  background: #fff;
  border-radius: 0 0 1.2rem 1.2rem;
  box-shadow: 0 2px 10px 0 rgba(80, 112, 255, 0.1), 0 1.5px 4px 0 rgba(0, 0, 0, 0.04);
  padding: 1.5rem 1rem;
  border: 1.5px solid #e0e7ff;
  overflow-y: auto;
  min-width: 190px;
  margin: 0 1rem;
}
.dashboard-header {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: #4f46e5;
  margin-bottom: 0.8rem;
  text-align: center;
  text-transform: uppercase;
  border-bottom: 2px solid #e0e7ff;
  padding-bottom: 0.5rem;
}
.dashboard-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.dashboard-list-item {
  font-size: 0.8rem;
  color: #334155;
  padding: 0.45rem 0.2rem;
  border-bottom: 1px dashed #e5e7eb;
  text-align: center;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.dashboard-list-item:last-child {
  border-bottom: none;
}
.dashboard-list-item:hover {
  background: #f1f5f9;
}
.delete-area {
  position: relative;
  display: flex;
  align-items: center;
}
.delete-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 1rem;
  cursor: pointer;
  padding: 0 0.3rem;
  border-radius: 50%;
  line-height: 1;
}
.popconfirm {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: #fff;
  border: 1px solid #e0e7ff;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px 0 rgba(80, 112, 255, 0.1);
  padding: 0.3rem 0.7rem;
  font-size: 0.7rem;
  color: #334155;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  min-width: 110px;
}
.popconfirm-text {
  margin-bottom: 0.2rem;
  text-align: center;
  font-size: 0.7rem;
}
.popconfirm-btn-row {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}
.popconfirm-btn {
  background: none;
  border: none;
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 0.3rem;
  padding: 0.15rem 0.5rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.popconfirm-btn.yes {
  color: #fff;
  background: #4f46e5;
}
.popconfirm-btn.yes:hover {
  background: #6366f1;
}
.popconfirm-btn.no {
  color: #64748b;
  background: #f1f5f9;
}
.popconfirm-btn.no:hover {
  background: #e0e7ff;
  color: #334155;
}
.add-item-row {
  display: flex;
  gap: 0.4rem;
  margin-top: 1.1rem;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
}
.add-input-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}
.inline-add-input {
  width: 100%;
  padding: 0.35rem 0.6rem;
  border: 1px solid #c7d2fe;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  outline: none;
  transition: border 0.2s;
  box-sizing: border-box;
}
.inline-add-input:focus {
  border-color: #6366f1;
}
.inline-buttons {
  display: flex;
  gap: 0.3rem;
  justify-content: center;
}
.inline-confirm-btn {
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 0.3rem;
  padding: 0.2rem 0.4rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  margin-right: 5px;
}
.inline-confirm-btn:hover {
  background: #059669;
}
.inline-cancel-btn {
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 0.3rem;
  padding: 0.2rem 0.4rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.inline-cancel-btn:hover {
  background: #dc2626;
}
.show-add-btn {
  background: none;
  border: none;
  color: #6366f1;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 0.5rem;
  padding: 0.35rem 0.9rem;
  transition: background 0.2s, color 0.2s;
}
.show-add-btn:hover {
  background: #eef2ff;
  color: #4338ca;
}
/* KEY card two-column layout */
.key-list {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.5rem;
}
.key-row {
  display: flex;
  border-bottom: 1px dashed #e5e7eb;
}
.key-col {
  flex: 1;
  overflow: hidden;
}
.key-item {
  font-size: 0.8rem;
  color: #334155;
  padding: 0.25rem 0.2rem;
  border-bottom: 1px dashed #e5e7eb;
  text-align: left;
  align-items: center;
}
.key-item:last-child {
  border-bottom: none;
}
.status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  display: inline-block;
  min-width: 60px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.add-key-row {
  border: 1px dashed #c7d2fe;
  border-radius: 0.5rem;
  padding: 0.5rem;
  background: #f8fafc;
}
.status-input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.status-text-input {
  flex: 1;
  padding: 0.35rem 0.6rem;
  border: 1px solid #c7d2fe;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  outline: none;
  transition: border 0.2s;
  box-sizing: border-box;
}
.status-text-input:focus {
  border-color: #6366f1;
}
.inline-color-input {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid #c7d2fe;
  padding: 0;
  cursor: pointer;
  transition: border 0.2s;
}
.inline-color-input:focus {
  border-color: #6366f1;
}
.status-item-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.status-color-picker {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #c7d2fe;
  padding: 0;
  cursor: pointer;
  transition: border 0.2s;
  background: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}
.status-color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
  border-radius: 50%;
  overflow: hidden;
}
.status-color-picker::-webkit-color-swatch {
  border: none;
  border-radius: 50%;
  width: 100%;
  height: 100%;
}
.status-color-picker::-moz-color-swatch {
  border: none;
  border-radius: 50%;
  width: 100%;
  height: 100%;
}
.status-color-picker:focus {
  border-color: #6366f1;
  outline: none;
}
</style>
