const QUARREL_PATTERNS = [
  { pattern: /哼|讨厌|不理你|绝交|分手|再也不/, score: 8, label: '赌气' },
  { pattern: /你能不能|你总是|你怎么|凭什么/, score: 6, label: '指责' },
  { pattern: /随便你|无所谓|关你屁事|不关你事/, score: 10, label: '冷淡' },
  { pattern: /笨蛋|蠢|傻|笨/, score: 5, label: '嗔怪' },
  { pattern: /我错了|对不起|我错了还不行/, score: -3, label: '认错' },
  { pattern: /原谅|别生气|消消气/, score: -5, label: '哄人' },
]

const quarrelDetector = {
  name: 'quarrel',
  label: '争吵模式',
  description: '检测对话中的争吵和情绪波动',

  detect(conversation) {
    const messages = conversation.messages
    if (messages.length < 3) {
      return { score: 0, tags: [] }
    }

    let score = 0
    const tagCounts = {}
    let emotionalSwings = 0
    let prevSentiment = 0

    for (const msg of messages) {
      if (!msg.body) continue

      let msgScore = 0
      for (const pattern of QUARREL_PATTERNS) {
        const matches = msg.body.match(pattern.pattern)
        if (matches) {
          msgScore += pattern.score * matches.length
          if (!tagCounts[pattern.label]) tagCounts[pattern.label] = 0
          tagCounts[pattern.label] += matches.length
        }
      }

      if ((prevSentiment > 0 && msgScore < 0) || (prevSentiment < 0 && msgScore > 0)) {
        emotionalSwings++
      }
      prevSentiment = msgScore
      score += msgScore
    }

    if (emotionalSwings >= 3) {
      score += 15
      tagCounts['情绪波动'] = emotionalSwings
    }

    const tags = []
    for (const [label, count] of Object.entries(tagCounts)) {
      if (count > 0) {
        tags.push(`${label} ×${count}`)
      }
    }

    if (score > 20) {
      tags.unshift('欢喜冤家')
    }

    return {
      score: Math.max(0, score),
      tags
    }
  }
}

export default quarrelDetector
export { QUARREL_PATTERNS }
