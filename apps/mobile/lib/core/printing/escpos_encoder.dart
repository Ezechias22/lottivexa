import 'dart:convert';
import 'dart:typed_data';

class EscPosEncoder {
  String plain(Map<String, dynamic> ticket) {
    final name = ticket['businessName']?.toString().trim();
    if (name == null || name.isEmpty || name.toLowerCase() == 'lottivexa') throw StateError('RECEIPT_BUSINESS_NAME_REQUIRED');
    final out = StringBuffer('$name\nTIKÈ ${ticket['ticketNumber'] ?? ticket['id']}\n${ticket['gameName'] ?? ''} ${ticket['drawName'] ?? ''}\n');
    for (final raw in ticket['lines'] as List<dynamic>? ?? const []) {
      final line = raw as Map<String, dynamic>;
      out.writeln('${line['selection'] ?? line['selectionKey']}   ${line['stake']}');
    }
    out.writeln('TOTAL: ${ticket['amount'] ?? ticket['totalAmount'] ?? ''}');
    out.writeln('ESTATI: ${ticket['status'] ?? 'VALID'}');
    out.writeln(ticket['qrCode'] ?? '');
    return out.toString();
  }

  Uint8List ticket(Map<String, dynamic> ticket) {
    final out = BytesBuilder();
    out.add([0x1b, 0x40, 0x1b, 0x61, 1, 0x1b, 0x45, 1]);
    final name = ticket['businessName']?.toString().trim();
    if (name == null || name.isEmpty || name.toLowerCase() == 'lottivexa') throw StateError('RECEIPT_BUSINESS_NAME_REQUIRED');
    _line(out, name);
    out.add([0x1b, 0x45, 0]);
    _line(out, 'TIKE ${ticket['ticketNumber'] ?? ticket['id']}');
    out.add([0x1b, 0x61, 0]);
    _line(out, '${ticket['gameName'] ?? ''}  ${ticket['drawName'] ?? ''}');
    for (final raw in ticket['lines'] as List<dynamic>? ?? const []) {
      final line = raw as Map<String, dynamic>;
      final won = line['isWinner'] == true;
      _line(out, '${won ? '*GAYAN* ' : ''}${line['selection'] ?? line['selectionKey']}   ${line['stake']}${won ? ' -> ${line['potentialWin']}' : ''}');
    }
    _line(out, 'TOTAL: ${ticket['amount'] ?? ticket['totalAmount'] ?? ''}');
    _line(out, 'ESTATI: ${ticket['status'] ?? 'VALID'}');
    final winning = ticket['winning'];
    if (winning is Map) _line(out, 'TOTAL GENYEN: ${winning['winningAmount'] ?? 0}');
    _line(out, ticket['createdAt']?.toString() ?? '');
    final code = ticket['ticketNumber']?.toString();
    if (code != null && code.isNotEmpty) _code128(out, code);
    final qr = ticket['qrCode']?.toString();
    if (qr != null && qr.isNotEmpty) _qr(out, qr);
    _line(out, ticket['footer']?.toString() ?? 'Kenbe tike orijinal la. Verifye avan peman. Tike ki peye pa ka peye anko.');
    out.add([0x1b, 0x64, 4, 0x1d, 0x56, 0]);
    return out.takeBytes();
  }

  Uint8List testPage(String name) => Uint8List.fromList([0x1b, 0x40, ...utf8.encode('TES ENPRIMANT\nEnprimant: $name\nTEST OK\n\n\n'), 0x1d, 0x56, 0]);
  void _line(BytesBuilder out, String value) => out.add(utf8.encode('$value\n'));
  void _code128(BytesBuilder out, String value) { final data = ascii.encode('{B$value'); out.add([0x1d, 0x48, 2, 0x1d, 0x68, 72, 0x1d, 0x6b, 0x49, data.length, ...data, 10]); }
  void _qr(BytesBuilder out, String value) { final data = utf8.encode(value), length = data.length + 3; out.add([0x1d,0x28,0x6b,0x04,0x00,0x31,0x41,0x32,0x00,0x1d,0x28,0x6b,0x03,0x00,0x31,0x43,0x05,0x1d,0x28,0x6b,length&255,(length>>8)&255,0x31,0x50,0x30,...data,0x1d,0x28,0x6b,0x03,0x00,0x31,0x51,0x30,10]); }
}
