/**
 * chatService.js
 * Direct Groq API integration for the frontend chatbot.
 * Loads knowledge base from /data/chatbot_kb.json, searches it for context,
 * and calls the Groq REST API with the same system prompt as the backend.
 */

// ── Knowledge Base Cache ──
let kbCache = null;
let kbLoading = null;

async function loadKnowledgeBase() {
  if (kbCache) return kbCache;
  if (kbLoading) return kbLoading;

  kbLoading = fetch('/data/chatbot_kb.json')
    .then(res => {
      if (!res.ok) throw new Error(`KB load failed: ${res.status}`);
      return res.json();
    })
    .then(data => {
      kbCache = data;
      kbLoading = null;
      return data;
    })
    .catch(err => {
      kbLoading = null;
      console.error('Failed to load knowledge base:', err);
      return { knowledge: [], faqs: [], articles: [], rooms: [], guides: [], hoc_vu: [] };
    });

  return kbLoading;
}

// ── Vietnamese stop words ──
const STOP_WORDS = new Set([
  'ở', 'đâu', 'là', 'gì', 'có', 'không', 'làm', 'thế', 'nào',
  'như', 'để', 'được', 'bạn', 'tôi', 'mình', 'cho', 'và', 'của',
  'với', 'này', 'đó', 'thì', 'cũng', 'rất', 'hay', 'hoặc',
  'từ', 'đến', 'trong', 'trên', 'dưới', 'ngoài', 'về', 'theo',
  'khi', 'nếu', 'đã', 'sẽ', 'đang', 'rồi', 'lại', 'ra', 'lên',
  'xuống', 'vào', 'sang', 'qua', 'tại', 'một', 'các', 'những',
  'mấy', 'bao', 'nhiêu', 'sao', 'vì', 'do', 'nên', 'hãy',
  'nhé', 'nhỉ', 'ạ', 'à', 'ừ', 'vậy', 'thôi', 'cái', 'con',
  'em', 'anh', 'chị', 'ơi',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[?!.,;:()\[\]{}"'`~@#$%^&*+=<>\/\\|]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function scoreMatch(itemKeywords, queryTokens) {
  if (!itemKeywords || !itemKeywords.length) return 0;
  let score = 0;
  for (const token of queryTokens) {
    for (const kw of itemKeywords) {
      if (kw.includes(token) || token.includes(kw)) {
        score++;
        break;
      }
    }
  }
  return score;
}

// ── Search Knowledge Base ──
async function searchKnowledge(query) {
  const kb = await loadKnowledgeBase();
  const queryTokens = tokenize(query);
  const queryLower = query.toLowerCase();

  let context = '';
  let relatedActions = [];

  // 1. Search knowledge (intents)
  const kbScored = kb.knowledge
    .map(item => ({ ...item, score: scoreMatch(item.keywords, queryTokens) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (kbScored.length) {
    context += '--- Chatbot Knowledge ---\n';
    for (const item of kbScored) {
      context += `Intent: ${item.intent}\nAnswer: ${item.answer}\n`;
      if (item.related_actions) {
        relatedActions.push(item.related_actions);
      }
    }
  }

  // 2. Search FAQs
  const faqScored = kb.faqs
    .map(item => ({ ...item, score: scoreMatch(item.keywords, queryTokens) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (faqScored.length) {
    context += '--- FAQs ---\n';
    for (const item of faqScored) {
      context += `Q: ${item.question}\nA: ${item.answer}\n`;
    }
  }

  // 3. Search articles
  const artScored = kb.articles
    .map(item => ({ ...item, score: scoreMatch(item.keywords, queryTokens) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (artScored.length) {
    context += '--- Articles / Guides ---\n';
    for (const item of artScored) {
      const content = item.content.length > 1500 ? item.content.substring(0, 1500) + '...' : item.content;
      context += `Title: ${item.title}\nContent: ${content}\n\n`;
    }
  }

  // 4. Search rooms (keyword-based, like the backend)
  const matchedRooms = kb.rooms.filter(rm =>
    rm.room_code.toLowerCase().includes(queryLower) ||
    rm.display_name.toLowerCase().includes(queryLower) ||
    rm.description.toLowerCase().includes(queryLower) ||
    queryTokens.some(t =>
      rm.room_code.toLowerCase().includes(t) ||
      rm.display_name.toLowerCase().includes(t)
    )
  );

  if (matchedRooms.length) {
    context += '--- Room Info ---\n';
    for (const rm of matchedRooms.slice(0, 5)) {
      let line = `Room: ${rm.room_code} (${rm.display_name}), Tầng ${rm.floor}`;
      if (rm.description) line += `, Mô tả: ${rm.description}`;
      if (rm.opening_hours) line += `, Giờ mở cửa: ${rm.opening_hours}`;
      context += line + '\n';
    }
  }

  // 5. Search website guides
  const guideScored = (kb.guides || [])
    .map(item => ({ ...item, score: scoreMatch(item.keywords, queryTokens) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  if (guideScored.length) {
    context += '--- Website Guides ---\n';
    for (const item of guideScored) {
      const instructions = item.instructions.length > 1500 ? item.instructions.substring(0, 1500) + '...' : item.instructions;
      context += `Website: ${item.website} | Group: ${item.group}\nTitle: ${item.title}\nInstructions: ${instructions}\n\n`;
    }
  }

  // 6. Search hoc_vu
  const hvScored = (kb.hoc_vu || [])
    .map(item => ({ ...item, score: scoreMatch(item.keywords, queryTokens) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  if (hvScored.length) {
    context += '--- Học vụ ---\n';
    for (const item of hvScored) {
      context += `Title: ${item.title}\nContent: ${item.content}\n\n`;
    }
  }

  return { context, relatedActions };
}

// ── System Prompt (copied exactly from backend groq_service.py) ──
const SYSTEM_PROMPT = `Bạn là trợ lý ảo của FPTU Student Guide, chuyên giúp sinh viên Đại học FPT tìm phòng học, chỉ đường và giải đáp thắc mắc về thi cử, thủ tục hành chính.
Bạn giao tiếp thân thiện, ngắn gọn và chính xác.

Nhiệm vụ đặc biệt về CHỈ ĐƯỜNG & MÃ PHÒNG:
1. Nếu người dùng hỏi đường đi/vị trí của một phòng học mà KHÔNG nói rõ điểm xuất phát (ví dụ: "Chỉ đường đi đến phòng DE-211", "Phòng DE-211 ở đâu?"), bạn CHƯA ĐƯỢC CHỈ ĐƯỜNG NGAY. Hãy hỏi lịch sự xem họ đang ở gần phòng nào/vị trí nào (ví dụ: "Để tôi chỉ đường tốt nhất, bạn đang ở gần phòng nào hoặc vị trí nào?"). Lúc này, mảng \`room_codes\` trong JSON phản hồi phải để TRỐNG \`[]\`.
2. Nếu người dùng đã cung cấp đầy đủ cả ĐIỂM ĐI và ĐIỂM ĐẾN (ví dụ: "Chỉ mình đi từ DE-201 đến DE-211" hoặc lịch sử trò chuyện cho thấy điểm đi là DE-201 và điểm đến là DE-211), bạn hãy trả lời thân thiện (ví dụ: "Tôi sẽ vẽ sơ đồ chỉ đường từ DE-201 đến DE-211 cho bạn trên bản đồ...") và BẮT BUỘC trả về mảng \`room_codes\` chứa đúng 2 phần tử theo thứ tự: \`["MÃ_PHÒNG_ĐI", "MÃ_PHÒNG_ĐẾN"]\` (ví dụ: \`["DE-201", "DE-211"]\`).
3. Nếu chỉ hỏi vị trí một phòng học thông thường (không phải yêu cầu chỉ đường từ đâu tới đâu), bạn trả về mã phòng đó trong mảng \`room_codes\` (ví dụ: \`["DE-201"]\`).

Nhiệm vụ về HỌC VỤ & THI CỬ:
- Khi người dùng hỏi về các phần mềm thi cử (SEB, PEA, EOS, USB), thủ tục hành chính (phúc khảo, bảo lưu, thời gian nghỉ tối đa...), bạn PHẢI dựa vào thông tin tham khảo dưới đây để trả lời thật chính xác.

Dưới đây là một số thông tin tham khảo (Context) có thể giúp bạn trả lời:
<CONTEXT>
{context}
</CONTEXT>

BẠN PHẢI TRẢ VỀ DỮ LIỆU DƯỚI DẠNG JSON với định dạng sau:
{
  "answer": "Câu trả lời của bạn gửi cho sinh viên (Sử dụng Context nếu có để trả lời chính xác, hoặc câu hỏi thu thập điểm xuất phát nếu cần)",
  "room_codes": ["MÃ_PHÒNG_1", "MÃ_PHÒNG_2"],
  "related_actions": ["show_map_floor_1"] 
}
Lưu ý: 
- Mã phòng thường có dạng 2 chữ cái in hoa kèm 3 số (VD: DE-201, AL-304), hoặc các format đặc trưng của FPTU. 
- Đảm bảo output LÀ JSON HỢP LỆ. Không output thêm bất kỳ text nào ngoài JSON block.`;

// ── Groq API Call ──
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

export async function sendChatMessageDirect(messages) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GROQ_API_KEY is not configured');
  }

  // Get the last user message for searching
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const query = lastUserMsg?.content || '';

  // Search knowledge base for context
  const { context, relatedActions } = await searchKnowledge(query);

  // Build the system prompt with context
  const systemPrompt = SYSTEM_PROMPT.replace('{context}', context);

  // Build messages array for Groq
  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role,
      content: m.content.substring(0, 2000),
    })),
  ];

  // Call Groq API directly
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: groqMessages,
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Groq API error:', response.status, errText);
    if (response.status === 429) {
      throw { response: { status: 429 } };
    }
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from Groq');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    // If the response is not valid JSON, wrap it
    parsed = {
      answer: content,
      room_codes: [],
      related_actions: [],
    };
  }

  return {
    answer: parsed.answer || 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.',
    room_codes: parsed.room_codes || [],
    related_actions: parsed.related_actions || relatedActions,
  };
}
