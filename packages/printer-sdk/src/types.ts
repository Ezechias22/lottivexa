export type PrinterState='DISCONNECTED'|'CONNECTING'|'READY'|'BUSY'|'ERROR'|'PAPER_OUT';
export interface PrinterStatus{state:PrinterState;message?:string}
export interface PrinterTransport{open():Promise<void>;close():Promise<void>;write(data:Uint8Array):Promise<void>;status?():Promise<PrinterStatus>}
export interface PrinterDriver{connect():Promise<void>;disconnect():Promise<void>;status():Promise<PrinterStatus>;print(data:Uint8Array):Promise<void>;testPrint():Promise<void>;cashDrawer():Promise<void>;cut():Promise<void>;feed(lines:number):Promise<void>}
export interface TicketTemplate{paperWidth:58|80;header?:string;footer?:string;showBarcode:boolean;showQr:boolean}
export interface TicketPrintData{businessName:string;ticketNumber:string;branch:string;branchAddress?:string;branchPhone?:string;game:string;draw:string;merchant?:string;merchantNumber?:string;currency?:string;status?:string;winningAmount?:string;lines:{betType?:string;selection:string;stake:string;potentialWin:string;isPromotional?:boolean;isWinner?:boolean;winCount?:number}[];amount:string;potentialWin:string;createdAt:string;barcode:string;qrCode:string}
