String drawSession(Map<String, dynamic> draw, {bool french = false}) {
  final text = <Object?>[draw['session'], draw['sessionType'], draw['name'], draw['drawNumber']]
      .whereType<Object>().join(' ').toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]+'), ' ');
  String? session;
  if (RegExp(r'\b(MORNING|MATIN|MATEN)\b').hasMatch(text)) {
    session = french ? 'Matin' : 'Maten';
  } else if (RegExp(r'\b(MID|MIDI|MIDDAY|NOON|DAY|JOUR|JOUNEN)\b').hasMatch(text)) {
    session = 'Midi';
  } else if (RegExp(r'\b(EVENING|SOIR|SWA|EVE|ASWE)\b').hasMatch(text)) {
    session = french ? 'Soir' : 'Swa';
  } else if (RegExp(r'\b(NIGHT|NUIT|LANNWIT)\b').hasMatch(text)) {
    session = french ? 'Nuit' : 'Lannuit';
  }
  if (session == null) {
    final source = draw['resultAt'] ?? draw['drawTime'] ?? draw['closesAt'] ?? draw['opensAt'];
    final parsed = source == null ? null : DateTime.tryParse('$source');
    final date = parsed == null ? null : _haitiTime(parsed);
    if (date != null) {
      session = date.hour < 12 ? (french ? 'Matin' : 'Maten')
          : date.hour < 16 ? 'Midi'
          : date.hour < 21 ? (french ? 'Soir' : 'Swa')
          : (french ? 'Nuit' : 'Lannuit');
    }
  }
  if (session == null) {
    final code = '${draw['drawNumber'] ?? ''}';
    final time = RegExp(r'(?:-|_)(\d{4})$').firstMatch(code)?.group(1);
    final hour = time == null ? null : int.tryParse(time.substring(0, 2));
    final minute = time == null ? null : int.tryParse(time.substring(2));
    if (hour != null && minute != null && hour < 24 && minute < 60) {
      session = hour < 12 ? (french ? 'Matin' : 'Maten')
          : hour < 16 ? 'Midi'
          : hour < 21 ? (french ? 'Soir' : 'Swa')
          : (french ? 'Nuit' : 'Lannuit');
    }
  }
  if (session == null) return french ? 'Séance à confirmer' : 'Sesyon pou verifye';
  return (french ? 'Normal · ' : 'Nòmal · ') + session;
}

String merchantDrawLabel(Map<String, dynamic> draw, {bool french = false}) {
  final game = draw['game'] is Map
      ? '${draw['game']['name'] ?? ''}'
      : '${draw['gameName'] ?? ''}';
  final source = draw['resultAt'] ?? draw['drawTime'] ?? draw['closesAt'] ?? draw['opensAt'] ?? draw['drawDate'];
  final parsed = source == null ? null : DateTime.tryParse('$source');
  final date = parsed == null ? null : _haitiTime(parsed);
  final parts = <String>[if (game.trim().isNotEmpty) game, drawSession(draw, french: french)];
  if (date != null) {
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final time = date.hour.toString().padLeft(2, '0') + ':' + date.minute.toString().padLeft(2, '0');
    parts.add(day + '/' + month + '/' + date.year.toString() +
        (draw['resultAt'] != null || draw['closesAt'] != null || draw['opensAt'] != null ? ' ' + time : ''));
  }
  return parts.join(' · ');
}

DateTime _haitiTime(DateTime value) => value.toUtc().subtract(const Duration(hours: 4));
