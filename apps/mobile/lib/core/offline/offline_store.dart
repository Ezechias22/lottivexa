import 'package:sqlite3/sqlite3.dart';

class OfflineStore {
  OfflineStore(String path) : db = sqlite3.open(path) {
    db.execute('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
    db.execute('''
      CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,operation TEXT NOT NULL,encrypted_payload TEXT NOT NULL,created_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING',attempts INTEGER NOT NULL DEFAULT 0,next_attempt_at TEXT NOT NULL,last_error TEXT);
      CREATE INDEX IF NOT EXISTS outbox_ready ON outbox(status,next_attempt_at);
      CREATE TABLE IF NOT EXISTS ticket_cache(id TEXT PRIMARY KEY,ticket_number TEXT,status TEXT NOT NULL,encrypted_payload TEXT NOT NULL,updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS printer_queue(id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL,printer_id TEXT NOT NULL,encrypted_payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING',attempts INTEGER NOT NULL DEFAULT 0,next_attempt_at TEXT NOT NULL,last_error TEXT,created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS printer_queue_ready ON printer_queue(status,next_attempt_at);
      CREATE TABLE IF NOT EXISTS local_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL);
    ''');
    _addColumn('printer_queue', 'printer_id', "TEXT NOT NULL DEFAULT ''");
    _addColumn('printer_queue', 'next_attempt_at', "TEXT NOT NULL DEFAULT '1970-01-01T00:00:00Z'");
    _addColumn('printer_queue', 'last_error', 'TEXT');
  }
  final Database db;
  void _addColumn(String table,String column,String definition){if(!db.select('PRAGMA table_info($table)').any((row)=>row['name']==column))db.execute('ALTER TABLE $table ADD COLUMN $column $definition');}
  void enqueue({required String id,required String operation,required String encryptedPayload,required DateTime createdAt}){final now=createdAt.toUtc().toIso8601String();db.execute('INSERT OR IGNORE INTO outbox(id,operation,encrypted_payload,created_at,next_attempt_at) VALUES(?,?,?,?,?)',[id,operation,encryptedPayload,now,now]);}
  List<Row>ready({int limit=50})=>db.select("SELECT * FROM outbox WHERE status IN ('PENDING','RETRY') AND next_attempt_at<=? ORDER BY created_at LIMIT ?",[DateTime.now().toUtc().toIso8601String(),limit]);
  int get pendingCount=>db.select("SELECT COUNT(*) n FROM outbox WHERE status IN ('PENDING','RETRY')").first['n']as int;
  int get rejectedCount=>db.select("SELECT COUNT(*) n FROM outbox WHERE status='REJECTED'").first['n']as int;
  List<Map<String,String>> get syncErrors=>db.select("SELECT status,last_error FROM outbox WHERE status IN ('RETRY','REJECTED') OR (status='APPLIED' AND last_error IS NOT NULL) ORDER BY created_at DESC LIMIT 5").map((row)=>{'status':row['status'].toString(),'error':row['last_error']?.toString()??''}).toList();
  void printAttention(String id)=>db.execute("UPDATE outbox SET last_error='PRINT_FOLLOWUP_REQUIRED' WHERE id=? AND status='APPLIED'",[id]);
  void applied(String id)=>db.execute("UPDATE outbox SET status='APPLIED',last_error=NULL WHERE id=?",[id]);
  void rejected(String id,String error)=>db.execute("UPDATE outbox SET status='REJECTED',last_error=? WHERE id=?",[error,id]);
  void retry(String id,int attempts,String error)=>db.execute("UPDATE outbox SET status='RETRY',attempts=?,last_error=?,next_attempt_at=? WHERE id=?",[attempts,error,_retryAt(attempts),id]);
  void enqueuePrint({required String id,required String ticketId,required String printerId,required String encryptedPayload}){final now=DateTime.now().toUtc().toIso8601String();db.execute('INSERT OR IGNORE INTO printer_queue(id,ticket_id,printer_id,encrypted_payload,created_at,next_attempt_at) VALUES(?,?,?,?,?,?)',[id,ticketId,printerId,encryptedPayload,now,now]);}
  List<Row>readyPrints({int limit=20})=>db.select("SELECT * FROM printer_queue WHERE status IN ('PENDING','RETRY') AND next_attempt_at<=? ORDER BY created_at LIMIT ?",[DateTime.now().toUtc().toIso8601String(),limit]);
  int get pendingPrintCount=>db.select("SELECT COUNT(*) n FROM printer_queue WHERE status IN ('PENDING','RETRY')").first['n']as int;
  void printCompleted(String id)=>db.execute("UPDATE printer_queue SET status='PRINTED',last_error=NULL WHERE id=?",[id]);
  void printRetry(String id,int attempts,String error)=>db.execute("UPDATE printer_queue SET status='RETRY',attempts=?,last_error=?,next_attempt_at=? WHERE id=?",[attempts,error,_retryAt(attempts),id]);
  void printRejected(String id,String error)=>db.execute("UPDATE printer_queue SET status='REJECTED',last_error=? WHERE id=?",[error,id]);
  String?setting(String key)=>db.select('SELECT value FROM local_settings WHERE key=?',[key]).firstOrNull?['value']as String?;
  void setSetting(String key,String value)=>db.execute('INSERT INTO local_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at',[key,value,DateTime.now().toUtc().toIso8601String()]);
  String _retryAt(int attempts){final capped=attempts.clamp(0,8);return DateTime.now().toUtc().add(Duration(seconds:1<<capped)).toIso8601String();}
  void close()=>db.dispose();
}
