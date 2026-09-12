import CoreBluetooth
import Flutter

final class PrinterBridge:NSObject,CBCentralManagerDelegate,CBPeripheralDelegate {
  private var central:CBCentralManager!
  private var discovered:[UUID:CBPeripheral]=[:]
  private var discoveryResult:FlutterResult?
  private var writeResult:FlutterResult?
  private var targetService:CBUUID?
  private var targetCharacteristic:CBUUID?
  private var pendingBytes=Data()
  private var pendingChunks:[Data]=[]
  private var writeCharacteristic:CBCharacteristic?
  private var timeout:DispatchWorkItem?

  init(channel:FlutterMethodChannel){super.init();central=CBCentralManager(delegate:self,queue:.main);channel.setMethodCallHandler{[weak self]call,result in self?.handle(call,result:result)}}
  private func handle(_ call:FlutterMethodCall,result:@escaping FlutterResult){guard let args=call.arguments as? [String:Any],let type=args["type"]as?String else{return result(FlutterError(code:"INVALID_ARGUMENT",message:"Printer type required",details:nil))};guard type=="BLUETOOTH"else{return result(FlutterError(code:"UNSUPPORTED_IOS_TRANSPORT",message:"iOS supports BLE printers with configured service and characteristic UUIDs; USB host printing is unavailable.",details:type))};switch call.method{case"discover":discover(result);case"write":guard let config=args["configuration"]as?[String:Any],let data=(args["bytes"]as?FlutterStandardTypedData)?.data else{return result(FlutterError(code:"INVALID_ARGUMENT",message:"Configuration and bytes required",details:nil))};write(config,data:data,result:result);default:result(FlutterMethodNotImplemented)}}
  private func discover(_ result:@escaping FlutterResult){guard central.state==.poweredOn else{return result(FlutterError(code:"BLUETOOTH_UNAVAILABLE",message:"Bluetooth is not powered on or authorized",details:central.state.rawValue))};discovered.removeAll();discoveryResult=result;central.scanForPeripherals(withServices:nil,options:[CBCentralManagerScanOptionAllowDuplicatesKey:false]);let work=DispatchWorkItem{[weak self]in self?.finishDiscovery()};timeout=work;DispatchQueue.main.asyncAfter(deadline:.now()+4,execute:work)}
  private func finishDiscovery(){central.stopScan();let values=discovered.values.map{["name":$0.name ?? "BLE Printer","deviceAddress":$0.identifier.uuidString,"bonded":false]};discoveryResult?(values);discoveryResult=nil}
  private func write(_ config:[String:Any],data:Data,result:@escaping FlutterResult){guard central.state==.poweredOn else{return result(FlutterError(code:"BLUETOOTH_UNAVAILABLE",message:"Bluetooth is not powered on",details:nil))};guard let identifierText=config["deviceAddress"]as?String,let identifier=UUID(uuidString:identifierText),let serviceText=config["serviceUuid"]as?String,let characteristicText=config["writeCharacteristicUuid"]as?String else{return result(FlutterError(code:"BLE_CONFIGURATION_REQUIRED",message:"deviceAddress, serviceUuid and writeCharacteristicUuid are required on iOS",details:nil))};guard let peripheral=central.retrievePeripherals(withIdentifiers:[identifier]).first ?? discovered[identifier] else{return result(FlutterError(code:"BLE_DEVICE_NOT_FOUND",message:"Discover the printer before printing",details:identifierText))};writeResult=result;targetService=CBUUID(string:serviceText);targetCharacteristic=CBUUID(string:characteristicText);pendingBytes=data;peripheral.delegate=self;central.connect(peripheral);let work=DispatchWorkItem{[weak self]in self?.fail("BLE_TIMEOUT","Printer connection timed out")};timeout=work;DispatchQueue.main.asyncAfter(deadline:.now()+15,execute:work)}
  func centralManagerDidUpdateState(_ central:CBCentralManager){}
  func centralManager(_ central:CBCentralManager,didDiscover peripheral:CBPeripheral,advertisementData:[String:Any],rssi RSSI:NSNumber){discovered[peripheral.identifier]=peripheral}
  func centralManager(_ central:CBCentralManager,didConnect peripheral:CBPeripheral){peripheral.discoverServices(targetService.map{[$0]})}
  func centralManager(_ central:CBCentralManager,didFailToConnect peripheral:CBPeripheral,error:Error?){fail("BLE_CONNECT_FAILED",error?.localizedDescription ?? "Connection failed")}
  func centralManager(_ central:CBCentralManager,didDisconnectPeripheral peripheral:CBPeripheral,error:Error?){if writeResult != nil{fail("BLE_DISCONNECTED",error?.localizedDescription ?? "Printer disconnected")}}
  func peripheral(_ peripheral:CBPeripheral,didDiscoverServices error:Error?){if let error=error{return fail("BLE_SERVICE_FAILED",error.localizedDescription)};guard let service=peripheral.services?.first(where:{$0.uuid==targetService})else{return fail("BLE_SERVICE_NOT_FOUND","Configured service was not found")};peripheral.discoverCharacteristics(targetCharacteristic.map{[$0]},for:service)}
  func peripheral(_ peripheral:CBPeripheral,didDiscoverCharacteristicsFor service:CBService,error:Error?){if let error=error{return fail("BLE_CHARACTERISTIC_FAILED",error.localizedDescription)};guard let characteristic=service.characteristics?.first(where:{$0.uuid==targetCharacteristic}),characteristic.properties.contains(.write)else{return fail("BLE_WRITE_NOT_SUPPORTED","Writable characteristic was not found")};writeCharacteristic=characteristic;let size=max(20,peripheral.maximumWriteValueLength(for:.withResponse));pendingChunks=stride(from:0,to:pendingBytes.count,by:size).map{pendingBytes.subdata(in:$0..<min($0+size,pendingBytes.count))};writeNext(peripheral)}
  private func writeNext(_ peripheral:CBPeripheral){guard let characteristic=writeCharacteristic else{return fail("BLE_WRITE_NOT_READY","Characteristic unavailable")};guard !pendingChunks.isEmpty else{timeout?.cancel();let callback=writeResult;writeResult=nil;central.cancelPeripheralConnection(peripheral);callback?(nil);return};peripheral.writeValue(pendingChunks.removeFirst(),for:characteristic,type:.withResponse)}
  func peripheral(_ peripheral:CBPeripheral,didWriteValueFor characteristic:CBCharacteristic,error:Error?){if let error=error{return fail("BLE_WRITE_FAILED",error.localizedDescription)};writeNext(peripheral)}
  private func fail(_ code:String,_ message:String){timeout?.cancel();writeResult?(FlutterError(code:code,message:message,details:nil));writeResult=nil}
}
