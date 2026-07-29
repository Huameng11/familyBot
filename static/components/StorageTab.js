export default {
  name: 'StorageTab',
  template: `
    <div class="content-section manager-padding">
      <div class="card">
        <h3>➕ 录入新物资</h3>
        <div class="form-group"><label>物品名称 *</label><input type="text" v-model="newStorage.item_name" class="form-control" placeholder="如：维达抽纸"></div>
        <div class="form-group"><label>分类</label><input type="text" v-model="newStorage.category" class="form-control" placeholder="如：日用百货"></div>
        <div class="form-group"><label>数量 / 规格</label><input type="text" v-model="newStorage.quantity" class="form-control"></div>
        <div class="form-group"><label>存放位置</label><input type="text" v-model="newStorage.location" class="form-control"></div>
        <div class="form-group"><label>备注说明</label><input type="text" v-model="newStorage.remark" class="form-control"></div>
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
        <div v-for="item in filteredStorageList" :key="item.id" class="item-card storage-border">
          <div class="item-card-header">
            <input type="text" v-model="item.item_name" class="item-title-input">
            <div class="action-btns">
              <button class="btn" style="background:#f44336;padding:6px 12px;font-size:13px;" @click="deleteStorage(item.id)">删除</button>
              <button class="btn" style="background:#FF9800;padding:6px 12px;font-size:13px;" @click="updateStorage(item)">保存</button>
            </div>
          </div>
          <div class="form-group"><label>分类</label><input type="text" v-model="item.category" class="form-control"></div>
          <div class="form-group"><label>数量/规格</label><input type="text" v-model="item.quantity" class="form-control"></div>
          <div class="form-group"><label>存放位置</label><input type="text" v-model="item.location" class="form-control"></div>
          <div class="form-group"><label>备注</label><input type="text" v-model="item.remark" class="form-control"></div>
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
    async fetchList() {
      const res = await fetch('/api/storage');
      const data = await res.json();
      if (data.status === 'success') this.storageList = data.data;
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
      const params = new URLSearchParams(item).toString();
      await fetch(`/api/update_storage?${params}`, { method: 'POST' });
      alert('修改成功');
      this.fetchList();
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