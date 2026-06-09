const LOVE_KEYWORDS = [
  { pattern: /想你|想念|好想你|miss you/gi, score: 15, tag: 'miss', label: '思念' },
  { pattern: /晚安|好梦|good night/gi, score: 10, tag: 'night', label: '晚安' },
  { pattern: /对不起|抱歉|sorry/gi, score: 12, tag: 'sorry', label: '道歉' },
  { pattern: /我爱你|love you|喜欢你|爱你/gi, score: 20, tag: 'love', label: '爱意' },
  { pattern: /抱抱|亲亲|么么哒|mua/gi, score: 10, tag: 'affection', label: '亲密' },
  { pattern: /亲爱的|宝贝|宝宝|亲爱的/gi, score: 8, tag: 'dear', label: '亲昵' },
  { pattern: /心疼|担心|挂念/gi, score: 8, tag: 'care', label: '关心' },
]

const keywordDetector = {
  name: 'keyword',
  label: '关键词检测',
  description: '通过关键词检测情感倾向',
  
  detect(conversation) {
    let totalScore = 0
    const tags = []
    const keywordHits = {}

    for (const msg of conversation.messages) {
      if (!msg.body) continue
      
      for (const kw of LOVE_KEYWORDS) {
        const matches = msg.body.match(kw.pattern)
        if (matches) {
          const count = matches.length
          totalScore += kw.score * count
          
          if (!keywordHits[kw.tag]) {
            keywordHits[kw.tag] = 0
            tags.push({ type: kw.tag, text: kw.label, count: 0 })
          }
          keywordHits[kw.tag] += count
          
          const tagObj = tags.find(t => t.type === kw.tag)
          if (tagObj) tagObj.count += count
        }
      }
    }

    return {
      score: totalScore,
      tags: tags.map(t => `${t.text} ×${t.count}`)
    }
  }
}

export default keywordDetector
export { LOVE_KEYWORDS }
