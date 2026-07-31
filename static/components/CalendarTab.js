import BatchImport from './BatchImport.js';

export default {
  name: 'CalendarTab',
  components: { BatchImport },
  template: `
    <div class="content-section manager-padding">
      <batch-import 
        title="📅 新增日历日程"
        api-route="/api/batch_add_calendar"
        ai-prompt="帮我生成3条近期的家庭重要日程与纪念日的JSON数组"
        example-format='[{"title":"宝宝打疫苗","event_date":"2026-08-15","category":"日常行程","location":"社区医院","remind_time":"09:30","remark":"记得带小绿本"}]'
        btn-color="#00bcd4"
        @success="fetchList"
      >
        <div class="form-group"><label>事件名称 *</label><input type="text" v-model="newCal.title" class="form-control"></div>
        <div class="form-group"><label>事件日期 *</label><input type="date" v-model="newCal.event_date" class="form-control"></div>
        <div class="form-group"><label>事件分类</label><input type="text" v-model="newCal.category" class="form-control" placeholder="如：纪念日, 行程"></div>
        <div class="form-group"><label>关联地点</label><input type="text" v-model="newCal.location" class="form-control"></div>
        <div class="form-group"><label>提醒时段</label><input type="text" v-model="newCal.remind_time" class="form-control" placeholder="如：全天、09:30"></div>
        <div class="form-group"><label>详细备注 (支持 MD)</label><textarea v-model="newCal.remark" rows="2" class="form-control"></textarea></div>
        <button class="btn" style="width:100%; background:#00bcd4;" @click="addCalendar">保存到日历</button>
      </batch-import>

      <div class="card">
        <h3>📅 家庭日程表</h3>
        <div style="margin-bottom:15px;"><input type="text" v-model="searchKey" class="form-control search-input" placeholder="🔍 搜索..."></div>
        
        <div class="common-accordion-list">
          <div v-for="item in filteredCalendarList" :key="item.id" class="accordion-item calendar-item-theme">
            <div class="accordion-header" @click="toggleExpand(item)">
              <div class="header-main-info">
                <span class="header-title-text">📅 {{ item.title }}</span>
                <div class="header-badge-container">
                  <span class="badge-item badge-main">{{ item.event_date }}</span>
                  <span class="badge-item badge-sub">{{ item.remind_time || item.category || '全天' }}</span>
                </div>
              </div>
              <span :class="['arrow-icon', { 'arrow-rotated': item.isExpanded }]">▼</span>
            </div>

            <div v-show="item.isExpanded" class="accordion-body">
              <div class="form-group"><label>事件名称</label><input type="text" class="form-control" v-model="item.title"></div>
              <div class="form-group"><label>事件日期</label><input type="date" class="form-control" v-model="item.event_date"></div>
              <div class="form-group"><label>事件分类</label><input type="text" class="form-control" v-model="item.category"></div>
              <div class="form-group"><label>关联地点</label><input type="text" class="form-control" v-model="item.location"></div>
              <div class="form-group"><label>提醒时段</label><input type="text" class="form-control" v-model="item.remind_time"></div>
              <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <label>详细备注</label>
                  <span class="edit-toggle-link" @click="item.isEditing = !item.isEditing">{{ item.isEditing ? '👁️ 预览' : '✍️ 修改' }}</span>
                </div>
                <textarea v-if="item.isEditing" class="form-control" rows="3" v-model="item.remark"></textarea>
                <div v-else class="accordion-markdown-panel"><div v-html="renderMarkdown(item.remark || '*暂无备注*')" class="markdown-body"></div></div>
              </div>
              <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px; padding-top:10px; border-top:1px dashed #eee;">
                <button class="btn" style="background:#f44336; padding:8px 16px;" @click="deleteCalendar(item.id)">删除</button>
                <button class="btn" style="background:#00bcd4; padding:8px 16px;" @click="updateCalendar(item)">保存修改</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return { searchKey: '', calendarList: [], newCal: { title: '', event_date: '', category: '', location: '', remind_time: '', remark: '' } }
  },
  computed: {
    filteredCalendarList() {
      if (!this.searchKey.trim()) return this.calendarList;
      const k = this.searchKey.toLowerCase();
      return this.calendarList.filter(i => (i.title && i.title.toLowerCase().includes(k)) || (i.event_date && i.event_date.includes(k)));
    }
  },
  methods: {
    toggleExpand(item) { item.isExpanded = !item.isExpanded; },
    renderMarkdown(text) { return (text && typeof marked !== 'undefined') ? marked.parse(text, { breaks: true, gfm: true }) : text; },
    async fetchList() {
      const res = await fetch('/api/calendars');
      const data = await res.json();
      if (data.status === 'success') this.calendarList = data.data.map(i => ({ ...i, isExpanded: false, isEditing: false }));
    },
    async addCalendar() {
      if (!this.newCal.title || !this.newCal.event_date) return alert('必填项为空');
      const params = new URLSearchParams(this.newCal).toString();
      await fetch(`/api/add_calendar?${params}`, { method: 'POST' });
      this.newCal = { title: '', event_date: '', category: '', location: '', remind_time: '', remark: '' };
      this.fetchList();
    },
    async updateCalendar(item) {
      const u = new URLSearchParams({ id: item.id, title: item.title, event_date: item.event_date, category: item.category || '', location: item.location || '', remind_time: item.remind_time || '', remark: item.remark || '' }).toString();
      await fetch(`/api/update_calendar?${u}`, { method: 'POST' });
      item.isEditing = false;
      alert('已更新');
      this.fetchList();
    },
    async deleteCalendar(id) {
      if (confirm('确认删除？')) { await fetch(`/api/delete_calendar?id=${id}`, { method: 'POST' }); this.fetchList(); }
    }
  },
  mounted() { this.fetchList(); }
}