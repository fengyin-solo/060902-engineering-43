import { readFileAsText, groupConversations } from './index'

export async function parseAndroidXML(file) {
  const text = await readFileAsText(file)
  
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(text, 'text/xml')
  
  const parseError = xmlDoc.querySelector('parsererror')
  if (parseError) {
    throw new Error('XML 解析失败，请检查文件格式')
  }
  
  const smsElements = xmlDoc.querySelectorAll('sms')
  const messages = []
  
  smsElements.forEach(sms => {
    const msg = {
      id: sms.getAttribute('_id') || Math.random().toString(36).substr(2, 9),
      address: sms.getAttribute('address') || '',
      body: sms.getAttribute('body') || '',
      date: parseInt(sms.getAttribute('date')) || Date.now(),
      type: parseInt(sms.getAttribute('type')) || 1,
      isSent: parseInt(sms.getAttribute('type')) === 2,
      isReceived: parseInt(sms.getAttribute('type')) === 1,
      read: parseInt(sms.getAttribute('read')) === 1,
      threadId: sms.getAttribute('thread_id') || sms.getAttribute('address')
    }
    messages.push(msg)
  })
  
  if (messages.length === 0) {
    throw new Error('未找到任何短信数据，请检查文件内容')
  }
  
  return groupConversations(messages)
}
