<template>
  <main class="mobile-app" @mousedown.capture="focusedKey = ''">
    <header class="mobile-header">
      <b>XJTU</b>
      <h1>XJTU研究生课程规划助手</h1>
      <div class="history-actions">
        <button :disabled="historyIndex <= 0" title="撤销一步" @click="undo">
          ↶</button
        ><button
          :disabled="historyIndex >= history.length - 1"
          title="恢复一步"
          @click="restoreHistory"
        >
          ↷
        </button>
      </div>
      <button @click="redo">重做</button>
    </header>
    <section class="week-control">
      <strong>{{ week === 0 ? "我的课表" : `第 ${week} 周` }}</strong
      ><input v-model.number="week" min="0" max="18" type="range" />
      <button class="schedule-mode-button" @click="toggleScheduleLayout">
        {{ (week === 0 ? mineLayout : weekLayout) === "list" ? "合并显示" : "普通显示" }}
      </button>
    </section>

    <section class="card main-card">
      <nav class="tabs">
        <button
          :class="{ active: tab === 'schedule' }"
          @click="tab = 'schedule'"
        >
          周课表</button
        ><button :class="{ active: tab === 'search' }" @click="tab = 'search'">
          课程检索 {{ courses.length }}</button
        ><button :class="{ active: tab === 'plan' }" @click="tab = 'plan'">
          培养方案 {{ planKeys.length }}
        </button>
      </nav>

      <template v-if="tab === 'schedule'">
        <p class="hint">
          {{
            week === 0
              ? "第 0 周：汇总全部已上课表课程"
              : "点击课程可定位到培养方案"
          }}
        </p>
        <div class="schedule-scroll">
          <table class="schedule-table">
            <thead>
              <tr>
                <th>节次</th>
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
                <td v-for="day in 7" :key="day" :class="{ 'compact-cell': compactModeActive }">
                  <button
                    v-for="item in scheduleClassesAt(day, period)"
                    :key="item.key"
                    class="class-card"
                    :class="{ 'compact-card': compactModeActive }"
                    :style="{ backgroundColor: item.course.color, ...scheduleCardStyle(day, period, item) }"
                    @click.stop="focusPlan(item.course.key)"
                  >
                    <b>{{ item.course.name }}</b
                    ><span
                      >{{ item.course.className }}
                      {{ item.course.teacher }}</span
                    ><small>{{
                      week === 0
                        ? `第${item.weekText}周@${item.room}`
                        : item.room
                    }}</small>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <section class="unscheduled-courses">
          <header>
            <h2>待安排课程</h2>
            <small>以下课程缺少上课时间或无法放入当前课表布局，暂无法排入周课表</small>
          </header>
          <div class="unscheduled-scroll">
            <table>
              <thead>
                <tr>
                  <th>课程号</th>
                  <th>课程名称</th>
                  <th>班级</th>
                  <th>教师</th>
                  <th>操作</th>
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
                    <button class="danger" @click.stop="toggleSchedule(course)">
                      移出课表
                    </button>
                  </td>
                </tr>
                <tr v-if="!unscheduledCourses.length">
                  <td colspan="5" class="empty-unscheduled">暂无待安排课程</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else-if="tab === 'search'">
        <p class="course-term">
          当前加载课程：2026秋。课程信息仅供参考，请以教务系统最新信息为准
        </p>
        <div class="filters">
          <input
            v-for="field in filterFields"
            :key="field.key"
            v-model="filters[field.key]"
            :placeholder="field.label"
            @input="searchPage = 1"
          /><button @click="clearFilters">清空</button>
        </div>
        <div class="course-list">
          <article
            v-for="course in pagedCourses"
            :key="course.key"
            class="course-row"
          >
            <div>
              <code
                >{{ course.id }} · {{ course.credit }} 学分 ·
                {{ course.college || "未填写学院" }}</code
              >
              <h3>{{ course.name }}</h3>
              <p>{{ course.className }} {{ course.teacher }}</p>
              <small
                >◷ {{ courseTime(course) }}<br />⌖ {{ course.rooms }}</small
              >
            </div>
            <button
              :class="{ outlined: planKeys.includes(course.key) }"
              @click="addToPlan(course)"
            >
              {{ planKeys.includes(course.key) ? "查看方案" : "加入方案" }}
            </button>
          </article>
        </div>
        <div class="pagination">
          <button :disabled="searchPage === 1" @click="changePage(-1)">
            上一页</button
          ><span>第 {{ searchPage }} 页，共 {{ totalPages }} 页</span
          ><button :disabled="searchPage === totalPages" @click="changePage(1)">
            下一页
          </button>
        </div>
      </template>

      <template v-else>
        <p class="hint">
          点击课程卡片即可加入或移出课表。因外语课组与公共课组为志愿式选课，建议导入培养方案后将两课组删除，在课程检索中直接选班。
        </p>
        <div class="group-tools">
          <div class="group-create-row">
            <button class="toggle-all" @click="toggleAllGroups">
              {{
                groups.length && groups.every((group) => group.open)
                  ? "关闭全部"
                  : "展开全部"
              }}</button
            ><select v-model="groupDraft.type">
              <option v-for="type in groupTypes" :key="type">
                {{ type }}
              </option></select
            ><input
              v-model.number="groupDraft.limit"
              min="1"
              placeholder="最多 n"
              type="number"
            /><select v-model="groupDraft.unit">
              <option value="course">门</option>
              <option value="credit">分</option>
            </select>
          </div>
          <div class="group-create-actions">
            <button @click="createGroup">添加组</button
            ><button class="danger" @click="groupDeleteMode = !groupDeleteMode">
              {{ groupDeleteMode ? "完成" : "删除组" }}
            </button>
          </div>
        </div>
        <section
          v-for="type in parentGroupTypes"
          :key="type"
          class="parent-group"
        >
          <header class="parent-group-head">
            <b>{{ type }}</b
            ><button
              class="parent-setting"
              title="设置最低要求学分"
              @click="openParentMinimumEditor(type)"
            >⚙</button
            ><em
              :class="{
                complete:
                  hasParentMinimum(type) &&
                  parentGroupCredits(type) >= parentMinimumCredits(type),
              }"
              >已选 {{ parentGroupCredits(type) }} 分 / 最低要求
              {{ parentMinimumCredits(type) }} 分</em
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
                  dragOverGroupId === group.id && draggingGroupId !== group.id,
              }"
            >
              <header
                draggable="true"
                @dragstart="startGroupDrag($event, group)"
                @dragover.prevent="dragOverGroupId = group.id"
                @dragleave="dragOverGroupId = ''"
                @drop="dropGroup($event, group)"
                @dragend="endGroupDrag"
              >
                <button
                  v-if="groupDeleteMode"
                  class="danger"
                  @click.stop="deleteGroup(group)"
                >
                  删除</button
                ><button class="fold" @click.stop="toggleGroupOpen(group)">
                  {{ group.open ? "收起" : "展开" }}</button
                ><b>{{ group.name }}</b
                ><em
                  :class="{
                    over: group.limit && groupValue(group) > group.limit,
                    complete: group.limit && groupValue(group) === group.limit,
                    under: group.limit && groupValue(group) < group.limit,
                  }"
                  >已选 {{ groupValue(group)
                  }}{{ group.unit === "course" ? "门" : "分" }} / 应选
                  {{ group.limit || "不限"
                  }}{{ group.unit === "course" ? "门" : "分" }}</em
                >
              </header>
              <div v-show="group.open" class="group-list">
                <article
                  v-for="course in coursesInGroup(group)"
                  :key="course.key"
                  class="course-row plan-row"
                  :class="{
                    focused: focusedKey === course.key,
                    selected: activeKeys.includes(course.key),
                  }"
                  @click="toggleSchedule(course)"
                >
                  <div>
                    <code
                      >{{ course.id }} · {{ course.credit }} 学分 ·
                      {{ course.college || "未填写学院" }}</code
                    >
                    <h3>{{ course.name }}</h3>
                    <p>{{ course.className }} {{ course.teacher }}</p>
                    <small
                      >◷ {{ courseTime(course) }}<br />⌖
                      {{ course.rooms }}</small
                    >
                  </div>
                  <button
                    class="danger"
                    @click.stop="removeFromGroup(group, course.key)"
                  >
                    移出组
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
            class="course-row plan-row"
            :class="{
              focused: focusedKey === course.key,
              selected: activeKeys.includes(course.key),
            }"
            @click="toggleSchedule(course)"
          >
            <div>
              <code
                >{{ course.id }} · {{ course.credit }} 学分 ·
                {{ course.college || "未填写学院" }}</code
              >
              <h3>{{ course.name }}</h3>
              <p>{{ course.className }} {{ course.teacher }}</p>
              <small
                >◷ {{ courseTime(course) }}<br />⌖ {{ course.rooms }}</small
              >
            </div>
            <div class="row-actions">
              <button @click.stop="groupPicker = course">加入组</button
              ><button class="danger" @click.stop="removePlan(course.key)">
                取消
              </button>
            </div>
          </article>
        </div>
      </template>
    </section>

    <section class="card conflicts">
      <header>
        <h2>冲突课程</h2>
        <div class="chips">
          <button
            v-for="number in conflictWeeks"
            :key="number"
            :class="{ active: week === number }"
            @click="
              week = number;
              tab = 'schedule';
            "
          >
            {{ number }}
          </button>
        </div>
      </header>
      <button
        v-for="item in conflicts"
        :key="item.key"
        class="conflict-row"
        @click="openConflict(item)"
      >
        {{ days[item.day - 1] }} 第{{ item.period }}节 ·
        {{ item.courses.map((course) => course.name).join("、") }}
        <span>处理 ›</span>
      </button>
      <p v-if="!conflicts.length">当前周次没有课程冲突</p>
    </section>

    <div v-if="groupPicker" class="mask" @click.self="groupPicker = null">
      <section class="dialog">
        <button class="close" @click="groupPicker = null">×</button>
        <h2>加入课程组</h2>
        <div class="group-choice-list">
          <button
            v-for="group in groups"
            :key="group.id"
            class="choice"
            @click="addToGroup(group)"
          >
            <b>{{ group.name }}</b
            ><small>{{ groupCourseSummary(group) }}</small>
          </button>
        </div>
        <p v-if="!groups.length">请先创建课程组</p>
      </section>
    </div>
    <div
      v-if="parentMinimumModal"
      class="mask"
      @click.self="parentMinimumModal = null"
    >
      <section class="dialog parent-minimum-modal">
        <button class="close" @click="parentMinimumModal = null">×</button>
        <h2>设置最低要求学分</h2>
        <p>{{ parentMinimumModal.type }}</p>
        <label>
          最低要求（分）
          <input
            v-model.number="parentMinimumModal.value"
            type="number"
            min="0"
            step="0.5"
          />
        </label>
        <div class="modal-actions">
          <button class="primary" @click="saveParentMinimum">确定</button>
        </div>
      </section>
    </div>
    <div v-if="conflictModal" class="mask" @click.self="conflictModal = null">
      <section class="dialog">
        <button class="close" @click="conflictModal = null">×</button>
        <h2>解决课程冲突</h2>
        <p>保留一门课程，其余移出课表。</p>
        <label v-for="course in conflictModal.courses" :key="course.key"
          ><input v-model="keepKey" :value="course.key" type="radio" />
          {{ course.name }}（{{ course.className }}）</label
        ><button class="primary" @click="resolveConflict">确认处理</button>
      </section>
    </div>
    <div v-if="notice" class="notice">{{ notice }}</div>
  </main>
</template>

<script>
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
export default {
  name: "MobileSchedule",
  data() {
    return {
      week: 1,
      mineLayout: "list",
      weekLayout: "list",
      tab: "schedule",
      courses: [],
      planKeys: [],
      activeKeys: [],
      groups: [],
      categoryMinimums: {},
      searchPage: 1,
      pageSize: 100,
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
      groupDeleteMode: false,
      groupPicker: null,
      parentMinimumModal: null,
      conflictModal: null,
      keepKey: "",
      focusedKey: "",
      notice: "",
      initial: null,
      history: [],
      historyIndex: -1,
      historyRestoring: false,
      historyTimer: null,
      draggingGroupId: "",
      dragOverGroupId: "",
      draggedGroup: false,
      filterFields: [
        { key: "id", label: "课程号" },
        { key: "name", label: "课程名称" },
        { key: "className", label: "班级" },
        { key: "college", label: "学院" },
        { key: "campus", label: "校区" },
        { key: "teacher", label: "教师姓名" },
        { key: "time", label: "上课时间" },
      ],
      groupTypes: ["外语课组", "公共课组", "专业课组", "选修课组", "必修环节"],
    };
  },
  computed: {
    days() {
      return ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    },
    filteredCourses() {
      const f = this.filters;
      const has = (value, query) =>
        !query ||
        String(value || "")
          .toLowerCase()
          .includes(query.toLowerCase());
      return this.courses.filter(
        (course) =>
          has(course.id, f.id) &&
          has(course.name, f.name) &&
          has(course.className, f.className) &&
          has(course.college, f.college) &&
          has(course.rooms, f.campus) &&
          has(course.teacher, f.teacher) &&
          has(this.courseTime(course), f.time)
      );
    },
    totalPages() {
      return Math.max(
        1,
        Math.ceil(this.filteredCourses.length / this.pageSize)
      );
    },
    pagedCourses() {
      return this.filteredCourses.slice(
        (this.searchPage - 1) * this.pageSize,
        this.searchPage * this.pageSize
      );
    },
    ungroupedPlanCourses() {
      const grouped = new Set(this.groups.flatMap((group) => group.courseKeys));
      return this.courses.filter(
        (course) =>
          this.planKeys.includes(course.key) && !grouped.has(course.key)
      );
    },
    unscheduledCourses() {
      const missing = this.courses.filter(
        (course) =>
          this.activeKeys.includes(course.key) && !course.meetings.length
      );
      const overflow = this.week === 0 && this.mineLayout === "compact" ? this.compactOverflowCourses() : [];
      return [...new Map([...missing, ...overflow].map((course) => [course.key, course])).values()];
    },
    conflicts() {
      return this.week === 0 ? [] : this.conflictsFor(this.week);
    },
    conflictWeeks() {
      return Array.from({ length: 18 }, (_, index) => index + 1).filter(
        (number) => this.conflictsFor(number).length
      );
    },
    parentGroupTypes() {
      return this.groupTypes.filter(
        (type) =>
          this.groupsForType(type).length ||
          Object.prototype.hasOwnProperty.call(this.categoryMinimums, type)
      );
    },
    compactLayouts() {
      return Array.from({ length: 8 }, (_, day) =>
        day ? this.buildCompactDayLayout(day) : null
      );
    },
    compactModeActive() {
      return (this.week === 0 && this.mineLayout === "compact") || (this.week > 0 && this.weekLayout === "compact");
    },
    weekCompactLayouts() {
      if (this.week === 0 || this.weekLayout !== "compact") return [];
      return Array.from({ length: 8 }, (_, day) => day ? this.buildWeekCompactDayLayout(day) : null);
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
  created() {
    this.loadCourses();
  },
  methods: {
    async loadCourses() {
      try {
        const response = await fetch(
          `${process.env.BASE_URL || "/"}lecture_unite.csv`
        );
        if (!response.ok) throw new Error();
        this.applyRows(this.parseCsv(await response.text()));
        this.message(`已加载 ${this.courses.length} 条课程`);
      } catch (error) {
        this.message("课程数据加载失败，请检查 lecture_unite.csv");
      }
    },
    parseCsv(text) {
      const rows = [];
      let row = [];
      let cell = "";
      let quoted = false;
      const source = text.replace(/^\uFEFF/, "");
      for (let index = 0; index < source.length; index += 1) {
        const char = source[index];
        if (char === '"') {
          if (quoted && source[index + 1] === '"') {
            cell += '"';
            index += 1;
          } else quoted = !quoted;
        } else if (char === "," && !quoted) {
          row.push(cell.trim());
          cell = "";
        } else if ((char === "\n" || char === "\r") && !quoted) {
          if (char === "\r" && source[index + 1] === "\n") index += 1;
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
    applyRows(rows) {
      const headers = rows[0] || [];
      const get = (row, field) =>
        String(row[headers.indexOf(field)] || "").trim();
      this.courses = rows
        .slice(1)
        .map((row) => {
          const meetings = [];
          const slotCount = headers.filter((header) =>
            /^星期几\d+$/.test(header)
          ).length;
          for (let index = 1; index <= slotCount; index += 1) {
            const day = Number(get(row, `星期几${index}`));
            const periods = get(row, `节次${index}`);
            if (day && periods) {
              const weekText = get(row, `周次${index}`) || "1-18";
              meetings.push({
                day,
                periods: this.nums(periods, 11),
                weeks: this.nums(weekText, 18),
                weekText,
                room: get(row, `教室${index}`) || "待定",
              });
            }
          }
          const id = get(row, "课程编号");
          const className = get(row, "班级") || "未分班";
          const teacher = get(row, "主讲教师");
          const key = `${id}-${className}-${teacher}`;
          const hash = [...key].reduce(
            (sum, char) => sum * 31 + char.charCodeAt(0),
            0
          );
          return {
            key,
            id,
            name: get(row, "课程名称"),
            className,
            credit: get(row, "学分") || "/",
            college: resolveCollege(id, get(row, "学院")),
            teacher,
            meetings,
            rooms: [...new Set(meetings.map((meeting) => meeting.room))].join(
              "；"
            ),
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
    nums(value, max) {
      const numbers = [];
      String(value)
        .match(/\d+(?:\s*[-~至]\s*\d+)?/g)
        ?.forEach((part) => {
          const range = part.match(/\d+/g).map(Number);
          for (
            let number = range[0];
            number <= (range[1] || range[0]);
            number += 1
          )
            numbers.push(number);
        });
      return numbers.filter((number) => number > 0 && number <= max);
    },
    displayedClasses(day, period) {
      if (this.week === 0) return this.allClassesAt(day, period);
      return this.courses
        .filter((course) => this.activeKeys.includes(course.key))
        .flatMap((course) =>
          course.meetings
            .filter(
              (meeting) =>
                meeting.day === day &&
                meeting.periods.includes(period) &&
                meeting.weeks.includes(this.week)
            )
            .map((meeting, index) => ({
              key: `${course.key}-${index}-${meeting.weekText}`,
              course,
              room: meeting.room,
              meeting,
            }))
        );
    },
    scheduleClassesAt(day, period) {
      if (this.week === 0 && this.mineLayout === "compact") return this.compactDisplayedClasses(day, period);
      if (this.week > 0 && this.weekLayout === "compact") return this.weekCompactDisplayedClasses(day, period);
      return this.displayedClasses(day, period);
    },
    scheduleCardStyle(day, period, item) {
      if (!this.compactModeActive) return {};
      return this.compactCardStyle(day, period, item);
    },
    allClassesAt(day, period) {
      const merged = new Map();
      this.courses
        .filter((course) => this.activeKeys.includes(course.key))
        .forEach((course) =>
          course.meetings
            .filter(
              (meeting) =>
                meeting.day === day && meeting.periods.includes(period)
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
            })
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
            })
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
        height: `${span * 68 - 4}px`,
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
    courseTime(course) {
      return course.meetings
        .map(
          (meeting) =>
            `${meeting.weekText}周，${
              this.days[meeting.day - 1]
            } ${this.formatPeriods(meeting.periods)}节`
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
    addToPlan(course) {
      if (this.planKeys.includes(course.key)) {
        this.focusPlan(course.key);
        return;
      }
      this.planKeys.push(course.key);
      this.message("已加入培养方案");
    },
    removePlan(key) {
      this.planKeys = this.planKeys.filter((item) => item !== key);
      this.activeKeys = this.activeKeys.filter((item) => item !== key);
      this.groups.forEach((group) => {
        group.courseKeys = group.courseKeys.filter((item) => item !== key);
      });
    },
    toggleSchedule(course) {
      if (this.activeKeys.includes(course.key)) {
        this.activeKeys = this.activeKeys.filter((key) => key !== course.key);
        return;
      }
      if (!course.meetings.length) {
        this.activeKeys.push(course.key);
        this.message("该课程缺少上课时间，已加入待安排课程");
        return;
      }
      const selectedClass = this.courses.find(
        (item) =>
          item.id === course.id &&
          item.key !== course.key &&
          this.activeKeys.includes(item.key)
      );
      if (selectedClass) {
        this.message(
          `课程号 ${course.id} 仅可选择一个班，请先移出 ${selectedClass.className}`
        );
        return;
      }
      this.activeKeys.push(course.key);
      if (this.week === 0 || !course.meetings[0].weeks.includes(this.week))
        this.week = course.meetings[0].weeks[0];
    },
    focusPlan(key) {
      this.groups
        .filter((group) => group.courseKeys.includes(key))
        .forEach((group) => {
          group.open = true;
        });
      this.tab = "plan";
      this.focusedKey = key;
      this.$nextTick(() =>
        document
          .querySelector(".focused")
          ?.scrollIntoView({ block: "center", behavior: "smooth" })
      );
    },
    clearFilters() {
      Object.keys(this.filters).forEach((key) => {
        this.filters[key] = "";
      });
      this.searchPage = 1;
    },
    changePage(step) {
      this.searchPage = Math.min(
        this.totalPages,
        Math.max(1, this.searchPage + step)
      );
    },
    createGroup() {
      const type = this.groupDraft.type;
      const number =
        this.groups.reduce((max, group) => {
          if (group.type !== type) return max;
          const value = Number(
            (String(group.name).match(/（(\d+)）$/) || [])[1]
          );
          return Math.max(max, value || 0);
        }, 0) + 1;
      this.groups.push({
        id: Date.now(),
        type,
        name: `${type}（${number}）`,
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
      if (!this.draggedGroup) group.open = !group.open;
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
      if (!draggedId || String(draggedId) === String(targetGroup.id)) return;
      const from = this.groups.findIndex(
        (group) => String(group.id) === String(draggedId)
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
    coursesInGroup(group) {
      return this.courses.filter((course) =>
        group.courseKeys.includes(course.key)
      );
    },
    groupsForType(type) {
      return this.groups.filter((group) => group.type === type);
    },
    groupCourseSummary(group) {
      const names = [
        ...new Set(
          this.coursesInGroup(group)
            .map((course) => course.name)
            .filter(Boolean)
        ),
      ];
      if (!names.length) return "暂无课程";
      return `${names.slice(0, 2).join("、")}${names.length > 2 ? "…" : ""}`;
    },
    parentGroupCredits(type) {
      const keys = new Set(
        this.groupsForType(type).flatMap((group) => group.courseKeys)
      );
      const courses = this.courses.filter(
        (course) => keys.has(course.key) && this.activeKeys.includes(course.key)
      );
      const uniqueCourses = [
        ...new Map(courses.map((course) => [course.id, course])).values(),
      ];
      return uniqueCourses.reduce(
        (sum, course) => sum + (Number(course.credit) || 0),
        0
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
    groupValue(group) {
      const courses = this.coursesInGroup(group).filter((course) =>
        this.activeKeys.includes(course.key)
      );
      const uniqueCourses = [
        ...new Map(courses.map((course) => [course.id, course])).values(),
      ];
      return group.unit === "credit"
        ? uniqueCourses.reduce(
            (sum, course) => sum + (Number(course.credit) || 0),
            0
          )
        : uniqueCourses.length;
    },
    addToGroup(group) {
      if (!group.courseKeys.includes(this.groupPicker.key))
        group.courseKeys.push(this.groupPicker.key);
      this.groupPicker = null;
      this.message(`已加入 ${group.name}`);
    },
    removeFromGroup(group, key) {
      group.courseKeys = group.courseKeys.filter((item) => item !== key);
    },
    deleteGroup(group) {
      const keys = new Set(group.courseKeys);
      this.planKeys = this.planKeys.filter((key) => !keys.has(key));
      this.activeKeys = this.activeKeys.filter((key) => !keys.has(key));
      this.groups.forEach((item) => {
        item.courseKeys = item.courseKeys.filter((key) => !keys.has(key));
      });
      this.groups = this.groups.filter((item) => item.id !== group.id);
      if (keys.has(this.focusedKey)) this.focusedKey = "";
      this.message(`已删除 ${group.name}`);
    },
    conflictsFor(week) {
      const cells = {};
      this.courses
        .filter((course) => this.activeKeys.includes(course.key))
        .forEach((course) =>
          course.meetings
            .filter((meeting) => meeting.weeks.includes(week))
            .forEach((meeting) =>
              meeting.periods.forEach((period) => {
                const key = `${meeting.day}-${period}`;
                (cells[key] || (cells[key] = [])).push(course);
              })
            )
        );
      return Object.entries(cells)
        .filter(([, courses]) => courses.length > 1)
        .map(([key, courses]) => {
          const [day, period] = key.split("-");
          return { key, day: Number(day), period: Number(period), courses };
        });
    },
    openConflict(item) {
      this.conflictModal = item;
      this.keepKey = item.courses[0].key;
    },
    resolveConflict() {
      const keys = new Set(
        this.conflictModal.courses.map((course) => course.key)
      );
      this.activeKeys = this.activeKeys.filter(
        (key) => !keys.has(key) || key === this.keepKey
      );
      this.conflictModal = null;
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
      const saved = JSON.parse(snapshot);
      this.historyRestoring = true;
      this.planKeys = saved.planKeys;
      this.activeKeys = saved.activeKeys;
      this.groups = saved.groups;
      this.categoryMinimums = saved.categoryMinimums || {};
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
      clearTimeout(this.historyTimer);
      this.historyRestoring = true;
      const saved = JSON.parse(this.initial);
      this.planKeys = saved.planKeys;
      this.activeKeys = saved.activeKeys;
      this.groups = saved.groups;
      this.categoryMinimums = saved.categoryMinimums || {};
      this.week = 1;
      this.tab = "schedule";
      this.$nextTick(() => {
        this.resetHistory();
        this.historyRestoring = false;
      });
      this.message("已恢复到打开状态");
    },
    message(text) {
      this.notice = text;
      clearTimeout(this.noticeTimer);
      this.noticeTimer = setTimeout(() => {
        this.notice = "";
      }, 2200);
    },
  },
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}
.mobile-app {
  min-height: 100vh;
  padding-bottom: 16px;
  background: #f4f7fb;
  color: #293852;
  font: 13px Arial, "Microsoft YaHei", sans-serif;
}
.mobile-header {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 14px;
  background: #fff;
  border-bottom: 1px solid #e2e8f1;
}
.mobile-header b {
  padding: 7px 5px;
  border-radius: 7px;
  background: #466fd7;
  color: #fff;
  font-size: 12px;
}
.mobile-header h1 {
  flex: 1;
  margin: 0;
  font-size: 17px;
}
.mobile-header button {
  border: 1px solid #cbd8f6;
  border-radius: 5px;
  padding: 6px 9px;
  background: #f4f7ff;
  color: #416dd5;
}
.week-control {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e2e8f1;
  border-radius: 9px;
}
.week-control strong {
  min-width: 64px;
}
.week-control input {
  width: 100%;
}
.schedule-mode-button {
  flex: 0 0 auto;
  height: 30px;
  border: 1px solid #11406c;
  border-radius: 6px;
  background: #fff;
  color: #11406c;
  font-size: 10px;
  white-space: nowrap;
}
.card {
  margin: 10px;
  overflow: hidden;
  border: 1px solid #e2e8f1;
  border-radius: 10px;
  background: #fff;
}
.tabs {
  display: flex;
  border-bottom: 1px solid #e7ecf2;
}
.tabs button {
  flex: 1;
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 13px 3px 11px;
  background: #fff;
  color: #65758d;
  font-size: 13px;
}
.tabs .active {
  border-color: #4773df;
  color: #4773df;
  font-weight: bold;
}
.hint {
  margin: 0;
  padding: 9px 12px;
  color: #8491a4;
  font-size: 12px;
}
.schedule-scroll {
  overflow-x: auto;
}
.schedule-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  table-layout: fixed;
}
.schedule-table th,
.schedule-table td {
  border: 1px solid #edf0f5;
}
.schedule-table th {
  height: 36px;
  background: #fbfcfe;
  color: #65758d;
  font-weight: normal;
}
.schedule-table th:first-child {
  width: 32px;
}
.schedule-table td {
  height: 70px;
  padding: 2px;
  vertical-align: top;
}
.schedule-table .split td,
.schedule-table .split th {
  border-top: 3px solid #d8dfeb;
}
.class-card {
  width: 100%;
  min-height: 65px;
  border: 0;
  border-radius: 4px;
  padding: 5px;
  color: #fff;
  text-align: left;
  overflow: visible;
}
.class-card b,
.class-card span,
.class-card small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}
.class-card b {
  display: block;
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  line-height: 13px;
}
.class-card span {
  margin-top: 2px;
  white-space: nowrap;
  font-size: 10px;
}
.class-card small {
  margin-top: 2px;
  line-height: 12px;
  font-size: 9px;
}
.schedule-table .compact-cell {
  position: relative;
  overflow: visible;
}
.schedule-table .compact-card {
  position: absolute;
  inset: 2px;
  width: calc(100% - 4px);
  min-height: 0;
}
.filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  padding: 10px;
}
.filters input,
.group-tools select,
.group-tools input {
  min-width: 0;
  height: 32px;
  border: 1px solid #d8e0eb;
  border-radius: 5px;
  padding: 6px;
  font-size: 12px;
}
.filters button {
  border: 0;
  border-radius: 5px;
  background: #4773df;
  color: #fff;
}
.course-list {
  max-height: 480px;
  overflow: auto;
  border-top: 1px solid #edf0f5;
}
.course-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 11px;
  border-bottom: 1px solid #edf0f5;
}
.course-row > div:first-child {
  min-width: 0;
  flex: 1;
}
.course-row code,
.course-row small {
  color: #8491a4;
  font-size: 11px;
}
.course-row h3,
.course-row p {
  margin: 3px 0;
}
.course-row h3 {
  font-size: 14px;
}
.course-row button,
.group-tools button,
.pagination button {
  align-self: center;
  border: 0;
  border-radius: 5px;
  padding: 7px 8px;
  background: #4773df;
  color: #fff;
  font-size: 11px;
  white-space: nowrap;
}
.course-row .outlined {
  border: 1px solid #4773df;
  background: #fff;
  color: #4773df;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  color: #718096;
  font-size: 12px;
}
.pagination button:disabled {
  opacity: 0.4;
}
.group-tools {
  display: grid;
  grid-template-columns: 1.3fr 0.8fr 0.7fr;
  gap: 6px;
  padding: 9px 10px;
  background: #f8faff;
}
.group-tools button {
  padding: 7px 4px;
}
.group {
  margin: 8px 10px;
  overflow: hidden;
  border: 1px solid #e3e8ef;
  border-radius: 7px;
}
.group header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px;
  background: #fbfcff;
}
.group header b {
  font-size: 13px;
}
.group header em {
  margin-left: auto;
  color: #69788d;
  font-size: 10px;
  font-style: normal;
  text-align: right;
}
.fold,
.danger {
  border: 1px solid #d8e0eb !important;
  border-radius: 5px !important;
  padding: 4px 6px !important;
  background: #fff !important;
  color: #6d7d94 !important;
  font-size: 10px !important;
}
.danger {
  border-color: #efcfcc !important;
  color: #c55d57 !important;
}
.over {
  color: #d6534b !important;
}
.plan-row {
  padding: 9px;
}
.plan-row h3 {
  font-size: 15px;
}
.selected {
  background: #edf4ff;
}
.focused {
  outline: 2px solid #5b85ec;
  outline-offset: -2px;
}
.row-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
}
.conflicts header {
  display: flex;
  align-items: center;
  padding: 11px;
  border-bottom: 1px solid #edf0f5;
}
.conflicts h2 {
  margin: 0;
  font-size: 15px;
}
.chips {
  margin-left: auto;
}
.chips button {
  width: 24px;
  height: 24px;
  margin-left: 3px;
  border: 0;
  border-radius: 5px;
  background: #f2f5fa;
  color: #718096;
}
.chips .active {
  background: #e85b4d;
  color: #fff;
}
.conflicts p {
  padding: 2px 12px;
  color: #8c98aa;
}
.conflict-row {
  width: 100%;
  border: 0;
  border-bottom: 1px solid #edf0f5;
  padding: 11px;
  background: #fff;
  color: #53657d;
  text-align: left;
}
.conflict-row span {
  float: right;
  color: #4773df;
}
.mask {
  position: fixed;
  z-index: 10;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: #1f2d4277;
}
.dialog {
  position: relative;
  width: min(390px, 100%);
  padding: 20px;
  border-radius: 10px;
  background: #fff;
}
.dialog h2 {
  margin-top: 0;
  font-size: 17px;
}
.dialog label,
.choice {
  display: block;
  width: 100%;
  margin: 8px 0;
  border: 1px solid #e3e8ef;
  border-radius: 6px;
  padding: 10px;
  background: #fff;
  text-align: left;
}
.choice small {
  display: block;
  margin-top: 3px;
  color: #8491a4;
}
.close {
  position: absolute;
  top: 6px;
  right: 10px;
  border: 0;
  background: transparent;
  font-size: 22px;
}
.primary {
  width: 100%;
  margin-top: 10px;
  border: 0;
  border-radius: 6px;
  padding: 10px;
  background: #4773df;
  color: #fff;
}
.notice {
  position: fixed;
  z-index: 20;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 6px;
  padding: 10px 14px;
  background: #293852;
  color: #fff;
  white-space: nowrap;
}
.history-actions {
  display: flex;
  gap: 3px;
}
.mobile-header .history-actions button {
  width: 27px;
  padding: 4px 0;
  font-size: 17px;
  line-height: 1;
}
.mobile-header .history-actions button:disabled {
  opacity: 0.42;
}
.schedule-scroll,
.unscheduled-scroll {
  overflow-x: hidden;
}
.schedule-table {
  min-width: 0;
}
.schedule-table th:first-child {
  width: 26px;
}
.schedule-table th {
  font-size: 11px;
}
.schedule-table td {
  height: 68px;
}
.class-card {
  min-height: 63px;
  padding: 4px;
}
.class-card span {
  font-size: 9px;
}
.class-card small {
  font-size: 8px;
}
.unscheduled-courses {
  margin-top: 10px;
  border-top: 1px solid #e3e8ef;
  background: #fbfcff;
}
.unscheduled-courses header {
  padding: 10px 12px;
}
.unscheduled-courses h2 {
  margin: 0 0 3px;
  font-size: 14px;
}
.unscheduled-courses header small {
  color: #8491a4;
  font-size: 11px;
}
.unscheduled-courses table {
  width: 100%;
  min-width: 0;
  border-collapse: collapse;
  table-layout: fixed;
}
.unscheduled-courses th,
.unscheduled-courses td {
  border: 1px solid #edf0f5;
  overflow-wrap: anywhere;
}
.unscheduled-courses th {
  height: 32px;
  background: #f1f5ff;
  color: #65758d;
  font-size: 10px;
  font-weight: normal;
}
.unscheduled-courses td {
  height: auto;
  padding: 6px 3px;
  vertical-align: middle;
  font-size: 10px;
}
.unscheduled-courses th:nth-child(1) {
  width: 18%;
}
.unscheduled-courses th:nth-child(2) {
  width: 28%;
}
.unscheduled-courses th:nth-child(3) {
  width: 15%;
}
.unscheduled-courses th:nth-child(4) {
  width: 17%;
}
.unscheduled-courses th:nth-child(5) {
  width: 22%;
}
.unscheduled-courses td:last-child {
  text-align: center;
}
.unscheduled-courses .danger {
  min-width: 0;
  padding: 4px 5px;
  border-radius: 6px !important;
}
.unscheduled-row {
  cursor: pointer;
}
.unscheduled-row:hover td {
  background: #f5f8ff;
}
.empty-unscheduled {
  color: #8c98aa;
  text-align: center;
}
.group-tools {
  display: block;
  padding: 9px 10px;
}
.group-create-row {
  display: grid;
  grid-template-columns: 58px 82px minmax(0, 1fr) 56px;
  gap: 5px;
}
.group-create-row select,
.group-create-row input {
  width: 100%;
  min-width: 0;
}
.group-tools .toggle-all {
  padding: 7px 2px;
  font-size: 10px;
}
.group-create-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 6px;
}
.group-create-actions button,
.group-create-actions .danger {
  width: 100%;
  height: 32px;
  padding: 7px 4px !important;
}
.row-actions button,
.row-actions .danger {
  width: 62px;
  height: 30px;
  padding: 6px 4px !important;
}
.group header {
  cursor: grab;
  user-select: none;
}
.group header:active {
  cursor: grabbing;
}
.group.dragging {
  opacity: 0.5;
}
.group.drag-over {
  border-color: #6e91e8;
  box-shadow: 0 -3px 0 #4773df;
}
.group-list {
  max-height: 370px;
  overflow-y: auto;
  overflow-x: hidden;
}
.complete {
  color: #259765 !important;
}
.under {
  color: #69788d !important;
}
.group-choice-list {
  max-height: min(360px, calc(100vh - 180px));
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 3px;
}
.group-list .danger,
.row-actions button,
.row-actions .danger {
  width: 54px;
  height: 28px;
  padding: 4px 6px !important;
}
.unscheduled-courses th:nth-child(1),
.unscheduled-courses td:nth-child(1),
.unscheduled-courses th:nth-child(3),
.unscheduled-courses td:nth-child(3),
.unscheduled-courses th:nth-child(4),
.unscheduled-courses td:nth-child(4),
.unscheduled-courses th:nth-child(5),
.unscheduled-courses td:nth-child(5) {
  text-align: center;
}
.course-row.selected {
  background-color: #edf4ff;
}
.course-row.selected > div {
  background-color: transparent;
}
.plan-list .course-row:last-child.focused {
  border-radius: 0 0 9px 9px;
}
.focused {
  outline: 0;
  box-shadow: inset 0 0 0 2px #5b85ec;
}
.course-term {
  margin: 0;
  padding: 9px 12px;
  color: #8491a4;
  font-size: 12px;
}
.parent-group {
  margin: 9px 10px;
  border: 1px solid #d8e3f2;
  border-radius: 8px;
  overflow: hidden;
  background: #f8faff;
}
.parent-group-head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 35px;
  padding: 8px 9px;
  background: #eaf2ff;
  color: #294f79;
}
.parent-group-head b {
  font-size: 13px;
}
.parent-setting {
  width: 19px;
  height: 19px;
  padding: 0;
  border: 1px solid #d6534b;
  border-radius: 5px;
  background: transparent;
  color: #d6534b;
  font-size: 11px;
  line-height: 19px;
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
.parent-minimum-modal .modal-actions {
  display: flex;
  gap: 8px;
}
.parent-minimum-modal .modal-actions button {
  width: 100%;
  margin-top: 10px;
}
.parent-group-head em {
  margin-left: auto;
  color: #526f90;
  font-size: 10px;
  font-style: normal;
  text-align: right;
  white-space: nowrap;
}
.parent-group-children {
  padding: 1px 0;
}
.parent-group-children .group {
  margin: 7px 8px;
}
</style>
