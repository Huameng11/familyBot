export default {
  name: 'MemoTab',
  template: `
    <div class="content-section manager-padding">
      <div class="card">
        <h3>➕ 新增备忘条目</h3>
        <div class="form-group">
          <label>备忘主题 / 问题 *</label>
          <input type="text" v-model="newMemo.title" class="form-control" placeholder="如：燃气缴费户号、宽带密码">
        </div>
        <div class="form-group">
          <label>详细记录内容</label>
          <textarea v-model="newMemo.content" rows="3" placeholder="在这里输入详细需要记住的信息..."></textarea>
        </div>
        <button class="btn" style="width:100%; background:#9C27B0;" @click="addMemo">保存到备忘录</button>
      </div>

      <div class="card">
        <h3>📋 备忘历史记录 (共: {{ filteredMemoList.length }} 条)</h3>
        <div style="margin-bottom: 15px;">
          <input type="text" v-model="searchKey" class="form-control search-input" placeholder="🔍 快速搜索备忘主题或详细内容...">
        </div>
        
        <div v-if="filteredMemoList.length === 0" style="text-align:center;color:#999;font-size:13px;padding:15px 0;">
          {{ searchKey ? '未找到符合条件的备忘' : '暂无数据' }}
        </div>

        <div class="common-accordion-list">
          <div v-for="memo in filteredMemoList" :key="memo.id" class="accordion-item memo-item-theme">
            
            <div class="accordion-header" @click="toggleExpand(memo)">
              <div class="header-main-info">
                <span class="header-title-text">📝 {{ memo.title || '无标题备忘' }}</span>
                <div class="header-badge-container">
                  <span class="badge-item badge-main">{{ formatQueryDate(memo.created_at) }}</span>
                  <span class="badge-item badge-sub">备忘条目</span>
                </div>
              </div>
              <span :class="['arrow-icon', { 'arrow-rotated': memo.isExpanded }]">▼</span>
            </div>

            <div v-show="memo.isExpanded" class="accordion-body">
              <div class="form-group">
                <label>备忘主题说明</label>
                <input type="text" class="form-control" v-model="memo.title">
              </div>
              <div class="form-group">
                <label>详细记录内容</label>
                <textarea class="form-control" rows="4" v-model="memo.content"></textarea>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee;">
                <button class="btn" style="background:#f44336; padding: 8px 16px; font-size: 13px;" @click="deleteMemo(memo.id)">删除备忘</button>
                <button class="btn" style="background:#9C27B0; padding: 8px 16px; font-size: 13px;" @click="updateMemo(memo)">保存修改</button>
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
      memoList: [],
      newMemo: { title: '', content: '' }
    }
  },
  computed: {
    filteredMemoList() {
      if (!this.searchKey.trim()) return this.memoList;
      const key = this.searchKey.toLowerCase();
      return this.memoList.filter(item => 
        (item.title && item.title.toLowerCase().includes(key)) ||
        (item.content && item.content.toLowerCase().includes(key))
      );
    }
  },
  methods: {
    toggleExpand(item) {
      item.isExpanded = !item.isExpanded;
    },
    // 格式化数据库自带的时间戳，仅保留年月日展示
    formatQueryDate(dateStr) {
      if (!dateStr) return '刚刚';
      return dateStr.split(' ')[0] || dateStr;
    },
    async fetchList() {
      const res = await fetch('/api/memos');
      const data = await res.json();
      if (data.status === 'success') {
        // 🚀 获取全量数据后，动态塞入响应式 isExpanded: false 状态实现初始折叠
        this.memoList = data.data.map(item => ({ ...item, isExpanded: false }));
      }
    },
    async addMemo() {
      if (!this.newMemo.title) return alert('请输入主题描述');
      const params = new URLSearchParams(this.newMemo).toString();
      await fetch(`/api/add_memo?${params}`, { method: 'POST' });
      alert('录入成功');
      this.newMemo = { title: '', content: '' };
      this.fetchList();
    },
    async updateMemo(memo) {
      const params = new URLSearchParams({ id: memo.id, title: memo.title, content: memo.content }).toString();
      await fetch(`/api/update_memo?${params}`, { method: 'POST' });
      alert('修改已成功保存！');
    },
    async deleteMemo(id) {
      if (confirm('确定要删除这条备忘信息吗？')) {
        await fetch(`/api/delete_memo?id=${id}`, { method: 'POST' });
        this.fetchList();
      }
    }
  },
  mounted() {
    this.fetchList();
  }
}