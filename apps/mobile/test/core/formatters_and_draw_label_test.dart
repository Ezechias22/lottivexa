import 'package:flutter_test/flutter_test.dart';
import 'package:lottivexa_mobile/core/draw_label.dart';
import 'package:lottivexa_mobile/core/formatters/currency_format.dart';

void main() {
  group('currency formatting', () {
    test('USD uses a dollar symbol without a country suffix', () {
      final value = formatCurrency(125.5, 'USD');

      expect(value, contains(r'$'));
      expect(value, isNot(contains(r'$US')));
    });

    test('invalid currency codes fall back to USD', () {
      expect(normalizeCurrencyCode(' usd '), 'USD');
      expect(normalizeCurrencyCode('US'), 'USD');
    });
  });

  group('draw labels', () {
    test('reads draw date and time from its draw number', () {
      expect(
        merchantDrawLabel({
          'drawNumber': 'NY-20261003-2230',
          'gameName': 'New York',
        }),
        'New York Swa 03/10/2026 22:30',
      );
    });

    test('shows a helpful label when the draw session is missing', () {
      expect(drawSession({}), 'Sesyon pou verifye');
    });
  });
}
