<template>
  <main class="app" @mousedown.capture="focusedKey = ''">
    <header class="header">
      <b class="logo">XJTU</b>
      <div>
        <h1>
          {{
            lang === "zh" ? "XJTU研究生课程规划助手" : "XJTU SCHEDULING HELPER"
          }}
        </h1>
      </div>
      <div class="history-actions">
        <button
          class="history-button"
          :disabled="historyIndex <= 0"
          :title="lang === 'zh' ? '撤销一步' : 'Undo'"
          @click="undo"
        >
          ↶
        </button>
        <button
          class="history-button"
          :disabled="historyIndex >= history.length - 1"
          :title="lang === 'zh' ? '恢复一步' : 'Redo'"
          @click="restoreHistory"
        >
          ↷
        </button>
      </div>
      <div class="header-links">
        <a href="https://gs.xjtu.edu.cn/" target="_blank" rel="noopener">{{
          t("graduateSchool")
        }}</a>
        <a
          href="https://gmis.xjtu.edu.cn/pyxx/"
          target="_blank"
          rel="noopener"
          >{{ t("academicSystem") }}</a
        >
        <button
          class="language-button"
          :title="t('switchLanguage')"
          @click="toggleLanguage"
        >
          🌐 {{ lang === "zh" ? "EN" : "中" }}
        </button>
      </div>
      <button class="redo" @click="redo">↻ {{ t("reset") }}</button>
    </header>
    <div class="week-layout">
      <section class="weekbar">
        <button
          class="my-schedule-button"
          :class="{ active: scheduleView === 'mine' }"
          @click="scheduleView = scheduleView === 'mine' ? 'week' : 'mine'"
        >
          {{ t("mySchedule") }}
        </button>
        <strong>{{ weekLabel(scheduleView === "mine" ? 0 : week) }}</strong
        ><input
          v-model.number="week"
          :disabled="scheduleView === 'mine'"
          min="1"
          max="18"
          type="range"
        />
      </section>
      <div class="import-actions">
        <button class="import-catalog-button" @click="openCatalogImport">
          {{ lang === "zh" ? "导入课程目录" : "Import Course" }}
        </button>
        <button class="import-plan-button" @click="startPlanImport">
          {{ t("importPlan") }}
        </button>
        <button class="export-schedule-button" @click="exportSchedule">
          {{ lang === "zh" ? "导出为…" : "Export…" }}
        </button>
      </div>
    </div>
    <div class="layout">
      <section class="card schedule">
        <div class="heading">
          <h2>
            {{
              scheduleView === "mine" ? t("mySchedule") : t("weeklySchedule")
            }}
          </h2>
          <small>{{
            scheduleView === "mine" ? t("allScheduled") : t("clickToPlan")
          }}</small>
          <button
            class="schedule-mode-button"
            @click="toggleScheduleLayout"
          >
            {{ (scheduleView === "mine" ? mineLayout : weekLayout) === "list" ? t("compactView") : t("normalView") }}
          </button>
        </div>
        <table v-if="scheduleView === 'week' && weekLayout === 'list'">
          <thead>
            <tr>
              <th>{{ t("period") }}</th>
              <th v-for="day in days" :key="day">{{ day }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="period in 11"
              :key="period"
              :class="{ split: period === 5 || period === 9 }"
            >
              <th>{{ period }}</th>
              <td v-for="day in 7" :key="day">
                <button
                  v-for="course in classesAt(day, period)"
                  :key="course.key"
                  class="course-card"
                  :class="{
                    ghost:
                      hoveredKey === course.key &&
                      !activeKeys.includes(course.key),
                  }"
                  :style="{ backgroundColor: course.color }"
                  @click="focusPlan(course.key)"
                  @mouseenter="tooltip = { course, day, period }"
                  @mouseleave="tooltip = null"
                >
                  <b>{{ course.name }}</b
                  ><span>{{ course.className }} {{ course.teacher }}</span
                  ><span
                    v-if="
                      tooltip &&
                      tooltip.course.key === course.key &&
                      tooltip.day === day &&
                      tooltip.period === period
                    "
                    class="tooltip"
                    ><strong>{{ course.id }} {{ course.name }}</strong
                    >{{ t("class") }}: {{ course.className }}<br />{{
                      t("teacher")
                    }}: {{ course.teacher }}<br />{{ t("location") }}:
                    {{ room(course, day, period) }}</span
                  >
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <table v-else-if="mineLayout === 'list'" class="my-schedule-table">
          <thead>
            <tr>
              <th>{{ t("period") }}</th>
              <th v-for="day in days" :key="day">{{ day }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="period in 11"
              :key="period"
              :class="{ split: period === 5 || period === 9 }"
            >
              <th>{{ period }}</th>
              <td v-for="day in 7" :key="day">
                <button
                  v-for="item in allClassesAt(day, period)"
                  :key="item.key"
                  class="course-card all-course-card"
                  :style="{ backgroundColor: item.course.color }"
                  @click="focusPlan(item.course.key)"
                >
                  <b>{{ item.course.name }}</b>
                  <span
                    >{{ item.course.className }} {{ item.course.teacher }}</span
                  >
                  <small
                    >{{ weekTextLabel(item.weekText) }}@{{ item.room }}</small
                  >
                </button>
              </td>
            </tr>
            <tr v-if="!myScheduleCourses.length">
              <td colspan="8" class="empty-schedule">
                {{ t("noScheduledCourses") }}
              </td>
            </tr>
          </tbody>
        </table>
        <table v-else-if="scheduleView === 'week'" class="compact-schedule-table week-compact-table">
          <thead><tr><th>{{ t("period") }}</th><th v-for="day in days" :key="day">{{ day }}</th></tr></thead>
          <tbody>
            <tr v-for="period in 11" :key="period" :class="{ split: period === 5 || period === 9 }">
              <th>{{ period }}</th>
              <td v-for="day in 7" :key="day" class="compact-cell">
                <button
                  v-for="item in weekCompactDisplayedClasses(day, period)"
                  :key="item.key"
                  class="course-card compact-course-card"
                  :style="{ backgroundColor: item.course.color, ...compactCardStyle(day, period, item) }"
                  @click="focusPlan(item.course.key)"
                  @mouseenter="tooltip = { course: item.course, day, period, room: item.room }"
                  @mouseleave="tooltip = null"
                ><b>{{ item.course.name }}</b><span>{{ item.course.className }} {{ item.course.teacher }}</span><span v-if="tooltip && tooltip.course.key === item.course.key && tooltip.day === day && tooltip.period === period" class="tooltip"><strong>{{ item.course.id }} {{ item.course.name }}</strong>{{ t("class") }}: {{ item.course.className }}<br />{{ t("teacher") }}: {{ item.course.teacher }}<br />{{ t("location") }}: {{ tooltip.room }}</span></button>
              </td>
            </tr>
          </tbody>
        </table>
        <table v-else class="my-schedule-table compact-schedule-table">
          <thead><tr><th>{{ t("period") }}</th><th v-for="day in days" :key="day">{{ day }}</th></tr></thead>
          <tbody>
            <tr v-for="period in 11" :key="period" :class="{ split: period === 5 || period === 9 }">
              <th>{{ period }}</th>
              <td v-for="day in 7" :key="day" class="compact-cell">
                <button
                  v-for="item in compactDisplayedClasses(day, period)"
                  :key="item.key"
                  class="course-card all-course-card compact-course-card"
                  :style="{ backgroundColor: item.course.color, ...compactCardStyle(day, period, item) }"
                  @click="focusPlan(item.course.key)"
                ><b>{{ item.course.name }}</b><span>{{ item.course.className }} {{ item.course.teacher }}</span><small>{{ weekTextLabel(item.weekText) }}@{{ item.room }}</small></button>
              </td>
            </tr>
            <tr v-if="!myScheduleCourses.length"><td colspan="8" class="empty-schedule">{{ t("noScheduledCourses") }}</td></tr>
          </tbody>
        </table>
        <section class="unscheduled-courses">
          <div class="heading">
            <h2>{{ t("unscheduledCourses") }}</h2>
            <small>{{ t("unscheduledHint") }}</small>
          </div>
          <table class="unscheduled-table">
            <thead>
              <tr>
                <th>{{ t("courseId") }}</th>
                <th>{{ t("courseName") }}</th>
                <th>{{ t("class") }}</th>
                <th>{{ t("teacher") }}</th>
                <th>{{ t("action") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="course in unscheduledCourses"
                :key="course.key"
                class="unscheduled-row"
                @click="focusPlan(course.key)"
              >
                <td>{{ course.id }}</td>
                <td>{{ course.name }}</td>
                <td>{{ course.className }}</td>
                <td>{{ course.teacher || "—" }}</td>
                <td>
                  <button class="cancel" @click.stop="toggleSchedule(course)">
                    {{ t("removeSchedule") }}
                  </button>
                </td>
              </tr>
              <tr v-if="!unscheduledCourses.length">
                <td colspan="5" class="empty-unscheduled">
                  {{ t("noUnscheduledCourses") }}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </section>
      <aside>
        <section class="card">
          <nav class="tabs">
            <button :class="{ on: tab === 'search' }" @click="tab = 'search'">
              {{ t("courseSearch") }} {{ courses.length }}</button
            ><button :class="{ on: tab === 'plan' }" @click="tab = 'plan'">
              {{ t("plan") }} {{ planKeys.length }}
            </button>
          </nav>
          <template v-if="tab === 'search'"
            ><p class="course-term">
              {{
                lang === "zh"
                  ? `当前加载课程：${
                      courseSource === "uploaded" ? "用户上传" : "2026秋"
                    }。课程信息仅供参考，请以教务系统最新信息为准`
                  : `Loaded courses: ${
                      courseSource === "uploaded" ? "User Upload" : "Fall 2026"
                    }. Course information is for reference only; please rely on the latest GMIS information.`
              }}
            </p>
            <div class="filters">
              <input
                @input="searchPage = 1"
                v-model="filters.id"
                :placeholder="t('courseId')"
              /><input
                @input="searchPage = 1"
                v-model="filters.name"
                :placeholder="t('courseName')"
              /><input
                @input="searchPage = 1"
                v-model="filters.className"
                :placeholder="t('class')"
              /><input
                @input="searchPage = 1"
                v-model="filters.college"
                :placeholder="t('college')"
              /><input
                @input="searchPage = 1"
                v-model="filters.campus"
                :placeholder="t('campus')"
              /><input
                @input="searchPage = 1"
                v-model="filters.teacher"
                :placeholder="t('teacher')"
              /><input
                @input="searchPage = 1"
                v-model="filters.time"
                :placeholder="t('classTime')"
              /><button @click="clearFilters">{{ t("clear") }}</button>
            </div>
            <div class="course-list">
              <article
                v-for="course in pagedCourses"
                :key="course.key"
                @mouseenter="hoveredKey = course.key"
                @mouseleave="hoveredKey = ''"
              >
                <div>
                  <code
                    >{{ course.id }} · {{ course.credit }} {{ t("credit") }} ·
                    {{
                      collegeLabel(course.college) || t("collegeMissing")
                    }}</code
                  >
                  <h3>{{ course.name }}</h3>
                  <p>{{ course.className }} {{ course.teacher }}</p>
                  <small
                    >◷ {{ courseTime(course) }}<br />⌖ {{ course.rooms }}</small
                  >
                </div>
                <button
                  :class="{ added: planKeys.includes(course.key) }"
                  @click="addToPlan(course)"
                >
                  {{
                    planKeys.includes(course.key) ? t("viewPlan") : t("addPlan")
                  }}
                </button>
              </article>
            </div>
            <div class="search-pagination">
              <button
                :disabled="searchPage === 1"
                @click="changeSearchPage(-1)"
              >
                {{ t("previousPage") }}
              </button>
              <span>{{ pageLabel(searchPage, totalPages) }}</span>
              <button
                :disabled="searchPage === totalPages"
                @click="changeSearchPage(1)"
              >
                {{ t("nextPage") }}
              </button>
            </div>
          </template>
          <template v-else
            ><div class="plan-tools">
              {{ t("planHint") }}
              <div>
                <button @click="toggleAllGroups">
                  {{
                    groups.length && groups.every((group) => group.open)
                      ? t("collapseAll")
                      : t("expandAll")
                  }}
                </button>
                <select v-model="groupDraft.type">
                  <option value="外语课组">{{ t("foreignGroup") }}</option>
                  <option value="公共课组">{{ t("publicGroup") }}</option>
                  <option value="专业课组">{{ t("professionalGroup") }}</option>
                  <option value="选修课组">{{ t("electiveGroup") }}</option>
                  <option value="必修环节">
                    {{ t("requiredModule") }}
                  </option></select
                ><input
                  v-model.number="groupDraft.limit"
                  min="1"
                  :placeholder="t('maxN')"
                  type="number"
                /><select v-model="groupDraft.unit">
                  <option value="course">{{ t("courseUnit") }}</option>
                  <option value="credit">{{ t("creditUnit") }}</option></select
                ><button @click="createGroup">{{ t("addGroup") }}</button
                ><button
                  class="danger"
                  @click="groupDeleteMode = !groupDeleteMode"
                >
                  {{ groupDeleteMode ? t("done") : t("deleteGroup") }}
                </button>
              </div>
            </div>
            <section
              v-for="type in parentGroupTypes"
              :key="type"
              class="parent-group"
            >
              <header class="parent-group-head">
                <b>{{ groupLabel(type) }}</b>
                <button
                  class="parent-setting"
                  :title="
                    lang === 'zh' ? '设置最低要求学分' : 'Set minimum credits'
                  "
                  @click="openParentMinimumEditor(type)"
                >
                  ⚙
                </button>
                <em
                  :class="{
                    complete:
                      hasParentMinimum(type) &&
                      parentGroupCredits(type) >= parentMinimumCredits(type),
                  }"
                  >{{ lang === "zh" ? "已选" : "Selected" }}
                  {{ parentGroupCredits(type) }} {{ t("creditUnit") }} /
                  {{ lang === "zh" ? "最低要求" : "Minimum required" }}
                  {{ parentMinimumCredits(type) }} {{ t("creditUnit") }}</em
                >
              </header>
              <div class="parent-group-children">
                <section
                  v-for="group in groupsForType(type)"
                  :key="group.id"
                  class="group"
                  :class="{
                    dragging: draggingGroupId === group.id,
                    'drag-over':
                      dragOverGroupId === group.id &&
                      draggingGroupId !== group.id,
                  }"
                >
                  <button
                    v-if="groupDeleteMode"
                    class="delete-group"
                    @click="deleteGroup(group)"
                  >
                    {{ t("delete") }}
                  </button>
                  <button
                    class="group-head"
                    draggable="true"
                    @click="toggleGroupOpen(group)"
                    @dragstart="startGroupDrag($event, group)"
                    @dragover.prevent="dragOverGroupId = group.id"
                    @dragleave="dragOverGroupId = ''"
                    @drop="dropGroup($event, group)"
                    @dragend="endGroupDrag"
                  >
                    <span class="group-toggle">{{
                      group.open ? t("collapse") : t("expand")
                    }}</span
                    ><b>{{ groupLabel(group.name) }}</b
                    ><em
                      :class="{
                        over: group.limit && groupValue(group) > group.limit,
                        complete:
                          group.limit && groupValue(group) === group.limit,
                        under: group.limit && groupValue(group) < group.limit,
                      }"
                      >{{ t("selected") }} {{ groupValue(group) }}
                      {{
                        group.unit === "course"
                          ? t("courseUnit")
                          : t("creditUnit")
                      }}
                      / {{ t("required") }}
                      {{ group.limit || t("unlimited") }}
                      {{
                        group.unit === "course"
                          ? t("courseUnit")
                          : t("creditUnit")
                      }}</em
                    >
                  </button>
                  <div v-show="group.open" class="group-list">
                    <article
                      v-for="course in coursesInGroup(group)"
                      :key="course.key"
                      :class="{
                        focused: focusedKey === course.key,
                        selected: activeKeys.includes(course.key),
                      }"
                      @click="toggleSchedule(course)"
                    >
                      <div>
                        <code
                          >{{ course.id }} · {{ course.credit }}
                          {{ t("credit") }} ·
                          {{
                            collegeLabel(course.college) || t("collegeMissing")
                          }}</code
                        >
                        <h3>{{ course.name }}</h3>
                        <p>{{ course.className }} {{ course.teacher }}</p>
                        <small
                          >◷ {{ courseTime(course) }}<br />⌖
                          {{ course.rooms }}</small
                        >
                      </div>
                      <button
                        class="cancel"
                        @click.stop="removeFromGroup(group, course.key)"
                      >
                        {{ t("removeGroup") }}
                      </button>
                    </article>
                  </div>
                </section>
              </div>
            </section>
            <div class="course-list plan-list">
              <article
                v-for="course in ungroupedPlanCourses"
                :key="course.key"
                :class="{
                  focused: focusedKey === course.key,
                  selected: activeKeys.includes(course.key),
                }"
                @click="toggleSchedule(course)"
                @mouseenter="hoveredKey = course.key"
                @mouseleave="hoveredKey = ''"
              >
                <div>
                  <code
                    >{{ course.id }} · {{ course.credit }} {{ t("credit") }} ·
                    {{
                      collegeLabel(course.college) || t("collegeMissing")
                    }}</code
                  >
                  <h3>{{ course.name }}</h3>
                  <p>{{ course.className }} {{ course.teacher }}</p>
                  <small
                    >◷ {{ courseTime(course) }}<br />⌖ {{ course.rooms }}</small
                  >
                </div>
                <div>
                  <button @click.stop="groupModal = { mode: 'add', course }">
                    {{ t("addToGroup") }}</button
                  ><button class="cancel" @click.stop="removePlan(course.key)">
                    {{ t("cancel") }}
                  </button>
                </div>
              </article>
            </div>
            <div v-if="false" class="pagination">
              <button
                :disabled="searchPage === 1"
                @click="changeSearchPage(-1)"
              >
                上一页</button
              ><span>第 {{ searchPage }} 页，共 {{ totalPages }} 页</span
              ><button
                :disabled="searchPage === totalPages"
                @click="changeSearchPage(1)"
              >
                下一页
              </button>
            </div></template
          >
        </section>
        <section class="card conflicts">
          <div class="heading">
            <h2>{{ t("conflicts") }}</h2>
            <div class="chips">
              <button
                v-for="n in conflictWeeks"
                :key="n"
                :class="{ current: week === n }"
                @click="week = n"
              >
                {{ n }}
              </button>
            </div>
          </div>
          <button
            v-for="item in conflicts"
            :key="item.key"
            class="conflict-row"
            @click="openConflict(item)"
          >
            {{ days[item.day - 1] }} {{ periodLabel(item.period) }} ·
            {{ item.courses.map((c) => c.name).join("、") }}
            <span>{{ t("handle") }} ›</span>
          </button>
          <p v-if="!conflicts.length">{{ t("noConflicts") }}</p>
        </section>
      </aside>
    </div>
    <div v-if="groupModal" class="mask" @click.self="groupModal = null">
      <section class="modal">
        <button class="close" @click="groupModal = null">×</button>
        <h2>
          {{ groupModal.mode === "add" ? t("addToGroup") : t("deleteGroup") }}
        </h2>
        <p>{{ t("selectGroup") }}</p>
        <div class="group-choice-list">
          <button
            v-for="group in groups"
            :key="group.id"
            class="choice"
            @click="
              groupModal.mode === 'add' ? addToGroup(group) : deleteGroup(group)
            "
          >
            <b>{{ groupLabel(group.name) }}</b
            ><small>{{ groupCourseSummary(group) }}</small>
          </button>
        </div>
        <p v-if="!groups.length">{{ t("noGroups") }}</p>
      </section>
    </div>
    <div
      v-if="parentMinimumModal"
      class="mask"
      @click.self="parentMinimumModal = null"
    >
      <section class="modal parent-minimum-modal">
        <button class="close" @click="parentMinimumModal = null">×</button>
        <h2>
          {{ lang === "zh" ? "设置最低要求学分" : "Set minimum credits" }}
        </h2>
        <p>{{ groupLabel(parentMinimumModal.type) }}</p>
        <label>
          {{ lang === "zh" ? "最低要求（分）" : "Minimum credits" }}
          <input
            v-model.number="parentMinimumModal.value"
            type="number"
            min="0"
            step="0.5"
          />
        </label>
        <div class="modal-actions">
          <button class="primary" @click="saveParentMinimum">
            {{ t("confirm") }}
          </button>
        </div>
      </section>
    </div>
    <div v-if="exportWarning" class="mask" @click.self="exportWarning = null">
      <section class="modal export-warning-modal">
        <button class="close" @click="exportWarning = null">×</button>
        <h2>{{ lang === "zh" ? "存在无法导出的课程" : "Courses cannot be exported" }}</h2>
        <p>{{ lang === "zh" ? "以下已上课表课程缺少上课时间，无法写入 CSV，将跳过它们：" : "The following scheduled courses have no class time and will be skipped:" }}</p>
        <ul class="export-warning-list">
          <li v-for="course in exportWarning" :key="course.key">{{ course.name }}（{{ course.className }}）</li>
        </ul>
        <div class="modal-actions">
          <button class="primary" @click="confirmExportSchedule">{{ t("confirm") }}</button>
        </div>
      </section>
    </div>
    <div v-if="exportConflictWeeks.length" class="mask" @click.self="exportConflictWeeks = []">
      <section class="modal export-warning-modal">
        <button class="close" @click="exportConflictWeeks = []">×</button>
        <h2>{{ lang === "zh" ? "存在未解决的课程冲突" : "Unresolved course conflicts" }}</h2>
        <p>{{ lang === "zh" ? `第 ${exportConflictWeeks.join("、")} 周存在课程冲突。请先在冲突课程栏中处理冲突，再导出 CSV。` : `Course conflicts remain in week ${exportConflictWeeks.join(", ")}. Resolve them before exporting CSV.` }}</p>
        <div class="modal-actions">
          <button class="primary" @click="exportConflictWeeks = []">{{ t("confirm") }}</button>
        </div>
      </section>
    </div>
    <div v-if="conflictModal" class="mask" @click.self="conflictModal = null">
      <section class="modal">
        <button class="close" @click="conflictModal = null">×</button>
        <h2>{{ t("resolveConflicts") }}</h2>
        <p>{{ t("resolveHint") }}</p>
        <label v-for="course in conflictModal.courses" :key="course.key"
          ><input v-model="keepKey" :value="course.key" type="radio" />
          {{ course.name }}（{{ course.className }}）</label
        ><button class="primary" @click="resolveConflict">
          {{ t("confirm") }}
        </button>
      </section>
    </div>
    <div
      v-if="planImportUpload"
      class="mask plan-import-mask"
      @click.self="planImportUpload = false"
    >
      <section class="modal plan-upload-modal">
        <button class="close" @click="planImportUpload = false">×</button>
        <h2>{{ t("readPlan") }}</h2>
        <ol v-if="lang === 'zh'" class="import-steps">
          <li>在新页面按 Ctrl+S，选择保存类型“网页，单个文件”</li>
          <li>保存下载培养计划页面的.mhtml文件</li>
          <li>点击按钮选择文件读取。</li>
        </ol>
        <ol v-else class="import-steps">
          <li>
            On the new page, press Ctrl+S and choose “Webpage, Single File”.
          </li>
          <li>Save the study-plan page as a .mhtml file.</li>
          <li>Click the button to select and read the file.</li>
        </ol>
        <input
          ref="planFileInput"
          class="plan-file-input"
          accept=".mht,.mhtml,.htm,.html,multipart/related,text/html"
          type="file"
          @change="readPlanFile"
        />
        <button class="primary" @click="choosePlanFile">
          {{ t("choosePlanFile") }}
        </button>
      </section>
    </div>
    <div
      v-if="planCampusModal"
      class="mask"
      @click.self="planCampusModal = false"
    >
      <section class="modal campus-modal">
        <button class="close" @click="planCampusModal = false">×</button>
        <h2>
          {{
            lang === "zh" ? "在哪个校区上课？" : "Which campus do you attend?"
          }}
        </h2>
        <label
          v-for="campus in planCampuses"
          :key="campus"
          class="campus-option"
          :class="{ selected: planCampus === campus }"
        >
          <input v-model="planCampus" :value="campus" type="radio" />
          {{ campus }}
        </label>
        <button
          class="primary"
          :disabled="!planCampus"
          @click="confirmPlanCampus"
        >
          {{ t("confirm") }}
        </button>
      </section>
    </div>
    <div
      v-if="catalogImportUpload"
      class="mask plan-import-mask"
      @click.self="catalogImportUpload = false"
    >
      <section class="modal plan-upload-modal">
        <button class="close" @click="catalogImportUpload = false">×</button>
        <h2>{{ lang === "zh" ? "读取课程目录" : "Read Course Catalog" }}</h2>
        <ol v-if="lang === 'zh'" class="import-steps">
          <li>在“每页 15 记录”的数字处右击“检查”</li>
          <li>在 Element 选项卡打开荧光所在列下拉框</li>
          <li>将 option value=“100”的值改到大于总课程条数</li>
          <li>在网页中选择“每页 100 记录”，等待数据加载完成</li>
          <li>在新页面按 Ctrl+S，选择保存类型“网页，单个文件”</li>
          <li>保存下载课程目录页面的.mhtml文件</li>
          <li>点击按钮选择文件读取。</li>
        </ol>
        <ol v-else class="import-steps">
          <li>
            Right-click the number in “15 records per page” and choose Inspect.
          </li>
          <li>In the Elements tab, open the highlighted dropdown.</li>
          <li>
            Change option value=“100” to a value greater than the total course
            count.
          </li>
          <li>
            Choose “100 records per page” and wait for the data to finish
            loading.
          </li>
          <li>
            On the new page, press Ctrl+S and choose “Webpage, Single File”.
          </li>
          <li>Save the course-catalog page as a .mhtml file.</li>
          <li>Click the button to select and read the file.</li>
        </ol>
        <input
          ref="catalogFileInput"
          class="plan-file-input"
          accept=".mht,.mhtml,.htm,.html,multipart/related,text/html"
          type="file"
          @change="readCatalogFile"
        />
        <button class="primary" @click="chooseCatalogFile">
          {{
            lang === "zh" ? "选择课程目录文件" : "Choose Course Catalog File"
          }}
        </button>
      </section>
    </div>
    <div v-if="planImportWaiting" class="mask plan-import-mask">
      <section class="modal plan-login-modal">
        <h2>{{ t("waitingLogin") }}</h2>
        <p>{{ t("loginConfirmHint") }}</p>
        <div class="modal-actions">
          <button class="primary" @click="openPlanLookup">
            {{ t("confirm") }}
          </button>
        </div>
      </section>
    </div>
    <div
      v-if="planImportReview"
      class="mask plan-review-mask"
      @click.self="planImportReview = null"
    >
      <section class="modal plan-review-modal">
        <button class="close" @click="planImportReview = null">×</button>
        <h2>{{ t("planReadResult") }}</h2>
        <p>✔️ {{ importSuccessText(planImportReview.success.length) }}</p>
        <div class="plan-review-table-wrap">
          <table class="plan-review-table">
            <thead>
              <tr>
                <th>{{ t("group") }}</th>
                <th>{{ t("courseId") }}</th>
                <th>{{ t("courseName") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in planImportReview.success" :key="item.key">
                <td>{{ groupLabel(item.groupName) }}</td>
                <td>{{ item.courseId }}</td>
                <td>{{ item.courseName }}</td>
              </tr>
              <tr v-if="!planImportReview.success.length">
                <td colspan="3">{{ t("noImportableCourses") }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="read-failed-text" v-if="lang === 'zh'">
          ❌ 以下课程读取失败，可能是<span class="failed-reasons"
            >缺乏排课信息、选错校区或本学期不开课</span
          >。若是全校课表中缺乏排课信息，请联系教务老师添加。
        </p>
        <p class="read-failed-text" v-else>
          ❌ The following courses could not be read. They may
          <span class="failed-reasons"
            >lack timetable information, belong to a different campus, or not be
            offered this term</span
          >. If the university timetable lacks the information, please contact
          the academic office.
        </p>
        <div class="plan-review-table-wrap">
          <table class="plan-review-table">
            <thead>
              <tr>
                <th>{{ t("group") }}</th>
                <th>{{ t("courseId") }}</th>
                <th>{{ t("courseName") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in planImportReview.failed" :key="item.key">
                <td>{{ groupLabel(item.groupName) }}</td>
                <td>{{ item.courseId }}</td>
                <td>{{ item.courseName }}</td>
              </tr>
              <tr v-if="!planImportReview.failed.length">
                <td colspan="3">{{ t("noReadFailures") }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="primary" @click="applyPlanImport">
          {{ t("confirmImport") }}
        </button>
      </section>
    </div>
    <div
      v-if="planImportNotice"
      class="plan-import-notice"
      :class="{ 'is-centered': planImportNoticeCenter }"
    >
      {{ planImportNotice }}
    </div>
    <div v-if="notice" class="notice">{{ notice }}</div>
  </main>
</template>
<script>
/* eslint-disable */
/* global DecompressionStream */
import pako from "pako";
const DecompressionStream = class {
  constructor() {
    const chunks = [];
    const stream = new TransformStream({
      transform(chunk) {
        chunks.push(new Uint8Array(chunk));
      },
      flush(controller) {
        const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const all = new Uint8Array(length);
        let offset = 0;
        chunks.forEach((chunk) => {
          all.set(chunk, offset);
          offset += chunk.length;
        });
        controller.enqueue(pako.inflateRaw(all));
      },
    });
    this.readable = stream.readable;
    this.writable = stream.writable;
  }
};
const COLORS = [
  "#4f7bd9",
  "#cf6b85",
  "#2c9b7a",
  "#d88a3c",
  "#8065c7",
  "#2e91b4",
  "#ba7155",
  "#63955a",
  "#b064b1",
  "#c4913f",
  "#4f9c96",
  "#7a82d2",
  "#d05d70",
  "#6487bb",
  "#9a79c3",
  "#4fa57f",
  "#d2754e",
  "#4a9abd",
  "#a67850",
  "#6e9a71",
  "#b26e98",
  "#587ac7",
  "#d1984c",
  "#5b9d8f",
  "#d36c9b",
  "#7180c6",
  "#3f9a86",
  "#c76d43",
  "#8c72b7",
  "#4b8fb0",
];
const resolveCollege = (courseId, college) => {
  const id = String(courseId || "")
    .trim()
    .toUpperCase();
  if (id.startsWith("KN")) return "课内授课";
  if (id.startsWith("WS")) return "小班实践";
  return college;
};
let planLoginPopup = null;
let planLookupPopup = null;
export default {
  name: "FreeSchedule",
  created() {
    this.loadCourses();
  },
  data() {
    return {
      week: 1,
      lang: "zh",
      scheduleView: "week",
      mineLayout: "list",
      weekLayout: "list",
      tab: "search",
      courses: [],
      planKeys: [],
      activeKeys: [],
      groups: [],
      groupTypes: ["外语课组", "公共课组", "专业课组", "选修课组", "必修环节"],
      categoryMinimums: {},
      filters: {
        id: "",
        name: "",
        className: "",
        college: "",
        campus: "",
        teacher: "",
        time: "",
      },
      groupDraft: { type: "外语课组", limit: null, unit: "course" },
      groupModal: null,
      parentMinimumModal: null,
      exportWarning: null,
      exportConflictWeeks: [],
      conflictModal: null,
      planImportWaiting: false,
      planCampusModal: false,
      planCampus: "",
      planCampuses: ["创新港校区", "兴庆校区", "雁塔校区", "待定"],
      pendingImport: "",
      planImportUpload: false,
      catalogImportUpload: false,
      courseSource: "default",
      planImportReview: null,
      planImportNotice: "",
      planImportNoticeCenter: false,
      keepKey: "",
      hoveredKey: "",
      focusedKey: "",
      tooltip: null,
      notice: "",
      initial: null,
      groupDeleteMode: false,
      draggingGroupId: "",
      dragOverGroupId: "",
      draggedGroup: false,
      history: [],
      historyIndex: -1,
      historyRestoring: false,
      historyTimer: null,
      searchPage: 1,
      pageSize: 100,
    };
  },
  computed: {
    days() {
      return this.lang === "zh"
        ? ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    },
    planCourses() {
      return this.courses.filter((c) => this.planKeys.includes(c.key));
    },
    myScheduleCourses() {
      return this.courses.filter((c) => this.activeKeys.includes(c.key));
    },
    unscheduledCourses() {
      const missing = this.courses.filter(
        (course) =>
          this.activeKeys.includes(course.key) && !course.meetings.length,
      );
      const overflow = this.mineLayout === "compact" ? this.compactOverflowCourses() : [];
      return [...new Map([...missing, ...overflow].map((course) => [course.key, course])).values()];
    },
    filteredCourses() {
      const f = this.filters,
        has = (v, q) =>
          !q ||
          String(v || "")
            .toLowerCase()
            .includes(q.toLowerCase());
      return this.courses.filter(
        (c) =>
          has(c.id, f.id) &&
          has(c.name, f.name) &&
          has(c.className, f.className) &&
          has(`${c.college} ${this.collegeLabel(c.college)}`, f.college) &&
          has(c.rooms, f.campus) &&
          has(c.teacher, f.teacher) &&
          has(this.courseTime(c), f.time),
      );
    },
    totalPages() {
      return Math.max(
        1,
        Math.ceil(this.filteredCourses.length / this.pageSize),
      );
    },
    pagedCourses() {
      const start = (this.searchPage - 1) * this.pageSize;
      return this.filteredCourses.slice(start, start + this.pageSize);
    },
    ungroupedPlanCourses() {
      const grouped = new Set(this.groups.flatMap((g) => g.courseKeys));
      return this.planCourses.filter((c) => !grouped.has(c.key));
    },
    conflicts() {
      return this.conflictsFor(this.week);
    },
    conflictWeeks() {
      return Array.from({ length: 18 }, (_, i) => i + 1).filter(
        (w) => this.conflictsFor(w).length,
      );
    },
    parentGroupTypes() {
      return this.groupTypes.filter(
        (type) =>
          this.groupsForType(type).length ||
          Object.prototype.hasOwnProperty.call(this.categoryMinimums, type),
      );
    },
    compactLayouts() {
      return Array.from({ length: 8 }, (_, day) =>
        day ? this.buildCompactDayLayout(day) : null,
      );
    },
    weekCompactLayouts() {
      if (this.scheduleView !== "week" || this.weekLayout !== "compact") return [];
      return Array.from({ length: 8 }, (_, day) =>
        day ? this.buildWeekCompactDayLayout(day) : null,
      );
    },
  },
  watch: {
    planKeys: {
      deep: true,
      handler() {
        this.queueHistory();
      },
    },
    activeKeys: {
      deep: true,
      handler() {
        this.queueHistory();
      },
    },
    groups: {
      deep: true,
      handler() {
        this.queueHistory();
      },
    },
    categoryMinimums: {
      deep: true,
      handler() {
        this.queueHistory();
      },
    },
  },
  methods: {
    t(key) {
      const importText = {
        zh: {
          readPlan: "读取培养方案",
          planFileHint:
            "请在新页面按 Ctrl+S，选择保存类型“网页，单个文件”后保存下载培养计划页面的 MHTML 文件，再在此选择文件读取。",
          choosePlanFile: "选择培养方案文件",
          waitingLogin: "等待登录",
          loginConfirmHint: "完成后点击确认",
          planReadResult: "培养方案读取结果",
          group: "所在分组",
          noImportableCourses: "没有可导入课程",
          planReadFailedHint:
            "以下课程读取失败，可能是缺乏排课信息或本学期不开课。若是全校课表中缺乏排课信息，请联系教务老师添加。",
          noReadFailures: "无读取失败课程",
          confirmImport: "确认导入",
          popupBlocked: "弹窗被浏览器拦截，请允许弹窗后重试",
          invalidPlanFile:
            "无法识别该培养方案文件，请确认下载的是培养计划查询页面",
        },
        en: {
          readPlan: "Read Study Plan",
          planFileHint:
            "On the new page, press Ctrl+S and choose “Webpage, Single File”. Save the study-plan MHTML file, then select it here.",
          choosePlanFile: "Choose Plan File",
          waitingLogin: "Waiting for Login",
          loginConfirmHint: "Click Confirm after you have finished.",
          planReadResult: "Study Plan Reading Results",
          group: "Group",
          noImportableCourses: "No courses available to import",
          planReadFailedHint:
            "The following courses could not be read. They may lack timetable information or may not be offered this term. If the university timetable lacks the information, please contact the academic office.",
          noReadFailures: "No failed courses",
          confirmImport: "Confirm Import",
          popupBlocked:
            "The popup was blocked. Please allow popups and try again.",
          invalidPlanFile:
            "This study-plan file could not be recognized. Please confirm it was saved from the study-plan query page.",
        },
      };
      if (importText[this.lang][key]) return importText[this.lang][key];
      const text = {
        zh: {
          graduateSchool: "研究生院",
          academicSystem: "教务系统",
          switchLanguage: "切换中英文",
          reset: "重做",
          mySchedule: "我的课表",
          importPlan: "导入培养方案",
          weeklySchedule: "周课表",
          allScheduled: "全部已上课表课程",
          clickToPlan: "点击课程定位至培养方案",
          period: "节次",
          class: "班级",
          teacher: "教师",
          location: "地点",
          noScheduledCourses: "暂未加入上课表的课程",
          unscheduledCourses: "待安排课程",
          unscheduledHint: "以下课程缺少上课时间或无法放入当前课表布局，暂无法排入周课表",
          compactView: "合并显示",
          normalView: "普通显示",
          courseId: "课程号",
          courseName: "课程名称",
          action: "操作",
          removeSchedule: "移出课表",
          noUnscheduledCourses: "暂无待安排课程",
          courseSearch: "课程检索",
          plan: "培养方案",
          college: "学院",
          campus: "校区",
          classTime: "上课时间",
          clear: "清空",
          credit: "学分",
          collegeMissing: "未填写学院",
          viewPlan: "查看方案",
          addPlan: "加入方案",
          previousPage: "上一页",
          nextPage: "下一页",
          planHint:
            "点击课程卡片即可加入或移出课表。因外语课组与公共课组为志愿式选课，建议导入培养方案后将两课组删除，在课程检索中直接选班。",
          collapseAll: "关闭全部",
          expandAll: "展开全部",
          maxN: "最多 n",
          courseUnit: "门",
          creditUnit: "分",
          addGroup: "添加组",
          done: "完成",
          deleteGroup: "删除组",
          delete: "删除",
          collapse: "收起",
          expand: "展开",
          selected: "已选",
          required: "应选",
          unlimited: "不限",
          removeGroup: "移出组",
          cancel: "取消",
          conflicts: "冲突课程",
          handle: "处理",
          noConflicts: "当前周次没有课程冲突",
          addToGroup: "加入组",
          selectGroup: "请选择课程组：",
          noGroups: "暂无课程组",
          resolveConflicts: "解决课程冲突",
          resolveHint: "保留一门课程，其余移出课表。",
          confirm: "确认",
          foreignGroup: "外语课组",
          publicGroup: "公共课组",
          professionalGroup: "专业课组",
          electiveGroup: "选修课组",
          requiredModule: "必修环节",
        },
        en: {
          graduateSchool: "Graduate School",
          academicSystem: "GMIS",
          switchLanguage: "Switch language",
          reset: "Reset",
          mySchedule: "My Schedule",
          importPlan: "Import Plan",
          weeklySchedule: "Weekly Schedule",
          allScheduled: "All scheduled courses",
          clickToPlan: "Click a course to locate it in the plan",
          period: "Period",
          class: "Class",
          teacher: "Instructor",
          location: "Location",
          noScheduledCourses: "No scheduled courses yet",
          unscheduledCourses: "Unscheduled Courses",
          unscheduledHint:
            "These courses have no class time or do not fit and cannot be placed on the timetable.",
          compactView: "Compact view",
          normalView: "Normal view",
          courseId: "Course ID",
          courseName: "Course Name",
          action: "Action",
          removeSchedule: "Remove",
          noUnscheduledCourses: "No unscheduled courses",
          courseSearch: "Course Search",
          plan: "Study Plan",
          college: "College",
          campus: "Campus",
          classTime: "Class Time",
          clear: "Clear",
          credit: "Credits",
          collegeMissing: "College not provided",
          viewPlan: "View Plan",
          addPlan: "Add to Plan",
          previousPage: "Previous",
          nextPage: "Next",
          planHint:
            "Tap a course card to add it to or remove it from the timetable. Foreign Language and General Education groups use preference-based selection; after importing a study plan, consider deleting these two groups and choosing a class directly in Course Search.",
          collapseAll: "Collapse All",
          expandAll: "Expand All",
          maxN: "Max. n",
          courseUnit: "courses",
          creditUnit: "credits",
          addGroup: "Add Group",
          done: "Done",
          deleteGroup: "Delete Group",
          delete: "Delete",
          collapse: "Collapse",
          expand: "Expand",
          selected: "Selected",
          required: "Required",
          unlimited: "Any",
          removeGroup: "Remove",
          cancel: "Cancel",
          conflicts: "Conflicts",
          handle: "Resolve",
          noConflicts: "No course conflicts this week",
          addToGroup: "Add to Course Group",
          selectGroup: "Select a course group:",
          noGroups: "No course groups",
          resolveConflicts: "Resolve Conflicts",
          resolveHint:
            "Keep one course and remove the others from the timetable.",
          confirm: "Confirm",
          foreignGroup: "Foreign Language",
          publicGroup: "General Education",
          professionalGroup: "Professional",
          electiveGroup: "Elective",
          requiredModule: "Required Component",
        },
      };
      return text[this.lang][key] || key;
    },
    importSuccessText(count) {
      return this.lang === "zh"
        ? `成功读取 ${count} 门课程，请认真核对。小班实践课程须另外添加。`
        : `Successfully read ${count} courses. Please review carefully. Small-group practice courses must be added separately.`;
    },
    toggleLanguage() {
      this.lang = this.lang === "zh" ? "en" : "zh";
    },
    weekLabel(week) {
      return this.lang === "zh" ? `第 ${week} 周` : `Week ${week}`;
    },
    weekTextLabel(text) {
      return this.lang === "zh" ? `第${text}周` : `Weeks ${text}`;
    },
    pageLabel(page, total) {
      return this.lang === "zh"
        ? `第 ${page} 页，共 ${total} 页`
        : `Page ${page} of ${total}`;
    },
    periodLabel(period) {
      return this.lang === "zh" ? `第${period}节` : `Period ${period}`;
    },
    groupLabel(name) {
      if (this.lang === "zh") return name;
      return String(name)
        .replace("外语课组", this.t("foreignGroup"))
        .replace("公共课组", this.t("publicGroup"))
        .replace("专业课组", this.t("professionalGroup"))
        .replace("选修课组", this.t("electiveGroup"))
        .replace("必修环节", this.t("requiredModule"));
    },
    collegeLabel(college) {
      if (this.lang === "zh") return college;
      const names = {
        材料科学与工程学院: "School of Materials Science and Engineering",
        电气工程学院: "School of Electrical Engineering",
        电子与信息学部: "School of Electronics and Information",
        法学院: "School of Law",
        公共政策与管理学院: "School of Public Policy and Administration",
        管理学院: "School of Management",
        国际教育学院: "School of International Education",
        航天航空学院: "School of Aerospace Engineering",
        化学工程与技术学院: "School of Chemical Engineering and Technology",
        化学学院: "School of Chemistry",
        机械工程学院: "School of Mechanical Engineering",
        金禾经济研究中心: "Jinhe Center for Economic Research",
        经济与金融学院: "School of Economics and Finance",
        理学院: "School of Science",
        马克思主义学院: "School of Marxism",
        能源与动力工程学院: "School of Energy and Power Engineering",
        前沿科学技术研究院: "Frontier Institute of Science and Technology",
        人工智能学院: "School of Artificial Intelligence",
        人居环境与建筑工程学院:
          "School of Human Settlements and Civil Engineering",
        人文社会科学学院: "School of Humanities and Social Sciences",
        软件学院: "School of Software",
        生命科学与技术学院: "School of Life Science and Technology",
        数学与统计学院: "School of Mathematics and Statistics",
        体育学院: "School of Physical Education",
        外国语学院: "School of Foreign Studies",
        未来技术学院: "School of Future Technology",
        物理学院: "School of Physics",
        新闻与新媒体学院: "School of Journalism and New Media",
        医学部: "Health Science Center",
        仪器科学与技术学院: "School of Instrument Science and Technology",
        课内授课: "In-class Instruction",
        小班实践: "Small-group Practice",
      };
      return names[college] || college;
    },
    async loadCourses() {
      try {
        const response = await fetch(
          `${process.env.BASE_URL || "/"}lecture_unite.csv`,
        );
        if (!response.ok) throw new Error("课程数据读取失败");
        this.applyCourseRows(this.parseCsv(await response.text()));
        this.noticeMsg(
          this.lang === "zh"
            ? `已加载 ${this.courses.length} 条课程`
            : `${this.courses.length} courses loaded`,
        );
      } catch (error) {
        this.noticeMsg(
          this.lang === "zh"
            ? "课程数据加载失败，请检查 lecture_unite.csv"
            : "Course data failed to load. Please check lecture_unite.csv.",
        );
      }
    },
    parseCsv(text) {
      const rows = [];
      let row = [];
      let cell = "";
      let quoted = false;
      const source = text.replace(/^\uFEFF/, "");
      for (let i = 0; i < source.length; i += 1) {
        const char = source[i];
        if (char === '"') {
          if (quoted && source[i + 1] === '"') {
            cell += '"';
            i += 1;
          } else quoted = !quoted;
        } else if (char === "," && !quoted) {
          row.push(cell.trim());
          cell = "";
        } else if ((char === "\n" || char === "\r") && !quoted) {
          if (char === "\r" && source[i + 1] === "\n") i += 1;
          row.push(cell.trim());
          if (row.some(Boolean)) rows.push(row);
          row = [];
          cell = "";
        } else cell += char;
      }
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      return rows;
    },
    applyCourseRows(rows) {
      const headers = rows[0] || [];
      const get = (row, field) =>
        String(row[headers.indexOf(field)] || "").trim();
      this.courses = rows
        .slice(1)
        .map((row) => {
          const meetings = [];
          const slotCount = headers.filter((header) =>
            /^星期几\d+$/.test(header),
          ).length;
          for (let index = 1; index <= slotCount; index += 1) {
            const day = Number(get(row, `星期几${index}`));
            const periods = get(row, `节次${index}`);
            if (!day || !periods) continue;
            const weekText = get(row, `周次${index}`) || "1-18";
            meetings.push({
              day,
              periods: this.nums(periods, 11),
              weeks: this.nums(weekText, 18),
              weekText,
              room: get(row, `教室${index}`) || "待定",
            });
          }
          const id = get(row, "课程编号");
          const className = get(row, "班级") || "未分班";
          const teacher = get(row, "主讲教师");
          const key = `${id}-${className}-${teacher}`;
          const hash = [...key].reduce(
            (sum, character) => sum * 31 + character.charCodeAt(0),
            0,
          );
          return {
            key,
            id,
            name: get(row, "课程名称"),
            className,
            credit: get(row, "学分") || "/",
            college: resolveCollege(id, get(row, "学院")),
            teacher,
            primaryRoom: get(row, "教室1"),
            meetings,
            rooms: [...new Set(meetings.map((meeting) => meeting.room))].join(
              "；",
            ),
            major: get(row, "专业"),
            color:
              COLORS[
                Math.abs(Math.imul(hash ^ (hash >>> 16), 2654435761)) %
                  COLORS.length
              ],
          };
        })
        .filter((course) => course.id && course.name);
      this.planKeys = [];
      this.activeKeys = [];
      this.groups = [];
      this.categoryMinimums = {};
      this.searchPage = 1;
      this.initial = this.snapshot();
      this.resetHistory();
    },
    snapshot() {
      return JSON.stringify({
        planKeys: this.planKeys,
        activeKeys: this.activeKeys,
        groups: this.groups,
        categoryMinimums: this.categoryMinimums,
      });
    },
    resetHistory() {
      clearTimeout(this.historyTimer);
      this.history = [this.snapshot()];
      this.historyIndex = 0;
    },
    queueHistory() {
      if (this.historyRestoring || !this.courses.length) return;
      clearTimeout(this.historyTimer);
      this.historyTimer = setTimeout(() => this.recordHistory(), 0);
    },
    recordHistory() {
      if (this.historyRestoring) return;
      const next = this.snapshot();
      if (this.history[this.historyIndex] === next) return;
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(next);
      if (this.history.length > 60) this.history.shift();
      this.historyIndex = this.history.length - 1;
    },
    applyHistory(snapshot) {
      const state = JSON.parse(snapshot);
      this.historyRestoring = true;
      this.planKeys = state.planKeys;
      this.activeKeys = state.activeKeys;
      this.groups = state.groups;
      this.categoryMinimums = state.categoryMinimums || {};
      this.$nextTick(() => {
        this.historyRestoring = false;
      });
    },
    undo() {
      if (this.historyIndex <= 0) return;
      this.historyIndex -= 1;
      this.applyHistory(this.history[this.historyIndex]);
    },
    restoreHistory() {
      if (this.historyIndex >= this.history.length - 1) return;
      this.historyIndex += 1;
      this.applyHistory(this.history[this.historyIndex]);
    },
    redo() {
      if (!this.initial) return;
      const x = JSON.parse(this.initial);
      clearTimeout(this.historyTimer);
      this.historyRestoring = true;
      this.planKeys = x.planKeys;
      this.activeKeys = x.activeKeys;
      this.groups = x.groups;
      this.categoryMinimums = x.categoryMinimums || {};
      this.week = 1;
      this.tab = "search";
      this.focusedKey = "";
      this.$nextTick(() => {
        this.resetHistory();
        this.historyRestoring = false;
      });
      this.noticeMsg(
        this.lang === "zh"
          ? "已恢复到打开状态"
          : "Restored to the initial state",
      );
    },
    openPlanImport() {
      this.pendingImport = "plan";
      this.openImportLogin("xjtu-curriculum-plan-login");
    },
    startPlanImport() {
      this.planCampus = "";
      this.planCampusModal = true;
    },
    confirmPlanCampus() {
      if (!this.planCampus) return;
      this.planCampusModal = false;
      this.openPlanImport();
    },
    openCatalogImport() {
      this.pendingImport = "catalog";
      this.openImportLogin("xjtu-course-catalog-login");
    },
    openImportLogin(popupName) {
      this.planImportWaiting = true;
      const width = Math.max(640, Math.floor(window.screen.availWidth * 0.75));
      const height = Math.max(640, window.screen.availHeight);
      planLoginPopup = window.open(
        "https://gmis.xjtu.edu.cn/pyxx/",
        popupName,
        `popup=yes,width=${width},height=${height},left=0,top=0,resizable=yes,scrollbars=yes`,
      );
      if (!planLoginPopup) {
        this.planImportWaiting = false;
        this.pendingImport = "";
        this.planImportNoticeMsg(this.t("popupBlocked"));
      }
    },
    openPlanLookup() {
      if (planLoginPopup && !planLoginPopup.closed) planLoginPopup.close();
      planLoginPopup = null;
      this.planImportWaiting = false;
      const width = Math.max(640, Math.floor(window.screen.availWidth * 0.75));
      const height = Math.max(640, window.screen.availHeight);
      const isCatalogImport = this.pendingImport === "catalog";
      planLookupPopup = window.open(
        isCatalogImport
          ? "https://gmis.xjtu.edu.cn/pyxx/pygl/pkjlcx/index"
          : "https://gmis.xjtu.edu.cn/pyxx/pygl/pyjhcx",
        isCatalogImport
          ? "xjtu-course-catalog-lookup"
          : "xjtu-curriculum-plan-lookup",
        `popup=yes,width=${width},height=${height},left=0,top=0,resizable=yes,scrollbars=yes`,
      );
      if (!planLookupPopup) {
        this.pendingImport = "";
        this.planImportNoticeMsg(this.t("popupBlocked"));
        return;
      }
      if (isCatalogImport) {
        this.pendingImport = "";
        this.catalogImportUpload = true;
        return;
      }
      this.planImportUpload = true;
    },
    choosePlanFile() {
      if (planLookupPopup && !planLookupPopup.closed) planLookupPopup.close();
      planLookupPopup = null;
      this.$refs.planFileInput.click();
    },
    chooseCatalogFile() {
      if (planLookupPopup && !planLookupPopup.closed) planLookupPopup.close();
      planLookupPopup = null;
      this.$refs.catalogFileInput.click();
    },
    async readPlanFile(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        const rawText = await file.text();
        const planHtml = /\.mht(?:ml)?$/i.test(file.name)
          ? this.extractPlanHtmlFromMhtml(rawText)
          : rawText;
        this.planImportReview = this.parsePlanHtml(planHtml);
        this.planImportUpload = false;
      } catch (error) {
        this.planImportNoticeMsg(this.t("invalidPlanFile"));
      } finally {
        event.target.value = "";
      }
    },
    async readCatalogFile(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        const rawText = await file.text();
        const catalogHtml = /\.mht(?:ml)?$/i.test(file.name)
          ? this.extractPlanHtmlFromMhtml(rawText)
          : rawText;
        const catalog = this.parseCourseCatalogHtml(catalogHtml);
        this.applyCourseRows(catalog.rows);
        this.courseSource = "uploaded";
        this.clearFilters();
        this.tab = "search";
        this.catalogImportUpload = false;
        this.noticeMsg(
          this.lang === "zh"
            ? `读取 ${catalog.courseCount} 门课程，${catalog.classCount} 个课程+班级组合`
            : `Read ${catalog.courseCount} courses and ${catalog.classCount} course-class combinations.`,
        );
      } catch (error) {
        this.planImportNoticeMsg(
          this.lang === "zh"
            ? "无法识别该课程目录文件，请确认下载的是排课记录查询页面"
            : "This course catalog file could not be recognized. Please confirm it was saved from the course catalog page.",
        );
      } finally {
        event.target.value = "";
      }
    },
    extractPlanHtmlFromMhtml(text) {
      const boundaryMatch = text.match(/boundary\s*=\s*"?([^";\r\n]+)"?/i);
      if (!boundaryMatch) throw new Error("missing mhtml boundary");
      const parts = text.split(`--${boundaryMatch[1]}`);
      const htmlPart = parts.find((part) =>
        /^\s*Content-Type:\s*text\/html\b/im.test(part),
      );
      if (!htmlPart) throw new Error("missing mhtml html part");
      const separator = htmlPart.match(/\r?\n\r?\n/);
      if (!separator || separator.index === undefined)
        throw new Error("missing mhtml body");
      const headers = htmlPart.slice(0, separator.index);
      const body = htmlPart.slice(separator.index + separator[0].length);
      if (/Content-Transfer-Encoding:\s*base64/i.test(headers)) {
        const binary = atob(body.replace(/\s/g, ""));
        return new TextDecoder("utf-8").decode(
          Uint8Array.from(binary, (char) => char.charCodeAt(0)),
        );
      }
      return this.decodeQuotedPrintable(body);
    },
    decodeQuotedPrintable(source) {
      const normalized = source.replace(/=\r?\n/g, "");
      const bytes = [];
      for (let index = 0; index < normalized.length; index += 1) {
        if (
          normalized[index] === "=" &&
          /^[0-9a-f]{2}$/i.test(normalized.slice(index + 1, index + 3))
        ) {
          bytes.push(parseInt(normalized.slice(index + 1, index + 3), 16));
          index += 2;
        } else {
          const code = normalized.charCodeAt(index);
          if (code <= 255) bytes.push(code);
          else bytes.push(...new TextEncoder().encode(normalized[index]));
        }
      }
      return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
    },
    formatCatalogCourseId(value) {
      let courseId = String(value || "")
        .trim()
        .replace(/\.0$/, "");
      if (/^\d{5}$/.test(courseId)) courseId = `0${courseId}`;
      return courseId;
    },
    catalogCollege(courseId) {
      const colleges = {
        "01": "机械工程学院",
        "02": "材料科学与工程学院",
        "03": "能源与动力工程学院",
        "04": "电气工程学院",
        "05": "电子与信息学部",
        "06": "航天航空学院",
        "07": "数学与统计学院",
        "08": "管理学院",
        "09": "理学院",
        10: "人文社会科学学院",
        11: "软件学院",
        12: "外国语学院",
        13: "生命科学与技术学院",
        14: "马克思主义学院",
        15: "医学部",
        16: "化学工程与技术学院",
        17: "医学部",
        18: "公共政策与管理学院",
        19: "经济与金融学院",
        21: "金禾经济研究中心",
        22: "人居环境与建筑工程学院",
        23: "继续教育学院",
        24: "法学院",
        25: "研究生院(苏州)",
        26: "MBA中心",
        27: "国际教育学院",
        28: "前沿科学技术研究院",
        29: "工程博士中心",
        30: "可持续发展学院",
        31: "体育学院",
        32: "新闻与新媒体学院",
        33: "物理学院",
        34: "化学学院",
        35: "联合设计与创新学院",
        36: "人工智能学院",
        37: "仪器科学与技术学院",
        81: "就创中心",
        96: "国家卓越工程师学院",
        97: "国家储能技术产教融合创新平台(中心)",
        98: "未来技术学院",
        99: "研究生院",
        "00": "其他",
      };
      return colleges[String(courseId || "").slice(0, 2)] || "";
    },
    parseCatalogSchedule(value) {
      const source = String(value || "").replace(/\s+/g, "");
      const roomMatches = [
        ...source.matchAll(/((?:创新港|兴庆|雁塔|曲江)校区-[^\s周]+)/g),
      ];
      const sections = roomMatches.length
        ? roomMatches.map((match, index) => ({
            room: match[1],
            text: source.slice(
              match.index + match[0].length,
              roomMatches[index + 1]
                ? roomMatches[index + 1].index
                : source.length,
            ),
          }))
        : [{ room: "", text: source }];
      const dayMap = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7 };
      const schedules = [];
      sections.forEach((section) => {
        const weekMatches = [
          ...section.text.matchAll(/周次:第(\d+(?:-\d+)?)周\s*连续周/g),
        ];
        weekMatches.forEach((weekMatch, index) => {
          const weekText = weekMatch[1].includes("-")
            ? weekMatch[1]
            : `${weekMatch[1]}-${weekMatch[1]}`;
          const timeText = section.text.slice(
            weekMatch.index + weekMatch[0].length,
            weekMatches[index + 1]
              ? weekMatches[index + 1].index
              : section.text.length,
          );
          [...timeText.matchAll(/星期([一二三四五六日])([^星期]*)/g)].forEach(
            (dayMatch) => {
              const periods = [
                ...new Set(
                  [...dayMatch[2].matchAll(/(?:上|下|晚)(\d+)/g)].map(
                    (periodMatch) => Number(periodMatch[1]),
                  ),
                ),
              ].sort((left, right) => left - right);
              if (dayMap[dayMatch[1]] && periods.length) {
                schedules.push({
                  day: dayMap[dayMatch[1]],
                  periods: periods.join(","),
                  weekText,
                  room: section.room || "待定",
                });
              }
            },
          );
        });
      });
      return schedules;
    },
    mergeCatalogSchedules(schedules) {
      let current = schedules.map((schedule) => ({ ...schedule }));
      while (true) {
        const byPeriod = new Map();
        current.forEach((schedule) => {
          const key = `${schedule.room}|${schedule.day}|${schedule.weekText}`;
          const item = byPeriod.get(key) || { ...schedule, periods: [] };
          item.periods.push(...String(schedule.periods).split(",").map(Number));
          byPeriod.set(key, item);
        });
        const periodMerged = [...byPeriod.values()].map((schedule) => ({
          ...schedule,
          periods: [...new Set(schedule.periods)]
            .sort((left, right) => left - right)
            .join(","),
        }));
        const byWeek = new Map();
        periodMerged.forEach((schedule) => {
          const key = `${schedule.room}|${schedule.day}|${schedule.periods}`;
          const items = byWeek.get(key) || [];
          items.push(schedule);
          byWeek.set(key, items);
        });
        const next = [];
        byWeek.forEach((items) => {
          items.sort(
            (left, right) =>
              Number(left.weekText.split("-")[0]) -
              Number(right.weekText.split("-")[0]),
          );
          let merged = null;
          items.forEach((item) => {
            const [start, end] = item.weekText.split("-").map(Number);
            if (merged && start <= merged.end + 1) {
              merged.end = Math.max(merged.end, end);
            } else {
              if (merged)
                next.push({
                  ...merged.item,
                  weekText: `${merged.start}-${merged.end}`,
                });
              merged = { item, start, end };
            }
          });
          if (merged)
            next.push({
              ...merged.item,
              weekText: `${merged.start}-${merged.end}`,
            });
        });
        if (next.length >= current.length) return next;
        current = next;
      }
    },
    parseCourseCatalogHtml(text) {
      const documentNode = new DOMParser().parseFromString(text, "text/html");
      const table = documentNode.querySelector("#objTables");
      if (!table) throw new Error("missing course catalog table");
      const duplicateClasses = new Map();
      const courses = [];
      table.querySelectorAll("tbody tr").forEach((row) => {
        const cells = Array.from(row.children)
          .filter((cell) => cell.tagName === "TD")
          .map((cell) => cell.textContent.replace(/\s+/g, " ").trim());
        const courseId = this.formatCatalogCourseId(cells[1]);
        const courseName = cells[2] || "";
        if (!courseId || !courseName) return;
        const originalClassName = cells[3] || "未分班";
        const duplicateKey = `${courseId}-${originalClassName}`;
        const duplicateIndex = duplicateClasses.get(duplicateKey) || 0;
        duplicateClasses.set(duplicateKey, duplicateIndex + 1);
        courses.push({
          id: courseId,
          college: this.catalogCollege(courseId),
          name: courseName,
          className: duplicateIndex
            ? `${originalClassName}_${duplicateIndex}`
            : originalClassName,
          credit: cells[4] || "/",
          hours: cells[5] || "",
          teacher: cells[6] || "",
          schedules: this.mergeCatalogSchedules(
            this.parseCatalogSchedule(cells[7]),
          ),
        });
      });
      if (!courses.length) throw new Error("empty course catalog");
      const maxSlots = Math.max(
        ...courses.map((course) => course.schedules.length),
        0,
      );
      const headers = [
        "课程编号",
        "学院",
        "课程名称",
        "班级",
        "学分",
        "学时",
        "主讲教师",
      ];
      for (let index = 1; index <= maxSlots; index += 1)
        headers.push(
          `教室${index}`,
          `星期几${index}`,
          `节次${index}`,
          `周次${index}`,
        );
      const rows = [
        headers,
        ...courses.map((course) => {
          const record = {
            课程编号: course.id,
            学院: course.college,
            课程名称: course.name,
            班级: course.className,
            学分: course.credit,
            学时: course.hours,
            主讲教师: course.teacher,
          };
          course.schedules.forEach((schedule, index) => {
            const number = index + 1;
            record[`教室${number}`] = schedule.room;
            record[`星期几${number}`] = schedule.day;
            record[`节次${number}`] = schedule.periods;
            record[`周次${number}`] = schedule.weekText;
          });
          return headers.map((header) => record[header] || "");
        }),
      ];
      return {
        rows,
        courseCount: new Set(courses.map((course) => course.id)).size,
        classCount: courses.length,
      };
    },
    parsePlanHtml(text) {
      const documentNode = new DOMParser().parseFromString(text, "text/html");
      const categoryMap = {
        外语课: "外语课组",
        公共课: "公共课组",
        专业学位课: "专业课组",
        选修课: "选修课组",
        必修环节: "必修环节",
      };
      const selected = [];
      const categoryMinimums = {};
      const lastGroupNumberByType = new Map();
      const unnamedGroupNumberByType = new Map();
      let currentType = "";
      documentNode.querySelectorAll("#tbl tr").forEach((row) => {
        if (row.classList.contains("tables_set_query")) {
          const category = (row.querySelector("b") || {}).textContent || "";
          currentType = categoryMap[category.trim()] || "";
          const requirement = row.textContent.match(
            /最低要求学分\s*\(?\s*(\d+(?:\.\d+)?)/,
          );
          if (currentType && requirement)
            categoryMinimums[currentType] = Number(requirement[1]);
          unnamedGroupNumberByType.delete(currentType);
          return;
        }
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (!currentType || !checkbox) return;
        const cells = Array.from(row.children)
          .filter((cell) => cell.tagName === "TD")
          .map((cell) => cell.textContent.replace(/\s+/g, " ").trim());
        const groupText = cells[1] || "";
        const explicitGroupNumber = (groupText.match(/第\s*(\d+)\s*组/) ||
          [])[1];
        let groupNumber;
        if (explicitGroupNumber) {
          groupNumber = Number(explicitGroupNumber);
          lastGroupNumberByType.set(currentType, groupNumber);
          unnamedGroupNumberByType.delete(currentType);
        } else {
          groupNumber = unnamedGroupNumberByType.get(currentType);
          if (!groupNumber) {
            groupNumber = (lastGroupNumberByType.get(currentType) || 0) + 1;
            lastGroupNumberByType.set(currentType, groupNumber);
            unnamedGroupNumberByType.set(currentType, groupNumber);
          }
        }
        if (!checkbox.checked) return;
        const courseId = cells[2] || "";
        const courseName = cells[3] || "";
        if (!courseId || !courseName) return;
        const requirement = groupText.match(/选\s*(\d+(?:\.\d+)?)\s*(门|分)/);
        const groupName = `${currentType}（${groupNumber}）`;
        selected.push({
          key: `${currentType}-${groupNumber}-${courseId}`,
          groupKey: `${currentType}-${groupNumber}`,
          groupName,
          type: currentType,
          limit: requirement ? Number(requirement[1]) : null,
          unit: requirement && requirement[2] === "分" ? "credit" : "course",
          courseId,
          courseName,
        });
      });
      if (!selected.length) throw new Error("no selected courses");
      const success = [];
      const failed = [];
      selected.forEach((item) => {
        const importedId = String(item.courseId).replace(/\s+/g, "");
        const courseKeys = this.courses
          .filter((course) => {
            if (!this.matchesPlanCampus(course)) return false;
            const localId = String(course.id).replace(/\s+/g, "");
            return item.type === "外语课组"
              ? localId.slice(-6) === importedId.slice(-6)
              : localId === importedId;
          })
          .map((course) => course.key);
        (courseKeys.length ? success : failed).push({ ...item, courseKeys });
      });
      return { success, failed, categoryMinimums };
    },
    matchesPlanCampus(course) {
      if (this.planCampus === "待定") return true;
      const firstRoom = String(
        course.primaryRoom || course.meetings[0]?.room || "",
      );
      const hasCampus = /(?:创新港|兴庆|雁塔|曲江)校区/.test(firstRoom);
      return !hasCampus || firstRoom.includes(this.planCampus);
    },
    applyPlanImport() {
      const review = this.planImportReview;
      if (!review) return;
      const importedGroups = new Map();
      this.categoryMinimums = {
        ...this.categoryMinimums,
        ...(review.categoryMinimums || {}),
      };
      review.success.forEach((item) => {
        let group = importedGroups.get(item.groupKey);
        if (!group) {
          group = this.groups.find(
            (candidate) => candidate.name === item.groupName,
          );
          if (!group) {
            group = {
              id: `import-${Date.now()}-${item.groupKey}`,
              type: item.type,
              name: item.groupName,
              limit: item.limit,
              unit: item.unit,
              courseKeys: [],
              open: true,
            };
            this.groups.push(group);
          } else if (item.limit) {
            group.limit = item.limit;
            group.unit = item.unit;
          }
          importedGroups.set(item.groupKey, group);
        }
        item.courseKeys.forEach((key) => {
          if (!group.courseKeys.includes(key)) group.courseKeys.push(key);
          if (!this.planKeys.includes(key)) this.planKeys.push(key);
        });
      });
      const importedCount = review.success.length;
      this.planImportReview = null;
      this.tab = "plan";
      this.planImportNoticeMsg(
        this.lang === "zh"
          ? `已导入 ${importedCount} 门课程至培养方案`
          : `${importedCount} courses were added to the study plan.`,
        true,
      );
    },
    planImportNoticeMsg(text, centered = true) {
      this.planImportNotice = text;
      this.planImportNoticeCenter = centered;
      clearTimeout(this.planImportNoticeTimer);
      this.planImportNoticeTimer = setTimeout(() => {
        this.planImportNotice = "";
        this.planImportNoticeCenter = false;
      }, 2200);
    },
    noticeMsg(text) {
      this.notice = text;
      clearTimeout(this.noticeTimer);
      this.noticeTimer = setTimeout(() => (this.notice = ""), 2200);
    },
    clearFilters() {
      Object.keys(this.filters).forEach((k) => (this.filters[k] = ""));
      this.searchPage = 1;
    },
    changeSearchPage(step) {
      this.searchPage = Math.min(
        this.totalPages,
        Math.max(1, this.searchPage + step),
      );
    },
    addToPlan(c) {
      if (this.planKeys.includes(c.key)) {
        this.focusPlan(c.key);
        return;
      }
      this.planKeys.push(c.key);
      this.noticeMsg(
        this.lang === "zh" ? "已加入培养方案" : "Added to the study plan",
      );
    },
    removePlan(key) {
      this.planKeys = this.planKeys.filter((k) => k !== key);
      this.activeKeys = this.activeKeys.filter((k) => k !== key);
      this.groups.forEach(
        (g) => (g.courseKeys = g.courseKeys.filter((k) => k !== key)),
      );
    },
    toggleSchedule(c) {
      if (this.activeKeys.includes(c.key)) {
        this.activeKeys = this.activeKeys.filter((k) => k !== c.key);
        return;
      }
      if (!c.meetings.length) {
        this.activeKeys.push(c.key);
        this.noticeMsg(
          this.lang === "zh"
            ? "该课程缺少上课时间，已加入待安排课程"
            : "This course has no class time and was added to Unscheduled Courses",
        );
        return;
      }
      const selectedClass = this.courses.find(
        (course) =>
          course.id === c.id &&
          course.key !== c.key &&
          this.activeKeys.includes(course.key),
      );
      if (selectedClass) {
        this.noticeMsg(
          this.lang === "zh"
            ? `课程号 ${c.id} 仅可选择一个班，请先移出 ${selectedClass.className}`
            : `Only one class may be selected for course ${c.id}. Remove ${selectedClass.className} first.`,
        );
        return;
      }
      this.activeKeys.push(c.key);
      if (!c.meetings[0].weeks.includes(this.week))
        this.week = c.meetings[0].weeks[0];
    },
    focusPlan(key) {
      this.groups
        .filter((group) => group.courseKeys.includes(key))
        .forEach((group) => {
          group.open = true;
        });
      this.tab = "plan";
      this.focusedKey = key;
      this.$nextTick(() => {
        document
          .querySelector(".focused")
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    },
    createGroup() {
      const type = this.groupDraft.type;
      const n =
        this.groups.reduce((max, group) => {
          if (group.type !== type) return max;
          const number = Number(
            (String(group.name).match(/（(\d+)）$/) || [])[1],
          );
          return Math.max(max, number || 0);
        }, 0) + 1;
      this.groups.push({
        id: Date.now(),
        type,
        name: type + "（" + n + "）",
        limit: this.groupDraft.limit || null,
        unit: this.groupDraft.unit,
        courseKeys: [],
        open: true,
      });
      this.groupDraft.limit = null;
    },
    toggleAllGroups() {
      const shouldOpen = this.groups.some((group) => !group.open);
      this.groups.forEach((group) => {
        group.open = shouldOpen;
      });
    },
    toggleGroupOpen(group) {
      if (this.draggedGroup) return;
      group.open = !group.open;
    },
    startGroupDrag(event, group) {
      this.draggingGroupId = group.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(group.id));
      requestAnimationFrame(() => {
        this.draggedGroup = true;
      });
    },
    dropGroup(event, targetGroup) {
      const draggedId =
        this.draggingGroupId || event.dataTransfer.getData("text/plain");
      if (!draggedId || draggedId === targetGroup.id) return;
      const from = this.groups.findIndex(
        (group) => String(group.id) === String(draggedId),
      );
      const to = this.groups.findIndex((group) => group.id === targetGroup.id);
      if (from < 0 || to < 0) return;
      const [group] = this.groups.splice(from, 1);
      this.groups.splice(to, 0, group);
    },
    endGroupDrag() {
      this.draggingGroupId = "";
      this.dragOverGroupId = "";
      window.setTimeout(() => {
        this.draggedGroup = false;
      }, 0);
    },
    coursesInGroup(g) {
      return this.courses.filter((c) => g.courseKeys.includes(c.key));
    },
    groupsForType(type) {
      return this.groups.filter((group) => group.type === type);
    },
    groupCourseSummary(group) {
      const names = [
        ...new Set(
          this.coursesInGroup(group)
            .map((course) => course.name)
            .filter(Boolean),
        ),
      ];
      if (!names.length) return this.lang === "zh" ? "暂无课程" : "No courses";
      return `${names.slice(0, 2).join("、")}${names.length > 2 ? "…" : ""}`;
    },
    parentGroupCredits(type) {
      const keys = new Set(
        this.groupsForType(type).flatMap((group) => group.courseKeys),
      );
      const selected = this.courses.filter(
        (course) =>
          keys.has(course.key) && this.activeKeys.includes(course.key),
      );
      const uniqueCourses = [
        ...new Map(selected.map((course) => [course.id, course])).values(),
      ];
      return uniqueCourses.reduce(
        (sum, course) => sum + (Number(course.credit) || 0),
        0,
      );
    },
    parentMinimumCredits(type) {
      return Number(this.categoryMinimums[type] || 0);
    },
    openParentMinimumEditor(type) {
      this.parentMinimumModal = {
        type,
        value: this.parentMinimumCredits(type),
      };
    },
    saveParentMinimum() {
      if (!this.parentMinimumModal) return;
      const value = Math.max(0, Number(this.parentMinimumModal.value) || 0);
      this.$set(this.categoryMinimums, this.parentMinimumModal.type, value);
      this.parentMinimumModal = null;
    },
    hasParentMinimum(type) {
      return Object.prototype.hasOwnProperty.call(this.categoryMinimums, type);
    },
    groupValue(g) {
      const list = this.coursesInGroup(g).filter((course) =>
        this.activeKeys.includes(course.key),
      );
      const uniqueCourses = [
        ...new Map(list.map((course) => [course.id, course])).values(),
      ];
      return g.unit === "credit"
        ? uniqueCourses.reduce((s, c) => s + (Number(c.credit) || 0), 0)
        : uniqueCourses.length;
    },
    addToGroup(g) {
      const c = this.groupModal.course;
      if (!g.courseKeys.includes(c.key)) g.courseKeys.push(c.key);
      this.groupModal = null;
      this.noticeMsg(
        this.lang === "zh"
          ? "已加入 " + g.name
          : `Added to ${this.groupLabel(g.name)}`,
      );
    },
    removeFromGroup(g, key) {
      g.courseKeys = g.courseKeys.filter((k) => k !== key);
    },
    deleteGroup(g) {
      const courseKeys = new Set(g.courseKeys);
      this.planKeys = this.planKeys.filter((key) => !courseKeys.has(key));
      this.activeKeys = this.activeKeys.filter((key) => !courseKeys.has(key));
      this.groups.forEach((group) => {
        group.courseKeys = group.courseKeys.filter(
          (key) => !courseKeys.has(key),
        );
      });
      this.groups = this.groups.filter((x) => x.id !== g.id);
      if (courseKeys.has(this.focusedKey)) this.focusedKey = "";
      this.noticeMsg(
        this.lang === "zh"
          ? "已删除 " + g.name
          : `Deleted ${this.groupLabel(g.name)}`,
      );
    },
    classesAt(day, period) {
      const active = this.courses.filter(
        (c) =>
          this.activeKeys.includes(c.key) &&
          c.meetings.some(
            (m) =>
              m.day === day &&
              m.periods.includes(period) &&
              m.weeks.includes(this.week),
          ),
      );
      const hover = this.courses.find((c) => c.key === this.hoveredKey);
      if (
        hover &&
        !active.some((c) => c.key === hover.key) &&
        hover.meetings.some(
          (m) =>
            m.day === day &&
            m.periods.includes(period) &&
            m.weeks.includes(this.week),
        )
      )
        active.push(hover);
      return active;
    },
    allClassesAt(day, period) {
      const merged = new Map();
      this.courses
        .filter((course) => this.activeKeys.includes(course.key))
        .forEach((course) =>
          course.meetings
            .filter(
              (meeting) =>
                meeting.day === day && meeting.periods.includes(period),
            )
            .forEach((meeting) => {
              const key = `${course.id}-${course.className}-${meeting.room}`;
              const item = merged.get(key) || {
                key: `${course.key}-${day}-${period}-${meeting.room}`,
                course,
                room: meeting.room,
                meetings: [],
              };
              item.meetings.push(meeting);
              merged.set(key, item);
            }),
        );
      return [...merged.values()]
        .map((item) => {
          const weeks = [
            ...new Set(item.meetings.flatMap((meeting) => meeting.weeks)),
          ].sort((a, b) => a - b);
          return {
            ...item,
            weekText: this.formatWeeks(weeks),
            startWeek: weeks[0],
          };
        })
        .sort((a, b) => a.startWeek - b.startWeek);
    },
    weekClassesAt(day, period) {
      const items = new Map();
      this.courses
        .filter((course) => this.activeKeys.includes(course.key))
        .forEach((course) =>
          course.meetings
            .filter((meeting) => meeting.day === day && meeting.periods.includes(period) && meeting.weeks.includes(this.week))
            .forEach((meeting) => {
              const key = `${course.key}|${meeting.room}`;
              if (!items.has(key)) items.set(key, { key, course, room: meeting.room, startWeek: this.week });
            }),
        );
      return [...items.values()];
    },
    buildWeekCompactDayLayout(day) {
      const activeRuns = new Map();
      const candidates = [];
      for (let period = 1; period <= 11; period += 1) {
        this.weekClassesAt(day, period).forEach((item) => {
          const identity = `${item.course.key}|${item.room}`;
          const previous = activeRuns.get(identity);
          if (previous && previous.end === period - 1) previous.end = period;
          else {
            const candidate = { ...item, key: `${identity}|${period}`, start: period, end: period, lane: 0, split: false };
            candidates.push(candidate);
            activeRuns.set(identity, candidate);
          }
        });
      }
      candidates.sort((a, b) => a.start - b.start || a.course.key.localeCompare(b.course.key));
      const placed = [];
      const overlap = (a, b) => a.start <= b.end && b.start <= a.end;
      candidates.forEach((candidate) => {
        const lane = [0, 1].find((value) => !placed.some((item) => item.lane === value && overlap(item, candidate)));
        if (lane === undefined) return;
        candidate.lane = lane;
        placed.push(candidate);
      });
      placed.forEach((candidate) => {
        candidate.split = placed.some((item) => item !== candidate && overlap(item, candidate));
      });
      return { placed };
    },
    weekCompactDisplayedClasses(day, period) {
      return (this.weekCompactLayouts[day]?.placed || []).filter((item) => item.start === period);
    },
    buildCompactDayLayout(day) {
      const activeRuns = new Map();
      const candidates = [];
      for (let period = 1; period <= 11; period += 1) {
        this.allClassesAt(day, period).forEach((item) => {
          const identity = `${item.course.key}|${item.room}|${item.weekText}`;
          const previous = activeRuns.get(identity);
          if (previous && previous.end === period - 1) {
            previous.end = period;
          } else {
            const candidate = {
              ...item,
              key: `${identity}|${period}`,
              start: period,
              end: period,
              lane: 0,
              split: false,
            };
            candidates.push(candidate);
            activeRuns.set(identity, candidate);
          }
        });
      }
      candidates.sort((a, b) => a.startWeek - b.startWeek || a.start - b.start || a.course.key.localeCompare(b.course.key));
      const placed = [];
      const overflow = [];
      const overlap = (a, b) => a.start <= b.end && b.start <= a.end;
      candidates.forEach((candidate) => {
        const lane = [0, 1].find((value) => !placed.some((item) => item.lane === value && overlap(item, candidate)));
        if (lane === undefined) {
          overflow.push(candidate);
          return;
        }
        candidate.lane = lane;
        placed.push(candidate);
      });
      placed.forEach((candidate) => {
        candidate.split = placed.some((item) => item !== candidate && overlap(item, candidate));
      });
      return { placed, overflow };
    },
    compactDayLayout(day) {
      return this.compactLayouts[day] || { placed: [], overflow: [] };
    },
    compactDisplayedClasses(day, period) {
      return this.compactDayLayout(day).placed.filter((item) => item.start === period);
    },
    compactCardStyle(day, period, item) {
      const span = item.end - item.start + 1;
      return {
        height: `${span * 66 - 4}px`,
        width: item.split ? "calc(50% - 3px)" : "calc(100% - 4px)",
        left: item.split && item.lane === 1 ? "calc(50% + 1px)" : "2px",
        top: "2px",
        bottom: "auto",
        right: "auto",
        zIndex: 2,
      };
    },
    compactOverflowCourses() {
      const overflow = new Map();
      for (let day = 1; day <= 7; day += 1) {
        this.compactDayLayout(day).overflow.forEach((item) => overflow.set(item.course.key, item.course));
      }
      return [...overflow.values()];
    },
    toggleScheduleLayout() {
      const next = this.mineLayout === "list" && this.weekLayout === "list" ? "compact" : "list";
      this.mineLayout = next;
      this.weekLayout = next;
    },
    room(c, d, p) {
      return (
        c.meetings.find((m) => m.day === d && m.periods.includes(p))?.room ||
        "待定"
      );
    },
    courseTime(c) {
      return c.meetings
        .map((m) =>
          this.lang === "zh"
            ? `${m.weekText}周，${this.days[m.day - 1]} ${this.formatPeriods(
                m.periods,
              )}节`
            : `Weeks ${m.weekText}, ${
                this.days[m.day - 1]
              } P${this.formatPeriods(m.periods)}`,
        )
        .join("；");
    },
    formatPeriods(periods) {
      const list = [...new Set(periods)].sort((a, b) => a - b);
      if (!list.length) return "";
      const ranges = [];
      let start = list[0];
      let end = list[0];
      list.slice(1).forEach((period) => {
        if (period === end + 1) {
          end = period;
          return;
        }
        ranges.push(start === end ? String(start) : `${start}-${end}`);
        start = period;
        end = period;
      });
      ranges.push(start === end ? String(start) : `${start}-${end}`);
      return ranges.join("、");
    },
    periodRanges(periods) {
      const list = [...new Set(periods || [])].sort((a, b) => a - b);
      if (!list.length) return [];
      const ranges = [];
      let start = list[0];
      let end = list[0];
      list.slice(1).forEach((period) => {
        if (period === end + 1) {
          end = period;
          return;
        }
        ranges.push([start, end]);
        start = period;
        end = period;
      });
      ranges.push([start, end]);
      return ranges;
    },
    exportSchedule(skipWarning = false) {
      const selectedCourses = this.courses.filter((course) => this.activeKeys.includes(course.key));
      if (this.conflictWeeks.length) {
        this.exportConflictWeeks = this.conflictWeeks;
        return;
      }
      const missingCourses = selectedCourses.filter((course) => !course.meetings.length);
      if (skipWarning !== true && missingCourses.length) {
        this.exportWarning = missingCourses;
        return;
      }
      if (!selectedCourses.length) {
        this.noticeMsg(this.lang === "zh" ? "没有可导出的已排课课程" : "No scheduled courses to export");
        return;
      }
      const rows = [["课程名称", "星期", "开始节数", "结束节数", "老师", "地点", "周数"]];
      selectedCourses
        .forEach((course) =>
          course.meetings.forEach((meeting) => {
            const weeks = (this.formatWeeks(meeting.weeks) || "1-18").replace(/,/g, "、");
            this.periodRanges(meeting.periods).forEach(([start, end]) =>
              rows.push([
                course.name || "无",
                String(meeting.day),
                String(start),
                String(end),
                course.teacher || "无",
                meeting.room && meeting.room !== "待定" ? meeting.room : "无",
                weeks,
              ]),
            );
          }),
        );
      const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
      const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escape).join(",")).join("\r\n")}`], {
        type: "text/csv;charset=utf-8",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = "XJTU_Schedule_Plan.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      this.noticeMsg(this.lang === "zh" ? `已导出 ${rows.length - 1} 条排课记录` : `Exported ${rows.length - 1} schedule entries`);
    },
    confirmExportSchedule() {
      this.exportWarning = null;
      this.exportSchedule(true);
    },
    formatWeeks(weeks) {
      const list = [...new Set(weeks)].sort((a, b) => a - b);
      if (!list.length) return "";
      const ranges = [];
      let start = list[0];
      let end = list[0];
      list.slice(1).forEach((week) => {
        if (week === end + 1) {
          end = week;
          return;
        }
        ranges.push(start === end ? String(start) : `${start}-${end}`);
        start = week;
        end = week;
      });
      ranges.push(start === end ? String(start) : `${start}-${end}`);
      return ranges.join(",");
    },
    conflictsFor(w) {
      const cells = {};
      this.courses
        .filter((c) => this.activeKeys.includes(c.key))
        .forEach((c) =>
          c.meetings
            .filter((m) => m.weeks.includes(w))
            .forEach((m) =>
              m.periods.forEach((p) => {
                const k = m.day + "-" + p;
                (cells[k] || (cells[k] = [])).push(c);
              }),
            ),
        );
      return Object.entries(cells)
        .filter(([, cs]) => cs.length > 1)
        .map(([k, courses]) => {
          const [day, period] = k.split("-");
          return { key: k, day: +day, period: +period, courses };
        });
    },
    openConflict(item) {
      this.conflictModal = item;
      this.keepKey = item.courses[0].key;
    },
    resolveConflict() {
      const keys = new Set(this.conflictModal.courses.map((c) => c.key));
      this.activeKeys = this.activeKeys.filter(
        (k) => !keys.has(k) || k === this.keepKey,
      );
      this.conflictModal = null;
    },
    nums(s, max) {
      const r = [];
      String(s)
        .match(/\d+(?:\s*[-~至]\s*\d+)?/g)
        ?.forEach((x) => {
          const a = x.match(/\d+/g).map(Number);
          for (let n = a[0]; n <= (a[1] || a[0]); n++) r.push(n);
        });
      return r.filter((n) => n > 0 && n <= max);
    },
    async upload(e) {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const zip = await this.unzip(new Uint8Array(await file.arrayBuffer())),
          parser = new DOMParser(),
          decode = (b) => new TextDecoder().decode(b),
          shared = zip["xl/sharedStrings.xml"]
            ? [
                ...parser
                  .parseFromString(
                    decode(zip["xl/sharedStrings.xml"]),
                    "text/xml",
                  )
                  .querySelectorAll("si"),
              ].map((n) =>
                [...n.querySelectorAll("t")].map((t) => t.textContent).join(""),
              )
            : [],
          sheet = Object.keys(zip).find((x) =>
            /worksheets\/sheet\d+\.xml$/.test(x),
          );
        if (!sheet) throw Error();
        const rows = [
            ...parser
              .parseFromString(decode(zip[sheet]), "text/xml")
              .querySelectorAll("sheetData row"),
          ].map((r) => {
            const a = [];
            r.querySelectorAll("c").forEach((c) => {
              let col = 0;
              for (const x of c.getAttribute("r").match(/[A-Z]+/)[0])
                col = col * 26 + x.charCodeAt(0) - 64;
              let v =
                c.getAttribute("t") === "inlineStr"
                  ? [...c.querySelectorAll("t")]
                      .map((t) => t.textContent)
                      .join("")
                  : (c.querySelector("v") || {}).textContent || "";
              a[col - 1] = c.getAttribute("t") === "s" ? shared[+v] : v;
            });
            return a;
          }),
          headers = rows[0],
          get = (r, n) => String(r[headers.indexOf(n)] || "").trim();
        this.courses = rows
          .slice(1)
          .map((r) => {
            const meetings = [];
            for (let i = 1; i <= 14; i++) {
              const day = +get(r, "星期几" + i),
                p = get(r, "节次" + i);
              if (day && p)
                meetings.push({
                  day,
                  periods: this.nums(p, 11),
                  weeks: this.nums(get(r, "周次" + i) || "1-18", 18),
                  weekText: get(r, "周次" + i) || "1-18",
                  room: get(r, "教室" + i) || "待定",
                });
            }
            const id = get(r, "课程编号"),
              className = get(r, "班级") || "未分班",
              teacher = get(r, "主讲教师"),
              key = id + "-" + className + "-" + teacher,
              hash = [...key].reduce((a, x) => a * 31 + x.charCodeAt(0), 0);
            return {
              key,
              id,
              name: get(r, "课程名称"),
              className,
              credit: get(r, "学分") || "/",
              teacher,
              meetings,
              rooms: [...new Set(meetings.map((m) => m.room))].join("；"),
              college: resolveCollege(id, get(r, "学院")),
              major: get(r, "专业"),
              color:
                COLORS[
                  Math.abs(Math.imul(hash ^ (hash >>> 16), 2654435761)) %
                    COLORS.length
                ],
            };
          })
          .filter((c) => c.id && c.name);
        this.initial = this.snapshot();
        this.noticeMsg("已导入 " + this.courses.length + " 条课程");
      } catch (err) {
        this.noticeMsg("导入失败，请使用标准 .xlsx 文件");
      }
      e.target.value = "";
    },
    async unzip(data) {
      const out = {},
        view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      let p = 0;
      while (p + 30 < data.length && view.getUint32(p, true) === 0x04034b50) {
        const method = view.getUint16(p + 8, true),
          size = view.getUint32(p + 18, true),
          nl = view.getUint16(p + 26, true),
          el = view.getUint16(p + 28, true),
          name = new TextDecoder().decode(data.slice(p + 30, p + 30 + nl)),
          start = p + 30 + nl + el,
          b = data.slice(start, start + size);
        out[name] = method
          ? new Uint8Array(
              await new Response(
                new Blob([b])
                  .stream()
                  .pipeThrough(new DecompressionStream("deflate-raw")),
              ).arrayBuffer(),
            )
          : b;
        p = start + size;
      }
      return out;
    },
  },
};
</script>
<style scoped>
.week-layout {
  width: 100%;
  max-width: 1400px;
  margin: auto;
  padding: 0;
}
.week-layout .weekbar {
  max-width: none;
  width: 100%;
  margin: 15px 0 0;
}
.course-card b {
  white-space: normal !important;
  display: block !important;
  overflow: visible !important;
  text-overflow: clip !important;
  line-height: 13px;
}
.course-card span:not(.tooltip) {
  margin-top: 2px;
}
.week-layout {
  max-width: 1400px;
  margin: auto;
}
.week-layout .weekbar {
  max-width: 61%;
  margin-left: 0;
}
.weekbar button {
  display: none;
}
.weekbar .my-schedule-button {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 9px;
  border: 1px solid #d8e0eb;
  border-radius: 5px;
  background: #fff;
  color: #52647d;
  font: inherit;
  white-space: nowrap;
}
.weekbar .my-schedule-button.active {
  border-color: #4773df;
  background: #edf3ff;
  color: #416bd4;
}
.week-layout > .import-actions {
  display: flex;
  align-items: stretch;
  gap: 8px;
  align-self: stretch;
  margin-top: 15px;
}
.week-layout > .import-actions > button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 1px solid #4773df;
  border-radius: 8px;
  background: #4773df;
  color: #fff;
  font: inherit;
  white-space: nowrap;
}
.course-card {
  overflow: visible;
}
.course-card > span:not(.tooltip) {
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.group-toggle,
.delete-group {
  height: 24px;
  display: inline-flex;
  align-items: center;
  border: 1px solid #d8e0eb;
  border-radius: 5px;
  background: #fff;
  color: #6d7d94;
  padding: 3px 6px;
  font-size: 10px;
}
.group-list article {
  align-items: center;
}
.group-list article > div {
  min-width: 0;
  flex: 1;
}
.group-list article p {
  margin: 3px 0;
  color: #69788d;
}
.group-list .cancel {
  border-radius: 6px;
  padding: 6px 8px;
  white-space: nowrap;
}
.schedule {
  align-self: start;
}
.conflicts {
  min-height: 0;
}
.layout > aside {
  display: flex;
  flex-direction: column;
}
.conflicts {
  margin-top: auto;
}
.course-list article > div {
  flex: 1;
}
.course-list article > button {
  width: 88px;
  flex: 0 0 88px;
  white-space: nowrap;
}
.course-list article > div:last-child {
  display: flex;
  gap: 5px;
  align-items: center;
  flex: 0 0 auto;
}
.focused {
  transition: outline 0.2s;
}
* {
  box-sizing: border-box;
}
.app {
  min-height: 100vh;
  background: #f5f7fb;
  color: #293852;
  font: 13px Arial, "Microsoft YaHei";
}
.header {
  height: 68px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 max(18px, calc((100% - 1400px) / 2));
  border-bottom: 1px solid #e6ebf2;
}
.logo {
  background: #466fd7;
  color: #fff;
  padding: 11px 7px;
  border-radius: 9px;
}
.header h1 {
  margin: 0;
  font-size: 18px;
}
.history-actions {
  display: flex;
  gap: 4px;
}
.history-button {
  width: 28px;
  height: 28px;
  border: 1px solid #d6e0f4;
  border-radius: 5px;
  background: #fff;
  color: #4773df;
  font-size: 19px;
  line-height: 1;
}
.history-button:disabled {
  color: #b8c3d6;
  border-color: #e5eaf3;
  cursor: not-allowed;
}
.header-links {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.header-links a,
.language-button {
  border: 1px solid #d6e0f4;
  border-radius: 5px;
  background: #fff;
  color: #416dd5;
  padding: 7px 9px;
  font: inherit;
  font-size: 12px;
  text-decoration: none;
  white-space: nowrap;
}
.language-button {
  cursor: pointer;
}
.header small {
  color: #8c98aa;
}
.redo {
  margin-left: 0;
  border: 1px solid #cbd8f6;
  background: #f4f7ff;
  color: #416dd5;
  border-radius: 5px;
  padding: 7px 10px;
}
.weekbar,
.layout {
  max-width: 1400px;
  margin: auto;
}
.weekbar {
  margin-top: 15px;
  padding: 13px 18px;
  background: #fff;
  border: 1px solid #e2e8f1;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 7px;
}
.weekbar input {
  flex: 1;
}
.weekbar button {
  border: 0;
  background: none;
  font-size: 11px;
  color: #8290a3;
}
.weekbar .on,
.tabs .on {
  background: #eaf0ff;
  color: #416bd4;
  border-radius: 5px;
}
.layout {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 16px;
  margin-top: 16px;
}
.card {
  background: #fff;
  border: 1px solid #e2e8f1;
  border-radius: 10px;
  overflow: hidden;
}
.heading {
  padding: 15px;
  border-bottom: 1px solid #edf0f5;
}
.heading h2 {
  display: inline;
  font-size: 15px;
}
.heading small {
  margin-left: 8px;
  color: #8c98aa;
}
.schedule-mode-button {
  float: right;
  min-width: 72px;
  height: 26px;
  border: 1px solid #11406c;
  border-radius: 6px;
  background: #fff;
  color: #11406c;
  font-size: 11px;
  cursor: pointer;
}
table {
  width: calc(100% - 20px);
  margin: 0 10px 10px;
  border-collapse: collapse;
  table-layout: fixed;
}
.schedule > table th:first-child {
  width: 34px;
  padding-left: 0;
  padding-right: 0;
}
th,
td {
  border: 1px solid #edf0f5;
}
th {
  height: 40px;
  background: #fbfcfe;
  color: #65758d;
  font-weight: normal;
}
td {
  height: 66px;
  padding: 2px;
  vertical-align: top;
}
.split td,
.split th {
  border-top: 3px solid #d8dfeb;
}
.course-card {
  width: 100%;
  min-height: 60px;
  border: 0;
  border-radius: 4px;
  color: #fff;
  text-align: left;
  padding: 5px;
  position: relative;
}
.course-card b,
.course-card span,
.course-card small {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.course-card small {
  font-size: 9px;
  margin-top: 3px;
}
.ghost {
  opacity: 0.35;
}
.tooltip {
  position: absolute;
  z-index: 9;
  left: 50%;
  bottom: calc(100% + 6px);
  transform: translateX(-50%);
  width: 205px;
  background: #273952;
  color: #fff;
  padding: 9px;
  border-radius: 7px;
  font-size: 11px;
  line-height: 18px;
  box-shadow: 0 5px 16px #0004;
}
.tooltip strong {
  display: block;
  white-space: normal;
  overflow-wrap: anywhere;
}
.tabs {
  height: 54px;
  display: flex;
  align-items: end;
  border-bottom: 1px solid #e7ecf2;
  padding: 0 11px;
  gap: 4px;
}
.tabs button {
  height: 40px;
  border: 0;
  background: none;
  color: #65758d;
}
.tabs label {
  margin: 0 0 8px auto;
  border: 1px solid #c9d7fa;
  color: #416dd5;
  padding: 6px;
  border-radius: 5px;
  font-size: 11px;
}
.tabs input {
  display: none;
}
.filters {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.filters input,
.plan-tools select,
.plan-tools input {
  min-width: 0;
  height: 29px;
  border: 1px solid #d8e0eb;
  border-radius: 5px;
  padding: 6px;
  font-size: 11px;
}
.filters button,
.plan-tools button,
.course-list button {
  height: 29px;
  border: 0;
  border-radius: 5px;
  background: #4773df;
  color: #fff;
  padding: 6px 8px;
  font-size: 11px;
}
.filters button {
  justify-self: end;
  width: 45px;
}
.course-list {
  height: 480px;
  overflow: auto;
  border-top: 1px solid #edf0f5;
}
.course-list article {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 11px 14px;
  border-bottom: 1px solid #edf0f5;
  cursor: pointer;
}
.course-list article > div:first-child {
  min-width: 0;
}
.course-list code,
.course-list small {
  color: #8491a4;
  font-size: 11px;
}
.course-list h3,
.course-list p {
  margin: 3px 0;
}
.course-list h3 {
  font-size: 14px;
}
.plan-list h3 {
  font-size: 15px;
}
.my-schedule-table td {
  height: 66px;
  padding: 2px;
  vertical-align: top;
}
.compact-schedule-table .compact-cell {
  position: relative;
  overflow: visible;
}
.compact-schedule-table .compact-course-card {
  position: absolute;
  inset: 2px;
  width: calc(100% - 4px);
  min-height: 0;
}
.unscheduled-courses {
  margin-top: 12px;
  border-top: 1px solid #e3e8ef;
  background: #fbfcff;
}
.unscheduled-courses .heading {
  padding: 11px 15px;
}
.unscheduled-table {
  table-layout: auto;
}
.unscheduled-table th {
  height: 32px;
  background: #f1f5ff;
  font-size: 12px;
}
.unscheduled-table td {
  height: auto;
  padding: 7px 8px;
  vertical-align: middle;
}
.unscheduled-row {
  cursor: pointer;
}
.unscheduled-row:hover td {
  background: #f5f8ff;
}
.unscheduled-table .cancel {
  min-width: 72px;
  padding: 4px 8px;
  border-radius: 6px;
}
.unscheduled-table td:last-child {
  text-align: center;
}
.unscheduled-table th:nth-child(1),
.unscheduled-table td:nth-child(1),
.unscheduled-table th:nth-child(3),
.unscheduled-table td:nth-child(3),
.unscheduled-table th:nth-child(4),
.unscheduled-table td:nth-child(4),
.unscheduled-table th:nth-child(5),
.unscheduled-table td:nth-child(5) {
  text-align: center;
}
.empty-unscheduled {
  color: #8c98aa;
  text-align: center;
}
.all-course-card small {
  line-height: 13px;
  white-space: normal;
}
.empty-schedule {
  color: #8c98aa;
  text-align: center;
}
.course-list .added {
  background: #fff;
  border: 1px solid #4773df;
  color: #4773df;
}
.plan-tools {
  padding: 12px;
  background: #f8faff;
  font-size: 12px;
}
.plan-tools > div {
  display: flex;
  gap: 5px;
  margin-top: 9px;
}
.plan-tools input {
  width: 70px;
}
.danger,
.cancel {
  background: #fff !important;
  color: #c55d57 !important;
  border: 1px solid #efcfcc !important;
}
.group {
  position: relative;
  margin: 8px 12px;
  border: 1px solid #e3e8ef;
  border-radius: 6px;
  overflow: hidden;
}
.parent-group {
  margin: 10px 12px;
  border: 1px solid #d8e3f2;
  border-radius: 8px;
  overflow: hidden;
  background: #f8faff;
}
.parent-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 8px 10px;
  background: #eaf2ff;
  color: #294f79;
}
.parent-group-head b {
  font-size: 14px;
}
.parent-setting {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid #d6534b;
  border-radius: 5px;
  background: transparent;
  color: #d6534b;
  font-size: 12px;
  line-height: 20px;
  cursor: pointer;
}
.parent-setting:hover {
  background: #fff1f0;
  color: #b93d36;
  border-color: #b93d36;
}
.parent-group-head em {
  margin-left: auto;
  color: #526f90;
  font-size: 11px;
  font-style: normal;
  white-space: nowrap;
}
.parent-group-children {
  padding: 1px 0;
}
.parent-group-children:empty::before {
  content: "暂无小课组";
  display: block;
  padding: 9px 10px;
  color: #8b99ab;
  font-size: 11px;
}
.course-term {
  margin: 0;
  padding: 9px 12px 0;
  color: #293852;
  font-size: 12px;
}
.group.dragging {
  opacity: 0.48;
}
.group.drag-over {
  border-color: #6e91e8;
  box-shadow: 0 -3px 0 #4773df;
}
.delete-group {
  position: absolute;
  z-index: 1;
  top: 8px;
  left: 7px;
  color: #c55d57;
  border-color: #efcfcc;
}
.group-head {
  width: 100%;
  border: 0;
  background: #fbfcff;
  padding: 8px;
  display: flex;
  gap: 7px;
  align-items: center;
  cursor: grab;
  user-select: none;
}
.group-head:active {
  cursor: grabbing;
}
.delete-group + .group-head {
  padding-left: 52px;
}
.group-head em {
  margin-left: auto;
  font-style: normal;
  color: #69788d;
  font-size: 11px;
}
.over {
  color: #d6534b !important;
}
.complete {
  color: #259765 !important;
}
.under {
  color: #69788d !important;
}
.group-list article {
  padding: 8px 10px;
  border-top: 1px solid #edf0f5;
  display: flex;
  justify-content: space-between;
}
.group-list {
  max-height: 370px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
}
.group-list h3 {
  margin: 0;
  font-size: 14px;
}
.group-list small {
  color: #8491a4;
}
.plan-list {
  height: auto;
  max-height: 500px;
}
.selected {
  background: #edf4ff;
}
.focused {
  outline: 2px solid #5b85ec;
  outline-offset: -2px;
}
.conflicts {
  margin-top: 16px;
}
.chips {
  display: inline;
  margin-left: 10px;
}
.chips button {
  width: 22px;
  height: 22px;
  margin: 2px;
  border: 0;
  border-radius: 5px;
  color: #718096;
}
.chips .current {
  background: #e85b4d;
  color: #fff;
}
.conflict-row {
  width: 100%;
  text-align: left;
  border: 0;
  border-top: 1px solid #edf0f5;
  background: #fff;
  padding: 10px 15px;
  color: #53657d;
}
.conflict-row span {
  float: right;
  color: #4773df;
}
.conflicts > p {
  padding: 14px;
  color: #8c98aa;
}
.mask {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: #1f2d4277;
  display: grid;
  place-items: center;
}
.plan-import-mask {
  left: 75vw;
}
.plan-import-mask .modal {
  width: calc(100% - 24px);
  max-width: none;
}
.plan-import-mask .plan-review-modal {
  max-height: calc(100vh - 24px);
}
.plan-review-mask .plan-review-modal {
  width: min(920px, calc(100vw - 48px));
  height: min(680px, calc(100vh - 48px));
  max-height: calc(100vh - 48px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal {
  width: min(410px, calc(100% - 30px));
  background: #fff;
  border-radius: 10px;
  padding: 21px;
  position: relative;
}
.modal h2 {
  font-size: 17px;
}
.close {
  position: absolute;
  right: 12px;
  top: 8px;
  border: 0;
  background: none;
  font-size: 21px;
}
.modal label,
.choice {
  display: block;
  width: 100%;
  margin: 7px 0;
  padding: 10px;
  border: 1px solid #e3e8ef;
  border-radius: 6px;
  background: #fff;
  text-align: left;
}
.choice small {
  display: block;
  color: #8491a4;
  margin-top: 3px;
}
.group-choice-list {
  max-height: min(360px, calc(100vh - 210px));
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}
.primary {
  width: 100%;
  margin-top: 12px;
  border: 0;
  border-radius: 5px;
  background: #4773df;
  color: #fff;
  padding: 9px;
}
.campus-modal {
  width: min(360px, calc(100% - 30px));
}
.campus-option {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  padding: 10px 11px;
  border: 1px solid #dce4ee;
  border-radius: 6px;
  color: #52647d;
  cursor: pointer;
}
.campus-option.selected {
  border-color: #4773df;
  background: #edf4ff;
  color: #2f61bb;
}
.campus-modal .primary:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
.modal-actions .primary {
  margin-top: 0;
}
.parent-minimum-modal label {
  display: grid;
  gap: 6px;
  color: #526f90;
  font-size: 13px;
}
.parent-minimum-modal input {
  box-sizing: border-box;
  width: 100%;
  height: 34px;
  border: 1px solid #cbd9e8;
  border-radius: 7px;
  padding: 0 9px;
}
.export-warning-modal {
  width: min(460px, calc(100% - 30px));
}
.export-warning-list {
  max-height: 160px;
  margin: 10px 0 0;
  overflow: auto;
  padding-left: 20px;
  color: #526f90;
  font-size: 13px;
  line-height: 1.7;
}
.plan-upload-modal {
  width: min(470px, calc(100% - 30px));
}
.plan-upload-modal input {
  width: 100%;
  margin: 12px 0 0;
}
.plan-upload-modal .plan-file-input {
  display: none;
}
.plan-review-modal {
  width: min(820px, calc(100vw - 48px));
  max-height: calc(100vh - 48px);
  overflow: auto;
}
.plan-review-table-wrap {
  flex: 1 1 0;
  min-height: 96px;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid #e2e8f1;
  border-radius: 6px;
}
.plan-review-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-size: 13px;
  line-height: 1.2;
}
.plan-review-table th,
.plan-review-table td {
  height: auto;
  min-height: 0;
  padding: 5px 8px;
  border-bottom: 1px solid #edf0f5;
  text-align: left;
  vertical-align: middle;
}
.plan-review-table th {
  position: sticky;
  top: -1px;
  z-index: 2;
  height: 32px;
  padding: 7px 8px;
  background: #edf3ff;
  color: #365ea9;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2px;
  border-bottom-color: #cddafa;
  box-shadow: inset 0 -1px #cddafa;
  background-clip: padding-box;
}
.plan-review-table th:nth-child(1),
.plan-review-table td:nth-child(1) {
  width: 24%;
}
.plan-review-table th:nth-child(2),
.plan-review-table td:nth-child(2) {
  width: 16%;
}
.plan-review-table th:nth-child(3),
.plan-review-table td:nth-child(3) {
  word-break: break-word;
}
.read-failed-text {
  margin: 18px 0 8px;
  color: #6b778b;
  line-height: 1.6;
}
.failed-reasons {
  color: #d6534b;
}
.secondary {
  flex: 1;
  border: 1px solid #d6e0f4;
  border-radius: 5px;
  background: #fff;
  color: #52647d;
  padding: 9px;
}
.week-layout {
  display: flex;
  align-items: stretch;
  gap: 10px;
}
.week-layout .weekbar {
  width: auto;
  max-width: none;
  flex: 1;
}
.pagination,
.search-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px;
  border-top: 1px solid #edf0f5;
  color: #718096;
}
.pagination button,
.search-pagination button {
  border: 1px solid #d6e0f4;
  background: #fff;
  color: #4773df;
  border-radius: 5px;
  padding: 5px 10px;
  font-size: 11px;
}
.pagination button:disabled,
.search-pagination button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.notice {
  position: fixed;
  z-index: 40;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #293852;
  color: #fff;
  padding: 10px 14px;
  border-radius: 6px;
}
.plan-import-notice {
  position: fixed;
  z-index: 30;
  right: 12px;
  bottom: 24px;
  width: calc(25vw - 24px);
  box-sizing: border-box;
  background: #293852;
  color: #fff;
  padding: 10px 14px;
  border-radius: 6px;
  text-align: center;
}
.plan-import-notice.is-centered {
  right: auto;
  left: 50%;
  width: auto;
  transform: translateX(-50%);
}
@media (max-width: 900px) {
  .layout {
    margin: 14px;
    grid-template-columns: 1fr;
  }
  .weekbar {
    margin: 14px;
  }
  .filters {
    grid-template-columns: repeat(3, 1fr);
  }
}
.import-steps {
  margin: 0 0 12px;
  padding-left: 20px;
  color: #52647d;
  line-height: 1.65;
}
.course-list article.selected,
.group-list article.selected {
  background-color: #edf4ff;
}
.course-list article.selected > div,
.group-list article.selected > div {
  background-color: transparent;
}
.plan-list article:last-child.focused {
  border-radius: 0 0 9px 9px;
}
.focused {
  outline: 0;
  box-shadow: inset 0 0 0 2px #5b85ec;
}
</style>
