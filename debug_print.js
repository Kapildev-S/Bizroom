const ReceiptPrinterEncoder = require('@point-of-sale/receipt-printer-encoder');

const encoder = new ReceiptPrinterEncoder({ language: 'esc-pos', width: 48 });
const bName = "BizRoom";

let receipt = encoder
  .initialize()
  .size(2, 2)
  .align('center')
  .bold(true)
  .line(bName)
  .size(1, 1)
  .bold(false);

const commands = receipt.commands();
console.log(JSON.stringify(commands, null, 2));
