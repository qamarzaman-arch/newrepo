export class ReceiptService {
  static generateReceiptText(order: any, settings: any): string {
    const lines = [];
    lines.push(settings.restaurantName || 'POSLytic Restaurant');
    lines.push(settings.address || '');
    lines.push(settings.phone || '');
    lines.push('--------------------------------');
    lines.push(`Order: ${order.orderNumber}`);
    lines.push(`Date: ${new Date(order.createdAt).toLocaleString()}`);
    lines.push('--------------------------------');

    order.items.forEach((item: any) => {
      lines.push(`${item.quantity}x ${item.menuItem.name.padEnd(20)} ${Number(item.totalPrice).toFixed(2)}`);
      if (item.notes) lines.push(`  * ${item.notes}`);
    });

    lines.push('--------------------------------');
    lines.push(`Subtotal: ${Number(order.subtotal).toFixed(2)}`);
    lines.push(`Tax:      ${Number(order.taxAmount).toFixed(2)}`);
    lines.push(`Total:    ${Number(order.totalAmount).toFixed(2)}`);
    lines.push('--------------------------------');
    lines.push('Thank you for your business!');

    return lines.join('\n');
  }
}
