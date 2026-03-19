const fs = require('fs');
const path = require('path');

function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function escapeCsvCell(value) {
  const v = (value ?? '').toString();
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function main() {
  const inputPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve('C:/Users/Youcode/Desktop/MaCake/jira-use-cases-macack.scsv');
  const outputPath = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.resolve('C:/Users/Youcode/Desktop/MaCake/jira-use-cases-macack.team-managed.scsv');

  const raw = fs.readFileSync(inputPath, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .filter((line, idx, arr) => !(idx === arr.length - 1 && line === ''));

  if (lines.length < 2) {
    throw new Error('Input CSV is empty.');
  }

  const header = parseCsvLine(lines[0]);
  const idx = (name) => header.indexOf(name);
  const get = (cols, name) => {
    const i = idx(name);
    return i >= 0 ? cols[i] ?? '' : '';
  };

  const rows = lines.slice(1).map(parseCsvLine);

  const epicCodeToId = new Map();
  let epicId = 1;

  for (const row of rows) {
    const issueType = (get(row, 'Issue Type') || '').trim().toLowerCase();
    if (issueType !== 'epic') continue;
    const code = (get(row, 'Epic Name') || get(row, 'Epic Link') || '').trim();
    if (!code) continue;
    if (!epicCodeToId.has(code)) epicCodeToId.set(code, epicId++);
  }

  const outHeader = ['Issue Id', 'Issue Type', 'Summary', 'Description', 'Parent Id', 'Epic Code'];
  const outLines = [outHeader.map(escapeCsvCell).join(',')];

  let nextId = 100;
  for (const row of rows) {
    const issueType = (get(row, 'Issue Type') || '').trim();
    if (!issueType) continue;

    let issueId;
    let parentId = '';
    let epicCode = '';

    if (issueType.toLowerCase() === 'epic') {
      epicCode = (get(row, 'Epic Name') || '').trim();
      issueId = epicCodeToId.get(epicCode) ?? nextId++;
    } else {
      issueId = nextId++;
      epicCode = (get(row, 'Epic Link') || '').trim();
      parentId = epicCodeToId.get(epicCode) ?? '';
    }

    const outRow = [
      String(issueId),
      issueType,
      get(row, 'Summary'),
      get(row, 'Description'),
      String(parentId),
      epicCode,
    ];
    outLines.push(outRow.map(escapeCsvCell).join(','));
  }

  fs.writeFileSync(outputPath, `${outLines.join('\n')}\n`, 'utf8');
  console.log(`Generated: ${outputPath}`);
}

main();

