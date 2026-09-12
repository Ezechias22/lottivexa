import{EscPosDriver}from'./escpos.js';import type{PrinterTransport}from'./types.js';
export class BluetoothEscPosAdapter extends EscPosDriver{constructor(transport:PrinterTransport,readonly deviceAddress:string){super(transport)}}
export class UsbEscPosAdapter extends EscPosDriver{constructor(transport:PrinterTransport,readonly vendorId:number,readonly productId:number){super(transport)}}
export class NetworkEscPosAdapter extends EscPosDriver{constructor(transport:PrinterTransport,readonly host:string,readonly port=9100){super(transport)}}
export class LotteryMachineAdapter extends EscPosDriver{constructor(transport:PrinterTransport,readonly protocol:string){super(transport)}}
