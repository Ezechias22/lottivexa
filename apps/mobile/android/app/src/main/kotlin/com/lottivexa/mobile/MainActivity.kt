package com.lottivexa.mobile

import android.Manifest
import android.app.PendingIntent
import android.bluetooth.BluetoothAdapter
import android.content.*
import android.content.pm.PackageManager
import android.hardware.usb.*
import android.os.Build
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.UUID

class MainActivity : FlutterActivity() {
  private val channelName = "com.lottivexa/printer"
  private val usbPermission = "com.lottivexa.USB_PERMISSION"
  private val bluetoothRequest = 9471
  private var pendingBluetoothResult: MethodChannel.Result? = null
  private var activePrintWebView: WebView? = null

  override fun configureFlutterEngine(engine: FlutterEngine) {
    super.configureFlutterEngine(engine)
    MethodChannel(engine.dartExecutor.binaryMessenger, channelName).setMethodCallHandler { call, result ->
      try { when (call.method) {
        "requestBluetoothPermission" -> requestBluetoothPermission(result)
        "openBluetoothSettings" -> { startActivity(Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS)); result.success(null) }
        "discover" -> result.success(discover(call.argument<String>("type") ?: ""))
        "systemPrint" -> systemPrint(call.argument<String>("text") ?: "", call.argument<String>("businessName") ?: "Bolet", result)
        "write" -> {
          val type = call.argument<String>("type") ?: ""
          val config = call.argument<Map<String, Any>>("configuration") ?: emptyMap()
          val bytes = call.argument<ByteArray>("bytes") ?: throw IllegalArgumentException("PRINT_BYTES_REQUIRED")
          when (type) { "BLUETOOTH" -> writeBluetooth(config, bytes, result); "USB" -> writeUsb(config, bytes, result); else -> result.error("UNSUPPORTED_TRANSPORT", type, null) }
        }
        else -> result.notImplemented()
      }} catch (error: Exception) { result.error("PRINTER_ERROR", error.message, error.javaClass.simpleName) }
    }
  }

  private fun requestBluetoothPermission(result: MethodChannel.Result) {
    if (Build.VERSION.SDK_INT < 31 || (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED && ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED)) { result.success(true); return }
    pendingBluetoothResult = result
    ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN), bluetoothRequest)
  }

  override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode == bluetoothRequest) { pendingBluetoothResult?.success(grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }); pendingBluetoothResult = null }
  }

  private fun discover(type: String): List<Map<String, Any?>> = when (type) {
    "BLUETOOTH" -> { requireBluetoothPermission(); BluetoothAdapter.getDefaultAdapter()?.bondedDevices?.map { mapOf("name" to (it.name ?: "Printer Bluetooth"), "deviceAddress" to it.address, "bonded" to true) } ?: emptyList() }
    "USB" -> { val manager = getSystemService(USB_SERVICE) as UsbManager; manager.deviceList.values.map { mapOf("name" to it.deviceName, "vendorId" to it.vendorId, "productId" to it.productId, "permission" to manager.hasPermission(it)) } }
    else -> emptyList()
  }

  private fun requireBluetoothPermission() { if (Build.VERSION.SDK_INT >= 31 && ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) throw SecurityException("BLUETOOTH_PERMISSION_REQUIRED") }

  private fun systemPrint(text: String, businessName: String, result: MethodChannel.Result) {
    val web = WebView(this)
    activePrintWebView = web
    val documentName = businessName.take(80).ifBlank { "Bolet" }
    val lineCount = text.lineSequence().count().coerceAtLeast(1)
    // Android otherwise chooses A4. That makes a 58 mm receipt look like a tiny
    // centered strip on an A4 page. Request roll width and content-based length.
    val heightMils = (lineCount * 140 + 1800).coerceIn(3000, 20000)
    val mediaSize = PrintAttributes.MediaSize("LVX_RECEIPT_58MM", "LOTTIVEXA 58 mm", 2283, heightMils)
    val html = """
      <!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        @page { size: 58mm ${heightMils / 1000.0 * 25.4}mm; margin: 0; }
        html, body { width: 58mm; margin: 0; padding: 0; background: #fff; color: #000; }
        body { box-sizing: border-box; padding: 2.5mm; }
        pre { box-sizing: border-box; width: 100%; margin: 0; white-space: pre-wrap; overflow-wrap: anywhere;
          font: 9.5pt/1.35 monospace; color: #000; }
      </style></head><body><pre>${android.text.TextUtils.htmlEncode(text)}</pre></body></html>
    """.trimIndent()
    web.webViewClient = object : android.webkit.WebViewClient() {
      override fun onPageFinished(view: WebView, url: String?) {
        try {
          val attributes = PrintAttributes.Builder()
            .setMediaSize(mediaSize)
            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
            .build()
          (getSystemService(Context.PRINT_SERVICE) as PrintManager)
            .print(documentName, view.createPrintDocumentAdapter(documentName), attributes)
          result.success(null)
        } catch (error: Exception) {
          result.error("SYSTEM_PRINT_FAILED", error.message, null)
        }
      }
    }
    web.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
  }

  private fun writeBluetooth(c: Map<String, Any>, bytes: ByteArray, result: MethodChannel.Result) {
    requireBluetoothPermission(); val address = c["deviceAddress"]?.toString() ?: throw IllegalArgumentException("DEVICE_ADDRESS_REQUIRED")
    Thread { try { val adapter = BluetoothAdapter.getDefaultAdapter() ?: throw IllegalStateException("BLUETOOTH_UNAVAILABLE"); val socket = adapter.getRemoteDevice(address).createRfcommSocketToServiceRecord(UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")); adapter.cancelDiscovery(); socket.connect(); socket.outputStream.use { it.write(bytes); it.flush() }; socket.close(); runOnUiThread { result.success(null) } } catch (error: Exception) { runOnUiThread { result.error("BLUETOOTH_PRINT_FAILED", error.message, null) } } }.start()
  }

  private fun writeUsb(c: Map<String, Any>, bytes: ByteArray, result: MethodChannel.Result) {
    val manager = getSystemService(USB_SERVICE) as UsbManager; val vendor = (c["vendorId"] as? Number)?.toInt(); val product = (c["productId"] as? Number)?.toInt()
    val device = manager.deviceList.values.firstOrNull { (vendor == null || it.vendorId == vendor) && (product == null || it.productId == product) } ?: throw IllegalArgumentException("USB_DEVICE_NOT_FOUND")
    if (manager.hasPermission(device)) { performUsbWrite(manager, device, bytes, result); return }
    val receiver = object : BroadcastReceiver() { override fun onReceive(context: Context, intent: Intent) { unregisterReceiver(this); if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) performUsbWrite(manager, device, bytes, result) else result.error("USB_PERMISSION_DENIED", "USB permission denied", null) } }
    ContextCompat.registerReceiver(this, receiver, IntentFilter(usbPermission), ContextCompat.RECEIVER_NOT_EXPORTED)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0); manager.requestPermission(device, PendingIntent.getBroadcast(this, 0, Intent(usbPermission).setPackage(packageName), flags))
  }

  private fun performUsbWrite(manager: UsbManager, device: UsbDevice, bytes: ByteArray, result: MethodChannel.Result) {
    Thread { var connection: UsbDeviceConnection? = null; try { val intf = (0 until device.interfaceCount).map { device.getInterface(it) }.firstOrNull { i -> (0 until i.endpointCount).any { i.getEndpoint(it).direction == UsbConstants.USB_DIR_OUT } } ?: throw IllegalStateException("USB_OUT_ENDPOINT_NOT_FOUND"); val endpoint = (0 until intf.endpointCount).map { intf.getEndpoint(it) }.first { it.direction == UsbConstants.USB_DIR_OUT }; connection = manager.openDevice(device) ?: throw IllegalStateException("USB_OPEN_FAILED"); if (!connection.claimInterface(intf, true)) throw IllegalStateException("USB_CLAIM_FAILED"); val written = connection.bulkTransfer(endpoint, bytes, bytes.size, 10000); if (written != bytes.size) throw IllegalStateException("USB_PARTIAL_WRITE_$written"); runOnUiThread { result.success(null) } } catch (error: Exception) { runOnUiThread { result.error("USB_PRINT_FAILED", error.message, null) } } finally { connection?.close() } }.start()
  }
}
