import importlib.util
import json
import tempfile
import unittest
from datetime import datetime
from io import BytesIO
from pathlib import Path
from unittest.mock import Mock

from PIL import Image


MODULE_PATH = Path(__file__).resolve().parents[1] / 'scripts' / 'publish-kitchen-photos.py'
SPEC = importlib.util.spec_from_file_location('publish_kitchen_photos', MODULE_PATH)
PUBLISHER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PUBLISHER)


class FakeResponse:
    def __init__(self, text='', content=b'', content_type='image/jpeg'):
        self.text = text
        self.content = content
        self.headers = {'content-type': content_type}

    def raise_for_status(self):
        return None


def jpeg_payload(size=(1800, 1200)):
    image = Image.new('RGB', size, '#557799')
    buffer = BytesIO()
    image.save(buffer, 'JPEG')
    return buffer.getvalue()


class KitchenPhotoPublisherTests(unittest.TestCase):
    def test_extract_photo_urls_unescapes_and_deduplicates(self):
        first = 'https://lh3.googleusercontent.com/photo-one=w512-h384'
        second = 'https://lh3.googleusercontent.com/photo-two=s640'
        urls = PUBLISHER.extract_photo_urls('before ' + first.replace('=', '\\u003d') + ' ' + second + ' ' + first)
        self.assertEqual(urls, [first, second])

    def test_high_resolution_url_replaces_existing_rendition(self):
        self.assertEqual(
            PUBLISHER.high_resolution_url('https://lh3.googleusercontent.com/photo=w512-h384-no?x=1'),
            'https://lh3.googleusercontent.com/photo=w1600-h1200?x=1',
        )

    def test_publish_photo_set_writes_five_local_images_and_manifest(self):
        urls = [f'https://lh3.googleusercontent.com/photo-{index}=w512-h384' for index in range(6)]
        album_page = ' '.join(urls)
        session = Mock()
        session.get.side_effect = [FakeResponse(text=album_page)] + [FakeResponse(content=jpeg_payload()) for _ in range(5)]

        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            manifest_file = root / 'family' / 'kitchen-photos.json'
            photo_directory = root / 'family' / 'kitchen-photos'
            changed = PUBLISHER.publish_photo_set(
                'https://photos.example.test/shared',
                manifest_file=manifest_file,
                photo_directory=photo_directory,
                now=datetime(2026, 9, 8, 1, 15, tzinfo=PUBLISHER.KITCHEN_TIMEZONE),
                session=session,
            )
            manifest = json.loads(manifest_file.read_text())

            self.assertTrue(changed)
            self.assertEqual(manifest['date'], '2026-09-08')
            self.assertEqual(len(manifest['photos']), 5)
            self.assertTrue(all((root / 'family' / item['src']).is_file() for item in manifest['photos']))
            self.assertTrue(all(len(item['id']) == 20 for item in manifest['photos']))

    def test_publish_photo_set_keeps_current_valid_set_without_force(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            photo_directory = root / 'family' / 'kitchen-photos'
            photo_directory.mkdir(parents=True)
            photos = []
            for index in range(1, 6):
                source = photo_directory / f'current-{index}.jpg'
                source.write_bytes(b'photo')
                photos.append({'src': f'kitchen-photos/current-{index}.jpg', 'id': str(index)})
            manifest_file = root / 'family' / 'kitchen-photos.json'
            manifest_file.write_text(json.dumps({'date': '2026-09-08', 'photos': photos}))

            changed = PUBLISHER.publish_photo_set(
                'https://photos.example.test/shared',
                manifest_file=manifest_file,
                photo_directory=photo_directory,
                now=datetime(2026, 9, 8, 1, 15, tzinfo=PUBLISHER.KITCHEN_TIMEZONE),
                session=Mock(),
            )

            self.assertFalse(changed)
