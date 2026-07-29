export default {
  name: 'MemoTab',
  template: `
    <div class="content-section manager-padding">
      <div class="card">
        <h3>➕ 新增备忘条目</h3>
        <div class="form-group"><label>备忘主题 / 问题 *</label><input type="text" v-model="newMemo.title" class="form-control" placeholder="如：燃气缴费户号、宽带密码"></div>
        <div class="form-group"><label>详细记录内容</label><textarea v-model="newMemo.content" rows="3" placeholder="在这里输入详细需要记住的信息..."></textarea></div>
        <button class="btn" style="width:100%; background:#9C27B0;" @click="addMemo">保存到备忘录</button>
      </div>
      <div class="card">
        <h3>📋 备忘历史记录 (显示: {{ filteredMemoList.length }} / 共: {{ memoList.length }})</h3>
        <div style="margin-bottom: 15px;">
          <input type="text" v-model="searchKey" class="form-control search-input" placeholder="🔍 快速搜索备忘主题或详细内容...">
        </div>
        <div v-if="filteredMemoList.length === 0" style="text-align:center;color:#999;font-size:13px;padding:15px 0;">
          {{ searchKey ? '未找到符合条件的备忘' : '暂无数据' }}
        </div>
        <div v-for="memo in filteredMemoList" :key="memo.id" class="item-card memo-border">
          <div class="item-card-header">
            <input type="text" v-model="memo.title" class="item-title-input">
            <div class="action-btns">
              <button class="btn" style="background:#f44336;padding:6px 12px;font-size:13px;" @click="deleteMemo(memo.id)">删除</button>
              <button class="btn" style="background:#9C27B0;padding:6px 12px;font-size:13px;" @click="updateMemo(memo)">保存</button>
            </div>
          </div>
          <div class="form-group"><label>详细内容</label><textarea v-model="memo.content" rows="3"></textarea></div>
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
    async fetchList() {
      const res = await fetch('/api/memos');
      const data = await res.json();
      if (data.status === 'success') this.memoList = data.data;
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
      alert('修改成功');
      this.fetchList();
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