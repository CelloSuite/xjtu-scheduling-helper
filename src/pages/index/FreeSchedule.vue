<template>
  <main class="app" @mousedown.capture="focusedKey = ''">
    <header class="header">
      <b class="logo">XJTU</b>
      <div>
        <h1>XJTU课程规划助手</h1>
        
      </div>
      <button class="redo" @click="redo">↻ 重做</button>
    </header>
    <div class="week-layout">
      <section class="weekbar">
        <button
          class="my-schedule-button"
          :class="{ active: scheduleView === 'mine' }"
          @click="scheduleView = scheduleView === 'mine' ? 'week' : 'mine'"
        >
          我的课表
        </button>
        <strong>第 {{ scheduleView === 'mine' ? 0 : week }} 周</strong
        ><input
          v-model.number="week"
          :disabled="scheduleView === 'mine'"
          min="1"
          max="18"
          type="range"
        />
      </section>
    </div>
    <div class="layout">
      <section class="card schedule">
        <div class="heading">
          <h2>{{ scheduleView === 'mine' ? '我的课表' : '周课表' }}</h2>
          <small>{{ scheduleView === 'mine' ? '全部已上课表课程' : '点击课程定位至培养方案' }}</small>
        </div>
        <table v-if="scheduleView === 'week'">
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
                    ><strong>{{ course.name }}</strong
                    >班级：{{ course.className }}<br />教师：{{ course.teacher
                    }}<br />地点：{{ room(course, day, period) }}</span
                  >
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <table v-else class="my-schedule-table">
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
              <td v-for="day in 7" :key="day">
                <button
                  v-for="item in allClassesAt(day, period)"
                  :key="item.key"
                  class="course-card all-course-card"
                  :style="{ backgroundColor: item.course.color }"
                  @click="focusPlan(item.course.key)"
                >
                  <b>{{ item.course.name }}</b>
                  <span>{{ item.course.className }} {{ item.course.teacher }}</span>
                  <small>第{{ item.meeting.weekText }}周@{{ item.meeting.room }}</small>
                </button>
              </td>
            </tr>
            <tr v-if="!myScheduleCourses.length">
              <td colspan="8" class="empty-schedule">暂未加入上课表的课程</td>
            </tr>
          </tbody>
        </table>
      </section>
      <aside>
        <section class="card">
          <nav class="tabs">
            <button :class="{ on: tab === 'search' }" @click="tab = 'search'">
              课程检索 {{ courses.length }}</button
            ><button :class="{ on: tab === 'plan' }" @click="tab = 'plan'">
              培养方案 {{ planKeys.length }}</button>
          </nav>
          <template v-if="tab === 'search'"
            ><div class="filters">
              <input
                @input="searchPage = 1"
                v-model="filters.id"
                placeholder="课程号"
              /><input
                @input="searchPage = 1"
                v-model="filters.name"
                placeholder="课程名称"
              /><input
                @input="searchPage = 1"
                v-model="filters.className"
                placeholder="班级"
              /><input
                @input="searchPage = 1"
                v-model="filters.college"
                placeholder="学院"
              /><input
                @input="searchPage = 1"
                v-model="filters.campus"
                placeholder="校区"
              /><input
                @input="searchPage = 1"
                v-model="filters.teacher"
                placeholder="教师姓名"
              /><input
                @input="searchPage = 1"
                v-model="filters.time"
                placeholder="上课时间"
              /><button @click="clearFilters">清空</button>
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
                  :class="{ added: planKeys.includes(course.key) }"
                  @click="addToPlan(course)"
                >
                  {{ planKeys.includes(course.key) ? "查看方案" : "加入方案" }}
                </button>
              </article>
            </div>
            <div class="search-pagination">
              <button
                :disabled="searchPage === 1"
                @click="changeSearchPage(-1)"
              >
                上一页
              </button>
              <span>第 {{ searchPage }} 页，共 {{ totalPages }} 页</span>
              <button
                :disabled="searchPage === totalPages"
                @click="changeSearchPage(1)"
              >
                下一页
              </button>
            </div>
            </template
          >
          <template v-else
            ><div class="plan-tools">
              点击课程卡片即可加入或移出课表。
              <div>
                <select v-model="groupDraft.type">
                  <option>外语课组</option>
                  <option>公共课组</option>
                  <option>专业课组</option>
                  <option>选修课组</option>
                  <option>必修环节</option></select
                ><input
                  v-model.number="groupDraft.limit"
                  min="1"
                  placeholder="最多 n"
                  type="number"
                /><select v-model="groupDraft.unit">
                  <option value="course">门</option>
                  <option value="credit">分</option></select
                ><button @click="createGroup">添加组</button
                ><button
                  class="danger"
                  @click="groupDeleteMode = !groupDeleteMode"
                >
                  {{ groupDeleteMode ? "完成" : "删除组" }}
                </button>
              </div>
            </div>
            <section v-for="group in groups" :key="group.id" class="group">
              <button
                v-if="groupDeleteMode"
                class="delete-group"
                @click="deleteGroup(group)"
              >
                删除
              </button>
              <button class="group-head" @click="group.open = !group.open">
                <span class="group-toggle">{{
                  group.open ? "收起" : "展开"
                }}</span
                ><b>{{ group.name }}</b
                ><em
                  :class="{
                    over: group.limit && groupValue(group) > group.limit,
                  }"
                  >已选 {{ groupValue(group) }}
                  {{ group.unit === "course" ? "门" : "分" }} / 应选
                  {{ group.limit || "不限" }}
                  {{ group.unit === "course" ? "门" : "分" }}</em
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
                    class="cancel"
                    @click.stop="removeFromGroup(group, course.key)"
                  >
                    移出组
                  </button>
                </article>
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
                    >{{ course.id }} · {{ course.credit }} 学分 ·
                    {{ course.college || "未填写学院" }}</code
                  >
                  <h3>{{ course.name }}</h3>
                  <p>{{ course.className }} {{ course.teacher }}</p>
                  <small>◷ {{ courseTime(course) }}<br />⌖ {{ course.rooms }}</small>
                </div>
                <div>
                  <button @click.stop="groupModal = { mode: 'add', course }">
                    加入组</button
                  ><button class="cancel" @click.stop="removePlan(course.key)">
                    取消
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
            <h2>冲突课程</h2>
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
            {{ days[item.day - 1] }} 第{{ item.period }}节 ·
            {{ item.courses.map((c) => c.name).join("、") }} <span>处理 ›</span>
          </button>
          <p v-if="!conflicts.length">当前周次没有课程冲突</p>
        </section>
      </aside>
    </div>
    <div v-if="groupModal" class="mask" @click.self="groupModal = null">
      <section class="modal">
        <button class="close" @click="groupModal = null">×</button>
        <h2>{{ groupModal.mode === "add" ? "加入课程组" : "删除课程组" }}</h2>
        <p>请选择课程组：</p>
        <button
          v-for="group in groups"
          :key="group.id"
          class="choice"
          @click="
            groupModal.mode === 'add' ? addToGroup(group) : deleteGroup(group)
          "
        >
          <b>{{ group.name }}</b
          ><small
            >已选 {{ groupValue(group) }}
            {{ group.unit === "course" ? "门" : "分" }}</small
          >
        </button>
        <p v-if="!groups.length">暂无课程组</p>
      </section>
    </div>
    <div v-if="conflictModal" class="mask" @click.self="conflictModal = null">
      <section class="modal">
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
  "#527dde",
  "#8b70c9",
  "#24a37a",
  "#df9139",
  "#d9657a",
  "#3699b5",
  "#5b9c6b",
  "#ba6fbe",
  "#cf7d50",
  "#4b9a9a",
  "#7d83d6",
  "#b39645",
  "#6f8fb9",
  "#c76e8d",
];
export default {
  name: "FreeSchedule",
  created() {
    this.loadCourses();
  },
  data() {
    return {
      week: 1,
      scheduleView: "week",
      tab: "search",
      courses: [],
      planKeys: [],
      activeKeys: [],
      groups: [],
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
      conflictModal: null,
      keepKey: "",
      hoveredKey: "",
      focusedKey: "",
      tooltip: null,
      notice: "",
      initial: null,
      groupDeleteMode: false,
      searchPage: 1,
      pageSize: 100,
    };
  },
  computed: {
    days() {
      return ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    },
    planCourses() {
      return this.courses.filter((c) => this.planKeys.includes(c.key));
    },
    myScheduleCourses() {
      return this.courses.filter((c) => this.activeKeys.includes(c.key));
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
          has(c.college, f.college) &&
          has(c.rooms, f.campus) &&
          has(c.teacher, f.teacher) &&
          has(this.courseTime(c), f.time)
      );
    },
    totalPages() {
      return Math.max(
        1,
        Math.ceil(this.filteredCourses.length / this.pageSize)
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
        (w) => this.conflictsFor(w).length
      );
    },
  },
  methods: {
    async loadCourses() {
      try {
        const response = await fetch(
          `${process.env.BASE_URL || '/'}lecture_unite.csv`
        );
        if (!response.ok) throw new Error("课程数据读取失败");
        this.applyCourseRows(this.parseCsv(await response.text()));
        this.noticeMsg(`已加载 ${this.courses.length} 条课程`);
      } catch (error) {
        this.noticeMsg("课程数据加载失败，请检查 lecture_unite.csv");
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
          for (let index = 1; index <= 14; index += 1) {
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
            0
          );
          return {
            key,
            id,
            name: get(row, "课程名称"),
            className,
            credit: get(row, "学分") || "—",
            college: get(row, "学院"),
            teacher,
            meetings,
            rooms: [...new Set(meetings.map((meeting) => meeting.room))].join(
              "；"
            ),
            major: get(row, "专业"),
            color: COLORS[Math.abs(hash) % COLORS.length],
          };
        })
        .filter((course) => course.id && course.name);
      this.planKeys = [];
      this.activeKeys = [];
      this.groups = [];
      this.searchPage = 1;
      this.initial = this.snapshot();
    },
    snapshot() {
      return JSON.stringify({
        planKeys: this.planKeys,
        activeKeys: this.activeKeys,
        groups: this.groups,
      });
    },
    redo() {
      if (!this.initial) return;
      const x = JSON.parse(this.initial);
      this.planKeys = x.planKeys;
      this.activeKeys = x.activeKeys;
      this.groups = x.groups;
      this.week = 1;
      this.tab = "search";
      this.focusedKey = "";
      this.noticeMsg("已恢复到打开状态");
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
        Math.max(1, this.searchPage + step)
      );
    },
    addToPlan(c) {
      if (this.planKeys.includes(c.key)) {
        this.focusPlan(c.key);
        return;
      }
      this.planKeys.push(c.key);
      this.noticeMsg("已加入培养方案");
    },
    removePlan(key) {
      this.planKeys = this.planKeys.filter((k) => k !== key);
      this.activeKeys = this.activeKeys.filter((k) => k !== key);
      this.groups.forEach(
        (g) => (g.courseKeys = g.courseKeys.filter((k) => k !== key))
      );
    },
    toggleSchedule(c) {
      if (this.activeKeys.includes(c.key)) {
        this.activeKeys = this.activeKeys.filter((k) => k !== c.key);
        return;
      }
      if (!c.meetings.length) {
        this.noticeMsg("该课程没有可识别的上课时间");
        return;
      }
      this.activeKeys.push(c.key);
      if (!c.meetings[0].weeks.includes(this.week))
        this.week = c.meetings[0].weeks[0];
    },
    focusPlan(key) {
      this.tab = "plan";
      this.focusedKey = key;
      this.$nextTick(() =>
        document
          .querySelector(".focused")
          ?.scrollIntoView({ block: "center", behavior: "smooth" })
      );
    },
    createGroup() {
      const n =
        this.groups.filter((g) => g.type === this.groupDraft.type).length + 1;
      this.groups.push({
        id: Date.now(),
        type: this.groupDraft.type,
        name: this.groupDraft.type + "（" + n + "）",
        limit: this.groupDraft.limit || null,
        unit: this.groupDraft.unit,
        courseKeys: [],
        open: true,
      });
      this.groupDraft.limit = null;
    },
    coursesInGroup(g) {
      return this.courses.filter((c) => g.courseKeys.includes(c.key));
    },
    groupValue(g) {
      const list = this.coursesInGroup(g);
      return g.unit === "credit"
        ? list.reduce((s, c) => s + (Number(c.credit) || 0), 0)
        : list.length;
    },
    addToGroup(g) {
      const c = this.groupModal.course;
      if (!g.courseKeys.includes(c.key)) g.courseKeys.push(c.key);
      this.groupModal = null;
      this.noticeMsg("已加入 " + g.name);
    },
    removeFromGroup(g, key) {
      g.courseKeys = g.courseKeys.filter((k) => k !== key);
    },
    deleteGroup(g) {
      this.groups = this.groups.filter((x) => x.id !== g.id);
      this.noticeMsg("已删除 " + g.name);
    },
    classesAt(day, period) {
      const active = this.courses.filter(
        (c) =>
          this.activeKeys.includes(c.key) &&
          c.meetings.some(
            (m) =>
              m.day === day &&
              m.periods.includes(period) &&
              m.weeks.includes(this.week)
          )
      );
      const hover = this.courses.find((c) => c.key === this.hoveredKey);
      if (
        hover &&
        !active.some((c) => c.key === hover.key) &&
        hover.meetings.some(
          (m) =>
            m.day === day &&
            m.periods.includes(period) &&
            m.weeks.includes(this.week)
        )
      )
        active.push(hover);
      return active;
    },
    allClassesAt(day, period) {
      return this.courses
        .filter((course) => this.activeKeys.includes(course.key))
        .flatMap((course) =>
          course.meetings
            .filter(
              (meeting) =>
                meeting.day === day && meeting.periods.includes(period)
            )
            .map((meeting, index) => ({
              key: `${course.key}-${day}-${period}-${index}-${meeting.weekText}`,
              course,
              meeting,
            }))
        );
    },
    room(c, d, p) {
      return (
        c.meetings.find((m) => m.day === d && m.periods.includes(p))?.room ||
        "待定"
      );
    },
    courseTime(c) {
      return c.meetings
        .map(
          (m) =>
            m.weekText +
            "周，" +
            this.days[m.day - 1] +
            " " +
            m.periods.join("-") +
            "节"
        )
        .join("；");
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
              })
            )
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
        (k) => !keys.has(k) || k === this.keepKey
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
                    "text/xml"
                  )
                  .querySelectorAll("si"),
              ].map((n) =>
                [...n.querySelectorAll("t")].map((t) => t.textContent).join("")
              )
            : [],
          sheet = Object.keys(zip).find((x) =>
            /worksheets\/sheet\d+\.xml$/.test(x)
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
              credit: get(r, "学分") || "—",
              teacher,
              meetings,
              rooms: [...new Set(meetings.map((m) => m.room))].join("；"),
              college: get(r, "学院"),
              major: get(r, "专业"),
              color: COLORS[Math.abs(hash) % COLORS.length],
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
                  .pipeThrough(new DecompressionStream("deflate-raw"))
              ).arrayBuffer()
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
  display: -webkit-box !important;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 14px;
  min-height: 28px;
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
  width: 62px;
  flex: 0 0 62px;
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
.header small {
  color: #8c98aa;
}
.redo {
  margin-left: auto;
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
  grid-template-columns: 1.1fr 0.9fr;
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
table {
  width: calc(100% - 20px);
  margin: 0 10px 10px;
  border-collapse: collapse;
  table-layout: fixed;
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
.group-list article {
  padding: 8px 10px;
  border-top: 1px solid #edf0f5;
  display: flex;
  justify-content: space-between;
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
  max-height: 300px;
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
.primary {
  width: 100%;
  margin-top: 12px;
  border: 0;
  border-radius: 5px;
  background: #4773df;
  color: #fff;
  padding: 9px;
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
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #293852;
  color: #fff;
  padding: 10px 14px;
  border-radius: 6px;
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
</style>
