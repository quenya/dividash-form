import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('launcher', Path(__file__).with_name('run_official_etf_sync.py'))
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)

FIXTURE = 'host=fake.example\nport=5432\ndatabase=fake_db\nuser=fake_user\npw: fake-password\n'

class LauncherTests(unittest.TestCase):
    def test_parse_fake_fixture(self):
        self.assertEqual(launcher.parse_credentials(FIXTURE), {
            'SUPABASE_DB_HOST':'fake.example', 'SUPABASE_DB_PORT':'5432',
            'SUPABASE_DB_NAME':'fake_db', 'SUPABASE_DB_USER':'fake_user',
            'SUPABASE_DB_PASSWORD':'fake-password'})

    def test_last_connection_and_markdown_password(self):
        values = launcher.parse_credentials('host=old.example\nuser=old\n' + FIXTURE.replace('pw: fake-password', '- pw: `fake-password`'))
        self.assertEqual(values['SUPABASE_DB_HOST'], 'fake.example')
        self.assertEqual(values['SUPABASE_DB_USER'], 'fake_user')
        self.assertEqual(values['SUPABASE_DB_PASSWORD'], 'fake-password')

    def test_missing_fields_rejected(self):
        with self.assertRaises(ValueError):
            launcher.parse_credentials('host=fake\npw: fake\n')

    def test_default_dry_run_passes_credentials_only_in_env_and_propagates_code(self):
        with tempfile.TemporaryDirectory() as d:
            note = Path(d) / 'fake-note'; note.write_text(FIXTURE)
            py = Path(d) / 'python'; py.touch(); py.chmod(0o755)
            with patch.object(launcher.subprocess, 'run', return_value=type('R', (), {'returncode': 19})()) as run:
                rc = launcher.main(['--python', str(py), '--credential-note', str(note)])
            self.assertEqual(rc, 19)
            args, kwargs = run.call_args
            self.assertEqual(args[0][-4:], [str(Path(__file__).with_name('sync_recent_official_etfs.py')), '--dry-run', '--trigger', 'schedule'])
            self.assertEqual(kwargs['env']['SUPABASE_DB_PASSWORD'], 'fake-password')
            self.assertNotIn('fake-password', ' '.join(args[0]))

    def test_missing_note_fails_closed(self):
        self.assertEqual(launcher.main(['--python', '/usr/bin/python3', '--credential-note', '/nonexistent/fake-note']), 2)

    def test_credential_note_is_explicit(self):
        with self.assertRaises(SystemExit) as error:
            launcher.main(['--python', '/usr/bin/python3'])
        self.assertEqual(error.exception.code, 2)

    def test_write_flag(self):
        with tempfile.TemporaryDirectory() as d:
            note = Path(d) / 'note'; note.write_text(FIXTURE)
            py = Path(d) / 'py'; py.touch(); py.chmod(0o755)
            with patch.object(launcher.subprocess, 'run', return_value=type('R', (), {'returncode': 0})()) as run:
                self.assertEqual(launcher.main(['--write', '--python', str(py), '--credential-note', str(note)]), 0)
            self.assertIn('--write', run.call_args.args[0])

if __name__ == '__main__':
    unittest.main()
