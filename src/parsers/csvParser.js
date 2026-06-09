import { readFileAsText, groupConversations } from './index'

export async function parseCSV(file) {
  const text = await readFileAsText(file)
  const lines = text.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    throw new Error('CSV 文件内容不足')
  }
  
  const headers = parseCSVLine(lines[0])
  const messages = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const msg = {}
    
    headers.forEach((header, idx) => {
      const h = header.toLowerCase()
      const val = values[idx] || ''
      
      if (h.includes('id') || h.includes('_id')) {
        msg.id = val
      } else if (h.includes('address') || h.includes('phone') || h.includes('sender') || h.includes('号码') || h.includes('电话')) {
        msg.address = val
      } else if (h.includes('body') || h.includes('text') || h.includes('content') || h.includes('内容') || h.includes('message')) {
        msg.body = val
      } else if (h.includes('date') || h.includes('time') || h.includes('timestamp') || h.includes('时间') || h.includes('日期')) {
        msg.date = parseDate(val)
      } else if (h.includes('type') || h.includes('direction') || h.includes('类型') || h.includes('方向')) {
        msg.type = parseType(val)
        msg.isSent = msg.type === 2
        msg.isReceived = msg.type === 1
      } else if (h.includes('read') || h.includes('已读')) {
        msg.read = val === '1' || val === 'true' || val === '是'
      } else if (h.includes('thread') || h.includes('会话')) {
        msg.threadId = val
      }
    })
    
    if (msg.body) {
      if (msg.type === undefined) {
        msg.type = 1
        msg.isReceived = true
        msg.isSent = false
      }
      if (!msg.date) msg.date = Date.now()
      if (!msg.id) msg.id = Math.random().toString(36).substr(2, 9)
      messages.push(msg)
    }
  }
  
  if (messages.length === 0) {
    throw new Error('未从 CSV 中解析到有效短信数据')
  }
  
  return groupConversations(messages)
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  
  return result
}

function parseDate(val) {
  if (!val) return Date.now()
  const num = parseFloat(val)
  if (!isNaN(num)) {
    if (num > 1000000000000) return num
    if (num > 1000000000) return num * 1000
  }
  const parsed = new Date(val).getTime()
  return isNaN(parsed) ? Date.now() : parsed
}

function parseType(val) {
  const lower = String(val).toLowerCase()
  if (lower === '2' || lower === 'sent' || lower === '发送' || lower === 'outbox' || lower === 'outgoing') return 2
  return 1
}
