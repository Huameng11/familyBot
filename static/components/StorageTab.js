import BatchImport from './BatchImport.js';

export default {
  name: 'StorageTab',
  components: { BatchImport },
  template: `
    <div class="content-section manager-padding">
      <batch-import 
        title="📦 录入新物资"
        api-route="/api/batch_add_storage"
        ai-prompt="帮我生成3条家庭囤货囤积物资的JSON数组"
        example-format='[{"item_name":"抽纸","category":"日用百货","quantity":"1箱","location":"储物间","remark":"囤货"}]'
        btn-color="#FF9800"
        @success="fetchList"
      >
        <div class="form-group"><label>物品名称 *</label><input type="text" v-model="newStorage.item_name" class="form-control"></div>
        <div class="form-group"><label>分类</label><input type="text" v-model="newStorage.category" class="form-control"></div>
        <div class="form-group"><label>数量/规格</label><input type="text" v-model="newStorage.quantity" class="form-control"></div>
        <div class="form-group"><label>存放位置</label><input type="text" v-model="newStorage.location" class="form-control"></div>
        <div class="form-group"><label>备注说明 (支持 MD)</label><textarea v-model="newStorage.remark" rows="2" class="form-control"></textarea></div>
        <button class="btn" style="width:100%; background:#FF9800;" @click="addStorage">保存到仓库</button>
      </batch-import>

      <div class="card">
        <h3>📋 仓库物资清单</h3>
        <div style="margin-bottom:15px;"><input type="text" v-model="searchKey" class="form-control search-input" placeholder="🔍 搜索..."></div>
        
        <div class="common-accordion-list">
          <div v-for="item in filteredStorageList" :key="item.id" class="accordion-item storage-item-theme">
            <div class="accordion-header" @click="toggleExpand(item)">
              <div class="header-main-info">
                <span class="header-title-text">📦 {{ item.item_name }}</span>
                <div class="header-badge-container">
                  <span class="badge-item badge-main">{{ item.quantity || '无数量' }}</span>
                  <span class="badge-item badge-sub">{{ item.location || '未知位置' }}</span>
                </div>
              </div>
              <span :class="['arrow-icon', { 'arrow-rotated': item.isExpanded }]">▼</span>
            </div>

            <div v-show="item.isExpanded" class="accordion-body">
              <div class="form-group"><label>物品名称</label><input type="text" class="form-control" v-model="item.item_name"></div>
              <div class="form-group"><label>物资分类</label><input type="text" class="form-control" v-model="item.category"></div>
              <div class="form-group"><label>数量/规格</label><input type="text" class="form-control" v-model="item.quantity"></div>
              <div class="form-group"><label>存放位置</label><input type="text" class="form-control" v-model="item.location"></div>
              <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <label>备注说明</label>
                  <span class="edit-toggle-link" @click="item.isEditing = !item.isEditing">{{ item.isEditing ? '👁️ 预览' : '✍️ 修改' }}</span>
                </div>
                <textarea v-if="item.isEditing" class="form-control" rows="3" v-model="item.remark"></textarea>
                <div v-else class="accordion-markdown-panel"><div v-html="renderMarkdown(item.remark || '*暂无备注*')" class="markdown-body"></div></div>
              </div>
              <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px; padding-top:10px; border-top:1px dashed #eee;">
                <button class="btn" style="background:#f44336; padding:8px 16px;" @click="deleteStorage(item.id)">删除</button>
                <button class="btn" style="background:#FF9800; padding:8px 16px;" @click="updateStorage(item)">保存修改</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return { searchKey: '', storageList: [], newStorage: { item_name: '', category: '', quantity: '', location: '', remark: '' } }
  },
  computed: {
    filteredStorageList() {
      if (!this.searchKey.trim()) return this.storageList;
      const k = this.searchKey.toLowerCase();
      return this.storageList.filter(i => (i.item_name && i.item_name.toLowerCase().includes(k)) || (i.location && i.location.toLowerCase().includes(k)));
    }
  },
  methods: {
    toggleExpand(item) { item.isExpanded = !item.isExpanded; },
    renderMarkdown(text) { return (text && typeof marked !== 'undefined') ? marked.parse(text, { breaks: true, gfm: true }) : text; },
    async fetchList() {
      const res = await fetch('/api/storage');
      const data = await res.json();
      if (data.status === 'success') this.storageList = data.data.map(i => ({ ...i, isExpanded: false, isEditing: false }));
    },
    async addStorage() {
      if (!this.newStorage.item_name) return alert('名称不能为空');
      const params = new URLSearchParams(this.newStorage).toString();
      await fetch(`/api/add_storage?${params}`, { method: 'POST' });
      this.newStorage = { item_name: '', category: '', quantity: '', location: '', remark: '' };
      this.fetchList();
    },
    async updateStorage(item) {
      const params = new URLSearchParams({ id: item.id, item_name: item.item_name, category: item.category, quantity: item.quantity, location: item.location, remark: item.remark }).toString();
      await fetch(`/api/update_storage?params=${params}`, { method: 'POST' });
      item.isEditing = false;
      alert('已更新');
      this.fetchList();
    },
    async deleteStorage(id) {
      if (confirm('确认删除？')) { await fetch(`/api/delete_storage?id=${id}`, { method: 'POST' }); this.fetchList(); }
    }
  },
  mounted() { this.fetchList(); }
}