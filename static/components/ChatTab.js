export default {
  name: 'ChatTab',
  template: `
    <div class="content-section" ref="scrollContainer">
      <div id="chat-box" ref="chatBox">
        <div v-for="(msg, index) in chatHistory" :key="index" :class="['msg', msg.role]">
          <div v-html="renderMarkdown(msg.text)" class="markdown-body"></div>
          
          <div v-if="msg.role === 'bot'" style="margin-top: 8px; text-align: right;">
            <button 
              class="btn" 
              style="background: #e8eaf6; color: #3F51B5; font-size: 11px; padding: 3px 8px; border-radius: 12px;"
              @click="toggleSpeak(msg.text, index)"
            >
              {{ speakingIndex === index ? '⏹️ 停止' : '🔊 朗读' }}
            </button>
          </div>
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
      chatHistory: [{ role: 'bot', text: '欢迎回来！我是你的家庭超级管家 **FamilyBot**。 👋' }],
      userInput: '',
      isThinking: false,
      isRecording: false,
      speakingIndex: null 
    }
  },
  methods: {
    // 新增：Markdown 渲染函数
    renderMarkdown(text) {
      if (!text) return '';
      // 使用 marked 库将 md 文本转换为 html，并配置安全渲染
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

      utterance.onend = () => {
        this.speakingIndex = null;
      };

      utterance.onerror = () => {
        this.speakingIndex = null;
      };

      this.speakingIndex = index;
      window.speechSynthesis.speak(utterance);
    },

    scrollToBottom() {
      this.$nextTick(() => {
        setTimeout(() => {
          const box = this.$refs.scrollContainer; 
          if (box) {
            box.scrollTop = box.scrollHeight;
          }
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

  unmounted() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}