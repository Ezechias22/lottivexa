# Printing runtime

The printing worker is an edge service installed in the branch where the physical
printers are reachable. It authenticates with a dedicated tenant user, atomically
claims durable jobs, renders versioned templates to ESC/POS bytes, writes to hardware,
and acknowledges success or failure. Failed jobs use server-controlled exponential
backoff and a maximum-attempt limit.

## Supported transports

- **LAN/network:** raw TCP socket, normally port 9100.
- **USB on Linux:** direct write to a configured device such as `/dev/usb/lp0`.
- **Bluetooth on Linux:** pair/bind the printer with BlueZ/RFCOMM and configure a
  device such as `/dev/rfcomm0`.
- **Lottery machine:** named driver adapter over TCP or an OS device path. Add a
  protocol-specific adapter without changing ticket, queue or finance code.

The process reports ONLINE or ERROR heartbeat state and last-seen time through the
tenant-scoped API. The worker account should have only `printers.view` and
`printers.configure`.

## Run

```bash
pnpm --filter @lottivexa/printing-worker start
```

For Docker development:

```bash
docker compose --profile printing up printing-worker
```

USB/RFCOMM deployments must explicitly pass the exact device into the container or
run the worker directly under a restricted systemd account that can write that device.
Never run it privileged.

## Physical test print

Set `PRINT_TEST_PRINTER_ID` and start the worker once. It connects using the stored
printer configuration, prints an ESC/POS test, feeds/cuts where supported, updates the
heartbeat and exits. Remove the variable before normal queue processing.

The Tenant Admin designer saves a new immutable template version and previews 58 mm or
80 mm output. Existing jobs retain their selected template version.
