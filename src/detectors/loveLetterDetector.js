const loveLetterDetector = {
  name: 'loveLetter',
  label: '情书指数',
  description: '综合评估对话的情书程度',

  detect(conversation) {
    const messages = conversation.messages
    if (messages.length < 2) {
      return { score: 0, tags: [] }
    }

    let score = 0
    const tags = []

    let backAndForth = 0
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].isSent !== messages[i - 1].isSent) {
        backAndForth++
      }
    }

    const interactionRate = backAndForth / messages.length
    if (interactionRate >= 0.7) score += 25
    else if (interactionRate >= 0.5) score += 15
    else if (interactionRate >= 0.3) score += 5

    let hasMissCount = 0
    let hasNightCount = 0
    let hasSorryCount = 0
    let hasLoveCount = 0

    for (const msg of messages) {
      if (msg.body) {
        if (/想你|想念|好想你/.test(msg.body)) hasMissCount++
        if (/晚安/.test(msg.body)) hasNightCount++
        if (/对不起|抱歉/.test(msg.body)) hasSorryCount++
        if (/我爱你|喜欢你|爱你/.test(msg.body)) hasLoveCount++
      }
    }

    if (hasMissCount >= 3) score += 20
    else if (hasMissCount >= 1) score += 10

    if (hasNightCount >= 5) score += 15
    else if (hasNightCount >= 2) score += 8

    if (hasSorryCount >= 2) score += 10
    else if (hasSorryCount >= 1) score += 5

    if (hasLoveCount >= 2) score += 30
    else if (hasLoveCount >= 1) score += 15

    if (hasMissCount > 0) tags.push(`想念 ×${hasMissCount}`)
    if (hasNightCount > 0) tags.push(`晚安 ×${hasNightCount}`)
    if (hasSorryCount > 0) tags.push(`道歉 ×${hasSorryCount}`)
    if (hasLoveCount > 0) tags.push(`爱意 ×${hasLoveCount}`)
    if (interactionRate >= 0.5) tags.push(`双向奔赴`)

    return { score, tags }
  }
}

export default loveLetterDetector
