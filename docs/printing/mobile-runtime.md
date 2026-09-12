# Mobile printing runtime

The Flutter client prints only server-confirmed tickets. Offline ticket drafts remain encrypted in SQLite until `/sync/batch` accepts them; rejected or conflicted drafts are never printed as valid tickets.

## Flow

1. The tenant assigns an approved printer to the merchant branch.
2. The merchant selects it by successfully sending a test page.
3. A confirmed ticket is encrypted and added to `printer_queue` with a unique job ID.
4. Network printers use raw TCP (default ESC/POS port 9100). Bluetooth and USB use the native `com.lottivexa/printer` bridge.
5. Failed jobs use bounded exponential retry and become `REJECTED` after ten attempts; no print failure creates another ticket.
6. Connectivity recovery runs the transaction sync queue first and the print queue second.

Printer configuration is always loaded again from the authenticated API. The API enforces tenant ownership and, for merchants, branch ownership before returning a printer configuration.

Android now contains a native bridge for paired Bluetooth Classic SPP printers and USB-host bulk transfers. Android 12+ requires `BLUETOOTH_CONNECT`; USB permission is requested through the operating-system dialog. LAN printing is operational through direct sockets.

iOS now has a CoreBluetooth adapter for discovery, service/characteristic lookup, MTU-aware chunking, acknowledged writes, disconnect detection and timeouts. Bluetooth Classic requires Apple-approved External Accessory/MFi support and generic USB host printing is unavailable on iOS. Unsupported transports return an explicit platform error rather than reporting a fake successful print. Signed release builds and physical-printer certification remain deployment gates.
