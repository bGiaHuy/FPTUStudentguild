/**
 * build_chatbot_kb.js
 * Reads all data/content/ CSV and JSON files and builds
 * frontend/public/data/chatbot_kb.json
 */
const fs = require('fs');
const path = require('path');

// ── Paths ──
const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'data', 'content');
const OUT_DIR = path.join(ROOT, 'frontend', 'public', 'data');
const OUT_FILE = path.join(OUT_DIR, 'chatbot_kb.json');

// ── Vietnamese stop words to filter out ──
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

// ── Simple CSV parser (handles quoted fields with commas) ──
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

// ── Extract meaningful keywords from text ──
function extractKeywords(text) {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[?!.,;:()\[\]{}"'`~@#$%^&*+=<>\/\\|]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  return [...new Set(words)];
}

// ── Main ──
function main() {
  console.log('📦 Building chatbot knowledge base...\n');

  // 1. chatbot_knowledge.todo.csv
  const kbRaw = fs.readFileSync(path.join(CONTENT, 'chatbot_knowledge.todo.csv'), 'utf-8');
  const kbRows = parseCSV(kbRaw);
  const knowledge = kbRows
    .filter(r => r.intent)
    .map(r => {
      const examples = (r.question_examples || '').split('|').map(s => s.trim()).filter(Boolean);
      const keywords = extractKeywords(examples.join(' ') + ' ' + (r.approved_answer || ''));
      return {
        type: 'intent',
        intent: r.intent,
        keywords,
        answer: r.approved_answer || '',
        related_actions: r.related_actions || '',
      };
    });
  console.log(`  ✅ chatbot_knowledge: ${knowledge.length} intents`);

  // 2. faq.todo.csv
  const faqRaw = fs.readFileSync(path.join(CONTENT, 'faq.todo.csv'), 'utf-8');
  const faqRows = parseCSV(faqRaw);
  const faqs = faqRows
    .filter(r => r.question)
    .map(r => ({
      question: r.question,
      answer: r.answer || '',
      category: r.category || '',
      keywords: extractKeywords(r.question + ' ' + (r.answer || '')),
    }));
  console.log(`  ✅ faqs: ${faqs.length} items`);

  // 3. articles.todo.csv
  const artRaw = fs.readFileSync(path.join(CONTENT, 'articles.todo.csv'), 'utf-8');
  const artRows = parseCSV(artRaw);
  const articles = artRows
    .filter(r => r.title)
    .map(r => ({
      title: r.title,
      content: r.content_md || '',
      category: r.category || '',
      keywords: extractKeywords(r.title + ' ' + (r.content_md || '')),
    }));
  console.log(`  ✅ articles: ${articles.length} items`);

  // 4. room_metadata.todo.csv
  const rmRaw = fs.readFileSync(path.join(CONTENT, 'room_metadata.todo.csv'), 'utf-8');
  const rmRows = parseCSV(rmRaw);
  const rooms = rmRows
    .filter(r => r.room_code)
    .map(r => ({
      room_code: r.room_code,
      display_name: r.display_name || '',
      floor: parseInt(r.floor, 10) || 0,
      description: r.description || '',
      opening_hours: r.opening_hours || '',
    }));
  console.log(`  ✅ rooms: ${rooms.length} items`);

  // 5. website_guides.todo.json
  const guidesRaw = fs.readFileSync(path.join(CONTENT, 'website_guides.todo.json'), 'utf-8');
  const guidesJson = JSON.parse(guidesRaw);
  const guides = guidesJson.map(g => ({
    website: g.website || '',
    group: g.group || '',
    title: g.title || '',
    instructions: g.instructions || '',
    keywords: extractKeywords((g.title || '') + ' ' + (g.group || '') + ' ' + (g.instructions || '').substring(0, 500)),
  }));
  console.log(`  ✅ website_guides: ${guides.length} items`);

  // 6. hoc_vu.json
  const hvRaw = fs.readFileSync(path.join(CONTENT, 'hoc_vu.json'), 'utf-8');
  const hvJson = JSON.parse(hvRaw);
  const hocVu = hvJson.map(h => ({
    title: h.title || '',
    content: h.content || '',
    keywords: extractKeywords((h.title || '') + ' ' + (h.content || '')),
  }));
  console.log(`  ✅ hoc_vu: ${hocVu.length} items`);

  // ── Combine ──
  const kb = {
    knowledge,
    faqs,
    articles,
    rooms,
    guides,
    hoc_vu: hocVu,
  };

  // ── Write output ──
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(kb, null, 2), 'utf-8');

  const sizeKB = (fs.statSync(OUT_FILE).size / 1024).toFixed(1);
  console.log(`\n✨ Knowledge base written to:\n   ${OUT_FILE}`);
  console.log(`   Size: ${sizeKB} KB`);
  console.log(`   Total entries: ${knowledge.length + faqs.length + articles.length + rooms.length + guides.length + hocVu.length}`);
}

main();
