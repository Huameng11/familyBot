export default {
  name: 'BatchImport',
  // 接收父组件（各个模块）传进来的特性化参数
  props: {
    title: { type: String, required: true },         // 卡片标题
    apiRoute: { type: String, required: true },      // 后端批量导入的 API 接口
    aiPrompt: { type: String, required: true },      // 给 AI 的提示词模版
    exampleFormat: { type: String, required: true }, // JSON 格式示例
    btnColor: { type: String, default: '#2e7d32' }   // 导入按钮颜色（可选参数）
  },
  template: `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:8px;">
        <h3 style="margin:0; border:none; padding:0;">{{ title }}</h3>
        <span class="edit-toggle-link" @click="isBatchMode = !isBatchMode">
          {{ isBatchMode ? '✍️ 单条录入' : '📄 从 JSON 批量导入' }}
        </span>
      </div>

      <div v-if="!isBatchMode">
        <slot></slot>
      </div>

      <div v-else>
        <div class="form-group">
          <label>请粘贴由 AI 生成的标准 JSON 数组</label>
          <div style="background:#f8f9fa; padding:8px; border-radius:6px; font-size:11px; color:#666; margin-bottom:8px; line-height:1.4;">
            💡 <strong>AI 提示词参考：</strong><br>
            "{{ aiPrompt }}"<br><br>
            <strong>格式必须严格为：</strong><br>
            <code>{{ exampleFormat }}</code>
          </div>
          <textarea v-model="jsonInput" rows="6" class="form-control" style="font-family:monospace; font-size:13px; background:#fafafa;" placeholder="[ { ... } ]"></textarea>
        </div>
        <button class="btn" :style="{ width: '100%', background: btnColor }" @click="handleBatchImport">
          ⚡ 解析并一键导入多条
        </button>
      </div>
    </div>
  `,
  data() {
    return {
      isBatchMode: false,
      jsonInput: ''
    }
  },
  methods: {
    async handleBatchImport() {
      if (!this.jsonInput.trim()) return alert('请先粘贴 JSON 数据');
      try {
        const parsedData = JSON.parse(this.jsonInput);
        if (!Array.isArray(parsedData)) {
          return alert('解析失败：JSON 数据必须是一个包裹在 [ ] 中的数组列表！');
        }
        
        // 统一调用父组件传进来的接口路由
        const res = await fetch(this.apiRoute, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedData)
        });
        const result = await res.json();
        
        if (result.status === 'success') {
          alert(result.message);
          this.jsonInput = '';
          this.isBatchMode = false;
          // 通知父组件：导入成功啦，快去刷新你的列表！
          this.$emit('success'); 
        } else {
          alert('后端导入失败：' + result.message);
        }
      } catch (err) {
        alert('❌ JSON 语法解析错误，请检查括号、双引号是否闭合对齐！\\n具体错误：' + err.message);
      }
    }
  }
}