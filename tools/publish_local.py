#!/usr/bin/env python3
import json, re, os, sys
from datetime import datetime, timezone

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
ROOT         = os.path.dirname(SCRIPT_DIR)
DRAFT_FILE   = os.path.join(ROOT, 'data', 'draft.json')
INDEX_FILE   = os.path.join(ROOT, 'index.html')
ARCHIVE_FILE = os.path.join(ROOT, 'data', 'archive.json')
META_FILE    = os.path.join(ROOT, 'data', 'meta.json')
MARKER_START = '<!-- ##ISSUE_START## -->'
MARKER_END   = '<!-- ##ISSUE_END## -->'

def slugify(title):
    return re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')

def fmt_date(iso_str):
    try:
        d = datetime.strptime(iso_str[:10], '%Y-%m-%d')
        return d.strftime('%B %d, %Y').replace(' 0', ' ')
    except Exception:
        return iso_str

def extract_pullquote(html_str):
    if not html_str:
        return ''
    text = re.sub(r'<[^>]+>', '', html_str)
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    for s in sentences:
        if 'Twinfang' in s or '—' in s or '–' in s:
            return s[:220]
    return sentences[0][:220] if sentences else ''

def source_chips(sources):
    if not sources:
        return ''
    seen, names = set(), []
    for item in sources:
        name = item.get('source', '') if isinstance(item, dict) else str(item)
        if name and name not in seen:
            seen.add(name)
            names.append(name)
    if not names:
        return ''
    chips = ''.join('<span class="ii-source-chip">' + n + '</span>' for n in names)
    return '<div class="ii-article-sources"><div class="ii-sources-grid">' + chips + '</div></div>'

def dist_chart(sections):
    counts = [(s.get('title',''), len(s.get('sources') or [])) for s in sections if len(s.get('sources') or []) > 0]
    if not counts:
        return ''
    max_c = max(c for _,c in counts) or 1
    rows = ''
    for t, c in counts:
        pct = round(c / max_c * 100)
        rows += ('<div class="ii-dist-row">'
                 '<span class="ii-dist-label">' + t + '</span>'
                 '<div class="ii-dist-track">'
                 '<div class="ii-dist-fill" style="width:' + str(pct) + '%"></div>'
                 '</div>'
                 '<span class="ii-dist-count">' + str(c) + '</span>'
                 '</div>')
    return '<div class="ii-dist-chart">' + rows + '</div>'

def gap_panel(gap_scan, sections):
    items, lead = [], ''
    if isinstance(gap_scan, dict):
        items = gap_scan.get('items', [])
        lead  = gap_scan.get('lead', '')
    elif isinstance(gap_scan, list):
        items = gap_scan
    if not items:
        return '<p class="ii-body">No gap analysis available.</p>'
    cards = ''
    for i, item in enumerate(items, 1):
        t = item.get('title', 'Insight ' + str(i)) if isinstance(item, dict) else 'Insight ' + str(i)
        b = item.get('body', item.get('text', '')) if isinstance(item, dict) else str(item)
        cards += ('<div class="ii-gap-card">'
                  '<div class="ii-gap-card-num">' + str(i).zfill(2) + '</div>'
                  '<div class="ii-gap-card-title">' + t + '</div>'
                  '<div class="ii-gap-card-text">' + b + '</div>'
                  '</div>')
    lead_html = '<p class="ii-body" style="margin-bottom:24px">' + lead + '</p>' if lead else ''
    return ('<div class="ii-gap-intro">' + lead_html + '</div>'
            '<div class="ii-gap-cards">' + cards + '</div>'
            + dist_chart(sections))

COLORS = {
    'studio moves': '#E8272A',
    'people on the move': '#6366F1',
    'the art pipeline': '#10B981',
    'ai & the craft': '#8B5CF6',
    "who's buying what": '#F59E0B',
    'on the shelf': '#3B82F6',
    'the field': '#9CA3AF',
    'ttrpg industry': '#F59E0B',
    'strategic insights': '#E8272A',
}

def build_issue_html(draft):
    num   = draft.get('issue', 1)
    date  = fmt_date(draft.get('date', ''))
    title = draft.get('headline') or draft.get('title') or 'Untitled'
    sub   = draft.get('lead', '')
    secs  = draft.get('sections', [])
    gap   = draft.get('gapScan', {})
    stats = draft.get('stats', {})

    stat_bar = ('<div class="ii-issue-stats">'
                '<div class="ii-stat">'
                '<span class="ii-stat-n">' + str(stats.get('storiesApproved', 0)) + '</span>'
                '<span class="ii-stat-l">Stories Approved</span>'
                '</div>'
                '<div class="ii-stat">'
                '<span class="ii-stat-n">' + str(stats.get('sourcesScanned', 0)) + '</span>'
                '<span class="ii-stat-l">Sources Scanned</span>'
                '</div>'
                '<div class="ii-stat">'
                '<span class="ii-stat-n">' + str(stats.get('sectionsActive', len(secs))) + '</span>'
                '<span class="ii-stat-l">Sections Active</span>'
                '</div>'
                '</div>')

    sub_html = '<p class="ii-lead u-mt24">' + sub + '</p>' if sub else ''
    active    = [s for s in secs if len(s.get('content') or '') >= 200]
    tab_items = active + [{'title': 'Strategic Insights', '_gap': True}]

    tabs_nav, panels = '', ''
    for idx, sec in enumerate(tab_items):
        st  = sec.get('title', 'Strategic Insights')
        tid = slugify(st)
        col = COLORS.get(st.lower(), '#E8272A')
        cnt = len(sec.get('sources') or [])
        act = ' act' if idx == 0 else ''
        bdg = ('<span class="ii-tab-badge" style="background:' + col + '">'
               + str(cnt) + '</span>') if cnt else ''
        tabs_nav += ('<button class="ii-tab' + act
                     + '" onclick="switchTab(\'' + tid + '\')"'
                     + ' id="tab-' + tid + '">' + st + bdg + '</button>\n      ')
        if sec.get('_gap'):
            pb = gap_panel(gap, secs)
        else:
            content = sec.get('content', '')
            pq      = extract_pullquote(content)
            pq_html = ('<blockquote class="ii-tab-pullquote" style="border-left-color:'
                       + col + '">' + pq + '</blockquote>') if pq else ''
            pb = ('<div class="ii-article-body">' + pq_html + content + '</div>'
                  + source_chips(sec.get('sources', [])))
        hid = '' if idx == 0 else ' hidden'
        panels += ('\n    <div class="ii-tab-panel' + hid
                   + '" id="panel-' + tid
                   + '" role="tabpanel" aria-labelledby="tab-' + tid + '">\n'
                   + '      ' + pb + '\n    </div>')

    eyebrow = 'Issue ' + str(num).zfill(3) + ' &middot; ' + date
    return '\n'.join([
        MARKER_START,
        '  <div class="ii-issue-header">',
        '    <span class="ii-eyebrow">' + eyebrow + '</span>',
        '    <h1 class="ii-h1">' + title + '</h1>',
        '    ' + sub_html,
        '    ' + stat_bar,
        '  </div>',
        '  <div class="ii-tabs-nav"><div class="ii-tabs-scroll">',
        '      ' + tabs_nav,
        '  </div></div>',
        '  ' + panels,
        MARKER_END,
    ])

def update_archive(draft):
    archive = []
    if os.path.exists(ARCHIVE_FILE):
        with open(ARCHIVE_FILE, 'r', encoding='utf-8') as f:
            archive = json.load(f)
    issue_num = draft.get('issue', 1)
    already   = any(a.get('issue') == issue_num for a in archive)
    if not already:
        entry = {
            'issue':    issue_num,
            'date':     draft.get('date', ''),
            'headline': draft.get('headline') or draft.get('title') or '',
            'lead':     draft.get('lead', ''),
            'stats':    draft.get('stats', {}),
            'file':     'issue-' + str(issue_num).zfill(3) + '.html',
        }
        archive.insert(0, entry)
        archive.sort(key=lambda a: a.get('issue', 0), reverse=True)
        with open(ARCHIVE_FILE, 'w', encoding='utf-8') as f:
            json.dump(archive, f, indent=2)
        print('Archive updated — added Issue ' + str(issue_num) + '.')
    else:
        print('Archive already has Issue ' + str(issue_num) + ' (re-publish).')

def update_meta(draft):
    meta = {}
    if os.path.exists(META_FILE):
        with open(META_FILE, 'r', encoding='utf-8') as f:
            meta = json.load(f)
    issue_num = draft.get('issue', 1)
    now_iso   = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    meta['lastPublished'] = now_iso
    if meta.get('nextIssue', 1) <= issue_num:
        meta['nextIssue'] = issue_num + 1
    with open(META_FILE, 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)

def check_already_published(draft):
    issue_num = draft.get('issue', 1)
    if not os.path.exists(ARCHIVE_FILE):
        return False
    with open(ARCHIVE_FILE, 'r', encoding='utf-8') as f:
        archive = json.load(f)
    match = next((a for a in archive if a.get('issue') == issue_num), None)
    if not match:
        return False
    stored_headline = match.get('headline', '')
    current_headline = draft.get('headline') or draft.get('title') or ''
    if stored_headline == current_headline:
        return True
    return False

def main():
    if not os.path.exists(DRAFT_FILE):
        print('ERROR: ' + DRAFT_FILE + ' not found.')
        print('Run this script from the industry-insights/ folder.')
        sys.exit(1)

    with open(DRAFT_FILE, 'r', encoding='utf-8') as f:
        draft = json.load(f)

    issue_num = draft.get('issue', 1)
    headline  = draft.get('headline') or draft.get('title') or '?'
    print('Publishing: Issue ' + str(issue_num) + ' - ' + headline)

    # Warn if this issue+headline is already in archive (likely a stale draft.json)
    if check_already_published(draft):
        meta = {}
        if os.path.exists(META_FILE):
            with open(META_FILE, 'r', encoding='utf-8') as f:
                meta = json.load(f)
        next_num = meta.get('nextIssue', issue_num + 1)
        print('')
        print('WARNING: Issue ' + str(issue_num) + ' is already published with this same content.')
        print('         draft.json has not been updated since the last publish.')
        print('')
        print('         Expected next issue: #' + str(next_num))
        print('         To publish a new issue, update data/draft.json with')
        print('         the new content (increment "issue" and change "headline").')
        print('')
        ans = input('Re-publish Issue ' + str(issue_num) + ' anyway? [y/N] ').strip().lower()
        if ans != 'y':
            print('Aborted.')
            sys.exit(0)

    if not os.path.exists(INDEX_FILE):
        print('ERROR: ' + INDEX_FILE + ' not found.')
        sys.exit(1)

    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        html = f.read()

    s = html.find(MARKER_START)
    e = html.find(MARKER_END)
    if s == -1 or e == -1:
        print('ERROR: Missing ##ISSUE_START## / ##ISSUE_END## markers in index.html.')
        sys.exit(1)

    new_html = html[:s] + build_issue_html(draft) + html[e + len(MARKER_END):]

    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(new_html)

    update_archive(draft)
    update_meta(draft)

    print('Done. index.html updated.')
    print('Refresh your browser to see Issue ' + str(issue_num) + '.')

if __name__ == '__main__':
    main()
