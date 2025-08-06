<script setup>
import StatusBreakdoesnCard from "./StatusBreakdoesnCard.vue";
import MemberWorkloadCard from "./MemberWorkloadCard.vue";
import ProjectProgressCard from "./ProjectProgressCard.vue";
import ProjectTimelineCard from "./ProjectTimelineCard.vue";
import SunburstCard from "./SunburstCard.vue";
</script>

<template>
  <div class="overview-section">
    <div class="row q-col-gutter-md">
      <div class="col-md-12">
        <q-card flat bordered>
          <q-card-section>
            <SunburstCard />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <StatusBreakdoesnCard />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <MemberWorkloadCard />
          </q-card-section>
        </q-card>
      </div>
    </div>
    <div class="row q-col-gutter-md q-mt-md">
      <div class="col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <ProjectProgressCard />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <ProjectTimelineCard />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-section {
  margin-bottom: 32px;
}
.overview-header {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.fantastic-member-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 13px;
}
.fantastic-member-item {
  display: flex;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}
.fantastic-checkbox-label {
  display: flex;
  align-items: center;
  width: 100%;
  cursor: pointer;
}
.fantastic-checkbox {
  display: none;
}
.fantastic-custom-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid #bfc7d1;
  background: #fff;
  margin-right: 10px;
  position: relative;
  transition: border 0.15s;
}
.fantastic-checkbox:checked + .fantastic-custom-checkbox {
  background: #409eff;
  border-color: #409eff;
}
.fantastic-checkbox:checked + .fantastic-custom-checkbox::after {
  content: "";
  position: absolute;
  left: 4px;
  top: 1.5px;
  width: 5px;
  height: 9px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.fantastic-member-name {
  flex: 1;
  font-weight: 400;
  color: #222;
  letter-spacing: 0.2px;
}
.fantastic-select-all {
  background: #f5f7fa;
  border: 1px solid #bfc7d1;
  color: #409eff;
  font-weight: 500;
  border-radius: 4px;
  padding: 4px 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.15s, border 0.15s;
}
.fantastic-select-all:hover {
  background: #e6f0fa;
  border-color: #409eff;
}
</style>
