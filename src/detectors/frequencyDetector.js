const frequencyDetector = {
  name: 'frequency',
  label: '发送频率检测',
  description: '通过消息发送频率和时间间隔分析亲密程度',

  detect(conversation) {
    const messages = conversation.messages
    if (messages.length < 3) {
      return { score: 0, tags: [] }
    }

    let score = 0
    const tags = []

    const totalDays = Math.max(1, (conversation.endTime - conversation.startTime) / 86400000)
    const msgPerDay = messages.length / totalDays

    if (msgPerDay >= 10) score += 30
    else if (msgPerDay >= 5) score += 20
    else if (msgPerDay >= 2) score += 10
    else if (msgPerDay >= 1) score += 5

    let quickReplies = 0
    let lateNightMsgs = 0
    let morningMsgs = 0
    const dailyPeakDays = new Set()

    for (let i = 1; i < messages.length; i++) {
      const diff = messages[i].date - messages[i - 1].date
      if (diff < 300000) quickReplies++

      const hour = new Date(messages[i].date).getHours()
      if (hour >= 22 || hour < 2) lateNightMsgs++
      if (hour >= 6 && hour < 9) morningMsgs++

      const day = new Date(messages[i].date).toDateString()
      dailyPeakDays.add(day)
    }

    if (quickReplies > messages.length * 0.3) score += 15
    if (lateNightMsgs > 5) score += 10
    if (morningMsgs > 3) score += 8

    const activeDays = dailyPeakDays.size
    if (activeDays >= 7) score += 15
    else if (activeDays >= 3) score += 8

    if (msgPerDay >= 5) tags.push(`高频互动 ×${msgPerDay.toFixed(1)}/天`)
    if (quickReplies > 5) tags.push(`秒回 ×${quickReplies}次`)
    if (lateNightMsgs > 3) tags.push(`深夜聊天 ×${lateNightMsgs}次`)
    if (morningMsgs > 2) tags.push(`早安问候 ×${morningMsgs}次`)

    return { score, tags }
  }
}

export default frequencyDetector
