import 'package:intl/intl.dart';

String normalizeCurrencyCode(dynamic value) {
  final code = value?.toString().trim().toUpperCase() ?? '';
  return RegExp(r'^[A-Z]{3}$').hasMatch(code) ? code : 'USD';
}

String narrowCurrencySymbol(dynamic value) {
  final code = normalizeCurrencyCode(value);
  if (code == 'USD') return r'$';
  try {
    final symbol = NumberFormat.simpleCurrency(name: code, locale: 'fr_HT').currencySymbol.trim();
    return symbol.isEmpty ? code : symbol;
  } catch (_) {
    return code;
  }
}

String formatCurrency(dynamic value, [dynamic currency = 'USD', int? decimalDigits]) {
  final code = normalizeCurrencyCode(currency);
  final amount = value is num ? value.toDouble() : double.tryParse('${value ?? 0}') ?? 0;
  return NumberFormat.currency(
    name: code,
    symbol: narrowCurrencySymbol(code),
    locale: 'fr_HT',
    decimalDigits: decimalDigits,
  ).format(amount.isFinite ? amount : 0);
}
