import { parseAndroidXML } from './androidParser'
import { parseIPhoneBackup } from './iphoneParser'
import { parseCSV } from './csvParser'
import { generateDemoData } from './demoData'

export async function parseSmsFile(file) {
  const fileName = file.name.toLowerCase()
  
  if (fileName.endsWith('.xml')) {
    return parseAndroidXML(file)
  } else if (fileName.endsWith('.db') || fileName.endsWith('.sqlite') || fileName.includes('iphone')) {
    return parseIPhoneBackup(file)
  } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
    return parseCSV(file)
  } else if (fileName.endsWith('.json')) {
    return parseJSON(file)
  }
  
  throw new Error('不支持的文件格式，请上传 .xml, .csv, .txt, .db 或 .json 文件')
}

export async function parseJSON(file) {
  const text = await readFileAsText(file)
  const data = JSON.parse(text)
  return normalizeData(data)
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function normalizeData(data) {
  if (data.messages && Array.isArray(data.messages)) {
    return groupConversations(data.messages.map(msg => normalizeMessage(msg)))
  }
  if (Array.isArray(data)) {
    return groupConversations(data.map(msg => normalizeMessage(msg)))
  }
  throw new Error('无法解析的数据格式')
}

function normalizeMessage(msg) {
  return {
    id: msg.id || msg._id || Math.random().toString(36).substr(2, 9),
    address: msg.address || msg.sender || msg.phone || '',
    body: msg.body || msg.text || msg.content || '',
    date: msg.date || msg.timestamp || msg.time || Date.now(),
    type: msg.type || msg.direction || (msg.isSent ? 2 : 1),
    isSent: msg.type === 2 || msg.direction === 'sent' || msg.isSent === true,
    isReceived: msg.type === 1 || msg.direction === 'received' || msg.isSent === false,
    read: msg.read !== undefined ? msg.read : true,
    threadId: msg.threadId || msg.thread_id || msg.address || 'default'
  }
}

export function groupConversations(messages) {
  const convMap = new Map()
  
  messages.sort((a, b) => a.date - b.date)
  
  messages.forEach((msg, index) => {
    const key = msg.address || msg.threadId || 'unknown'
    if (!convMap.has(key)) {
      convMap.set(key, {
        id: key,
        address: key,
        name: guessName(key),
        messages: [],
        startTime: msg.date,
        endTime: msg.date
      })
    }
    const conv = convMap.get(key)
    conv.messages.push({
      ...msg,
      index,
      replyTo: index > 0 ? index - 1 : null
    })
    conv.endTime = msg.date
  })
  
  const conversations = []
  convMap.forEach(conv => {
    conv.messageCount = conv.messages.length
    conv.duration = conv.endTime - conv.startTime
    conversations.push(conv)
  })
  
  conversations.sort((a, b) => b.messageCount - a.messageCount)
  
  return conversations
}

function guessName(address) {
  if (!address) return '未知联系人'
  const phone = address.replace(/\D/g, '')
  if (phone.length >= 7) {
    return `联系人 ${phone.substr(-4)}`
  }
  return address
}

export { generateDemoData }
