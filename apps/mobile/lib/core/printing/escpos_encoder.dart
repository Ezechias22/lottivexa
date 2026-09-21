import 'dart:convert';
import 'dart:typed_data';

class EscPosEncoder {
  static const _defaultFooter =
      'KENBE RESI A POU VERIFYE TIKE A. TCHEKE REZILTA A AVAN PEMAN. JWE AK RESPONSABILITE.';

  String plain(Map<String, dynamic> ticket) {
    final name = _businessName(ticket);
    final width = _paperColumns(ticket);
    final out = <String>[];
    void line(String value) => out.add(value);
    void wrapped(String value) => out.addAll(_wrap(value, width));
    void pair(String label, String value) => out.addAll(_pair(label, value, width));

    out.addAll(_wrap(name, width).map((value) => _center(value, width)));
    line(_center('RESI BOLET', width));
    line(_repeat('-', width));

    final branch = _branch(ticket);
    final branchName = branch['name']?.toString() ?? ticket['branchName']?.toString() ?? ticket['branch']?.toString();
    if (branchName != null && branchName.isNotEmpty) wrapped(branchName);
    final address = branch['address']?.toString() ?? ticket['branchAddress']?.toString();
    if (address != null && address.isNotEmpty) wrapped(address);
    final phone = branch['phone']?.toString() ?? ticket['branchPhone']?.toString();
    if (phone != null && phone.isNotEmpty) line('TELEFON: $phone');

    line(_repeat('-', width));
    pair('NIMEWO TIKE', _ticketNumber(ticket));
    final merchant = _map(ticket['merchant']);
    final merchantNumber = merchant['merchantNumber']?.toString() ?? ticket['merchantNumber']?.toString();
    if (merchantNumber != null && merchantNumber.isNotEmpty) pair('MACHANN #', merchantNumber);
    final device = ticket['deviceName']?.toString() ?? _map(ticket['device'])['name']?.toString() ?? ticket['deviceId']?.toString();
    if (device != null && device.isNotEmpty) pair('APAREY', device.length > 14 ? device.substring(0, 14) : device);
    pair('DAT / LE', _dateTime(ticket['createdAt']));
    pair('JWE', _game(ticket));
    pair('TIRAJ', _draw(ticket));

    final draw = _map(ticket['draw']);
    if (draw['drawDate'] != null) pair('DAT TIRAJ', _dateOnly(draw['drawDate']));
    if (draw['closesAt'] != null) pair('FEMTI', _dateTime(draw['closesAt']));
    final results = _drawResult(ticket);
    if (results.isNotEmpty) pair('REZILTA', results.join(' / '));

    line(_repeat('-', width));
    line('JWET / CHWA');
    for (final item in _ticketLines(ticket)) {
      final selection = _lineSelection(item);
      final betType = _betType(item);
      wrapped('$betType: $selection');
      final position = _linePosition(item);
      if (position.isNotEmpty) line('  OPSYON: $position');
      pair('PRI', _money(item['stake'], ticket['currency']?.toString()));
      if (item['isWinner'] == true) pair('GAYAN', _money(item['potentialWin'], ticket['currency']?.toString()));
    }

    line(_repeat('-', width));
    pair('TOTAL PARYAJ', _money(ticket['amount'] ?? ticket['totalAmount'], ticket['currency']?.toString()));
    final winningAmount = _winningAmount(ticket);
    final confirmedWinner = winningAmount > 0 && _ticketLines(ticket).any((item) => item['isWinner'] == true);
    final possible = _number(ticket['potentialWin']);
    if (confirmedWinner || possible > 0) {
      pair(confirmedWinner ? 'TOTAL GAYAN' : 'GANYAN POSIB',
          _money(confirmedWinner ? winningAmount : possible, ticket['currency']?.toString()));
    }
    pair('ESTATI', _status(ticket['status']?.toString()));
    line(_repeat('-', width));
    final verification = ticket['barcode']?.toString() ?? _ticketNumber(ticket);
    if (verification.isNotEmpty) pair('KOD VERIFIKASYON', verification);
    final footer = ticket['footer']?.toString();
    wrapped(footer != null && footer.trim().isNotEmpty && !footer.toLowerCase().contains('lottivexa')
        ? footer
        : _defaultFooter);
    return '${out.join('\n')}\n\n';
  }

  Uint8List ticket(Map<String, dynamic> ticket) {
    final out = BytesBuilder();
    final width = _paperColumns(ticket);
    final name = _businessName(ticket);
    final branch = _branch(ticket);
    final branchName = branch['name']?.toString() ?? ticket['branchName']?.toString() ?? ticket['branch']?.toString() ?? '';
    final address = branch['address']?.toString() ?? ticket['branchAddress']?.toString() ?? '';
    final phone = branch['phone']?.toString() ?? ticket['branchPhone']?.toString() ?? '';

    out.add([0x1b, 0x40, 0x1b, 0x61, 1, 0x1b, 0x45, 1]);
    for (final value in _wrap(name, width)) _line(out, value);
    out.add([0x1d, 0x21, 0x10]);
    _line(out, 'RESI BOLET');
    out.add([0x1d, 0x21, 0, 0x1b, 0x45, 0]);
    if (branchName.isNotEmpty) _writeWrapped(out, branchName, width);
    if (address.isNotEmpty) _writeWrapped(out, address, width);
    if (phone.isNotEmpty) _line(out, 'TELEFON: $phone');
    out.add([0x1b, 0x61, 0]);

    _separator(out, width);
    _writePair(out, 'NIMEWO TIKE', _ticketNumber(ticket), width);
    final merchant = _map(ticket['merchant']);
    final merchantNumber = merchant['merchantNumber']?.toString() ?? ticket['merchantNumber']?.toString();
    if (merchantNumber != null && merchantNumber.isNotEmpty) _writePair(out, 'MACHANN #', merchantNumber, width);
    final device = ticket['deviceName']?.toString() ?? _map(ticket['device'])['name']?.toString() ?? ticket['deviceId']?.toString();
    if (device != null && device.isNotEmpty) {
      _writePair(out, 'APAREY', device.length > 14 ? device.substring(0, 14) : device, width);
    }
    _writePair(out, 'DAT / LE', _dateTime(ticket['createdAt']), width);
    _writePair(out, 'JWE', _game(ticket), width);
    _writePair(out, 'TIRAJ', _draw(ticket), width);

    final draw = _map(ticket['draw']);
    if (draw['drawDate'] != null) _writePair(out, 'DAT TIRAJ', _dateOnly(draw['drawDate']), width);
    if (draw['closesAt'] != null) _writePair(out, 'FEMTI', _dateTime(draw['closesAt']), width);
    final results = _drawResult(ticket);
    if (results.isNotEmpty) _writePair(out, 'REZILTA', results.join(' / '), width);

    _separator(out, width);
    _line(out, 'JWET / CHWA');
    for (final item in _ticketLines(ticket)) {
      _writeWrapped(out, '${_betType(item)}: ${_lineSelection(item)}', width);
      final position = _linePosition(item);
      if (position.isNotEmpty) _line(out, '  OPSYON: $position');
      _writePair(out, 'PRI', _money(item['stake'], ticket['currency']?.toString()), width);
      if (item['isWinner'] == true) {
        _writePair(out, 'GAYAN', _money(item['potentialWin'], ticket['currency']?.toString()), width);
      }
    }

    _separator(out, width);
    _writePair(out, 'TOTAL PARYAJ', _money(ticket['amount'] ?? ticket['totalAmount'], ticket['currency']?.toString()), width);
    final winningAmount = _winningAmount(ticket);
    final confirmedWinner = winningAmount > 0 && _ticketLines(ticket).any((item) => item['isWinner'] == true);
    final possible = _number(ticket['potentialWin']);
    if (confirmedWinner || possible > 0) {
      _writePair(out, confirmedWinner ? 'TOTAL GAYAN' : 'GANYAN POSIB',
          _money(confirmedWinner ? winningAmount : possible, ticket['currency']?.toString()), width);
    }
    _writePair(out, 'ESTATI', _status(ticket['status']?.toString()), width);
    _separator(out, width);

    final showBarcode = ticket['showBarcode'] != false;
    final code = ticket['barcode']?.toString();
    if (showBarcode && code != null && code.isNotEmpty) {
      out.add([0x1b, 0x61, 1]);
      _code128(out, code);
      _line(out, _ticketNumber(ticket));
      out.add([0x1b, 0x61, 0]);
    }
    final showQr = ticket['showQr'] != false;
    final qr = ticket['qrCode']?.toString();
    if (showQr && qr != null && qr.isNotEmpty) {
      out.add([0x1b, 0x61, 1]);
      _line(out, 'ESKANE POU VERIFIKASYON');
      _qr(out, qr);
      out.add([0x1b, 0x61, 0]);
    }

    out.add([0x1b, 0x61, 1]);
    final footer = ticket['footer']?.toString();
    _writeWrapped(out, footer != null && footer.trim().isNotEmpty && !footer.toLowerCase().contains('lottivexa')
        ? footer
        : _defaultFooter, width);
    _line(out, '');
    out.add([0x1b, 0x64, 4, 0x1d, 0x56, 0]);
    return out.takeBytes();
  }

  Uint8List testPage(String name) => Uint8List.fromList([
        0x1b,
        0x40,
        ...utf8.encode('TES ENPRIMANT\nEnprimant: $name\nTEST OK\n\n\n'),
        0x1d,
        0x56,
        0,
      ]);

  String _businessName(Map<String, dynamic> ticket) {
    final name = ticket['businessName']?.toString().trim();
    if (name == null || name.isEmpty || name.toLowerCase() == 'lottivexa') {
      throw StateError('RECEIPT_BUSINESS_NAME_REQUIRED');
    }
    return name;
  }

  int _paperColumns(Map<String, dynamic> ticket) {
    final value = ticket['paperWidth'] ?? ticket['width'];
    return value?.toString() == '80' ? 48 : 32;
  }

  Map<String, dynamic> _map(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

  Map<String, dynamic> _branch(Map<String, dynamic> ticket) {
    final direct = _map(ticket['branch']);
    if (direct.isNotEmpty) return direct;
    final merchant = _map(ticket['merchant']);
    return _map(merchant['branch']);
  }

  String _ticketNumber(Map<String, dynamic> ticket) =>
      ticket['ticketNumber']?.toString() ?? ticket['id']?.toString() ?? '';

  String _game(Map<String, dynamic> ticket) {
    final draw = _map(ticket['draw']);
    final drawGame = _map(draw['game']);
    final game = _map(ticket['game']);
    return ticket['gameName']?.toString() ?? game['name']?.toString() ?? drawGame['name']?.toString() ?? 'LOTI';
  }

  String _draw(Map<String, dynamic> ticket) {
    final draw = _map(ticket['draw']);
    return ticket['drawName']?.toString() ?? draw['drawNumber']?.toString() ?? '—';
  }

  List<Map<String, dynamic>> _ticketLines(Map<String, dynamic> ticket) {
    final value = ticket['lines'];
    if (value is! List) return const [];
    return value.whereType<Map>().map((line) => Map<String, dynamic>.from(line)).toList();
  }

  String _lineSelection(Map<String, dynamic> line) {
    final raw = line['selectionKey']?.toString() ?? _selectionValue(line['selection']);
    return raw.split('@').first.replaceAll('-', ' x ');
  }

  String _selectionValue(dynamic value) {
    if (value is List) return value.join('-');
    return value?.toString() ?? '—';
  }

  String _linePosition(Map<String, dynamic> line) {
    final fromField = line['resultPosition']?.toString();
    final selectionKey = line['selectionKey']?.toString() ?? '';
    final value = fromField ?? (selectionKey.contains('@') ? selectionKey.split('@').last : '');
    if (value.isEmpty || value == 'null') return '';
    switch (value) {
      case '1':
        return '1YE';
      case '2':
        return '2YEM';
      case '3':
        return '3YEM';
      default:
        return value;
    }
  }

  String _betType(Map<String, dynamic> line) {
    final value = line['betType'];
    if (value is Map) {
      final bet = Map<String, dynamic>.from(value);
      return bet['name']?.toString() ?? bet['code']?.toString() ?? 'BOLET';
    }
    return value?.toString() ?? line['betTypeName']?.toString() ?? line['betTypeCode']?.toString() ?? 'BOLET';
  }

  List<String> _drawResult(Map<String, dynamic> ticket) {
    final direct = ticket['drawResult'];
    if (direct is List) return direct.map((value) => value.toString()).toList();
    final result = _map(_map(ticket['draw'])['result']);
    final values = result['winningKeys'] ?? result['numbers'];
    if (values is List) return values.map((value) => value.toString()).toList();
    return const [];
  }

  double _number(dynamic value) => double.tryParse(value?.toString() ?? '') ?? 0;

  double _winningAmount(Map<String, dynamic> ticket) {
    final winning = _map(ticket['winning']);
    return _number(winning['winningAmount'] ?? ticket['winningAmount']);
  }

  String _money(dynamic value, String? currency) {
    final amount = _number(value);
    final parts = amount.toStringAsFixed(2).split('.');
    final whole = parts.first;
    final negative = whole.startsWith('-');
    final digits = negative ? whole.substring(1) : whole;
    final grouped = StringBuffer();
    for (var index = 0; index < digits.length; index++) {
      if (index > 0 && (digits.length - index) % 3 == 0) grouped.write(',');
      grouped.write(digits[index]);
    }
    return '\$${negative ? '-' : ''}${grouped.toString()}.${parts.last}';
  }

  String _status(String? status) {
    const names = <String, String>{
      'PENDING': 'AN ATANT',
      'VALID': 'VALAB',
      'WINNER': 'GAYAN',
      'LOSER': 'PEDI',
      'CANCELLED': 'ANILE',
      'VOID': 'ANILE',
      'PAID': 'PEYE',
      'EXPIRED': 'EKSPIRE',
    };
    final key = (status ?? 'VALID').toUpperCase();
    return names[key] ?? key;
  }

  String _dateTime(dynamic value) {
    final date = DateTime.tryParse(value?.toString() ?? '');
    if (date == null) return value?.toString() ?? '';
    final local = date.toLocal();
    return '${_two(local.day)}/${_two(local.month)}/${local.year} ${_two(local.hour)}:${_two(local.minute)}';
  }

  String _dateOnly(dynamic value) {
    final raw = value?.toString() ?? '';
    final match = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(raw);
    return match == null ? raw : '${match.group(3)}/${match.group(2)}/${match.group(1)}';
  }

  String _two(int value) => value.toString().padLeft(2, '0');

  List<String> _wrap(String value, int width) {
    final words = value.replaceAll(RegExp(r'[\r\n\t]+'), ' ').trim().split(RegExp(r'\s+'));
    final out = <String>[];
    var current = '';
    for (final word in words.where((part) => part.isNotEmpty)) {
      if (word.length > width) {
        if (current.isNotEmpty) out.add(current);
        current = '';
        for (var index = 0; index < word.length; index += width) {
          out.add(word.substring(index, index + width > word.length ? word.length : index + width));
        }
        continue;
      }
      final next = current.isEmpty ? word : '$current $word';
      if (next.length > width) {
        out.add(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current.isNotEmpty) out.add(current);
    return out.isEmpty ? [''] : out;
  }

  List<String> _pair(String label, String value, int width) {
    if (value.length > width ~/ 2 || label.length > width - value.length - 1) {
      return [..._wrap(label, width), ..._wrap(value, width)];
    }
    final right = value;
    final leftWidth = (width - right.length - 1).clamp(1, width).toInt();
    final leftLines = _wrap(label, leftWidth);
    final out = <String>[];
    for (final line in leftLines.take(leftLines.length - 1)) {
      out.add(line);
    }
    final left = leftLines.last.length > leftWidth ? leftLines.last.substring(0, leftWidth) : leftLines.last;
    final gap = (width - left.length - right.length).clamp(1, width).toInt();
    final spacing = _repeat(' ', gap);
    out.add('$left$spacing$right');
    return out;
  }

  String _center(String value, int width) {
    final text = value.length > width ? value.substring(0, width) : value;
    final left = ((width - text.length) ~/ 2).clamp(0, width).toInt();
    final prefix = _repeat(' ', left);
    final suffix = _repeat(' ', width - left - text.length);
    return '$prefix$text$suffix';
  }

  String _repeat(String value, int count) => List<String>.filled(count, value).join();

  void _line(BytesBuilder out, String value) => out.add(utf8.encode('$value\n'));

  void _writeWrapped(BytesBuilder out, String value, int width) {
    for (final line in _wrap(value, width)) {
      _line(out, line);
    }
  }

  void _writePair(BytesBuilder out, String label, String value, int width) {
    for (final line in _pair(label, value, width)) {
      _line(out, line);
    }
  }

  void _separator(BytesBuilder out, int width) => _line(out, _repeat('-', width));

  void _code128(BytesBuilder out, String value) {
    final data = ascii.encode('{B$value');
    out.add([0x1d, 0x48, 2, 0x1d, 0x68, 72, 0x1d, 0x77, 2, 0x1d, 0x6b, 73, data.length, ...data, 10]);
  }

  void _qr(BytesBuilder out, String value) {
    final data = utf8.encode(value);
    final length = data.length + 3;
    out.add([
      0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
      0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x05,
      0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31,
      0x1d, 0x28, 0x6b, length & 255, (length >> 8) & 255, 0x31, 0x50, 0x30,
      ...data,
      0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30, 10,
    ]);
  }
}
