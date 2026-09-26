import 'dart:convert';
import 'dart:typed_data';

import '../draw_label.dart';

class EscPosEncoder {
  String plain(Map<String, dynamic> ticket) {
    final name = _requiredName(ticket);
    final ticketNumber = ticket['ticketNumber'] ?? ticket['id'] ?? '';
    final french = ticket['language'] == 'fr';
    String tr(String ht, String fr) => french ? fr : ht;
    final game = ticket['gameName'] ?? ticket['game']?['name'] ?? 'Lotri';
    final currency = _currency(ticket['currency']);
    final branch = _map(ticket['merchant']?['branch']);
    final date = _date(ticket['createdAt']);
    final winning = _map(ticket['winning']);
    final out = StringBuffer()
      ..writeln(name)
      ..writeln(tr('FICH BOLET', 'TICKET DE LOTERIE'))
      ..writeln('--------------------------------')
      ..writeln('${tr('TIKÈ', 'TICKET')}: $ticketNumber')
      ..writeln('${tr('LOTRI', 'LOTERIE')}: $game')
      ..writeln('${tr('TIRAJ', 'TIRAGE')}: ${_drawName(ticket)}')
      ..writeln('${tr('BIWO', 'SUCCURSALE')}: ${branch['name'] ?? ticket['branchName'] ?? '—'}');
    final address = branch['address'] ?? ticket['branchAddress'];
    final phone = branch['phone'] ?? ticket['branchPhone'];
    if (address != null && '$address'.trim().isNotEmpty) out.writeln('${tr('ADRÈS', 'ADRESSE')}: $address');
    if (phone != null && '$phone'.trim().isNotEmpty) out.writeln('${tr('TELEFÒN', 'TÉLÉPHONE')}: $phone');
    out
      ..writeln('${tr('DAT / LÈ', 'DATE / HEURE')}: $date')
      ..writeln('--------------------------------')
      ..writeln(tr('JWÈT / NIMEWO                 PRI', 'JEU / NUMÉRO                 MISE'));
    for (final raw in ticket['lines'] as List<dynamic>? ?? const []) {
      final line = Map<String, dynamic>.from(raw as Map);
      final parts = '${line['selectionKey'] ?? line['selection'] ?? ''}'.split('@');
      final selection = parts.first.replaceAll('-', ' × ');
      out.writeln(_compactLine(line, selection, parts.length > 1 ? parts[1] : '', currency, tr('GRATIS', 'GRATUIT')));
      final winCount = _winCount(line);
      if (winCount > 1) out.writeln('${tr('DEKABÈS', 'DÉKABÈS')} × $winCount');
      if (line['isPromotional'] == true) out.writeln(tr('MARYAJ GRATIS', 'MARYAJ GRATUIT'));
    }
    out
      ..writeln('--------------------------------')
      ..writeln('TOTAL: $currency${ticket['amount'] ?? ticket['totalAmount'] ?? ''}')
      ..writeln('${tr('GANY POSIB', 'GAIN POTENTIEL')}: $currency${ticket['potentialWin'] ?? ''}')
      ..writeln('${tr('ESTATI', 'STATUT')}: ${_status(ticket['status'], french)}');
    if ((double.tryParse('${winning['winningAmount'] ?? 0}') ?? 0) > 0) {
      out.writeln('${tr('GANY KONFIME', 'GAIN CONFIRMÉ')}: $currency${winning['winningAmount']}');
    }
    out
      ..writeln('--------------------------------')
      ..writeln(date)
      ..writeln(tr('Kenbe tikè orijinal la. Verifye avan peman.', 'Conservez ce ticket original et vérifiez le résultat avant le paiement.'));
    return out.toString();
  }

  Uint8List ticket(Map<String, dynamic> ticket) {
    final out = BytesBuilder();
    final currency = _currency(ticket['currency']);
    final ticketNumber = ticket['ticketNumber'] ?? ticket['id'] ?? '';
    out.add([0x1b, 0x40, 0x1b, 0x61, 1, 0x1b, 0x45, 1]);
    _line(out, _requiredName(ticket));
    final french = ticket['language'] == 'fr';
    String tr(String ht, String fr) => french ? fr : ht;
    _line(out, tr('FICH BOLET', 'TICKET DE LOTERIE'));
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
    _line(out, tr('JWÈT / NIMEWO                 PRI', 'JEU / NUMÉRO                 MISE'));
    for (final raw in ticket['lines'] as List<dynamic>? ?? const []) {
      final line = Map<String, dynamic>.from(raw as Map);
      final parts = '${line['selectionKey'] ?? line['selection'] ?? ''}'.split('@');
      final selection = parts.first.replaceAll('-', ' × ');
      final won = line['isWinner'] == true;
      _line(out, '${won ? (french ? '*GAGNANT* ' : '*GENYEN* ') : ''}${_compactLine(line, selection, parts.length > 1 ? parts[1] : '', currency, tr('GRATIS', 'GRATUIT'))}');
      final winCount = _winCount(line);
      if (winCount > 1) _line(out, '${tr('DEKABÈS', 'DÉKABÈS')} × $winCount');
      _line(out, line['isPromotional'] == true
          ? tr('  GRATIS', '  GRATUIT')
          : '  $currency${line['stake'] ?? ''}');
      if (line['isPromotional'] == true) _line(out, tr('BONIS GRATIS', 'BONUS GRATUIT'));
    }
    _line(out, '--------------------------------');
    _line(out, 'TOTAL: $currency${ticket['amount'] ?? ticket['totalAmount'] ?? ''}');
    _line(out, '${tr('GANY POSIB', 'GAIN POTENTIEL')}: $currency${ticket['potentialWin'] ?? ''}');
    _line(out, '${tr('ESTATI', 'STATUT')}: ${_status(ticket['status'], french)}');
    final winning = _map(ticket['winning']);
    if ((double.tryParse('${winning['winningAmount'] ?? 0}') ?? 0) > 0) {
      _line(out, '${tr('GANY KONFIME', 'GAIN CONFIRMÉ')}: $currency${winning['winningAmount']}');
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
    out.add([0x1b, 0x64, 4, 0x1d, 0x56, 0]);
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
    final explicit = ticket['drawName']?.toString().trim();
    if (explicit != null && explicit.isNotEmpty) return explicit;
    final draw = _map(ticket['draw']);
    if (draw.isEmpty) return 'Sesyon pou verifye';
    final game = draw['game'] is Map ? '${draw['game']['name'] ?? ''}' : '${ticket['gameName'] ?? ''}';
    final session = drawSession(draw, french: ticket['language'] == 'fr');
    final dateValue = draw['resultAt'] ?? draw['drawTime'] ?? draw['closesAt'] ?? draw['opensAt'] ?? draw['drawDate'];
    final parsed = dateValue == null ? null : DateTime.tryParse('$dateValue');
    final date = parsed == null ? '' : _date(parsed);
    return [if (game.trim().isNotEmpty) game, session, if (date.isNotEmpty) date].join(' · ');
  }

  Map<String, dynamic> _map(dynamic value) => value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
  String _currency(dynamic _) => r'$';
  String _compactLine(Map<String, dynamic> line, String selection, String option, String currency, String free) {
    final betType = line['betType'];
    final raw = (betType is Map ? betType['code'] : line['betTypeName'] ?? betType ?? '').toString().toUpperCase();
    final code = raw.contains('LOTO3') ? 'LT3' : raw.contains('LOTO4') ? 'LT4' : raw.contains('LOTO5') ? 'LT5' : raw.contains('MARYAJ') ? 'MJ' : 'BL';
    final price = line['isPromotional'] == true ? free : '$currency${line['stake'] ?? ''}';
    return '${option.isEmpty ? '' : 'OP$option '}$code $selection $price';
  }
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
