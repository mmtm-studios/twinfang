#!/usr/bin/env python3
"""
generate_draft.py  -  Industry Insights local draft generator
Twinfang Internal

Usage (from the industry-insights/ folder):
  Windows:   py tools/generate_draft.py
  Mac/Linux: python3 tools/generate_draft.py

Reads data/gate1-decisions.json + data/stories.json,
calls GPT-4o for each section, writes data/draft.json.

OpenAI key: set OPENAI_API_KEY env var, or add to .env file,
or just run the script and it will prompt you once.
"""

import json, os, sys, re
from urllib import request as urequest, error as uerror
from datetime import datetime, timezone

SCRIPT_DIR     = os.path.dirname(os.path.abspath(__file__))
ROOT           = os.path.dirname(SCRIPT_DIR)
STORIES_FILE   = os.path.join(ROOT, 'data', 'stories.json')
DECISIONS_FILE = os.path.join(ROOT, 'data', 'gate1-decisions.json')
DRAFT_FILE     = os.path.join(ROOT, 'data', 'draft.json')
META_FILE      = os.path.join(ROOT, 'data', 'meta.json')
ENV_FILE       = os.path.join(ROOT, '.env')

OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
MODEL = 'gpt-4o'

SYSTEM_PROMPT = (
    'You are a senior editorial writer for Industry Insights, '
    "Twinfang's internal bi-monthly intelligence publication. "
    'Twinfang is a founder-led creative art studio based in Southeast Asia, '
    'specialising in concept art, character design, visual development, and '
    'illustration for the games and entertainment industry. '
    'Write in a direct, analytical tone. No fluff, no corporate speak. '
    "You are writing for Twinfang's founding team who want to understand "
    'what is happening in the industry and what it means for a studio like '
    'theirs. Be specific. Name names. Draw conclusions. When relevant, '
    "connect the story to Twinfang's positioning, clients, or pipeline."
)

SECTION_ORDER = [
    'Studio Moves', 'People on the Move', 'The Art Pipeline',
    "AI & The Craft", "Who's Buying What", 'On the Shelf',
    'The Field', 'TTRPG Industry',
]


def load_api_key():
    key = os.environ.get('OPENAI_API_KEY', '').strip()
    if key:
        return key
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('OPENAI_API_KEY='):
                    key = line.split('=', 1)[1].strip().strip('"').strip("'")
                    if key:
                        return key
    return None


def save_api_key(key):
    lines = []
    replaced = False
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip().startswith('OPENAI_API_KEY='):
                    lines.append('OPENAI_API_KEY=' + key + '\n')
                    replaced = True
                else:
                    lines.append(line)
    if not replaced:
        lines.append('OPENAI_API_KEY=' + key + '\n')
    with open(ENV_FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('Key saved to .env (will be used automatically next time)')


def openai_chat(api_key, messages, max_tokens=1400, temperature=0.7):
    payload = json.dumps({
        'model': MODEL,
        'messages': messages,
        'max_tokens': max_tokens,
        'temperature': temperature,
    }).encode('utf-8')
    req = urequest.Request(
        OPENAI_ENDPOINT,
        data=payload,
        headers={
            'Authorization': 'Bearer ' + api_key,
            'Content-Type':  'application/json',
        },
        method='POST',
    )
    try:
        with urequest.urlopen(req, timeout=90) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            return result['choices'][0]['message']['content']
    except uerror.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            msg = json.loads(body).get('error', {}).get('message', body)
        except Exception:
            msg = body
        raise RuntimeError('OpenAI ' + str(e.code) + ': ' + msg)


def draft_section(api_key, section_name, stories, issue_num):
    stories_text = ''
    for i, s in enumerate(stories, 1):
        stories_text += (
            str(i) + '. ' + s.get('headline', '') + '\n'
            '   Source: ' + s.get('source', '') + ' | ' + s.get('date', '') + '\n'
            '   ' + s.get('summary', '') + '\n'
            '   URL: ' + s.get('url', '') + '\n\n'
        )
    prompt = (
        'Write the "' + section_name + '" section for Issue #' + str(issue_num)
        + ' of Industry Insights.\n\n'
        'Approved stories (' + str(len(stories)) + '):\n\n'
        + stories_text
        + 'Write 450-600 words of editorial prose. '
        'Use <h2> tags for 2-3 sub-headings that group stories thematically. '
        'Use <p> tags for paragraphs. No bullet points or lists. '
        'Reference specific stories by naming the source in parentheses. '
        "Identify what this means for Twinfang's business where relevant. "
        'Write for the founding team directly.\n\n'
        'Output clean HTML only. No markdown, no code fences, no preamble.'
    )
    messages = [
        {'role': 'system', 'content': SYSTEM_PROMPT},
        {'role': 'user',   'content': prompt},
    ]
    return openai_chat(api_key, messages, max_tokens=1400)


def draft_gap_scan(api_key, section_summaries, issue_num):
    summary_text = '\n'.join(
        '- ' + name + ': ' + str(count) + ' stories approved'
        for name, count in section_summaries
    )
    prompt = (
        'You have just written Issue #' + str(issue_num) + ' of Industry Insights, covering:\n'
        + summary_text + '\n\n'
        'Identify 5 strategic white-space opportunities or watch items for Twinfang. '
        'These should be cross-cutting pattern insights, not restatements of individual stories.\n\n'
        'Return a JSON object with this exact structure:\n'
        '{\n'
        '  "title": "A 6-10 word headline framing the key strategic theme of this issue",\n'
        '  "lead": "One sentence capturing the single most important fault line this issue reveals for Twinfang.",\n'
        '  "items": [\n'
        '    {"title": "4-8 word punchy title", "body": "2-3 sentences of specific, actionable analysis."},\n'
        '    ... 5 items total\n'
        '  ]\n'
        '}\n\n'
        'Output only valid JSON. No markdown. No code fences. No explanation.'
    )
    messages = [
        {'role': 'system', 'content': SYSTEM_PROMPT},
        {'role': 'user',   'content': prompt},
    ]
    raw = openai_chat(api_key, messages, max_tokens=900, temperature=0.6)
    raw = re.sub(r'^```[a-z]*\s*', '', raw.strip(), flags=re.IGNORECASE)
    raw = re.sub(r'\s*```$', '', raw.strip())
    return json.loads(raw)


def main():
    # Get API key
    api_key = load_api_key()
    if not api_key:
        print('')
        print('No OpenAI API key found.')
        print('You can set OPENAI_API_KEY as an environment variable, or')
        print('add it to a .env file in the industry-insights/ folder.')
        print('')
        api_key = input('Paste your API key now (sk-...): ').strip()
        if not api_key:
            print('No key entered. Exiting.')
            sys.exit(1)
        save_api_key(api_key)

    # Load decisions
    if not os.path.exists(DECISIONS_FILE):
        print('ERROR: ' + DECISIONS_FILE + ' not found.')
        print('Complete Gate 1 and save your decisions file first.')
        sys.exit(1)

    with open(DECISIONS_FILE, 'r', encoding='utf-8') as f:
        decisions_data = json.load(f)

    decisions    = decisions_data.get('decisions', decisions_data)
    approved_ids = {k for k, v in decisions.items() if v == 'approved'}
    print('Gate 1 decisions: ' + str(len(approved_ids)) + ' approved')

    # Load stories
    if not os.path.exists(STORIES_FILE):
        print('ERROR: ' + STORIES_FILE + ' not found.')
        sys.exit(1)

    with open(STORIES_FILE, 'r', encoding='utf-8') as f:
        all_stories = json.load(f)

    approved_stories = [s for s in all_stories if s.get('id') in approved_ids]
    print('Matched ' + str(len(approved_stories)) + ' stories in stories.json')

    if not approved_stories:
        print('')
        print('WARNING: No matching stories found.')
        print('The IDs in gate1-decisions.json may not match stories.json.')
        print('Make sure both files are from the same collection cycle.')
        sys.exit(1)

    # Group by section
    sections_map = {}
    for s in approved_stories:
        sec = s.get('section', 'Uncategorised')
        sections_map.setdefault(sec, []).append(s)

    # Determine issue number from meta.json
    meta = {}
    if os.path.exists(META_FILE):
        with open(META_FILE, 'r', encoding='utf-8') as f:
            meta = json.load(f)
    issue_num  = meta.get('nextIssue', 3)
    issue_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    print('')
    print('Generating Issue #' + str(issue_num) + ' — ' + str(len(approved_stories)) + ' stories across ' + str(len(sections_map)) + ' sections')
    print('')

    # Draft each section in order
    sections_out     = []
    section_summaries = []

    ordered = (
        [s for s in SECTION_ORDER if s in sections_map] +
        [s for s in sections_map   if s not in SECTION_ORDER]
    )

    for sec_name in ordered:
        stories = sections_map[sec_name]
        print('  Drafting ' + sec_name + ' (' + str(len(stories)) + ' stories)...', end='', flush=True)
        try:
            content = draft_section(api_key, sec_name, stories, issue_num)
            print(' done')
            sections_out.append({
                'title':   sec_name,
                'content': content,
                'sources': stories,
            })
            section_summaries.append((sec_name, len(stories)))
        except Exception as e:
            print(' ERROR: ' + str(e))
            sections_out.append({
                'title':   sec_name,
                'content': '<p>Draft unavailable — ' + str(e)[:120] + '</p>',
                'sources': stories,
            })

    # Add empty sections so gate-2 shows all 8
    for sec_name in SECTION_ORDER:
        if sec_name not in sections_map:
            sections_out.append({
                'title':   sec_name,
                'content': '<p>No stories approved for this section this cycle.</p>',
                'sources': [],
            })

    # Generate Strategic Insights (gapScan)
    print('')
    print('  Generating Strategic Insights...', end='', flush=True)
    try:
        gap_scan = draft_gap_scan(api_key, section_summaries, issue_num)
        print(' done')
    except Exception as e:
        print(' ERROR: ' + str(e))
        gap_scan = {
            'title': 'Issue #' + str(issue_num) + ' Strategic Insights',
            'lead':  'Analysis unavailable — see individual sections.',
            'items': [],
        }

    # Write draft.json
    draft = {
        'issue':    issue_num,
        'date':     issue_date,
        'headline': gap_scan.get('title', 'Issue #' + str(issue_num)),
        'lead':     gap_scan.get('lead', ''),
        'sections': sections_out,
        'gapScan':  gap_scan,
        'stats': {
            'storiesApproved': len(approved_stories),
            'sourcesScanned':  len(all_stories),
            'sectionsActive':  len([s for s in sections_out if s.get('sources')]),
        },
    }

    with open(DRAFT_FILE, 'w', encoding='utf-8') as f:
        json.dump(draft, f, indent=2, ensure_ascii=False)

    print('')
    print('Draft saved to data/draft.json')
    print('Headline: "' + draft['headline'] + '"')
    print('')
    print('Open Gate 2 in your browser to review the draft.')


if __name__ == '__main__':
    main()
