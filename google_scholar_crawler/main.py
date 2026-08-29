import json
from datetime import datetime
import os
import signal
import sys
from contextlib import contextmanager

from scholarly import scholarly


RESULTS_DIR = 'results'
FETCH_TIMEOUT_SECONDS = 120


class ScholarFetchTimeout(Exception):
    pass


@contextmanager
def scholar_timeout(seconds):
    if not hasattr(signal, 'SIGALRM'):
        yield
        return

    def handle_timeout(signum, frame):
        raise ScholarFetchTimeout(f'Google Scholar fetch timed out after {seconds}s')

    previous_handler = signal.signal(signal.SIGALRM, handle_timeout)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, previous_handler)


def write_results(author):
    os.makedirs(RESULTS_DIR, exist_ok=True)
    with open(os.path.join(RESULTS_DIR, 'gs_data.json'), 'w') as outfile:
        json.dump(author, outfile, ensure_ascii=False)

    citedby = author.get('citedby')
    shieldio_data = {
        'schemaVersion': 1,
        'label': 'citations',
        'message': str(citedby) if citedby is not None else 'unavailable',
    }
    with open(os.path.join(RESULTS_DIR, 'gs_data_shieldsio.json'), 'w') as outfile:
        json.dump(shieldio_data, outfile, ensure_ascii=False)


def write_fallback_results(reason):
    write_results({
        'name': '',
        'citedby': None,
        'updated': str(datetime.now()),
        'error': reason,
        'publications': {},
    })


def fetch_author():
    scholar_id = os.environ.get('GOOGLE_SCHOLAR_ID')
    if not scholar_id:
        raise RuntimeError('Missing GOOGLE_SCHOLAR_ID repository secret')

    with scholar_timeout(FETCH_TIMEOUT_SECONDS):
        author = scholarly.search_author_id(scholar_id)
        scholarly.fill(author, sections=['basics', 'indices', 'counts', 'publications'])

    author['updated'] = str(datetime.now())
    author['publications'] = {
        publication.get('author_pub_id', str(index)): publication
        for index, publication in enumerate(author.get('publications', []))
    }
    return author


def main():
    try:
        author = fetch_author()
    except Exception as exc:
        print(f'Warning: failed to fetch Google Scholar data: {exc}', file=sys.stderr)
        write_fallback_results(str(exc))
        return

    print(json.dumps(author, indent=2))
    write_results(author)


if __name__ == '__main__':
    main()
