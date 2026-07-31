import BatchImport from './BatchImport.js';

export default {
  name: 'MedicineTab',
  components: { BatchImport },
  template: `
    <div class="content-section manager-padding">
      <batch-import 
        title="💊 录入新药品"
        api-route="/api/batch_add_medicine"
        ai-prompt="帮我生成3条家庭常用药品的JSON数组"
        example-format='[{"name":"药名","count":"1盒","location":"医药箱","expire_date":"2027/12/31","usage":"一日三次，一次一片"}]'
        btn-color="#4CAF50"
        @success="loadMedicines"
      >
        <div class="form-group"><label>药品名称 *</label><input type="text" class="form-control" v-model="newMed.name" placeholder="如：布洛芬"></div>
        <div class="form-group"><label>数量/规格</label><input type="text" class="form-control" v-model="newMed.count" placeholder="如：1盒"></div>
        <div class="form-group"><label>存放位置</label><input type="text" class="form-control" v-model="newMed.location" placeholder="如：主卧抽屉"></div>
        <div class="form-group"><label>有效期</label><input type="text" class="form-control" v-model="newMed.expire_date" placeholder="如：2027/12/31"></div>
        <div class="form-group">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <label>用法用量 (支持 MD)</label>
            <span v-if="isOcrLoading" style="font-size:11px; color:#009688; font-weight:bold;">⚡ 正在解析...</span>
          </div>
          <div style="display:flex; gap:8px;">
            <textarea v-model="newMed.usage" rows="2" class="form-control" placeholder="输入用法..."></textarea>
            <label class="btn" style="background:#009688; display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0; padding:0 12px; cursor:pointer; border-radius:8px;">
              <span>📷</span><span style="font-size:10px; font-weight:normal;">拍照</span>
              <input type="file" accept="image/*" capture="camera" style="display:none;" @change="handleImageUpload($event, newMed)" :disabled="isOcrLoading">
            </label>
          </div>
        </div>
        <button class="btn" style="width:100%; background:#4CAF50; margin-top:5px;" @click="addMed">保存到药箱</button>
      </batch-import>

      <div style="margin-bottom:15px;"><input type="text" class="form-control search-input" v-model="searchQuery" placeholder="🔍 快速搜索药品..."></div>

      <div class="common-accordion-list">
        <div v-for="item in filteredMedicines" :key="item.id" class="accordion-item med-item-theme">
          <div class="accordion-header" @click="toggleExpand(item)">
            <div class="header-main-info">
              <span class="header-title-text">💊 {{ item.name }}</span>
              <div class="header-badge-container">
                <span class="badge-item badge-main">{{ item.count || '无数量' }}</span>
                <span class="badge-item badge-sub">{{ item.location || '未知位置' }}</span>
              </div>
            </div>
            <span :class="['arrow-icon', { 'arrow-rotated': item.isExpanded }]">▼</span>
          </div>

          <div v-show="item.isExpanded" class="accordion-body">
            <div class="form-group"><label>药品名称</label><input type="text" class="form-control" v-model="item.name"></div>
            <div class="form-group"><label>数量/规格</label><input type="text" class="form-control" v-model="item.count"></div>
            <div class="form-group"><label>存放位置</label><input type="text" class="form-control" v-model="item.location"></div>
            <div class="form-group"><label>有效期</label><input type="text" class="form-control" v-model="item.expire_date"></div>
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <label>用法用量说明</label>
                <span class="edit-toggle-link" @click="item.isEditing = !item.isEditing">{{ item.isEditing ? '👁️ 预览' : '✍️ 修改' }}</span>
              </div>
              <textarea v-if="item.isEditing" class="form-control" rows="3" v-model="item.usage"></textarea>
              <div v-else class="accordion-markdown-panel"><div v-html="renderMarkdown(item.usage || '*暂无用法记录*')" class="markdown-body"></div></div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px; padding-top:10px; border-top:1px dashed #eee;">
              <button class="btn" style="background:#f44336; padding:8px 16px;" @click="deleteMed(item.id)">删除</button>
              <button class="btn" style="background:#2196F3; padding:8px 16px;" @click="updateMed(item)">保存修改</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return { searchQuery: '', medicines: [], isOcrLoading: false, newMed: { name: '', count: '', location: '', expire_date: '', usage: '' } }
  },
  computed: {
    filteredMedicines() {
      if (!this.searchQuery.trim()) return this.medicines;
      const q = this.searchQuery.toLowerCase();
      return this.medicines.filter(m => (m.name && m.name.toLowerCase().includes(q)) || (m.location && m.location.toLowerCase().includes(q)));
    }
  },
  methods: {
    toggleExpand(item) { item.isExpanded = !item.isExpanded; },
    renderMarkdown(text) { return (text && typeof marked !== 'undefined') ? marked.parse(text, { breaks: true, gfm: true }) : text; },
    async loadMedicines() {
      const res = await fetch('/api/medicines');
      const data = await res.json();
      if (data.status === 'success') this.medicines = data.data.map(i => ({ ...i, isExpanded: false, isEditing: false }));
    },
    async addMed() {
      if (!this.newMed.name) return alert('名称不能为空');
      const params = new URLSearchParams(this.newMed).toString();
      await fetch(`/api/add_medicine?${params}`, { method: 'POST' });
      this.newMed = { name: '', count: '', location: '', expire_date: '', usage: '' };
      this.loadMedicines();
    },
    async updateMed(item) {
      const params = new URLSearchParams({ id: item.id, name: item.name, count: item.count, location: item.location, expire_date: item.expire_date, usage: item.usage }).toString();
      await fetch(`/api/update_medicine?${params}`, { method: 'POST' });
      item.isEditing = false;
      alert('已更新');
      this.loadMedicines();
    },
    async deleteMed(id) {
      if (confirm('确认删除？')) { await fetch(`/api/delete_medicine?id=${id}`, { method: 'POST' }); this.loadMedicines(); }
    },
    async handleImageUpload(event, targetObject) {
      const file = event.target.files[0]; if (!file) return;
      this.isOcrLoading = true;
      try {
        const formData = new FormData(); formData.append('file', file);
        const res = await fetch('/api/parse_instruction', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.status === 'success') { targetObject.usage = data.text; if (targetObject.id) this.updateMed(targetObject); }
      } catch (e) { alert('OCR异常'); } finally { this.isOcrLoading = false; }
    }
  },
  mounted() { this.loadMedicines(); }
}