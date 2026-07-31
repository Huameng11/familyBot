export default {
  name: 'CalendarTab',
  template: `
    <div class="content-section manager-padding">
      <div class="card">
        <h3>➕ 新增日历日程</h3>
        <div class="form-group"><label>事件名称 *</label><input type="text" v-model="newCal.title" class="form-control" placeholder="如：宝宝打疫苗、结婚纪念日"></div>
        <div class="form-group"><label>事件日期 *</label><input type="date" v-model="newCal.event_date" class="form-control"></div>
        <div class="form-group"><label>事件分类</label><input type="text" v-model="newCal.category" class="form-control" placeholder="如：纪念日、日常行程、缴费"></div>
        <div class="form-group"><label>关联地点</label><input type="text" v-model="newCal.location" class="form-control" placeholder="如：社区卫生服务中心"></div>
        <div class="form-group"><label>提醒时段</label><input type="text" v-model="newCal.remind_time" class="form-control" placeholder="如：上午 09:30、全天"></div>
        <div class="form-group"><label>详细备注</label><input type="text" v-model="newCal.remark" class="form-control" placeholder="如：记得带预防接种证"></div>
        <button class="btn" style="width:100%; background:#00bcd4;" @click="addCalendar">保存到日历</button>
      </div>

      <div class="card">
        <h3>📅 家庭日程表 (显示: {{ filteredCalendarList.length }} / 共: {{ calendarList.length }})</h3>
        <div style="margin-bottom: 15px;">
          <input type="text" v-model="searchKey" class="form-control search-input" placeholder="🔍 搜索事件名称、日期、分类、地点...">
        </div>
        
        <div v-if="filteredCalendarList.length === 0" style="text-align:center;color:#999;font-size:13px;padding:15px 0;">
          {{ searchKey ? '未找到符合条件的日程' : '暂无数据' }}
        </div>

        <div class="common-accordion-list">
          <div v-for="item in filteredCalendarList" :key="item.id" class="accordion-item calendar-item-theme">
            
            <div class="accordion-header" @click="toggleExpand(item)">
              <div class="header-main-info">
                <span class="header-title-text">📅 {{ item.title || '未命名事件' }}</span>
                <div class="header-badge-container">
                  <span class="badge-item badge-main">{{ item.event_date || '未设置日期' }}</span>
                  <span class="badge-item badge-sub">{{ item.remind_time || item.category || '全天' }}</span>
                </div>
              </div>
              <span :class="['arrow-icon', { 'arrow-rotated': item.isExpanded }]">▼</span>
            </div>

            <div v-show="item.isExpanded" class="accordion-body">
              <div class="form-group">
                <label>事件名称</label>
                <input type="text" class="form-control" v-model="item.title">
              </div>
              <div class="form-group">
                <label>事件日期</label>
                <input type="date" class="form-control" v-model="item.event_date">
              </div>
              <div class="form-group">
                <label>事件分类</label>
                <input type="text" class="form-control" v-model="item.category">
              </div>
              <div class="form-group">
                <label>关联地点</label>
                <input type="text" class="form-control" v-model="item.location">
              </div>
              <div class="form-group">
                <label>提醒时段</label>
                <input type="text" class="form-control" v-model="item.remind_time">
              </div>
              <div class="form-group">
                <label>详细备注</label>
                <input type="text" class="form-control" v-model="item.remark">
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee;">
                <button class="btn" style="background:#f44336; padding: 8px 16px; font-size: 13px;" @click="deleteCalendar(item.id)">删除日程</button>
                <button class="btn" style="background:#00bcd4; padding: 8px 16px; font-size: 13px;" @click="updateCalendar(item)">保存修改</button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  `,
  data() {
    return {
      searchKey: '',
      calendarList: [],
      newCal: { title: '', event_date: '', category: '', location: '', remind_time: '', remark: '' }
    }
  },
  computed: {
    filteredCalendarList() {
      if (!this.searchKey.trim()) return this.calendarList;
      const key = this.searchKey.toLowerCase();
      return this.calendarList.filter(item => 
        (item.title && item.title.toLowerCase().includes(key)) ||
        (item.event_date && item.event_date.toLowerCase().includes(key)) ||
        (item.category && item.category.toLowerCase().includes(key)) ||
        (item.location && item.location.toLowerCase().includes(key)) ||
        (item.remark && item.remark.toLowerCase().includes(key))
      );
    }
  },
  methods: {
    toggleExpand(item) {
      item.isExpanded = !item.isExpanded;
    },
    async fetchList() {
      const res = await fetch('/api/calendars');
      const data = await res.json();
      if (data.status === 'success') {
        this.calendarList = data.data.map(item => ({ ...item, isExpanded: false }));
      }
    },
    async addCalendar() {
      if (!this.newCal.title) return alert('请输入事件名称');
      if (!this.newCal.event_date) return alert('请选择事件日期');
      const params = new URLSearchParams(this.newCal).toString();
      await fetch(`/api/add_calendar?${params}`, { method: 'POST' });
      alert('录入成功');
      this.newCal = { title: '', event_date: '', category: '', location: '', remind_time: '', remark: '' };
      this.fetchList();
    },
    async updateCalendar(item) {
      const params = new URLSearchParams({
        id: item.id,
        title: item.title,
        event_date: item.event_date,
        category: item.category,
        location: item.location,
        remind_time: item.remind_time,
        remark: item.remark
      }).toString();
      await fetch(`/api/update_calendar?${params}`, { method: 'POST' });
      alert('修改已成功保存！');
    },
    async deleteCalendar(id) {
      if (confirm('确定要删除这条日程记录吗？')) {
        await fetch(`/api/delete_calendar?id=${id}`, { method: 'POST' });
        this.fetchList();
      }
    }
  },
  mounted() {
    this.fetchList();
  }
}