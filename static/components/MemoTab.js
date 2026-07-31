// 🚀 1. 顶部引入公共批量导入外壳组件
import BatchImport from './BatchImport.js'; 

export default {
  name: 'MemoTab',
  // 🚀 2. 局部注册组件
  components: { BatchImport }, 
  template: `
    <div class="content-section manager-padding">
      
      <batch-import 
        title="➕ 新增备忘条目"
        api-route="/api/batch_add_memo"
        ai-prompt="帮我生成3条家庭琐事、核心账号或日常缴费备忘的JSON数组"
        example-format='[{"title":"燃气缴费户号","content":"- 户号：\`12345678\`\\n- 户名：张三\\n- 提示：每月\`10号\`前缴费有优惠..."}]'
        btn-color="#9C27B0"
        @success="fetchList"
      >
        <div class="form-group">
          <label>备忘主题 / 问题 *</label>
          <input type="text" v-model="newMemo.title" class="form-control" placeholder="如：燃气缴费户号、宽带密码">
        </div>
        <div class="form-group">
          <label>详细记录内容 (支持 MD 排版)</label>
          <textarea v-model="newMemo.content" rows="3" class="form-control" placeholder="如：\\n- 户号：12345678\\n- 提示：每月使用微信缴费..."></textarea>
        </div>
        <button class="btn" style="width:100%; background:#9C27B0;" @click="addMemo">保存到备忘录</button>
      </batch-import>

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
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <label>详细记录内容</label>
                  <span class="edit-toggle-link" @click="memo.isEditing = !memo.isEditing">
                    {{ memo.isEditing ? '👁️ 预览排版' : '✍️ 修改内容' }}
                  </span>
                </div>
                <textarea v-if="memo.isEditing" class="form-control" rows="5" v-model="memo.content"></textarea>
                <div v-else class="accordion-markdown-panel">
                  <div v-html="renderMarkdown(memo.content || '*暂无详细记录内容*')" class="markdown-body"></div>
                </div>
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
    // 🚀 带安全容错的全局 marked 语法编译器
    renderMarkdown(text) {
      if (!text || typeof text !== 'string') return '';
      try {
        if (typeof marked !== 'undefined' && marked.parse) {
          return marked.parse(text, { breaks: true, gfm: true });
        }
        // 若 CDN 异常未成功加载，则以换行符替换作为兜底纯文本渲染，防止白屏
        return text.replace(/\n/g, '<br>');
      } catch (e) {
        return text.replace(/\n/g, '<br>');
      }
    },
    // 快速格式化 SQLite 原生返回的 timestamp
    formatQueryDate(dateStr) {
      if (!dateStr) return '刚刚';
      return dateStr.split(' ')[0] || dateStr;
    },
    async fetchList() {
      const res = await fetch('/api/memos');
      const data = await res.json();
      if (data.status === 'success') {
        // 数据拉取后，动态映射注入响应式折叠状态与独立编辑状态控制
        this.memoList = data.data.map(item => ({ 
          ...item, 
          isExpanded: false,
          isEditing: false
        }));
      }
    },
    async addMemo() {
      if (!this.newMemo.title) return alert('请输入主题描述');
      
      // 使用 URLSearchParams 对包含特殊 MD 符号的提交参数执行安全流转义
      const u = new URLSearchParams();
      u.append('title', this.newMemo.title);
      u.append('content', this.newMemo.content || '');

      await fetch(`/api/add_memo?${u.toString()}`, { method: 'POST' });
      alert('🎉 备忘录入成功');
      this.newMemo = { title: '', content: '' };
      this.fetchList();
    },
    async updateMemo(memo) {
      const u = new URLSearchParams();
      u.append('id', memo.id);
      u.append('title', memo.title);
      u.append('content', memo.content || '');

      await fetch(`/api/update_memo?${u.toString()}`, { method: 'POST' });
      // 保存修改后，自动拨回预览开关，展示清爽排版
      memo.isEditing = false;
      alert('✅ 修改已成功保存！');
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