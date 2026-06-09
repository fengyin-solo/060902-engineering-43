import { readFileAsText, groupConversations } from './index'

export async function parseIPhoneBackup(file) {
  try {
    const text = await readFileAsText(file)
    
    if (text.trim().startsWith('<?xml') || text.trim().startsWith('<')) {
      return parseIPhoneXML(text)
    }
    
    return parseIPhoneText(text)
  } catch (e) {
    throw new Error('iPhone 备份解析失败: ' + e.message)
  }
}

function parseIPhoneXML(text) {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(text, 'text/xml')
  
  const messages = []
  const rows = xmlDoc.querySelectorAll('row')
  
  rows.forEach(row => {
    const fields = row.querySelectorAll('field')
    const msg = {}
    
    fields.forEach(field => {
      const name = field.getAttribute('name')
      switch (name) {
        case 'ROWID':
        case 'guid':
          msg.id = field.textContent || field.getAttribute('value')
          break
        case 'text':
        case 'message_text':
          msg.body = field.textContent || field.getAttribute('value')
          break
        case 'handle_id':
        case 'phone_number':
        case 'account':
          msg.address = field.textContent || field.getAttribute('value') || ''
          break
        case 'date':
        case 'timestamp':
          const dateVal = field.getAttribute('value') || field.textContent
          msg.date = parseAppleDate(dateVal)
          break
        case 'is_sent':
        case 'is_from_me':
          const isSent = (field.getAttribute('value') || field.textContent) === '1'
          msg.isSent = isSent
          msg.type = isSent ? 2 : 1
          msg.isReceived = !isSent
          break
      }
    })
    
    if (msg.body) {
      messages.push(msg)
    }
  })
  
  if (messages.length === 0) {
    throw new Error('未找到 iPhone 短信数据，请检查文件格式')
  }
  
  return groupConversations(messages)
}

function parseIPhoneText(text) {
  const lines = text.split('\n')
  const messages = []
  let currentMsg = null
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    const dateMatch = trimmed.match(/(\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2}(:\d{2})?)/)
    if (dateMatch) {
      if (currentMsg) {
        messages.push(currentMsg)
      }
      currentMsg = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date(dateMatch[1]).getTime(),
        body: '',
        address: '',
        isSent: false,
        type: 1
      }
      
      if (trimmed.includes('发送') || trimmed.includes('Sent') || trimmed.includes('我:')) {
        currentMsg.isSent = true
        currentMsg.type = 2
      }
      
      const phoneMatch = trimmed.match(/(\+?\d[\d\s-]{7,}\d)/)
      if (phoneMatch) {
        currentMsg.address = phoneMatch[1].replace(/\s/g, '')
      }
      
      const textAfterDate = trimmed.substring(dateMatch[0].length).trim()
      if (textAfterDate && !textAfterDate.startsWith(':') && !textAfterDate.includes('发送') && !textAfterDate.includes('接收')) {
        currentMsg.body = textAfterDate.replace(/^[:：\s]+/, '')
      }
    } else if (currentMsg && trimmed) {
      if (!currentMsg.body) {
        currentMsg.body = trimmed
      } else {
        currentMsg.body += '\n' + trimmed
      }
    }
  }
  
  if (currentMsg) {
    messages.push(currentMsg)
  }
  
  if (messages.length === 0) {
    throw new Error('未解析到短信内容，请检查文本格式')
  }
  
  return groupConversations(messages)
}

function parseAppleDate(val) {
  if (!val) return Date.now()
  const num = parseFloat(val)
  if (!isNaN(num)) {
    if (num > 1000000000000) return num
    if (num > 1000000000) return num * 1000
    if (num > 1000000) return num * 1000000
    return new Date('2001-01-01').getTime() + num * 1000
  }
  const parsed = new Date(val).getTime()
  return isNaN(parsed) ? Date.now() : parsed
}
