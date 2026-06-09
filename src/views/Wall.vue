<template>
  <div class="wall-page">
    <div class="wall-header" v-if="store.loveLetters.length > 0">
      <h2>🎨 情书墙</h2>
      <p>点击展品查看完整对话，点击连线查看回复关系</p>
      
      <div class="filter-bar">
        <span class="filter-label">筛选模式：</span>
        <button 
          v-for="mode in displayModes" 
          :key="mode.value"
          class="mode-btn"
          :class="{ active: displayMode === mode.value }"
          @click="displayMode = mode.value"
        >
          {{ mode.label }}
        </button>
      </div>
    </div>

    <div v-if="store.loveLetters.length === 0" class="empty-state">
      <div class="icon">💌</div>
      <h3>还没有情书哦</h3>
      <p>先去首页上传短信备份，或者加载演示数据看看效果吧</p>
      <router-link to="/" class="btn btn-primary">去上传</router-link>
    </div>

    <div v-else class="wall-container">
      <div class="wall-canvas" ref="wallCanvas">
        <svg class="connection-lines" ref="svgRef">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" :style="{ stopColor: lineColor }" />
              <stop offset="100%" :style="{ stopColor: lineColor, stopOpacity: 0.3 }" />
            </linearGradient>
            <marker 
              id="arrowhead" 
              markerWidth="10" 
              markerHeight="7" 
              refX="9" 
              refY="3.5" 
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" :fill="lineColor" />
            </marker>
          </defs>
          
          <g v-for="letter in displayedLetters" :key="'lines-' + letter.conversation.id">
            <g v-for="rel in letter.relationships" :key="'rel-' + letter.conversation.id + '-' + rel.from + '-' + rel.to">
              <line
                v-if="getMessagePosition(letter, rel.fromIndex) && getMessagePosition(letter, rel.toIndex)"
                :x1="getMessagePosition(letter, rel.fromIndex).x"
                :y1="getMessagePosition(letter, rel.fromIndex).y"
                :x2="getMessagePosition(letter, rel.toIndex).x"
                :y2="getMessagePosition(letter, rel.toIndex).y"
                :stroke="getLineColor(rel)"
                :stroke-width="getLineWidth(rel)"
                :stroke-dasharray="rel.isReply ? 'none' : '5,5'"
                :marker-end="rel.isReply ? 'url(#arrowhead)' : ''"
                :opacity="getLineOpacity(rel)"
                class="connection-line"
                :class="{ 
                  'is-reply': rel.isReply, 
                  'is-alternate': rel.direction === 'alternate',
                  'highlight': highlightedRel === rel.from + '-' + rel.to
                }"
                @click="highlightRelationship(rel)"
              />
            </g>
          </g>
        </svg>

        <div 
          v-for="letter in displayedLetters" 
          :key="'group-' + letter.conversation.id"
          class="letter-group"
          :style="getGroupStyle(letter)"
        >
          <div class="group-title">
            <h3>{{ letter.conversation.name }}</h3>
            <span class="group-score">情书指数 {{ letter.loveScore }}</span>
          </div>

          <div class="messages-grid">
            <div
              v-for="(msg, idx) in letter.highlightedMessages"
              :key="msg.id"
              class="message-exhibit"
              :class="{ 
                sent: msg.isSent, 
                received: msg.isReceived,
                'has-highlight': msg.highlights && msg.highlights.length > 0,
                'selected': selectedMsg === msg.id
              }"
              :ref="el => setMessageRef(letter, idx, el)"
              @click="selectMessage(letter, msg)"
            >
              <div class="exhibit-header">
                <span class="exhibit-time">{{ formatDate(msg.date) }}</span>
                <span class="exhibit-type">{{ msg.isSent ? '📤 发送' : '📥 接收' }}</span>
              </div>
              
              <div class="exhibit-body">
                {{ msg.body }}
              </div>
              
              <div class="exhibit-tags" v-if="msg.highlights && msg.highlights.length > 0">
                <span 
                  v-for="hl in msg.highlights" 
                  :key="hl.type"
                  class="tag"
                  :class="'tag-' + hl.type"
                >
                  {{ hl.text }}
                </span>
              </div>
              
              <div class="exhibit-actions">
                <button class="action-btn" @click.stop="viewConversation(letter)">
                  👀 看对话
                </button>
                <button class="action-btn primary" @click.stop="hangUp(letter, msg)">
                  📌 挂出去
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedLetter" class="conversation-modal" @click.self="selectedLetter = null">
      <div class="modal-content card">
        <div class="modal-header">
          <h3>💬 完整对话 - {{ selectedLetter.conversation.name }}</h3>
          <button class="close-btn" @click="selectedLetter = null">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="conversation-tags">
            <span 
              v-for="tag in selectedLetter.tags" 
              :key="tag"
              class="tag"
              :class="getTagClass(tag)"
            >
              {{ tag }}
            </span>
          </div>
          
          <div class="full-conversation">
            <div 
              v-for="msg in selectedLetter.highlightedMessages" 
              :key="msg.id"
              class="chat-message"
              :class="{ sent: msg.isSent, received: msg.isReceived }"
            >
              <div class="chat-avatar">
                {{ msg.isSent ? '👤' : '💑' }}
              </div>
              <div class="chat-content">
                <div class="chat-bubble">
                  {{ msg.body }}
                </div>
                <div class="chat-time">{{ formatDate(msg.date) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showHangUpModal" class="conversation-modal" @click.self="showHangUpModal = false">
      <div class="modal-content card">
        <div class="modal-header">
          <h3>📌 匿名挂出去</h3>
          <button class="close-btn" @click="showHangUpModal = false">✕</button>
        </div>
        
        <div class="modal-body">
          <p class="modal-desc">把这条短信匿名挂到广场，让别人猜猜上下文是什么。</p>
          
          <div class="preview-exhibit">
            <div class="message-exhibit received">
              <div class="exhibit-body">
                {{ selectedMessageToHang?.body }}
              </div>
            </div>
          </div>
          
          <div class="options">
            <label>
              <input type="checkbox" v-model="hangUpOptions.hideContext" />
              隐藏上下文（让大家猜）
            </label>
            <label>
              <input type="checkbox" v-model="hangUpOptions.anonymous" />
              完全匿名（不显示任何联系方式）
            </label>
          </div>
          
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showHangUpModal = false">取消</button>
            <button class="btn btn-primary" @click="confirmHangUp">确认挂出</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { store } from '@/store';
const router = useRouter();
const wallCanvas = ref(null);
const svgRef = ref(null);
const displayMode = ref('all');
const selectedLetter = ref(null);
const selectedMsg = ref(null);
const highlightedRel = ref(null);
const showHangUpModal = ref(false);
const selectedMessageToHang = ref(null);
const selectedLetterToHang = ref(null);
const hangUpOptions = ref({
 hideContext: true,
 anonymous: true
});
const messageRefs = ref({});
const displayModes = [
 { value: 'all', label: '全部' },
 { value: 'love', label: '💖 情书模式' },
 { value: 'quarrel', label: '🔥 争吵模式' },
 { value: 'cute', label: '🥺 撒娇模式' }
];
const lineColor = computed(() => {
 switch (displayMode.value) {
 case 'quarrel': return '#e74c3c';
 case 'cute': return '#ff8fab';
 default: return '#e74c3c';
 }
});
const displayedLetters = computed(() => {
 if (displayMode.value === 'all')
 return store.loveLetters;
 return store.loveLetters.filter(l => {
 const tagStr = l.tags.join('');
 if (displayMode.value === 'love') {
 return tagStr.includes('想念') || tagStr.includes('爱意') || tagStr.includes('晚安');
 }
 if (displayMode.value === 'quarrel') {
 return tagStr.includes('争吵') || tagStr.includes('冤家') || tagStr.includes('情绪');
 }
 if (displayMode.value === 'cute') {
 return tagStr.includes('撒娇') || tagStr.includes('可爱') || tagStr.includes('叠字');
 }
 return true;
 });
});
function setMessageRef(letter, idx, el) {
 const key = letter.conversation.id + '-' + idx;
 if (el) {
 messageRefs.value[key] = el;
 }
}
function getMessagePosition(letter, idx) {
 const key = letter.conversation.id + '-' + idx;
 const el = messageRefs.value[key];
 const container = wallCanvas.value;
 if (!el || !container)
 return null;
 const elRect = el.getBoundingClientRect();
 const containerRect = container.getBoundingClientRect();
 return {
 x: elRect.left + elRect.width / 2 - containerRect.left + container.scrollLeft,
 y: elRect.top + elRect.height / 2 - containerRect.top + container.scrollTop
 };
}
function getGroupStyle(letter) {
 const index = displayedLetters.value.indexOf(letter);
 return {
 marginTop: index > 0 ? '4rem' : '0'
 };
}
function getLineColor(rel) {
 if (rel.direction === 'alternate' && rel.isReply) {
 return '#e74c3c';
 }
 if (rel.type === 'thread') {
 return '#f39c12';
 }
 return '#bdc3c7';
}
function getLineWidth(rel) {
 if (rel.isReply && rel.direction === 'alternate')
 return 3;
 if (rel.timeDiff < 300000)
 return 2.5;
 return 1.5;
}
function getLineOpacity(rel) {
 if (rel.isReply)
 return 0.8;
 if (rel.timeDiff < 3600000)
 return 0.5;
 return 0.2;
}
function highlightRelationship(rel) {
 highlightedRel.value = rel.from + '-' + rel.to;
 setTimeout(() => {
 highlightedRel.value = null;
 }, 2000);
}
function selectMessage(letter, msg) {
 selectedMsg.value = msg.id;
}
function viewConversation(letter) {
 selectedLetter.value = letter;
}
function hangUp(letter, msg) {
 selectedMessageToHang.value = msg;
 selectedLetterToHang.value = letter;
 showHangUpModal.value = true;
}
function confirmHangUp() {
 if (!selectedMessageToHang.value || !selectedLetterToHang.value)
 return;
 const post = {
 id: Math.random().toString(36).substr(2, 9),
 message: selectedMessageToHang.value.body,
 messageId: selectedMessageToHang.value.id,
 date: Date.now(),
 isSent: selectedMessageToHang.value.isSent,
 context: hangUpOptions.value.hideContext ? null : {
 prev: getContextMessage(selectedLetterToHang.value, selectedMessageToHang.value, -1),
 next: getContextMessage(selectedLetterToHang.value, selectedMessageToHang.value, 1)
 },
 tags: selectedMessageToHang.value.highlights || [],
 guesses: [],
 anonymous: hangUpOptions.value.anonymous,
 originalConversation: hangUpOptions.value.anonymous ? null : selectedLetterToHang.value.conversation.name
 };
 store.addAnonymousPost(post);
 showHangUpModal.value = false;
 selectedMessageToHang.value = null;
 selectedLetterToHang.value = null;
 router.push('/gallery');
}
function getContextMessage(letter, msg, direction) {
 const messages = letter.highlightedMessages;
 const idx = messages.findIndex(m => m.id === msg.id);
 const contextIdx = idx + direction;
 if (contextIdx >= 0 && contextIdx < messages.length) {
 return messages[contextIdx].body;
 }
 return null;
}
function formatDate(timestamp) {
 const d = new Date(timestamp);
 const month = d.getMonth() + 1;
 const day = d.getDate();
 const hour = d.getHours().toString().padStart(2, '0');
 const minute = d.getMinutes().toString().padStart(2, '0');
 return `${month}/${day} ${hour}:${minute}`;
}
function getTagClass(tag) {
 if (tag.includes('想念') || tag.includes('思念'))
 return 'tag-miss';
 if (tag.includes('晚安'))
 return 'tag-night';
 if (tag.includes('道歉') || tag.includes('对不起'))
 return 'tag-sorry';
 if (tag.includes('爱意') || tag.includes('双向奔赴'))
 return 'tag-love';
 if (tag.includes('争吵') || tag.includes('冤家') || tag.includes('情绪'))
 return 'tag-quarrel';
 if (tag.includes('撒娇') || tag.includes('可爱') || tag.includes('叠字'))
 return 'tag-cute';
 if (tag.includes('高频') || tag.includes('秒回') || tag.includes('互动'))
 return 'tag-freq';
 return 'tag';
}
onMounted(() => {
 nextTick(() => {
 const container = wallCanvas.value;
 if (container) {
 container.addEventListener('scroll', () => {
 }, { passive: true });
 }
 });
});
</script>

<style scoped>
.wall-page {
  position: relative;
}

.wall-header {
  text-align: center;
  margin-bottom: 2rem;
}

.wall-header h2 {
  font-size: 2rem;
  color: var(--love-red);
  margin-bottom: 0.5rem;
}

.wall-header p {
  color: var(--text-light);
  margin-bottom: 1.5rem;
}

.filter-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-label {
  color: var(--text-light);
}

.mode-btn {
  padding: 0.5rem 1rem;
  border: 2px solid var(--border);
  background: white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.mode-btn:hover {
  border-color: var(--love-pink);
}

.mode-btn.active {
  background: linear-gradient(135deg, var(--love-red), var(--love-pink));
  color: white;
  border-color: transparent;
}

.wall-container {
  position: relative;
}

.wall-canvas {
  position: relative;
  overflow-x: auto;
  padding: 2rem;
}

.connection-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.connection-lines .connection-line {
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s;
}

.connection-lines .connection-line:hover,
.connection-lines .connection-line.highlight {
  stroke-width: 4 !important;
  stroke: var(--love-red) !important;
  opacity: 1 !important;
}

.letter-group {
  position: relative;
  z-index: 2;
  margin-bottom: 3rem;
}

.group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px dashed var(--border);
}

.group-title h3 {
  color: var(--text-dark);
}

.group-score {
  color: var(--love-red);
  font-weight: bold;
  background: #ffe5e5;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.messages-grid {
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  padding: 1rem 0;
  scroll-snap-type: x mandatory;
}

.message-exhibit {
  flex: 0 0 300px;
  scroll-snap-align: start;
  background: white;
  border: 2px solid var(--border);
  border-radius: 16px;
  padding: 1.25rem;
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
}

.message-exhibit::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 12px;
  background: var(--bg-medium);
  border-radius: 6px;
  border: 2px solid var(--border);
}

.message-exhibit:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 30px rgba(231, 76, 60, 0.2);
  border-color: var(--love-pink);
}

.message-exhibit.sent {
  border-left: 4px solid var(--love-red);
}

.message-exhibit.received {
  border-right: 4px solid var(--accent);
}

.message-exhibit.selected {
  border-color: var(--love-red);
  box-shadow: 0 0 20px rgba(231, 76, 60, 0.3);
}

.exhibit-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-light);
  margin-bottom: 0.75rem;
}

.exhibit-body {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-dark);
  margin-bottom: 1rem;
  min-height: 60px;
}

.exhibit-tags {
  margin-bottom: 1rem;
}

.exhibit-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.action-btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border);
  background: white;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: var(--bg-light);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--love-red), var(--love-pink));
  color: white;
  border: none;
}

.preview-exhibit {
  margin: 1.5rem 0;
  padding: 1rem;
  background: var(--bg-light);
  border-radius: 12px;
}

.conversation-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  color: var(--love-red);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-light);
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s;
}

.close-btn:hover {
  background: var(--love-red);
  color: white;
}

.modal-body {
  overflow-y: auto;
  flex: 1;
}

.modal-desc {
  color: var(--text-light);
  margin-bottom: 1rem;
}

.conversation-tags {
  margin-bottom: 1.5rem;
}

.full-conversation {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chat-message {
  display: flex;
  gap: 0.75rem;
}

.chat-message.sent {
  flex-direction: row-reverse;
}

.chat-avatar {
  width: 40px;
  height: 40px;
  background: var(--bg-medium);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.chat-content {
  max-width: 70%;
}

.chat-message.sent .chat-content {
  text-align: right;
}

.chat-bubble {
  display: inline-block;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  background: var(--bg-light);
  margin-bottom: 0.25rem;
}

.chat-message.sent .chat-bubble {
  background: linear-gradient(135deg, var(--love-red), var(--love-pink));
  color: white;
  border-bottom-right-radius: 4px;
}

.chat-message.received .chat-bubble {
  border-bottom-left-radius: 4px;
}

.chat-time {
  font-size: 0.75rem;
  color: var(--text-light);
}

.options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}
</style>
