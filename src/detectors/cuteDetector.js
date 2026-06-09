const CUTE_PATTERNS = [
  { pattern: /嘤嘤嘤|呜呜呜|哇哇哇|啊啊啊/, score: 8, label: '叠字撒娇' },
  { pattern: /嘛|啦|呢|哟|好不好嘛/, score: 4, label: '语气词' },
  { pattern: /🥺|😢|😭|😘|😚|😗|😙|🥰|😍/, score: 5, label: '撒娇表情' },
  { pattern: /人家|伦家|宝宝|宝贝/, score: 6, label: '自称卖萌' },
  { pattern: /不要嘛|不嘛|就要|就要嘛/, score: 7, label: '小任性' },
  { pattern: /抱抱|亲亲|举高高|摸摸头/, score: 6, label: '求安慰' },
  { pattern: /错了嘛|原谅我嘛|好不好/, score: 8, label: '软磨硬泡' },
]

const cuteDetector = {
  name: 'cute',
  label: '撒娇模式',
  description: '检测对话中的撒娇和卖萌行为',

  detect(conversation) {
    const messages = conversation.messages
    if (messages.length < 2) {
      return { score: 0, tags: [] }
    }

    let score = 0
    const tagCounts = {}
    let cuteMessages = 0

    for (const msg of messages) {
      if (!msg.body) continue

      let hasCute = false
      for (const pattern of CUTE_PATTERNS) {
        const matches = msg.body.match(pattern.pattern)
        if (matches) {
          score += pattern.score * matches.length
          if (!tagCounts[pattern.label]) tagCounts[pattern.label] = 0
          tagCounts[pattern.label] += matches.length
          hasCute = true
        }
      }

      if (/[嘛呢啦哟]$/.test(msg.body.trim())) {
        score += 2
      }

      if (hasCute) cuteMessages++
    }

    const cuteRate = cuteMessages / messages.length
    if (cuteRate >= 0.5) score += 20
    else if (cuteRate >= 0.3) score += 10
    else if (cuteRate >= 0.1) score += 5

    const tags = []
    for (const [label, count] of Object.entries(tagCounts)) {
      if (count > 0) {
        tags.push(`${label} ×${count}`)
      }
    }

    if (cuteRate >= 0.3) {
      tags.unshift('撒娇狂魔')
    }

    return { score, tags }
  }
}

export default cuteDetector
export { CUTE_PATTERNS }
