// src/global.d.ts
import { PrinterClient } from "./api/PrinterClient";

export {};

declare global {
  interface Window {
    client: PrinterClient;
  }
}
