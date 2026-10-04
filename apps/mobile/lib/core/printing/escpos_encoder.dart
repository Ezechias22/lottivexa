import 'dart:convert';
import 'dart:typed_data';

import '../draw_label.dart';
import '../formatters/currency_format.dart';

class EscPosEncoder {
  String plain(Map<String, dynamic> ticket) {
    final name = _requiredName(ticket);
    final ticketNumber = ticket['ticketNumber'] ?? ticket['id'] ?? '';
    final french = ticket['language'] == 'fr';
    String tr(String ht, String fr) => french ? fr : ht;
    final game = ticket['gameName'] ?? ticket['game']?['name'] ?? 'Lotri';
    final currency = normalizeCurrencyCode(ticket['currency']);
    final branch = _map(ticket['merchant']?['branch']);
    final date = _date(ticket['createdAt']);
    final winning = _map(ticket['winning']);
    final out = StringBuffer();
    if (_showBusinessName(name)) out.writeln(name);
    out.writeln('--------------------------------');
    out.writeln('${tr('TIKÈ', 'TICKET')}: $ticketNumber');
    out.writeln('${tr('LOTRI', 'LOTERIE')}: $game');
    out.writeln('${tr('TIRAJ', 'TIRAGE')}: ${_drawName(ticket)}');
    out.writeln('${tr('BIWO', 'SUCCURSALE')}: ${branch['name'] ?? ticket['branchName'] ?? '—'}');
    final address = branch['address'] ?? ticket['branchAddress'];
    final phone = branch['phone'] ?? ticket['branchPhone'];
    if (address != null && '$address'.trim().isNotEmpty) out.writeln('${tr('ADRÈS', 'ADRESSE')}: $address');
    if (phone != null && '$phone'.trim().isNotEmpty) out.writeln('${tr('TELEFÒN', 'TÉLÉPHONE')}: $phone');
    out
      ..writeln('${tr('DAT / LÈ', 'DATE / HEURE')}: $date')
      ..writeln('--------------------------------')
      ..writeln(tr('JWÈT / NIMEWO       PRI', 'JEU / NUMÉRO       MISE'));
    for (final raw in ticket['lines'] as List<dynamic>? ?? const []) {
      final line = Map<String, dynamic>.from(raw as Map);
      final parts = '${line['selectionKey'] ?? line['selection'] ?? ''}'.split('@');
      final selection = parts.first.replaceAll('-', ' × ');
      out.writeln(_receiptRow(line, selection, parts.length > 1 ? parts[1] : '', currency, tr('GRATIS', 'GRATUIT')));
      if (line['isPromotional'] == true) out.writeln('  Peye ${formatCurrency(line['potentialWin'], currency)} si li genyen');
      final winCount = _winCount(line);
      if (winCount > 1) out.writeln('${tr('DEKABÈS', 'DÉKABÈS')} × $winCount');
    }
    out
      ..writeln('--------------------------------')
      ..writeln('TOTAL: ${formatCurrency(ticket['amount'] ?? ticket['totalAmount'] ?? 0, currency)}')
      ..writeln('${tr('ESTATI', 'STATUT')}: ${_status(ticket['status'], french)}');
    if ((double.tryParse('${winning['winningAmount'] ?? 0}') ?? 0) > 0) {
      out.writeln('${tr('GEN KONFIME', 'GAIN CONFIRMÉ')}: ${formatCurrency(winning['winningAmount'], currency)}');
    }
    out
      ..writeln('--------------------------------')
      ..writeln(date)
      ..writeln(tr('Kenbe tikè orijinal la. Verifye avan peman.', 'Conservez ce ticket original et vérifiez le résultat avant le paiement.'));
    return out.toString();
  }

  Uint8List ticket(Map<String, dynamic> ticket) {
    final out = BytesBuilder();
    final currency = normalizeCurrencyCode(ticket['currency']);
    final ticketNumber = ticket['ticketNumber'] ?? ticket['id'] ?? '';
    out.add([0x1b, 0x40, 0x1b, 0x61, 1, 0x1b, 0x45, 1]);
    final businessName = _requiredName(ticket);
    if (_showBusinessName(businessName)) _line(out, businessName);
    final french = ticket['language'] == 'fr';
    String tr(String ht, String fr) => french ? fr : ht;
    _line(out, '--------------------------------');
    out.add([0x1b, 0x45, 0]);
    _line(out, '${tr('TIKÈ', 'TICKET')} ${ticket['ticketNumber'] ?? ticket['id'] ?? ''}');
    out.add([0x1b, 0x61, 0]);
    final branch = _map(ticket['merchant']?['branch']);
    _line(out, '${tr('LOTRI', 'LOTERIE')}: ${ticket['gameName'] ?? ticket['game']?['name'] ?? 'Lotri'}');
    _line(out, '${tr('TIRAJ', 'TIRAGE')}: ${_drawName(ticket)}');
    _line(out, '${tr('BIWO', 'SUCCURSALE')}: ${branch['name'] ?? ticket['branchName'] ?? '—'}');
    _line(out, '${tr('DAT / LÈ', 'DATE / HEURE')}: ${_date(ticket['createdAt'])}');
    _line(out, '--------------------------------');
    _line(out, tr('JWÈT / NIMEWO       PRI', 'JEU / NUMÉRO       MISE'));
    for (final raw in ticket['lines'] as List<dynamic>? ?? const []) {
      final line = Map<String, dynamic>.from(raw as Map);
      final parts = '${line['selectionKey'] ?? line['selection'] ?? ''}'.split('@');
      final selection = parts.first.replaceAll('-', ' × ');
      final won = line['isWinner'] == true;
      _line(out, _receiptRow(line, selection, parts.length > 1 ? parts[1] : '', currency, tr('GRATIS', 'GRATUIT')));
      if (line['isPromotional'] == true) _line(out, '  ${tr('Peye', 'Gain fixe')} ${formatCurrency(line['potentialWin'], currency)} ${tr('si li genyen', 'si gagnant')}');
      if (won) _line(out, french ? '  GAGNANT' : '  GENYEN');
      final winCount = _winCount(line);
      if (winCount > 1) _line(out, '${tr('DEKABÈS', 'DÉKABÈS')} × $winCount');
    }
    _line(out, '--------------------------------');
    _line(out, 'TOTAL: ${formatCurrency(ticket['amount'] ?? ticket['totalAmount'] ?? 0, currency)}');
    _line(out, '${tr('ESTATI', 'STATUT')}: ${_status(ticket['status'], french)}');
    final winning = _map(ticket['winning']);
    if ((double.tryParse('${winning['winningAmount'] ?? 0}') ?? 0) > 0) {
      _line(out, '${tr('GEN KONFIME', 'GAIN CONFIRMÉ')}: ${formatCurrency(winning['winningAmount'], currency)}');
    }
    _line(out, _date(ticket['createdAt']));
    final code = ticket['ticketNumber']?.toString();
    if (code != null && code.isNotEmpty) {
      _code128(out, code);
    }
    final qr = ticket['qrCode']?.toString();
    if (qr != null && qr.isNotEmpty) {
      _qr(out, qr);
    } else if (ticketNumber.toString().isNotEmpty) {
      _qr(out, ticketNumber.toString());
    }
    _line(out, ticket['footer']?.toString() ?? tr('Kenbe tikè orijinal la. Verifye avan peman. Tikè ki peye pa ka peye ankò.', 'Conservez le ticket original. Vérifiez le résultat avant paiement. Un ticket déjà payé ne peut pas l’être une seconde fois.'));
    out.add([0x1b, 0x64, 6, 0x1d, 0x56, 0]);
    return out.takeBytes();
  }

  Uint8List testPage(String name) => Uint8List.fromList([0x1b, 0x40, ...utf8.encode('TES ENPRIMANT\nEnprimant: $name\nTEST OK\n\n\n'), 0x1d, 0x56, 0]);

  String _requiredName(Map<String, dynamic> ticket) {
    final value = ticket['businessName']?.toString().trim();
    if (value == null || value.isEmpty || value.toLowerCase() == 'lottivexa') {
      throw StateError('RECEIPT_BUSINESS_NAME_REQUIRED');
    }
    return value;
  }

  String _drawName(Map<String, dynamic> ticket) {
    final linked = ticket['ticketDraws'] as List<dynamic>? ?? [];
    final draws = linked.map((item) => item is Map ? item['draw'] : null).whereType<Map>().toList();
    if (draws.isNotEmpty) {
      return draws.map((draw) => merchantDrawLabel(Map<String, dynamic>.from(draw), french: ticket['language'] == 'fr').replaceFirst(RegExp(r'\s+\d{2}:\d{2}$'), '')).where((label) => label.isNotEmpty).toSet().join(' / ');
    }
    final explicit = ticket['drawName']?.toString().trim();
    if (explicit != null && explicit.isNotEmpty) return explicit.replaceFirst(RegExp(r'\s+\d{2}:\d{2}$'), '');
    final draw = _map(ticket['draw']);
    if (draw.isEmpty) return 'Sesyon pou verifye';
    final game = draw['game'] is Map ? '${draw['game']['name'] ?? ''}' : '${ticket['gameName'] ?? ''}';
    final session = drawSession(draw, french: ticket['language'] == 'fr');
    final dateValue = draw['resultAt'] ?? draw['drawTime'] ?? draw['closesAt'] ?? draw['opensAt'] ?? draw['drawDate'];
    final parsed = dateValue == null ? null : DateTime.tryParse('$dateValue');
    final date = parsed == null ? '' : _date(parsed);
    return [if (game.trim().isNotEmpty) game, session, if (date.isNotEmpty) date.replaceFirst(RegExp(r'\s+\d{2}:\d{2}$'), '')].join(' · ');
  }

  Map<String, dynamic> _map(dynamic value) => value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
  String _compactLine(Map<String, dynamic> line, String selection, String option) {
    final betType = line['betType'];
    final raw = (betType is Map ? betType['code'] : line['betTypeName'] ?? betType ?? '').toString().toUpperCase();
    final code = raw.contains('LOTO3') ? 'LT3' : raw.contains('LOTO4') ? 'LT4' : raw.contains('LOTO5') ? 'LT5' : raw.contains('MARYAJ') ? 'MJ' : 'BL';
    return (option.isEmpty ? '' : 'OP' + option + ' ') + code + '  ' + selection;
  }

  String _receiptRow(Map<String, dynamic> line, String selection, String option, String currency, String free) {
    final left = _compactLine(line, selection, option);
    final price = line['isPromotional'] == true ? free : formatCurrency(line['stake'], currency);
    const width = 32;
    if (price.length >= width - 2) return '$left\n${price.padLeft(width)}';
    final firstWidth = width - price.length;
    if (left.length <= firstWidth) return left.padRight(firstWidth) + price;
    final continuationWidth = firstWidth - 2;
    final output = <String>[];
    var remaining = left;
    var first = true;
    while (remaining.isNotEmpty) {
      final widthForLine = first ? firstWidth : continuationWidth;
      final split = _splitReceiptLine(remaining, widthForLine);
      final segment = split[0];
      remaining = split[1];
      if (remaining.isEmpty) {
        final prefix = first ? '' : '  ';
        output.add((prefix + segment).padRight(firstWidth) + price);
      } else {
        output.add(first ? segment : '  $segment');
      }
      first = false;
    }
    return output.join('\n');
  }

  List<String> _splitReceiptLine(String value, int maxChars) {
    if (value.length <= maxChars) return [value, ''];
    var split = value.lastIndexOf(' ', maxChars);
    if (split < maxChars ~/ 2) split = maxChars;
    return [value.substring(0, split).trimRight(), value.substring(split).trimLeft()];
  }

  bool _showBusinessName(String name) => !const {'bolet', 'lottivexa'}.contains(name.trim().toLowerCase());

  int _winCount(Map<String, dynamic> line) => int.tryParse('${line['winCount'] ?? 0}') ?? 0;
  String _status(dynamic raw, bool french) => (french
      ? const {'VALID':'Valide','WINNER':'Gagnant','LOSER':'Perdant','PAID':'Payé','CANCELLED':'Annulé','VOID':'Annulé','PENDING':'En attente'}
      : const {'VALID':'Valab','WINNER':'Gayan','LOSER':'Pèdan','PAID':'Peye','CANCELLED':'Anile','VOID':'Anile','PENDING':'An atant'})['${raw ?? 'VALID'}'] ?? '${raw ?? 'VALID'}';
  String _date(dynamic raw) {
    final value = raw == null ? null : DateTime.tryParse('$raw');
    if (value == null) return '';
    final date = value.toUtc().subtract(const Duration(hours: 4));
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  void _line(BytesBuilder out, String value) => out.add(utf8.encode('$value\n'));
  void _code128(BytesBuilder out, String value) { final data = ascii.encode('{B$value'); out.add([0x1d, 0x48, 2, 0x1d, 0x68, 72, 0x1d, 0x6b, 0x49, data.length, ...data, 10]); }
  void _qr(BytesBuilder out, String value) { final data = utf8.encode(value), length = data.length + 3; out.add([0x1d,0x28,0x6b,0x04,0x00,0x31,0x41,0x32,0x00,0x1d,0x28,0x6b,0x03,0x00,0x31,0x43,0x05,0x1d,0x28,0x6b,length&255,(length>>8)&255,0x31,0x50,0x30,...data,0x1d,0x28,0x6b,0x03,0x00,0x31,0x51,0x30,10]); }
}
