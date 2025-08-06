<template>
  <div class="quick-access-panel">
    <div class="quick-access-header">
      <span>QUICK ACCESS</span>
    </div>
    <div class="row quick-access-buttons items-center q-col-gutter-md">
      <div class="col">
        <router-link to="/timeline">
          <q-btn round color="primary" icon="timeline" />
        </router-link>
        <div class="quick-access-label">Timeline</div>
      </div>
      <div class="col-3">
        <router-link to="/dailytasks">
          <q-btn round color="primary" icon="checklist" />
        </router-link>
        <div class="quick-access-label">Daily Tasks</div>
      </div>
      <div class="col">
        <router-link to="/list">
          <q-btn round color="primary" icon="group" />
        </router-link>
        <div class="quick-access-label">Task List</div>
      </div>
      <div class="col">
        <router-link to="/schedule">
          <q-btn round color="primary" icon="event" />
        </router-link>
        <div class="quick-access-label">Schedule</div>
      </div>
      <div class="col">
        <router-link to="/notes">
          <q-btn round color="primary" icon="description" />
        </router-link>
        <div class="quick-access-label">Notes</div>
      </div>
    </div>
    <div class="today-date">
      <span>TODAY'S DATE</span>
      <span class="date-value">{{ today }}</span>
    </div>
    <div class="section-title">
      <span>ANNOUNCEMENTS</span>
      <q-btn round size="sm" color="primary" icon="add" @click="showAddModal = true" class="add-announcement-btn" />
    </div>
    <q-table
      :columns="announcementColumns"
      :rows="announcementData"
      dense
      bordered
      flat
      :pagination="{ rowsPerPage: 10 }"
      @row-click="showAnnouncementDetails"
    />
    <div class="section-title">NEEDS URGENT ATTENTION</div>
    <q-table
      :columns="urgentColumns"
      :rows="urgentData"
      dense
      bordered
      flat
      :pagination="{ rowsPerPage: 10 }"
      @row-click="showAnnouncementDetails"
    />
  </div>

  <!-- Add Announcement Modal -->
  <q-dialog v-model="showAddModal" persistent>
    <q-card style="width: 640px" class="relative">
      <div
        v-if="isAddingAnnouncement"
        class="absolute-full bg-white bg-opacity-75 flex items-center justify-center z-10"
      >
        <div class="text-center">
          <q-spinner-dots color="primary" size="50px" />
          <div class="text-body2 q-mt-sm">Adding announcement...</div>
        </div>
      </div>
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Add New Announcement</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form @submit="addAnnouncement" class="q-gutter-md">
          <q-input
            v-model="newAnnouncement.Title"
            label="Title"
            outlined
            dense
            :disable="isAddingAnnouncement"
            :rules="[(val) => !!val || 'Title is required']"
          />
          <q-editor v-model="newAnnouncement.content" min-height="10rem" :disable="isAddingAnnouncement" />

          <div class="row" style="height: 30px">
            <div :class="newAnnouncement.isUrgent ? 'col-md-4' : 'col-md-12'">
              <q-checkbox
                v-model="newAnnouncement.isUrgent"
                label="Mark as urgent"
                color="red"
                :disable="isAddingAnnouncement"
              />
            </div>
            <div class="col-md-8" v-if="newAnnouncement.isUrgent">
              <q-input
                v-model="newAnnouncement.deadline_date"
                label="Deadline Date"
                outlined
                dense
                readonly
                :disable="isAddingAnnouncement"
                :rules="[
                  (val) => !newAnnouncement.isUrgent || !!val || 'Deadline is required for urgent announcements',
                ]"
              >
                <template v-slot:append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="newAnnouncement.deadline_date" mask="YYYY-MM-DD" />
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
          </div>

          <div class="row justify-end q-gutter-sm">
            <q-btn label="Cancel" color="grey" v-close-popup :disable="isAddingAnnouncement" />
            <q-btn
              label="Add Announcement"
              type="submit"
              color="primary"
              :loading="isAddingAnnouncement"
              :disable="isAddingAnnouncement"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>

  <!-- Announcement Details Modal -->
  <q-dialog v-model="showDetailsModal" persistent>
    <q-card style="width: 640px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          Announcement Details
          <q-badge v-if="selectedAnnouncement?.deadline_date" color="red" class="q-ml-sm" label="URGENT" />
          <b class="text-red q-ml-sm">{{ selectedAnnouncement?.deadline_date }}</b>
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <div>
          <div class="row q-col-gutter-md">
            <div class="col-12">
              <i>Title :</i>
              <p>
                <b>{{ selectedAnnouncement?.Title || "No title" }}</b>
              </p>
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-6">
              <i>Posted Date :</i>
              <p>
                <b>{{ selectedAnnouncement?.posted_date || "N/A" }}</b>
              </p>
            </div>
            <div class="col-6">
              <i>Posted By :</i>
              <p>
                <b>{{ selectedAnnouncement?.posted_by || "N/A" }}</b>
              </p>
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12">
              <i>Content :</i>
              <div
                class="text-body1 q-mt-xs q-pa-md bg-grey-1 rounded-borders"
                v-html="selectedAnnouncement?.content || 'No content available'"
              ></div>
            </div>
          </div>
          <div class="text-right q-pt-md q-gutter-md">
            <q-btn label="Delete" icon="delete" size="sm" color="red" @click="deleteAnnouncement" />
            <q-btn label="Edit" icon="edit" size="sm" color="primary" @click="openEditModal" />
          </div>
          <!-- Edit Announcement Modal -->
          <q-dialog v-model="showEditModal" persistent>
            <q-card style="width: 640px" class="relative">
              <div
                v-if="isEditingAnnouncement"
                class="absolute-full bg-white bg-opacity-75 flex items-center justify-center z-10"
              >
                <div class="text-center">
                  <q-spinner-dots color="primary" size="50px" />
                  <div class="text-body2 q-mt-sm">Updating announcement...</div>
                </div>
              </div>
              <q-card-section class="row items-center q-pb-none">
                <div class="text-h6">Edit Announcement</div>
                <q-space />
                <q-btn icon="close" flat round dense v-close-popup />
              </q-card-section>

              <q-card-section>
                <q-form @submit="editAnnouncement" class="q-gutter-md">
                  <q-input
                    v-model="editAnnouncementData.Title"
                    label="Title"
                    outlined
                    dense
                    :disable="isEditingAnnouncement"
                    :rules="[(val) => !!val || 'Title is required']"
                  />
                  <q-editor
                    v-model="editAnnouncementData.content"
                    min-height="10rem"
                    :disable="isEditingAnnouncement"
                  />

                  <div class="row" style="height: 30px">
                    <div :class="editAnnouncementData.isUrgent ? 'col-md-4' : 'col-md-12'">
                      <q-checkbox
                        v-model="editAnnouncementData.isUrgent"
                        label="Mark as urgent"
                        color="red"
                        :disable="isEditingAnnouncement"
                      />
                    </div>
                    <div class="col-md-8" v-if="editAnnouncementData.isUrgent">
                      <q-input
                        v-model="editAnnouncementData.deadline_date"
                        label="Deadline Date"
                        outlined
                        dense
                        readonly
                        :disable="isEditingAnnouncement"
                        :rules="[
                          (val) =>
                            !editAnnouncementData.isUrgent || !!val || 'Deadline is required for urgent announcements',
                        ]"
                      >
                        <template v-slot:append>
                          <q-icon name="event" class="cursor-pointer">
                            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                              <q-date v-model="editAnnouncementData.deadline_date" mask="YYYY-MM-DD" />
                            </q-popup-proxy>
                          </q-icon>
                        </template>
                      </q-input>
                    </div>
                  </div>

                  <div class="text-right q-gutter-sm">
                    <q-btn label="Cancel" color="grey" v-close-popup :disable="isEditingAnnouncement" />
                    <q-btn
                      label="Save Changes"
                      type="submit"
                      color="primary"
                      :loading="isEditingAnnouncement"
                      :disable="isEditingAnnouncement"
                    />
                  </div>
                </q-form>
              </q-card-section>
            </q-card>
          </q-dialog>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useAnnouncementsStore, useProjectStore, useUserStore } from "../../store";
import { addItem } from "../../actions/addItem";
import { editItem } from "../../actions/editItem";
import { deleteItem } from "../../actions/deleteItem";
// Edit modal state
const showEditModal = ref(false);
const isEditingAnnouncement = ref(false);
const editAnnouncementData = ref({
  ID: null,
  Title: "",
  content: "",
  isUrgent: false,
  deadline_date: "",
});

// Open edit modal and populate data
function openEditModal() {
  if (!selectedAnnouncement.value) return;
  editAnnouncementData.value = {
    ID: selectedAnnouncement.value.ID,
    Title: selectedAnnouncement.value.Title,
    content: selectedAnnouncement.value.content,
    isUrgent: !!selectedAnnouncement.value.deadline_date,
    deadline_date: selectedAnnouncement.value.deadline_date || "",
  };
  showEditModal.value = true;
}

// Edit announcement logic
async function editAnnouncement() {
  try {
    isEditingAnnouncement.value = true;
    const updatedData = {
      Title: editAnnouncementData.value.Title,
      content: editAnnouncementData.value.content,
      deadline_date: editAnnouncementData.value.isUrgent ? editAnnouncementData.value.deadline_date : "",
    };
    // Call editItem action (assumes editItem(listName, id, data))
    await editItem("Announcements", editAnnouncementData.value.ID, updatedData);
    // Update store
    announcementsStore.editAnnouncement({
      ...selectedAnnouncement.value,
      ...updatedData,
    });
    // Update selectedAnnouncement
    selectedAnnouncement.value = {
      ...selectedAnnouncement.value,
      ...updatedData,
    };
    showEditModal.value = false;
  } catch (error) {
    console.error("Error editing announcement:", error);
  } finally {
    isEditingAnnouncement.value = false;
  }
}

// Reset edit form when modal closes
watch(showEditModal, (val) => {
  if (!val) {
    editAnnouncementData.value = {
      ID: null,
      Title: "",
      content: "",
      isUrgent: false,
      deadline_date: "",
    };
  }
});

// Delete announcement logic
async function deleteAnnouncement() {
  if (!selectedAnnouncement.value.ID) return;
  if (!confirm("Are you sure you want to delete this announcement?")) return;
  try {
    isEditingAnnouncement.value = true;
    await deleteItem("Announcements", selectedAnnouncement.value.ID);
    announcementsStore.deleteAnnouncement(selectedAnnouncement.value.ID);
    showEditModal.value = false;
    showDetailsModal.value = false;
  } catch (error) {
    console.error("Error deleting announcement:", error);
  } finally {
    isEditingAnnouncement.value = false;
  }
}

const userStore = useUserStore();
const projectStore = useProjectStore();
const announcementsStore = useAnnouncementsStore();

const today = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const announcementColumns = [
  { name: "posted_date", label: "Posted Date", field: "posted_date", align: "left" },
  { name: "posted_by", label: "Posted by", field: "posted_by", align: "left" },
  { name: "Title", label: "Title", field: "Title", align: "left" },
];

function shortenName(fullName) {
  const [firstName, lastName] = fullName.trim().split(" ");
  return `${firstName} ${lastName?.charAt(0) || ""}`;
}

const announcementData = computed(() => {
  const processedData = announcementsStore.announcements
    .filter((item) => item.project_name == projectStore.currentProjectTitle)
    .map((item) => ({
      ...item,
      posted_by: shortenName(item.posted_by),
      Title: processTitle(item.Title),
    }));

  return addBlankRows(processedData);
});

const urgentColumns = [
  { name: "deadline_date", label: "Deadline Date", field: "deadline_date", align: "left" },
  { name: "posted_by", label: "Posted by", field: "posted_by", align: "left" },
  { name: "Title", label: "Title", field: "Title", align: "left" },
];

// Helper function to remove HTML tags and limit text
const processTitle = (Title) => {
  if (!Title) return "";
  // Remove HTML tags
  const textTitle = Title.replace(/<[^>]*>/g, "");
  // Limit to 10 characters
  return textTitle.length > 15 ? textTitle.substring(0, 15) + "..." : textTitle;
};

// Helper function to add blank rows
const addBlankRows = (data, maxRows = 10) => {
  const blankRows = [];
  const remainingRows = maxRows - data.length;

  for (let i = 0; i < remainingRows; i++) {
    blankRows.push({
      posted_date: "",
      posted_by: "",
      Title: "",
      deadline_date: "",
    });
  }

  return [...data, ...blankRows];
};

const urgentData = computed(() => {
  const today = new Date().toISOString().slice(0, 10);
  const filteredData = announcementsStore.announcements
    .filter(
      (announcement) =>
        announcement.deadline_date && announcement.deadline_date.trim() !== "" && announcement.deadline_date >= today
    )
    .sort((a, b) => (a.deadline_date > b.deadline_date ? 1 : -1))
    .map((item) => ({
      ...item,
      posted_by: shortenName(item.posted_by),
      Title: processTitle(item.Title),
    }));

  return addBlankRows(filteredData);
});

// Modal and form data
const showAddModal = ref(false);
const showDetailsModal = ref(false);
const selectedAnnouncement = ref(null);
const isAddingAnnouncement = ref(false);
const newAnnouncement = ref({
  Title: "",
  content: "",
  isUrgent: false,
  deadline_date: "",
});

// Reset form when modal is closed
const resetForm = () => {
  newAnnouncement.value = {
    Title: "",
    content: "",
    isUrgent: false,
    deadline_date: "",
  };
};

// Show announcement details
const showAnnouncementDetails = (evt, row) => {
  if (row.ID) {
    selectedAnnouncement.value = announcementsStore.announcements.find((item) => item.ID === row.ID) || row;
    showDetailsModal.value = true;
  }
};

// Add new announcement
const addAnnouncement = async () => {
  try {
    isAddingAnnouncement.value = true;

    const announcementData = {
      project_name: projectStore.currentProjectTitle,
      Title: newAnnouncement.value.Title,
      content: newAnnouncement.value.content,
      posted_date: new Date().toISOString().slice(0, 10),
      posted_by: userStore.currentUser.Title,
      deadline_date: newAnnouncement.value.isUrgent ? newAnnouncement.value.deadline_date : "",
    };

    const res = await addItem("Announcements", announcementData);

    // Add to announcements store
    announcementsStore.addAnnouncement({
      ...announcementData,
      ID: res.ID,
    });

    // Reset form and close modal
    resetForm();
    showAddModal.value = false;
  } catch (error) {
    console.error("Error adding announcement:", error);
  } finally {
    isAddingAnnouncement.value = false;
  }
};

// Watch for modal close to reset form
watch(showAddModal, (newValue) => {
  if (!newValue) {
    resetForm();
  }
});

// Watch for details modal close to reset selected announcement
watch(showDetailsModal, (newValue) => {
  if (!newValue) {
    selectedAnnouncement.value = null;
  }
});
</script>

<style scoped>
.quick-access-panel {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.quick-access-header {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 12px;
  text-align: center;
  letter-spacing: 1px;
}
.quick-access-buttons {
  margin-bottom: 16px;
  text-align: center;
}
.quick-access-label {
  font-size: 11px;
  margin-top: 4px;
  color: #555;
  text-wrap-mode: nowrap;
}
.today-date {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin: 12px 0 16px 0;
  font-weight: 500;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  margin: 18px 0 6px 0;
  color: #2a3b4d;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.add-announcement-btn {
  margin-left: 8px;
}
</style>
