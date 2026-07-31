export default {
  name: 'StorageTab',
  template: `
    <div class="content-section manager-padding">
      <div class="card">
        <h3>➕ 录入新物资</h3>
        <div class="form-group"><label>物品名称 *</label><input type="text" v-model="newStorage.item_name" class="form-control" placeholder="如：维达抽纸"></div>
        <div class="form-group"><label>分类</label><input type="text" v-model="newStorage.category" class="form-control" placeholder="如：日用百货"></div>
        <div class="form-group"><label>数量 / 规格</label><input type="text" v-model="newStorage.quantity" class="form-control" placeholder="如：1箱 / 24包"></div>
        <div class="form-group"><label>存放位置</label><input type="text" v-model="newStorage.location" class="form-control" placeholder="如：主卧床底储物箱"></div>
        <div class="form-group"><label>备注说明</label><input type="text" v-model="newStorage.remark" class="form-control" placeholder="如：双十一囤货"></div>
        <button class="btn" style="width:100%; background:#FF9800;" @click="addStorage">保存到仓库</button>
      </div>

      <div class="card">
        <h3>📋 仓库库存 (显示: {{ filteredStorageList.length }} / 共: {{ storageList.length }})</h3>
        <div style="margin-bottom: 15px;">
          <input type="text" v-model="searchKey" class="form-control search-input" placeholder="🔍 快速搜索物资名称、分类、位置...">
        </div>
        
        <div v-if="filteredStorageList.length === 0" style="text-align:center;color:#999;font-size:13px;padding:15px 0;">
          {{ searchKey ? '未找到符合条件的物资' : '暂无数据' }}
        </div>

        <div class="common-accordion-list">
          <div v-for="item in filteredStorageList" :key="item.id" class="accordion-item storage-item-theme">
            
            <div class="accordion-header" @click="toggleExpand(item)">
              <div class="header-main-info">
                <span class="header-title-text">📦 {{ item.item_name || '未命名物资' }}</span>
                <div class="header-badge-container">
                  <span class="badge-item badge-main">{{ item.quantity || '无数量记录' }}</span>
                  <span class="badge-item badge-sub">{{ item.location || '未知位置' }}</span>
                </div>
              </div>
              <span :class="['arrow-icon', { 'arrow-rotated': item.isExpanded }]">▼</span>
            </div>

            <div v-show="item.isExpanded" class="accordion-body">
              <div class="form-group">
                <label>物品名称说明</label>
                <input type="text" class="form-control" v-model="item.item_name">
              </div>
              <div class="form-group">
                <label>物资分类</label>
                <input type="text" class="form-control" v-model="item.category">
              </div>
              <div class="form-group">
                <label>数量 / 规格</label>
                <input type="text" class="form-control" v-model="item.quantity">
              </div>
              <div class="form-group">
                <label>存放位置</label>
                <input type="text" class="form-control" v-model="item.location">
              </div>
              <div class="form-group">
                <label>备注信息</label>
                <input type="text" class="form-control" v-model="item.remark">
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee;">
                <button class="btn" style="background:#f44336; padding: 8px 16px; font-size: 13px;" @click="deleteStorage(item.id)">删除物资</button>
                <button class="btn" style="background:#FF9800; padding: 8px 16px; font-size: 13px;" @click="updateStorage(item)">保存修改</button>
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
      storageList: [],
      newStorage: { item_name: '', category: '', quantity: '', location: '', remark: '' }
    }
  },
  computed: {
    filteredStorageList() {
      if (!this.searchKey.trim()) return this.storageList;
      const key = this.searchKey.toLowerCase();
      return this.storageList.filter(item => 
        (item.item_name && item.item_name.toLowerCase().includes(key)) ||
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
      const res = await fetch('/api/storage');
      const data = await res.json();
      // 🚀 核心改动：获取全量数据后，为物资对象动态塞入前端响应式 isExpanded: false 状态实现初始折叠
      if (data.status === 'success') {
        this.storageList = data.data.map(item => ({ ...item, isExpanded: false }));
      }
    },
    async addStorage() {
      if (!this.newStorage.item_name) return alert('请输入名称');
      const params = new URLSearchParams(this.newStorage).toString();
      await fetch(`/api/add_storage?${params}`, { method: 'POST' });
      alert('录入成功');
      this.newStorage = { item_name: '', category: '', quantity: '', location: '', remark: '' };
      this.fetchList();
    },
    async updateStorage(item) {
      const params = new URLSearchParams({
        id: item.id,
        item_name: item.item_name,
        category: item.category,
        quantity: item.quantity,
        location: item.location,
        remark: item.remark
      }).toString();
      await fetch(`/api/update_storage?${params}`, { method: 'POST' });
      alert('修改已成功保存！');
    },
    async deleteStorage(id) {
      if (confirm('确定要删除这条物资记录吗？')) {
        await fetch(`/api/delete_storage?id=${id}`, { method: 'POST' });
        this.fetchList();
      }
    }
  },
  mounted() {
    this.fetchList();
  }
}