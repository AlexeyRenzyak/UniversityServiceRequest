from django.test import SimpleTestCase
from .views import safe_csv_cell


class CsvSafetyTests(SimpleTestCase):
    def test_escapes_formula_cells(self):
        for value in ("=2+3", "+SUM(1)", "-1+2", "@cmd", "  =1+1"):
            self.assertTrue(safe_csv_cell(value).startswith("'"))
        self.assertEqual(safe_csv_cell("printer jam"), "printer jam")
