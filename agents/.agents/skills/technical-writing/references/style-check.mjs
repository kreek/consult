#!/usr/bin/env node
// Mechanical style checker for the technical-writing skill.
// Flags what a pattern-matcher can find; the SKILL.md tripwires say when a
// flag is a false alarm. Usage: node style-check.mjs <file...> [--max-grade N]
import { readFileSync } from 'node:fs';

const HARD_GRADE = 10; // sentences at or above this grade are flagged
const VERY_HARD_GRADE = 14;
const MIN_WORDS_FOR_GRADE = 14; // short sentences are never flagged for grade

const ADVERB_WHITELIST = new Set([
	'only', 'early', 'likely', 'unlikely', 'family', 'apply', 'applies',
	'reply', 'supply', 'imply', 'comply', 'multiply', 'assembly', 'fly',
	'rely', 'daily', 'monopoly', 'anomaly', 'ugly', 'holy', 'silly', 'rally',
	'ally', 'tally', 'poly', 'italy', 'july', 'belly', 'jelly', 'folly',
	'bully', 'weekly', 'monthly', 'quarterly', 'yearly', 'hourly', 'nightly',
]);

const QUALIFIERS = [
	'i think', 'i believe', 'i feel', 'maybe', 'perhaps', 'possibly',
	'somewhat', 'sort of', 'kind of', 'a bit', 'fairly', 'quite', 'rather',
	'arguably', 'seemingly', 'generally speaking', 'it could be argued',
	'it is important to note', "it's important to note", 'needless to say',
];

const SIMPLER = {
	utilize: 'use', utilizes: 'uses', utilized: 'used', utilization: 'use',
	leverage: 'use', leverages: 'uses', leveraged: 'used',
	facilitate: 'help', facilitates: 'helps',
	commence: 'start', commences: 'starts', endeavor: 'try',
	demonstrate: 'show', demonstrates: 'shows',
	numerous: 'many', sufficient: 'enough', additional: 'more',
	obtain: 'get', obtains: 'gets', purchase: 'buy', attempt: 'try',
	assist: 'help', assists: 'helps', ascertain: 'find out',
	'in order to': 'to', 'prior to': 'before', 'subsequent to': 'after',
	'in the event that': 'if', 'due to the fact that': 'because',
	'despite the fact that': 'although', 'at this point in time': 'now',
	'a number of': 'several', 'with regard to': 'about',
	'in the process of': '(delete)', 'on a daily basis': 'daily',
};

const IRREGULAR_PARTICIPLES = new Set([
	'begun', 'bought', 'brought', 'broken', 'built', 'caught', 'chosen',
	'done', 'drawn', 'driven', 'eaten', 'felt', 'found', 'forgotten',
	'frozen', 'given', 'gone', 'held', 'hidden', 'kept', 'known', 'led',
	'left', 'lost', 'made', 'meant', 'paid', 'put', 'read', 'run', 'seen',
	'sent', 'set', 'shown', 'sold', 'spent', 'split', 'taken', 'told',
	'thought', 'torn', 'understood', 'worn', 'written',
]);

function stripMarkdown(text) {
	return text
		.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' '))
		.replace(/`[^`\n]+`/g, (m) => ' '.repeat(m.length))
		.replace(/\[([^\]]*)\]\([^)]*\)/g, (m, label) =>
			label.padEnd(m.length, ' '))
		.replace(/^[|].*$/gm, (m) => ' '.repeat(m.length));
}

function lineOf(text, offset) {
	let line = 1;
	for (let i = 0; i < offset; i++) if (text[i] === '\n') line++;
	return line;
}

function splitSentences(text) {
	const sentences = [];
	const re = /[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g;
	// Headings and blank lines end a sentence even without punctuation.
	const blockRe = /[^\n][^]*?(?=\n\s*\n|\n#|$)/g;
	for (const block of text.matchAll(blockRe)) {
		if (block[0].trim().startsWith('#')) continue;
		for (const m of block[0].matchAll(re)) {
			if (m[0].trim().length > 0) {
				sentences.push({ text: m[0], offset: block.index + m.index });
			}
		}
	}
	return sentences;
}

// Automated Readability Index: 4.71*(chars/words) + 0.5*(words/sentence) - 21.43
function ariGrade(sentence) {
	const words = sentence.match(/[A-Za-z0-9'-]+/g) || [];
	if (words.length === 0) return { grade: 0, words: 0 };
	const chars = words.join('').length;
	const grade = 4.71 * (chars / words.length) + 0.5 * words.length - 21.43;
	return { grade: Math.round(grade), words: words.length };
}

function checkSentence(sentence, maxGrade, flags, file, line) {
	const { grade, words } = ariGrade(sentence);
	if (words >= MIN_WORDS_FOR_GRADE && grade >= maxGrade) {
		const label = grade >= VERY_HARD_GRADE ? 'very-hard-sentence' : 'hard-sentence';
		flags.push({ file, line, category: label,
			match: `${words} words, grade ${grade}`,
			hint: 'split the sentence or convert an in-sentence list to bullets' });
	}
	const passiveRe = /\b(am|is|are|was|were|be|been|being|get|gets|got)\s+(?:\w+ly\s+)?(\w+)\b/gi;
	for (const m of sentence.matchAll(passiveRe)) {
		const p = m[2].toLowerCase();
		if (/[a-z]{2}ed$/.test(p) || IRREGULAR_PARTICIPLES.has(p)) {
			flags.push({ file, line, category: 'passive-voice', match: m[0].trim(),
				hint: 'name the actor; keep only if the actor is irrelevant or unknown' });
		}
	}
	for (const m of sentence.matchAll(/\b([A-Za-z]+ly)\b/g)) {
		if (!ADVERB_WHITELIST.has(m[1].toLowerCase())) {
			flags.push({ file, line, category: 'adverb', match: m[1],
				hint: 'pick a stronger verb or give the number' });
		}
	}
}

function checkLexicon(sentence, flags, file, line) {
	const lower = sentence.toLowerCase();
	for (const q of QUALIFIERS) {
		if (lower.includes(q)) {
			flags.push({ file, line, category: 'qualifier', match: q,
				hint: 'delete it or state the evidence; keep only if the hedge is the claim' });
		}
	}
	for (const [phrase, simpler] of Object.entries(SIMPLER)) {
		const re = new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'i');
		if (re.test(lower)) {
			flags.push({ file, line, category: 'simpler-alternative', match: phrase,
				hint: `use "${simpler}"` });
		}
	}
}

function checkFile(file, maxGrade) {
	const text = stripMarkdown(readFileSync(file, 'utf8'));
	const flags = [];
	for (const m of text.matchAll(/—/g)) {
		flags.push({ file, line: lineOf(text, m.index), category: 'em-dash',
			match: '—', hint: 'use a period, colon, comma, or parentheses' });
	}
	for (const s of splitSentences(text)) {
		const line = lineOf(text, s.offset + (s.text.length - s.text.trimStart().length));
		const clean = s.text.replace(/\s+/g, ' ').trim();
		checkSentence(clean, maxGrade, flags, file, line);
		checkLexicon(clean, flags, file, line);
	}
	return flags;
}

const args = process.argv.slice(2);
const gradeIdx = args.indexOf('--max-grade');
const maxGrade = gradeIdx >= 0 ? Number(args.splice(gradeIdx, 2)[1]) : HARD_GRADE;
if (args.length === 0 || Number.isNaN(maxGrade)) {
	console.error('usage: node style-check.mjs <file...> [--max-grade N]');
	process.exit(2);
}

let total = 0;
for (const file of args) {
	const flags = checkFile(file, maxGrade);
	total += flags.length;
	for (const f of flags) {
		console.log(`${f.file}:${f.line}  [${f.category}] "${f.match}" - ${f.hint}`);
	}
}
console.log(total === 0 ? 'style-check: clean' : `style-check: ${total} flag(s)`);
process.exit(total === 0 ? 0 : 1);
