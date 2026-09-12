# Printing architecture

The core depends on `PrinterDriver` and `PrinterTransport`, never a vendor SDK. Bluetooth, USB, network and lottery-machine adapters wrap a transport supplied by the mobile/native platform. ESC/POS rendering produces immutable bytes from a versioned template and ticket snapshot.

Print jobs are tenant-idempotent. A device claims eligible jobs with optimistic locking, reports completion only after the transport write succeeds, and reports failures for exponential retry. A completed job creates `PRINTED`; later completed jobs create `REPRINTED`. Paper-out and connection state are reported through the driver status contract.

Printer configuration contains connection coordinates only. Credentials or pairing secrets belong in the device secure store, not database JSON. Browser USB/Bluetooth support must be capability-detected; unsupported hardware routes through the Flutter/native client or a local print bridge.
