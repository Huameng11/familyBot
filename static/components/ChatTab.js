export default {
  name: 'ChatTab',
  template: `
    <div class="content-section" ref="scrollContainer">
      <div style="padding: 10px 15px 0 15px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12px; color: #888;">📊 对话持久化缓存已开启</span>
        <button class="btn" style="background: #ff4d4f; font-size: 11px; padding: 4px 10px; border-radius: 6px;" @click="clearHistory">
          🗑️ 清空记录
        </button>
      </div>

      <div id="chat-box" ref="chatBox">
        <div v-for="(msg, index) in chatHistory" :key="index" :class="['msg', msg.role]">
          
          <template v-if="msg.role === 'bot'">
            <div class="msg-header">
              <div class="msg-author">🤖 FamilyBot</div>
              <button class="copy-btn" @click="copyText(msg.text)">复制</button>
            </div>
            <div v-html="renderMarkdown(msg.text)" class="markdown-body"></div>
            <button class="play-btn" @click="toggleSpeak(msg.text, index)">
              {{ speakingIndex === index ? '⏹️ 停止朗读' : '▶   朗 读' }}
            </button>
          </template>

          <template v-else>
            <div class="msg-header">
              <div class="msg-author" style="color: #c5cae9;">👤 User</div>
            </div>
            <div class="user-content">{{ msg.text }}</div>
          </template>
          
        </div>
        <div v-if="isThinking" class="loading">大管家正在检索数据库...</div>
      </div>

      <div class="input-area">
        <button class="voice-btn" @click="startVoice">{{ isRecording ? '🎙️' : '🎤' }}</button>
        <input type="text" class="chat-input" v-model="userInput" @keypress.enter="sendMessage" placeholder="有事请吩咐大管家...">
        <button class="btn" style="border-radius:20px;" @click="sendMessage">发送</button>
      </div>
    </div>
  `,
  data() {
    return {
      chatHistory: [], 
      userInput: '',
      isThinking: false,
      isRecording: false,
      speakingIndex: null 
    }
  },
  methods: {
    // 🚀 新增：一键复制文本功能
    // 🚀 修复版：带降级兼容的一键复制文本功能
    async copyText(text) {
      // 1. 如果支持现代剪贴板 API 且在 HTTPS/localhost 安全环境下
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          alert('✅ 内容已复制到剪贴板！');
          return;
        } catch (err) {
          console.warn("现代复制失败，尝试降级...", err);
        }
      }
      
      // 2. 降级方案：适用于局域网 HTTP 访问
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        // 将 textarea 移出视口，避免页面滚动跳动
        textArea.style.position = "fixed";
        textArea.style.top = "-999999px";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          alert('✅ 内容已复制到剪贴板！');
        } else {
          alert('❌ 复制失败，请手动长按文字复制。');
        }
      } catch (err) {
        alert('❌ 浏览器不支持此操作，请长按文字复制。');
      }
    },

    async loadChatHistory() {
      try {
        const res = await fetch('/api/chat/history');
        const data = await res.json();
        if (data.status === 'success' && data.data.length > 0) {
          this.chatHistory = data.data;
        } else {
          this.chatHistory = [{ role: 'bot', text: '欢迎回来！我是你的家庭超级管家 **FamilyBot**。' }];
        }
        this.scrollToBottom();
      } catch (e) {
        console.error("加载聊天历史记录失败", e);
      }
    },

    async clearHistory() {
      if (confirm('确定要永久清空所有的聊天记录吗？此操作不可恢复。')) {
        try {
          const res = await fetch('/api/chat/clear', { method: 'POST' });
          const data = await res.json();
          if (data.status === 'success') {
            this.chatHistory = [{ role: 'bot', text: '聊天记录已成功清空。大管家随时等待您的吩咐。 ✨' }];
            alert('清空成功！');
          }
        } catch (e) {
          alert('清空失败，网络或后端接口异常');
        }
      }
    },

    renderMarkdown(text) {
      if (!text) return '';
      return marked.parse(text, { breaks: true, gfm: true });
    },

    async sendMessage() {
      if (!this.userInput.trim()) return;
      const query = this.userInput;
      this.chatHistory.push({ role: 'user', text: query });
      this.userInput = '';
      this.isThinking = true;
      this.$nextTick(() => { this.scrollToBottom(); });

      try {
        const res = await fetch(`/api/chat?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        this.chatHistory.push({ role: 'bot', text: data.reply });
      } catch (e) {
        this.chatHistory.push({ role: 'bot', text: '网络连接失败，请确认后端服务是否正常运行。' });
      } finally {
        this.isThinking = false;
        this.$nextTick(() => { this.scrollToBottom(); });
      }
    },

    toggleSpeak(text, index) {
      if (!('speechSynthesis' in window)) {
        return alert('您的浏览器不支持语音朗读功能');
      }
      if (this.speakingIndex === index) {
        window.speechSynthesis.cancel();
        this.speakingIndex = null;
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN'; 
      utterance.rate = 1.0;     
      utterance.pitch = 1.0;    
      utterance.onend = () => { this.speakingIndex = null; };
      utterance.onerror = () => { this.speakingIndex = null; };
      this.speakingIndex = index;
      window.speechSynthesis.speak(utterance);
    },

    scrollToBottom() {
      this.$nextTick(() => {
        setTimeout(() => {
          const box = this.$refs.scrollContainer; 
          if (box) { box.scrollTop = box.scrollHeight; }
        }, 80);
      });
    },

    startVoice() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return alert('您的浏览器不支持语音识别');
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.start();
      this.isRecording = true;
      recognition.onresult = (e) => {
        this.userInput = e.results[0][0].transcript;
        this.isRecording = false;
        this.sendMessage();
      };
      recognition.onerror = () => { this.isRecording = false; };
      recognition.onend = () => { this.isRecording = false; };
    }
  },
  mounted() {
    this.loadChatHistory();
  },
  unmounted() {
    if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); }
  }
}